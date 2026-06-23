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
  const { nom, formation_id, teacher_id } = req.body;

  const { data, error } = await supabase
    .from('groups')
    .insert({ nom, formation_id, teacher_id: teacher_id || null })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const updateGroup = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

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

  const { error } = await supabase
    .from('groups')
    .update({ archived: true })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
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
    .eq('group_id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

module.exports = { getGroupsByFormation, createGroup, updateGroup, deleteGroup, getGroupEtudiants };