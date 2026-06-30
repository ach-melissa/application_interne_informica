const supabase = require('../supabaseClient');

const getGroupSchedule = async (req, res) => {
  const { groupId } = req.params;
  const { data, error } = await supabase
    .from('schedules')
    .select('id, jour_semaine, salle, periode, contenu, heure_debut, heure_fin')
    .eq('group_id', groupId);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const createSchedule = async (req, res) => {
  const { group_id, jour_semaine, salle, periode, contenu, heure_debut, heure_fin } = req.body;
  const { data, error } = await supabase
    .from('schedules')
    .insert({ group_id, jour_semaine, salle, periode, contenu, heure_debut, heure_fin })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const updateSchedule = async (req, res) => {
  const { id } = req.params;
  const { contenu, heure_debut, heure_fin } = req.body;
  const { data, error } = await supabase
    .from('schedules')
    .update({ contenu, heure_debut, heure_fin })
    .eq('id', id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const deleteSchedule = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('schedules').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};


const getProfSchedule = async (req, res) => {
  const userId = req.user.id;

  // 1) Trouver le teacher_id lié à cet utilisateur connecté
  const { data: teacher, error: tErr } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (tErr || !teacher) {
    return res.status(404).json({ error: 'Professeur introuvable' });
  }

  // 2) Trouver les groupes assignés à ce prof
  const { data: groups, error: gErr } = await supabase
    .from('groups')
    .select('id')
    .eq('teacher_id', teacher.id)
    .eq('archived', false);

  if (gErr) return res.status(500).json({ error: gErr.message });

  const groupIds = groups.map((g) => g.id);
  if (groupIds.length === 0) return res.json([]);

  // 3) Récupérer les schedules de ces groupes uniquement
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      id, jour_semaine, salle, periode, contenu, heure_debut, heure_fin,
      groups(id, nom)
    `)
    .in('group_id', groupIds);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const getSchedulesByFormation = async (req, res) => {
  const { formation_id } = req.params;

  // d'abord récupère les group_ids de cette formation
  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id')
    .eq('formation_id', formation_id);

  if (groupsError) return res.status(500).json({ error: groupsError.message });

  const groupIds = groups.map((g) => g.id);

  if (groupIds.length === 0) return res.json([]);

  const { data, error } = await supabase
    .from('schedules')
    .select('*, groups(id, nom)')
    .in('group_id', groupIds);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

module.exports = { getGroupSchedule, createSchedule, updateSchedule, deleteSchedule , getProfSchedule ,getSchedulesByFormation  };