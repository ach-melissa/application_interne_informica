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

  // ← NOUVEAU : ces 12 lignes n'existaient pas avant
  const { data: conflicts, error: conflictErr } = await supabase
    .from('schedules')
    .select('id, heure_debut, heure_fin')
    .eq('salle', salle)
    .eq('jour_semaine', jour_semaine)
    .lt('heure_debut', heure_fin)
    .gt('heure_fin', heure_debut);

  if (conflictErr) return res.status(500).json({ error: conflictErr.message });
  if (conflicts.length > 0) {
    return res.status(409).json({
      error: `${salle} est déjà occupée ce jour-là de ${conflicts[0].heure_debut} à ${conflicts[0].heure_fin}.`,
    });
  }
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

  // ← NOUVEAU : tout ce bloc n'existait pas avant
  if (heure_debut && heure_fin) {
    const { data: current, error: curErr } = await supabase
      .from('schedules')
      .select('salle, jour_semaine')
      .eq('id', id)
      .single();
    if (curErr) return res.status(500).json({ error: curErr.message });

    const { data: conflicts, error: conflictErr } = await supabase
      .from('schedules')
      .select('id, heure_debut, heure_fin')
      .eq('salle', current.salle)
      .eq('jour_semaine', current.jour_semaine)
      .neq('id', id)
      .lt('heure_debut', heure_fin)
      .gt('heure_fin', heure_debut);

    if (conflictErr) return res.status(500).json({ error: conflictErr.message });
    if (conflicts.length > 0) {
      return res.status(409).json({
        error: `${current.salle} est déjà occupée ce jour-là de ${conflicts[0].heure_debut} à ${conflicts[0].heure_fin}.`,
      });
    }
  }

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

const renameSalle = async (req, res) => {
  const { id, newName } = req.body;
  if (!id || !newName?.trim()) return res.status(400).json({ error: 'id et newName requis' });
  const { data, error } = await supabase
    .from('salles')
    .update({ nom: newName.trim() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: `La salle "${newName.trim()}" existe déjà.` });
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
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
const getAllSchedules = async (req, res) => {
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      *,
      groups (
        id,
        nom,
        formations (
          id,
          nom
        )
      ),
users:prof_id (
  id,
  nom,
  prenom
)
    `);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const getJours = async (req, res) => {
  const { data, error } = await supabase.rpc('get_day_enum_values');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const getSalles = async (req, res) => {
  const { data, error } = await supabase.from('salles').select('id, nom').order('nom');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const createSalle = async (req, res) => {
  const { nom } = req.body;
  if (!nom?.trim()) return res.status(400).json({ error: 'nom requis' });
  const { data, error } = await supabase
    .from('salles')
    .insert({ nom: nom.trim() })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: `La salle "${nom.trim()}" existe déjà.` });
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
};

module.exports = { getGroupSchedule, createSchedule, updateSchedule, deleteSchedule,renameSalle, getProfSchedule, getSchedulesByFormation, getAllSchedules,getJours,getSalles ,createSalle };