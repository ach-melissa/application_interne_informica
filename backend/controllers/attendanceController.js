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

const batchAttendance = async (req, res) => {
  const { session_id, entries } = req.body; // entries: [{ etudiant_id, statut }]
  if (!session_id || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'session_id et entries sont requis.' });
  }

  const { data: existing, error: exErr } = await supabase
    .from('attendance')
    .select('id, etudiant_id')
    .eq('session_id', session_id);
  if (exErr) return res.status(500).json({ error: exErr.message });

  const existingMap = {};
  (existing ?? []).forEach(a => { existingMap[a.etudiant_id] = a.id; });

  const toInsert = [];
  const toUpdate = [];
  const toDeleteIds = [];

  for (const e of entries) {
    const existingId = existingMap[e.etudiant_id];
    if (!e.statut) {
      if (existingId) toDeleteIds.push(existingId);
    } else if (existingId) {
      toUpdate.push({ id: existingId, statut: e.statut });
    } else {
      toInsert.push({ session_id, etudiant_id: e.etudiant_id, statut: e.statut });
    }
  }

  if (toDeleteIds.length) {
    const { error } = await supabase.from('attendance').delete().in('id', toDeleteIds);
    if (error) return res.status(500).json({ error: error.message });
  }
  if (toInsert.length) {
    const { error } = await supabase.from('attendance').insert(toInsert);
    if (error) return res.status(500).json({ error: error.message });
  }
  for (const u of toUpdate) {
    const { error } = await supabase.from('attendance').update({ statut: u.statut }).eq('id', u.id);
    if (error) return res.status(500).json({ error: error.message });
  }

  const { error: finErr } = await supabase
    .from('sessions')
    .update({ finalized_at: new Date().toISOString() })
    .eq('id', session_id);
  if (finErr) return res.status(500).json({ error: finErr.message });

  res.json({ success: true });
};

module.exports = { getAttendance, createAttendance, updateAttendance, deleteAttendance, batchAttendance };