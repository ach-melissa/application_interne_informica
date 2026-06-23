// formation controller
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

const createFormation = async (req, res) => {
  const { nom, prix, heures, description } = req.body;

  if (!nom || !nom.trim()) {
    return res.status(400).json({ error: 'Le nom de la formation est obligatoire.' });
  }
  if (prix === undefined || prix === null || isNaN(prix) || Number(prix) < 0) {
    return res.status(400).json({ error: 'Le prix doit être un nombre valide.' });
  }
  if (heures === undefined || heures === null || isNaN(heures) || Number(heures) <= 0) {
    return res.status(400).json({ error: "Le nombre d'heures doit être un nombre valide." });
  }

  const { data, error } = await supabase
    .from('formations')
    .insert([{
      nom: nom.trim(),
      prix: Number(prix),
      heures: Number(heures),
      description: description?.trim() || null,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
};

module.exports = { getFormations, createFormation };