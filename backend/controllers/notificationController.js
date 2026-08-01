const supabase = require('../supabaseClient');

// ── POST /api/notifications/demande-salle ──────────────────
const demanderSalle = async (req, res) => {
  const { jour_semaine, periode, heure_debut, heure_fin, groupe_id, message } = req.body;

  if (!jour_semaine || !periode || !heure_debut || !heure_fin) {
    return res.status(400).json({ error: 'Champs requis manquants (jour, période, heures).' });
  }

  const { data: profUser, error: userErr } = await supabase
    .from('users')
    .select('nom, prenom')
    .eq('id', req.user.id)
    .single();

  if (userErr) return res.status(500).json({ error: userErr.message });

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      type: 'demande_salle',
      expediteur_id: req.user.id,
      destinataire_role: 'admin',
      titre: `Demande de salle - ${profUser.prenom} ${profUser.nom}`,
      message: message || null,
      data: { jour_semaine, periode, heure_debut, heure_fin, groupe_id: groupe_id || null },
    })
    .select()
    .single();

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
  res.json(data);
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
const traiterNotification = async (req, res) => {
  const { id } = req.params;
  const { statut, salle_assignee, reponse_message } = req.body;

  if (!['approuvee', 'refusee'].includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('notifications')
    .select('data')
    .eq('id', id)
    .single();

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  let finalStatut = statut;
  const updatedData = { ...existing.data };

  if (statut === 'approuvee') {
    const salles = (salle_assignee || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (salles.length === 0) {
      return res.status(400).json({ error: 'Merci d\'indiquer au moins une salle.' });
    }

    if (salles.length === 1) {
      updatedData.salle_assignee = salles[0];
      updatedData.salles_proposees = null;
    } else {
      finalStatut = 'proposee';
      updatedData.salles_proposees = salles;
      updatedData.salle_assignee = null;
    }
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({
      statut: finalStatut,
      reponse_message: reponse_message || null,
      traite_par: req.user.id,
      traite_le: new Date().toISOString(),
      data: updatedData,
      lu: false, // le prof n'a pas encore vu ce changement
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// ── PATCH /api/notifications/:id/choisir-salle ──────────────
const choisirSalle = async (req, res) => {
  const { id } = req.params;
  const { salle } = req.body;

  if (!salle) return res.status(400).json({ error: 'Salle requise.' });

  const { data: existing, error: fetchErr } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  if (existing.expediteur_id !== req.user.id) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  if (existing.statut !== 'proposee') {
    return res.status(400).json({ error: 'Cette demande n\'est pas en attente de choix.' });
  }

  const sallesProposees = existing.data?.salles_proposees || [];
  if (!sallesProposees.includes(salle)) {
    return res.status(400).json({ error: 'Salle non proposée.' });
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({
      statut: 'approuvee',
      data: { ...existing.data, salle_assignee: salle },
      lu_admin: false, // l'admin n'a pas encore vu le choix du prof
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
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

  // Celui qui répond a lu ; l'autre partie n'a pas encore vu ce nouveau message
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

module.exports = {
  demanderSalle,
  listerNotifications,
  mesDemandes,
  marquerLu,
  traiterNotification,
  choisirSalle,
  repondreNotification,
};