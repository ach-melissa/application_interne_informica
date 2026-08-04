const supabase = require('../supabaseClient');

const getGroupsByFormation = async (req, res) => {
  const { formation_id } = req.query;

  const { data, error } = await supabase
    .from('groups')
    .select(`
      *,
      teacher:teacher_id(id, user:user_id(nom, prenom)),
      formations:formation_id(nom)
    `)
    .eq('formation_id', formation_id)
    .eq('archived', false)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const result = await Promise.all(
    data.map(async (g) => {
      const { count } = await supabase
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', g.id);
      return { ...g, nb_etudiants: count ?? 0 };
    })
  );

  res.json(result);
};

const createGroup = async (req, res) => {
  const { nom, formation_id, teacher_id, en_promotion, prix_promotion } = req.body;

  const { data, error } = await supabase
    .from('groups')
    .insert({
      nom,
      formation_id,
      teacher_id: teacher_id || null,
      en_promotion: !!en_promotion,
      prix_promotion: en_promotion ? (prix_promotion || null) : null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const updateGroup = async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };

  // Postgres refuse '' pour une colonne `date`
 if (updates.date_debut === '') updates.date_debut = null;
  if (updates.date_fin === '') updates.date_fin = null;

  // Jamais de prix promo si la promo est désactivée
  if ('en_promotion' in updates) {
    updates.prix_promotion = updates.en_promotion ? (updates.prix_promotion || null) : null;
  }
  const { data, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const deleteGroup = async (req, res) => {
  const { id } = req.params;

  // Remettre group_id à null pour les étudiants de ce groupe
// Bloquer la suppression si des étudiants sont encore inscrits à ce groupe
  const { count, error: countError } = await supabase
    .from('inscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', id);

  if (countError) return res.status(500).json({ error: countError.message });
  if (count > 0) {
    return res.status(400).json({
      error: `Ce groupe a ${count} étudiant(s) inscrit(s). Retirez-les ou réaffectez-les à un autre groupe avant de le supprimer.`,
    });
  }

  // Nettoyer les données liées avant la suppression réelle
  const { error: schedErr } = await supabase.from('schedules').delete().eq('group_id', id);
  if (schedErr) return res.status(500).json({ error: schedErr.message });

  const { data: sessions, error: sessErr } = await supabase
    .from('sessions')
    .select('id')
    .eq('group_id', id);
  if (sessErr) return res.status(500).json({ error: sessErr.message });

  if (sessions?.length) {
    const sessionIds = sessions.map(s => s.id);
    const { error: attErr } = await supabase.from('attendance').delete().in('session_id', sessionIds);
    if (attErr) return res.status(500).json({ error: attErr.message });

    const { error: sessDelErr } = await supabase.from('sessions').delete().eq('group_id', id);
    if (sessDelErr) return res.status(500).json({ error: sessDelErr.message });
  }

  // Suppression réelle du groupe
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};
const archiveGroup = async (req, res) => {
  const { id } = req.params;
  const { annee_scolaire } = req.body || {};

  const updates = { archived: true };
  if (annee_scolaire?.trim()) updates.annee_scolaire = annee_scolaire.trim();

  const { data, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const restoreGroup = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('groups')
    .update({ archived: false })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const getGroupEtudiants = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('inscriptions')
    .select(`
      *,
      etudiant:etudiant_id(*),
      formation:formation_id(nom)
    `)
    .eq('group_id', id)
    .eq('statut', 'confirmed');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
const getUnassignedStudents = async (req, res) => {
  const { formation_id } = req.params;

  const { data, error } = await supabase
    .from('inscriptions')
    .select('id, etudiant_id, etudiant:etudiant_id(id, nom, prenom, telephone)')
    .eq('formation_id', formation_id)
    .eq('statut', 'confirmed')
    .is('group_id', null);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
module.exports = { getGroupsByFormation, createGroup, updateGroup, deleteGroup, getGroupEtudiants, getUnassignedStudents, archiveGroup, restoreGroup };