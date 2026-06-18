const supabase = require('../supabaseClient');

const getFormations = async (req, res) => {
  const { data, error } = await supabase
    .from('formations')
    .select('*')
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

module.exports = { getFormations };