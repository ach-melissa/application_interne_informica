const supabase = require('../supabaseClient');

const getInscriptions = async (req, res) => {
  const { statut, formation_id } = req.query;

  let query = supabase
    .from('inscriptions')
    .select(`*, etudiant:etudiant_id(*), formation:formation_id(nom)`)
    .order('created_at', { ascending: false });

  if (statut) query = query.eq('statut', statut);
  if (formation_id) query = query.eq('formation_id', formation_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
const assignToGroup = async (req, res) => {
  const { id } = req.params; // inscription_id
  const { group_id } = req.body;

  const { data, error } = await supabase
    .from('inscriptions')
    .update({ group_id })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
module.exports = { getInscriptions, assignToGroup };