const supabase = require('../supabaseClient');

const demanderSalle = async (req, res) => {
  const {
    jour_semaine, periode, heure_debut, heure_fin,
    formation_id, groupe_id, type_demande, date_cible,
        salle_souhaitee_id, message, ancien_creneau_id,
  } = req.body;

  if (!jour_semaine || !periode || !heure_debut || !heure_fin ||
      !formation_id || !groupe_id || !type_demande || !date_cible) {
    return res.status(400).json({ error: 'Champs requis manquants.' });
  }
  if (!['remplacement', 'changement'].includes(type_demande)) {
    return res.status(400).json({ error: 'Type de demande invalide.' });
  }
if (heure_debut < '08:00' || heure_fin > '16:00' || heure_debut >= heure_fin) {
  return res.status(400).json({ error: 'Les horaires doivent être compris entre 08:00 et 16:00.' });
}
  const { data: profUser, error: userErr } = await supabase
    .from('users').select('nom, prenom').eq('id', req.user.id).single();
  if (userErr) return res.status(500).json({ error: userErr.message });

  const { data: formation } = await supabase
    .from('formations').select('nom').eq('id', formation_id).single();
  const { data: groupe } = await supabase
    .from('groups').select('nom').eq('id', groupe_id).single();

  let salle_souhaitee_nom = null;
  if (salle_souhaitee_id) {
    const { data: s } = await supabase.from('salles').select('nom').eq('id', salle_souhaitee_id).single();
    salle_souhaitee_nom = s?.nom || null;
  }
  let ancienCreneau = null;
  if (ancien_creneau_id) {
    const { data: ac, error: acErr } = await supabase
      .from('schedules')
      .select('id, jour_semaine, periode, heure_debut, heure_fin, salle, group_id')
      .eq('id', ancien_creneau_id)
      .single();
    if (acErr || !ac) return res.status(400).json({ error: 'Créneau existant introuvable.' });
    if (ac.group_id !== groupe_id) return res.status(400).json({ error: "Ce créneau n'appartient pas à ce groupe." });
    ancienCreneau = ac;
  }
 const { data, error } = await supabase
  .from('notifications')
  .insert({
    type: 'demande_salle',
    expediteur_id: req.user.id,
    destinataire_role: 'admin',
    titre: `Demande de salle - ${profUser.prenom} ${profUser.nom}`,
    message: message || null,
    lu: false,
    lu_admin: false,
    data: {
      jour_semaine, periode, heure_debut, heure_fin,
      formation_id, formation_nom: formation?.nom || null,
      groupe_id, groupe_nom: groupe?.nom || null,
      type_demande, date_cible,
      salle_souhaitee_id: salle_souhaitee_id || null,
      salle_souhaitee_nom,
      demandeur_nom: `${profUser.prenom} ${profUser.nom}`,
            ancien_creneau_id: ancienCreneau?.id || null,
      ancien_jour_semaine: ancienCreneau?.jour_semaine || null,
      ancien_periode: ancienCreneau?.periode || null,
      ancien_heure_debut: ancienCreneau?.heure_debut || null,
      ancien_heure_fin: ancienCreneau?.heure_fin || null,
      ancien_salle_nom: ancienCreneau?.salle || null,
    },
  })
  .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const AVATAR_BUCKET = 'avatars';
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 7; // 7 jours

const getPhotoUrl = async (photoPath) => {
  if (!photoPath) return null;
  const { data, error } = await supabase
    .storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(photoPath, SIGNED_URL_EXPIRY);
  return error ? null : data.signedUrl;
};

// ── GET /api/notifications ──────────────────────────────────
const listerNotifications = async (req, res) => {
  const { statut } = req.query;

  let query = supabase
    .from('notifications')
    .select('*, expediteur:expediteur_id(id, nom, prenom, photo_path)')
    .eq('destinataire_role', req.user.role)
    .order('created_at', { ascending: false });

  if (statut) query = query.eq('statut', statut);

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });

  const withPhotos = await Promise.all(
    data.map(async (n) => ({
      ...n,
      expediteur: n.expediteur
        ? { ...n.expediteur, photo_url: await getPhotoUrl(n.expediteur.photo_path) }
        : null,
    }))
  );

  res.json(withPhotos);
};

// ── GET /api/notifications/mes-demandes ─────────────────────
const mesDemandes = async (req, res) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('expediteur_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const traiteurIds = [...new Set(data.filter((d) => d.traite_par).map((d) => d.traite_par))];
  let traiteurs = {};
  if (traiteurIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, nom, prenom').in('id', traiteurIds);
    traiteurs = Object.fromEntries((users || []).map((u) => [u.id, `${u.prenom} ${u.nom}`]));
  }

  res.json(data.map((d) => ({ ...d, traite_par_nom: d.traite_par ? traiteurs[d.traite_par] : null })));
};

// ── PATCH /api/notifications/:id/lu ─────────────────────────
const marquerLu = async (req, res) => {
  const { id } = req.params;
  const field = req.user.role === 'admin' ? 'lu_admin' : 'lu';

  const { data, error } = await supabase
    .from('notifications')
    .update({ [field]: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// ── PATCH /api/notifications/:id/traiter ────────────────────
// Admin approuve (avec UNE seule salle) ou refuse.
const traiterNotification = async (req, res) => {
  const { id } = req.params;
  const { statut, salle_id, reponse_message } = req.body;

  if (!['approuvee', 'refusee'].includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('notifications').select('*').eq('id', id).single();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  if (existing.statut !== 'en_attente') {
    return res.status(400).json({ error: 'Cette demande a déjà été traitée.' });
  }

  const updatedData = { ...existing.data };

   if (statut === 'approuvee') {
    if (!salle_id) return res.status(400).json({ error: 'Merci de choisir une salle.' });

    const { data: salle, error: salleErr } = await supabase
      .from('salles').select('id, nom').eq('id', salle_id).single();
    if (salleErr || !salle) return res.status(400).json({ error: 'Salle introuvable.' });

const { data: conflicts, error: conflictErr } = await supabase
  .from('schedules')
  .select('id, heure_debut, heure_fin')
  .eq('salle', salle.nom)
  .eq('jour_semaine', existing.data.jour_semaine)
  .lt('heure_debut', existing.data.heure_fin)
  .gt('heure_fin', existing.data.heure_debut);
    if (conflictErr) return res.status(500).json({ error: conflictErr.message });
    if (conflicts.length > 0) {
      return res.status(409).json({
        error: `${salle.nom} est déjà occupée ce jour-là de ${conflicts[0].heure_debut?.slice(0,5)} à ${conflicts[0].heure_fin?.slice(0,5)}. Choisissez une autre salle.`,
      });
    }

    updatedData.salle_assignee = salle.id;
    updatedData.salle_assignee_nom = salle.nom;
  }
  const { data, error } = await supabase
    .from('notifications')
    .update({
      statut,
      reponse_message: reponse_message || null,
      traite_par: req.user.id,
      traite_le: new Date().toISOString(),
      data: updatedData,
      lu: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id).select().single();

  if (error) return res.status(500).json({ error: error.message });

  if (statut === 'approuvee') {
    const { error: schedErr } = await creerCreneauDepuisNotification(
      data, updatedData.salle_assignee, updatedData.salle_assignee_nom
    );
    if (schedErr) return res.status(500).json({ error: schedErr.message });
  }

  res.json(data);
};

// ── PATCH /api/notifications/:id/modifier-salle ─────────────
// Admin change la salle d'une demande DÉJÀ approuvée.
const modifierSalleAssignee = async (req, res) => {
  const { id } = req.params;
  const { salle_id } = req.body;
  if (!salle_id) return res.status(400).json({ error: 'Salle requise.' });

  const { data: existing, error: fetchErr } = await supabase
    .from('notifications').select('*').eq('id', id).single();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  if (existing.statut !== 'approuvee') {
    return res.status(400).json({ error: "Cette demande n'est pas encore approuvée." });
  }

  const { data: salle, error: salleErr } = await supabase
    .from('salles').select('id, nom').eq('id', salle_id).single();
  if (salleErr || !salle) return res.status(400).json({ error: 'Salle introuvable.' });

const { data: conflicts, error: conflictErr } = await supabase
  .from('schedules')
  .select('id, heure_debut, heure_fin')
  .eq('salle', salle.nom)
  .eq('jour_semaine', existing.data.jour_semaine)
  .or(`notification_id.is.null,notification_id.neq.${id}`)
  .lt('heure_debut', existing.data.heure_fin)
  .gt('heure_fin', existing.data.heure_debut);
  if (conflictErr) return res.status(500).json({ error: conflictErr.message });
  if (conflicts.length > 0) {
    return res.status(409).json({
      error: `${salle.nom} est déjà occupée ce jour-là de ${conflicts[0].heure_debut?.slice(0,5)} à ${conflicts[0].heure_fin?.slice(0,5)}.`,
    });
  }

  const updatedData = { ...existing.data, salle_assignee: salle.id, salle_assignee_nom: salle.nom };

  const { data, error } = await supabase
    .from('notifications')
    .update({ data: updatedData, lu: false, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  const { error: schedErr } = await supabase
    .from('schedules')
    .update({ salle: salle.nom, salle_id: salle.id })
    .eq('notification_id', id);
  if (schedErr) return res.status(500).json({ error: schedErr.message });

  res.json(data);
};

// ── PATCH /api/notifications/:id/proposer ───────────────────
// Admin propose un autre jour/heure/salle que ce que le prof a demandé.
const proposerAlternative = async (req, res) => {
  const { id } = req.params;
  const { propositions } = req.body;

  if (!Array.isArray(propositions) || propositions.length === 0) {
    return res.status(400).json({ error: 'Au moins une proposition est requise.' });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('notifications').select('*').eq('id', id).single();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  if (existing.statut !== 'en_attente') {
    return res.status(400).json({ error: 'Cette demande a déjà été traitée.' });
  }

    let salle_demandee_occupee = false;
  if (existing.data.salle_souhaitee_id) {
    const { data: salleSouhaitee } = await supabase
      .from('salles').select('nom').eq('id', existing.data.salle_souhaitee_id).single();
    if (salleSouhaitee) {
      const { data: conflictsSouhaitee } = await supabase
        .from('schedules')
        .select('id')
        .eq('salle', salleSouhaitee.nom)
        .eq('jour_semaine', existing.data.jour_semaine)
        .lt('heure_debut', existing.data.heure_fin)
        .gt('heure_fin', existing.data.heure_debut);
      salle_demandee_occupee = (conflictsSouhaitee?.length || 0) > 0;
    }
  }

  const built = [];
  for (const p of propositions) {
    const { jour_semaine, periode, heure_debut, heure_fin, salle_id, message_admin } = p;
if (!jour_semaine || !periode || !heure_debut || !heure_fin || !salle_id) {
  return res.status(400).json({ error: 'Chaque option doit avoir un jour, une période, des heures et une salle.' });
}
if (heure_debut < '08:00' || heure_fin > '16:00' || heure_debut >= heure_fin) {
  return res.status(400).json({ error: 'Chaque option doit avoir des horaires compris entre 08:00 et 16:00.' });
}

    const { data: salle, error: salleErr } = await supabase
      .from('salles').select('id, nom').eq('id', salle_id).single();
    if (salleErr || !salle) return res.status(400).json({ error: 'Salle introuvable.' });

    const { data: conflicts, error: conflictErr } = await supabase
      .from('schedules')
      .select('id, heure_debut, heure_fin')
      .eq('salle', salle.nom)
      .eq('jour_semaine', jour_semaine)
      .lt('heure_debut', heure_fin)
      .gt('heure_fin', heure_debut);
    if (conflictErr) return res.status(500).json({ error: conflictErr.message });
    if (conflicts.length > 0) {
      return res.status(409).json({
        error: `${salle.nom} est déjà occupée ce jour-là de ${conflicts[0].heure_debut?.slice(0,5)} à ${conflicts[0].heure_fin?.slice(0,5)}.`,
      });
    }

    built.push({
      jour_semaine, periode, heure_debut, heure_fin,
      salle_id: salle.id, salle_nom: salle.nom,
      message_admin: message_admin || null,
    });
  }

const updatedData = { ...existing.data, propositions: built, salle_demandee_occupee };

  const { data, error } = await supabase
    .from('notifications')
    .update({
      statut: 'proposee',
      data: updatedData,
      traite_par: req.user.id,
      lu: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
};

// ── PATCH /api/notifications/:id/repondre-proposition ───────
// Le prof accepte ou refuse la proposition de l'admin.
const repondreProposition = async (req, res) => {
  const { id } = req.params;
  const { accepte, proposition_index } = req.body;

  if (typeof accepte !== 'boolean') {
    return res.status(400).json({ error: 'accepte (booléen) requis.' });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('notifications').select('*').eq('id', id).single();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  if (existing.expediteur_id !== req.user.id) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }
  if (existing.statut !== 'proposee') {
    return res.status(400).json({ error: "Cette demande n'a pas de proposition en attente." });
  }

  if (!accepte) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ statut: 'refusee', lu_admin: false, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  const propositions = existing.data?.propositions || [];
  const prop = propositions[proposition_index];
  if (!prop) return res.status(400).json({ error: 'Option introuvable.' });

  const { data: conflicts, error: conflictErr } = await supabase
    .from('schedules')
    .select('id, heure_debut, heure_fin')
    .eq('salle', prop.salle_nom)
    .eq('jour_semaine', prop.jour_semaine)
    .lt('heure_debut', prop.heure_fin)
    .gt('heure_fin', prop.heure_debut);
  if (conflictErr) return res.status(500).json({ error: conflictErr.message });
  if (conflicts.length > 0) {
    return res.status(409).json({
      error: `${prop.salle_nom} n'est plus disponible sur ce créneau. Choisissez une autre option.`,
    });
  }

  const updatedData = {
    ...existing.data,
    jour_semaine: prop.jour_semaine,
    periode: prop.periode,
    heure_debut: prop.heure_debut,
    heure_fin: prop.heure_fin,
    salle_assignee: prop.salle_id,
    salle_assignee_nom: prop.salle_nom,
  };

  const { data, error } = await supabase
    .from('notifications')
    .update({
      statut: 'approuvee',
      data: updatedData,
            lu_admin: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  const { error: schedErr } = await creerCreneauDepuisNotification(
    data, updatedData.salle_assignee, updatedData.salle_assignee_nom
  );
  if (schedErr) return res.status(500).json({ error: schedErr.message });

  res.json(data);
};

// ── POST /api/notifications/:id/repondre ────────────────────
const repondreNotification = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message requis.' });
  }

  const { data: notif, error: fetchErr } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  const estExpediteur = notif.expediteur_id === req.user.id;
  const estDestinataire = notif.destinataire_role === req.user.role;

  if (!estExpediteur && !estDestinataire) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  const { data: authUser, error: userErr } = await supabase
    .from('users')
    .select('nom, prenom')
    .eq('id', req.user.id)
    .single();

  if (userErr) return res.status(500).json({ error: userErr.message });

  const nouvelleReponse = {
    auteur_id: req.user.id,
    auteur_role: req.user.role,
    auteur_nom: `${authUser.prenom} ${authUser.nom}`,
    message: message.trim(),
    created_at: new Date().toISOString(),
  };

  const updatedReplies = [...(notif.replies || []), nouvelleReponse];

  const champUpdate =
    req.user.role === 'admin'
      ? { lu: false, lu_admin: true }
      : { lu: true, lu_admin: false };

  const { data, error } = await supabase
    .from('notifications')
    .update({ replies: updatedReplies, ...champUpdate, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const creerCreneauDepuisNotification = async (notif, salleId, salleNom) => {
  const d = notif.data || {};

  if (d.type_demande === 'remplacement') {
    return supabase.from('schedules').insert({
      group_id: d.groupe_id,
      jour_semaine: d.jour_semaine,
      periode: d.periode,
      heure_debut: d.heure_debut,
      heure_fin: d.heure_fin,
      salle: salleNom,
      salle_id: salleId,
      type_special: 'remplacement',
      expire_le: d.date_cible,
      notification_id: notif.id,
      contenu: 'Remplacement',
    });
  }

  const veille = new Date(d.date_cible);
  veille.setDate(veille.getDate() - 1);

  if (d.ancien_creneau_id) {
    await supabase
      .from('schedules')
      .update({ expire_le: veille.toISOString().slice(0, 10) })
      .eq('id', d.ancien_creneau_id);
  } else {
    // anciennes demandes créées avant cette évolution (pas d'ancien_creneau_id)
    await supabase
      .from('schedules')
      .update({ expire_le: veille.toISOString().slice(0, 10) })
      .eq('group_id', d.groupe_id)
      .eq('jour_semaine', d.jour_semaine)
      .is('type_special', null);
  }

  return supabase.from('schedules').insert({
    group_id: d.groupe_id,
    jour_semaine: d.jour_semaine,
    periode: d.periode,
    heure_debut: d.heure_debut,
    heure_fin: d.heure_fin,
    salle: salleNom,
    salle_id: salleId,
    type_special: 'changement',
    applicable_depuis: d.date_cible,
    notification_id: notif.id,
    contenu: "Changement d'horaire",
  });
};

module.exports = {
  demanderSalle,
  listerNotifications,
  mesDemandes,
  marquerLu,
  traiterNotification,
  modifierSalleAssignee,
  proposerAlternative,
  repondreProposition,
  repondreNotification,
};