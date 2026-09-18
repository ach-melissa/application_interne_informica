const supabase = require('../supabaseClient');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const getAutresRevenus = async (req, res) => {
  const { data, error } = await supabase
    .from('autres_revenus')
    .select('*, bons:autres_revenus_bons(id, url)')
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
    .select('*, bons:autres_revenus_bons(id, url)')
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

// ============================================================
// BONS — multiple photos per revenu
// ============================================================

const uploadBonRevenu = async (req, res) => {
  const { id } = req.params; // autre_revenu_id
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Aucun fichier reçu' });

  const ext = file.mimetype.split('/')[1] || 'jpg';
  const path = `revenus/${id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('bons-paiement')
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
  if (uploadError) return res.status(500).json({ error: uploadError.message });

  const { data: { publicUrl } } = supabase.storage
    .from('bons-paiement')
    .getPublicUrl(path);

  const { data, error } = await supabase
    .from('autres_revenus_bons')
    .insert({ autre_revenu_id: id, url: publicUrl })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
};

const deleteBonRevenu = async (req, res) => {
  const { bonId } = req.params;

  const { data: bon, error: fetchErr } = await supabase
    .from('autres_revenus_bons')
    .select('url')
    .eq('id', bonId)
    .single();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  // Extract the storage path from the public URL to remove the file too.
  const marker = '/bons-paiement/';
  const idx = bon.url.indexOf(marker);
  if (idx !== -1) {
    const storagePath = bon.url.slice(idx + marker.length);
    await supabase.storage.from('bons-paiement').remove([storagePath]);
  }

  const { error } = await supabase.from('autres_revenus_bons').delete().eq('id', bonId);
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
  uploadBonRevenu, deleteBonRevenu, upload,
  getCategories, addCategorie, renameCategorie, removeCategorie,
};