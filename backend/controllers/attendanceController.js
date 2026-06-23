const supabase = require('../supabaseClient');

const getAttendance = async (req, res) => {
  const { group_id } = req.query;
  const { data: sessions } = await supabase
    .from('sessions').select('id').eq('group_id', group_id);
  const sessionIds = (sessions ?? []).map(s => s.id);
  if (!sessionIds.length) return res.json([]);

  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .in('session_id', sessionIds);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const createAttendance = async (req, res) => {
  const { session_id, etudiant_id, statut } = req.body;
  const { data, error } = await supabase
    .from('attendance')
    .insert({ session_id, etudiant_id, statut })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const updateAttendance = async (req, res) => {
  const { id } = req.params;
  const { statut } = req.body;
  const { data, error } = await supabase
    .from('attendance')
    .update({ statut })
    .eq('id', id)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const deleteAttendance = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

module.exports = { getAttendance, createAttendance, updateAttendance, deleteAttendance };