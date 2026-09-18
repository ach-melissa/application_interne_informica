const supabase = require('../supabaseClient');

const getAutresRevenus = async (req, res) => {
  const { data, error } = await supabase
    .from('autres_revenus')
    .select('*')
    .order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const createAutreRevenu = async (req, res) => {
  const { libelle, montant, date, categorie } = req.body;
  if (!libelle || !montant) return res.status(400).json({ error: 'Libellé et montant requis.' });

  const { data, error } = await supabase
    .from('autres_revenus')
    .insert({ libelle, montant: parseFloat(montant), date: date || new Date().toISOString().split('T')[0], categorie })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const updateAutreRevenu = async (req, res) => {
  const { id } = req.params;
  const fields = {};
  for (const k of ['libelle', 'montant', 'date', 'categorie']) {
    if (req.body[k] !== undefined) fields[k] = req.body[k];
  }
  const { data, error } = await supabase
    .from('autres_revenus')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const deleteAutreRevenu = async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('autres_revenus').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

const getCategories = async (req, res) => {
  const { data, error } = await supabase.rpc('get_categorie_autre_revenu_values');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const addCategorie = async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom requis.' });
  const { error } = await supabase.rpc('add_categorie_autre_revenu', { new_value: nom });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

const renameCategorie = async (req, res) => {
  const { ancien, nouveau } = req.body;
  if (!ancien || !nouveau) return res.status(400).json({ error: 'ancien et nouveau requis.' });
  const { error } = await supabase.rpc('rename_categorie_autre_revenu', { old_value: ancien, new_value: nouveau });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};
const removeCategorie = async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom requis.' });
  const { error } = await supabase.rpc('remove_categorie_autre_revenu', { old_value: nom });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

module.exports = {
  getAutresRevenus, createAutreRevenu, updateAutreRevenu, deleteAutreRevenu,
  getCategories, addCategorie, renameCategorie,removeCategorie,
};