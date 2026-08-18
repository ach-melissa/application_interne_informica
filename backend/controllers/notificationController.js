const supabase = require('../supabaseClient');

const demanderSalle = async (req, res) => {
  const {
    jour_semaine, periode, heure_debut, heure_fin,
    formation_id, groupe_id, type_demande, date_cible,
    salle_souhaitee_id, message,
  } = req.body;

  if (!jour_semaine || !periode || !heure_debut || !heure_fin ||
      !formation_id || !groupe_id || !type_demande || !date_cible) {
    return res.status(400).json({ error: 'Champs requis manquants.' });
  }
  if (!['remplacement', 'changement'].includes(type_demande)) {
    return res.status(400).json({ error: 'Type de demande invalide.' });
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
    },
  })
  .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// ── GET /api/notifications ──────────────────────────────────
const listerNotifications = async (req, res) => {
  const { statut } = req.query;

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('destinataire_role', req.user.role)
    .order('created_at', { ascending: false });

  if (statut) query = query.eq('statut', statut);

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
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

  await supabase
    .from('schedules')
    .update({ expire_le: veille.toISOString().slice(0, 10) })
    .eq('group_id', d.groupe_id)
    .eq('jour_semaine', d.jour_semaine)
    .is('type_special', null);

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
  repondreNotification,
};