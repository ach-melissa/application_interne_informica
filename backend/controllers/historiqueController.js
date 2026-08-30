const supabase = require('../supabaseClient');

// ============================================================
// GET /api/historique — liste des actions admin (+ super_admin)
// Support optionnel : ?limit=50 (défaut 50, max 200)
// ============================================================
const getHistorique = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const { data, error } = await supabase
      .from('historique')
      .select('id, utilisateur_nom, role, action, entite, description, created_at')
      .eq('perimetre', 'admin')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('getHistorique:', error);
      return res.status(500).json({ message: 'Erreur serveur' });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
const getHistoriqueUnread = async (req, res) => {
  const { data: user, error: uErr } = await supabase
    .from('users').select('historique_last_seen').eq('id', req.user.id).single();
  if (uErr) return res.status(500).json({ message: 'Erreur serveur' });

  const { data: last, error } = await supabase
    .from('historique')
    .select('created_at')
    .eq('perimetre', 'admin')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return res.status(500).json({ message: 'Erreur serveur' });

  const hasUnread = !!last && (!user.historique_last_seen || new Date(last.created_at) > new Date(user.historique_last_seen));
  res.json({ hasUnread });
};

const markHistoriqueSeen = async (req, res) => {
  const { error } = await supabase
    .from('users').update({ historique_last_seen: new Date().toISOString() }).eq('id', req.user.id);
  if (error) return res.status(500).json({ message: 'Erreur serveur' });
  res.json({ success: true });
};

module.exports = { getHistorique, getHistoriqueUnread, markHistoriqueSeen };