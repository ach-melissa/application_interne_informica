const supabase = require('../supabaseClient');

const getFormationNiveaux = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('formation_niveaux')
    .select('*')
    .eq('formation_id', id)
    .order('ordre', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const setFormationNiveaux = async (req, res) => {
  const { id } = req.params;
  const { niveaux } = req.body; // [{ nom, prix, duree_valeur, type_duree }, ...]

  if (!Array.isArray(niveaux)) {
    return res.status(400).json({ error: 'niveaux doit être un tableau.' });
  }

  const { data: formation, error: fErr } = await supabase
    .from('formations')
    .select('prix_uniforme, duree_uniforme')
    .eq('id', id)
    .single();
  if (fErr) return res.status(500).json({ error: fErr.message });

  for (const n of niveaux) {
    if (!n.nom || !n.nom.trim()) {
      return res.status(400).json({ error: 'Chaque niveau doit avoir un nom.' });
    }
    if (!formation.prix_uniforme && (n.prix === '' || n.prix === undefined || n.prix === null || Number(n.prix) <= 0)) {
      return res.status(400).json({ error: `Prix requis pour le niveau "${n.nom}".` });
    }
    if (!formation.duree_uniforme && (n.duree_valeur === '' || n.duree_valeur === undefined || n.duree_valeur === null || Number(n.duree_valeur) <= 0)) {
      return res.status(400).json({ error: `Durée requise pour le niveau "${n.nom}".` });
    }
    if (n.type_duree && !['heures', 'seances'].includes(n.type_duree)) {
      return res.status(400).json({ error: `type_duree invalide pour le niveau "${n.nom}".` });
    }
  }

  const { error: delErr } = await supabase.from('formation_niveaux').delete().eq('formation_id', id);
  if (delErr) return res.status(500).json({ error: delErr.message });

  if (niveaux.length === 0) return res.json([]);

  const rows = niveaux.map((n, idx) => ({
    formation_id: id,
    nom: n.nom.trim(),
    ordre: idx + 1,
    prix: n.prix !== '' && n.prix !== undefined && n.prix !== null ? Number(n.prix) : null,
    duree_valeur: n.duree_valeur !== '' && n.duree_valeur !== undefined && n.duree_valeur !== null ? Number(n.duree_valeur) : null,
    type_duree: n.type_duree || null,
  }));

  const { data, error } = await supabase.from('formation_niveaux').insert(rows).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

module.exports = { getFormationNiveaux, setFormationNiveaux };