const supabase = require('../supabaseClient');

const getTeachers = async (req, res) => {
  const { formation_id } = req.query;

  let teacherIds = null;
  if (formation_id) {
    const { data: links, error: linkErr } = await supabase
      .from('teacher_formations')
      .select('teacher_id')
      .eq('formation_id', formation_id);

    if (linkErr) return res.status(500).json({ error: linkErr.message });
    teacherIds = links.map((l) => l.teacher_id);
  }

  let query = supabase
    .from('teachers')
    .select(`id, user_id, created_at, user:user_id(id, nom, prenom, email, telephone)`)
    .order('created_at', { ascending: false });

  if (teacherIds) {
    query = query.in('id', teacherIds.length ? teacherIds : ['00000000-0000-0000-0000-000000000000']);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Formations assignées à chaque prof — vient de teacher_formations,
  // jamais déduite des groupes (un prof peut couvrir une formation sans
  // avoir de groupe actif dessus pour l'instant).
  const allTeacherIds = data.map((t) => t.id);
  const { data: allLinks, error: allLinksErr } = await supabase
    .from('teacher_formations')
    .select('teacher_id, formation:formation_id(id, nom)')
    .in('teacher_id', allTeacherIds.length ? allTeacherIds : ['00000000-0000-0000-0000-000000000000']);
  if (allLinksErr) return res.status(500).json({ error: allLinksErr.message });

  const formationsByTeacher = {};
  (allLinks ?? []).forEach((l) => {
    if (!l.formation?.id) return;
    (formationsByTeacher[l.teacher_id] ??= []).push({ id: l.formation.id, nom: l.formation.nom });
  });

  // Groupes en cours (non archivés, non terminés) — uniquement parmi les
  // formations que ce prof est censé enseigner, pas tous les groupes qui
  // lui sont techniquement assignés en base.
  const today = new Date().toISOString().slice(0, 10);
  const allFormationIds = [...new Set((allLinks ?? []).map((l) => l.formation?.id).filter(Boolean))];

  let groupsByTeacher = {};
  if (allTeacherIds.length && allFormationIds.length) {
    const { data: groups, error: groupsErr } = await supabase
      .from('groups')
      .select('id, teacher_id, formation_id, archived, statut, date_fin')
      .in('teacher_id', allTeacherIds)
      .in('formation_id', allFormationIds)
      .eq('archived', false)
      .neq('statut', 'terminer')
      .or(`date_fin.is.null,date_fin.gte.${today}`);
    if (groupsErr) return res.status(500).json({ error: groupsErr.message });

    (groups ?? []).forEach((g) => {
      (groupsByTeacher[g.teacher_id] ??= []).push(g);
    });
  }

  const result = data.map((t) => ({
    id: t.id,
    user_id: t.user_id,
    nom: t.user?.nom ?? '',
    prenom: t.user?.prenom ?? '',
    email: t.user?.email ?? '',
    telephone: t.user?.telephone ?? '',
    formations: formationsByTeacher[t.id] ?? [],
    nb_formations: (formationsByTeacher[t.id] ?? []).length,
    nb_groupes: (groupsByTeacher[t.id] ?? []).length,
  }));

  res.json(result);
};
// GET /api/teachers/by-user/:user_id — formation_ids for pre-filling the edit form
const getTeacherFormationsByUser = async (req, res) => {
  const { user_id } = req.params;

  const { data: teacher, error: tErr } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', user_id)
    .maybeSingle();

  if (tErr) return res.status(500).json({ error: tErr.message });
  if (!teacher) return res.json({ teacher_id: null, formation_ids: [] });

  const { data: links, error: lErr } = await supabase
    .from('teacher_formations')
    .select('formation_id')
    .eq('teacher_id', teacher.id);

  if (lErr) return res.status(500).json({ error: lErr.message });

  res.json({ teacher_id: teacher.id, formation_ids: links.map((l) => l.formation_id) });
};

module.exports = { getTeachers, getTeacherFormationsByUser };