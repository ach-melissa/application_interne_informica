const supabase = require('../supabaseClient');

const getFormations = async (req, res) => {
  const { data, error } = await supabase
    .from('formations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
const getFormationById = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('formations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return res.status(404).json({ error: 'Formation introuvable.' });
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

const updateFormation = async (req, res) => {
  const { id } = req.params;
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
    .update({
  nom: nom.trim(),
  prix: Number(prix),
  heures: Number(heures),
  description: description?.trim() || null,
})
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const archiveFormation = async (req, res) => {
  const { id } = req.params;
  const { annee_scolaire } = req.body;

  const updates = { archived: true };
  if (annee_scolaire?.trim()) updates.annee_scolaire = annee_scolaire.trim();

  const { data, error } = await supabase
    .from('formations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const restoreFormation = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('formations')
    .update({ archived: false })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const deleteFormation = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('formations')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

module.exports = { getFormations, getFormationById, createFormation, updateFormation, archiveFormation, restoreFormation, deleteFormation };