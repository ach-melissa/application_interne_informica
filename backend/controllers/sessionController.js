const supabase = require('../supabaseClient');

const getSessions = async (req, res) => {
  const { group_id } = req.query;
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('group_id', group_id)
    .order('date', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const createSession = async (req, res) => {
  const { group_id, date, statut, type_seance } = req.body;
  const { data, error } = await supabase
    .from('sessions')
    .insert({ group_id, date, statut: statut ?? 'effectuee', type_seance: type_seance ?? 'normale' })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const deleteSession = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};
const updateSession = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('sessions').update(req.body).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
module.exports = { getSessions, createSession, deleteSession, updateSession };