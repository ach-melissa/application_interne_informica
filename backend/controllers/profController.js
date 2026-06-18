const supabase = require('../supabaseClient');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const getProfs = async (req, res) => {
  const { data, error } = await supabase
    .from('teachers')
    .select(`
      id,
      user:user_id(id, nom, prenom, email, telephone),
      groups(
        id, nom,
        formation:formation_id(nom)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const result = data.map((t) => ({
    id: t.id,
    nom: t.user?.nom ?? '',
    prenom: t.user?.prenom ?? '',
    email: t.user?.email ?? '',
    telephone: t.user?.telephone ?? '',
    formations: [...new Set(t.groups?.map((g) => g.formation?.nom).filter(Boolean))],
    groups: t.groups ?? [],
  }));

  res.json(result);
};

const getProfPointage = async (req, res) => {
  const { group_id } = req.query;

  const { data: sessions, error: sessError } = await supabase
    .from('sessions')
    .select('id, date, statut')
    .eq('group_id', group_id)
    .order('date', { ascending: true });

  if (sessError) return res.status(500).json({ error: sessError.message });

  const { data: inscriptions, error: insError } = await supabase
    .from('inscriptions')
    .select('etudiant:etudiant_id(id, nom, prenom)')
    .eq('group_id', group_id);

  if (insError) return res.status(500).json({ error: insError.message });

  const sessionIds = sessions.map((s) => s.id);

  let attendance = [];
  if (sessionIds.length > 0) {
    const { data: attData, error: attError } = await supabase
      .from('attendance')
      .select('session_id, etudiant_id, statut')
      .in('session_id', sessionIds);

    if (attError) return res.status(500).json({ error: attError.message });
    attendance = attData;
  }

  res.json({ sessions, inscriptions, attendance });
};

module.exports = { getProfs, getProfPointage };