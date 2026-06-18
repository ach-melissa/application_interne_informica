const supabase = require('../supabaseClient');

const getTeachers = async (req, res) => {
  const { data, error } = await supabase
    .from('teachers')
    .select(`
      id,
      user_id,
      created_at,
      user:user_id(id, nom, prenom, email, telephone)
    `)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const result = data.map((t) => ({
    id: t.id,
    user_id: t.user_id,
    nom: t.user?.nom ?? '',
    prenom: t.user?.prenom ?? '',
    email: t.user?.email ?? '',
    telephone: t.user?.telephone ?? '',
  }));

  res.json(result);
};

module.exports = { getTeachers };