const supabase = require('../supabaseClient');
const multer = require('multer');
const { logHistorique, buildDiffDescription } = require('../utils/historique');
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

  await logHistorique({
    req, perimetre: 'comptable', action: 'creation', entite: 'autre_revenu', entite_id: data.id,
    description: `a ajouté un revenu "${data.libelle}" de ${Number(data.montant).toLocaleString('fr-FR')} DA${data.categorie ? ` (${data.categorie})` : ''}`,
  });

  res.json(data);
};

const updateAutreRevenu = async (req, res) => {
  const { id } = req.params;
  const fields = {};
  for (const k of ['libelle', 'montant', 'date', 'categorie']) {
    if (req.body[k] !== undefined) fields[k] = req.body[k];
  }

  const { data: before } = await supabase
    .from('autres_revenus')
    .select('libelle, montant, date, categorie')
    .eq('id', id)
    .single();

  let data, error;
  if (Object.keys(fields).length === 0) {
    // Nothing to update (e.g. a refresh-only call after a bon upload) — just re-fetch the row.
    ({ data, error } = await supabase
      .from('autres_revenus')
      .select('*, bons:autres_revenus_bons(id, url)')
      .eq('id', id)
      .single());
  } else {
    ({ data, error } = await supabase
      .from('autres_revenus')
      .update(fields)
      .eq('id', id)
      .select('*, bons:autres_revenus_bons(id, url)')
      .single());
  }

  if (error) return res.status(500).json({ error: error.message });

  // Only log a real modification, not the empty-body refresh call.
  if (Object.keys(fields).length > 0 && before) {
    const changes = buildDiffDescription(before, fields);
    if (changes.length > 0) {
      await logHistorique({
        req, perimetre: 'comptable', action: 'modification', entite: 'autre_revenu', entite_id: id,
        description: `a modifié le revenu "${before.libelle}" : ${changes.join(', ')}`,
      });
    }
  }

  res.json(data);
};

const deleteAutreRevenu = async (req, res) => {
  const { id } = req.params;

  const { data: before } = await supabase
    .from('autres_revenus')
    .select('libelle, montant')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('autres_revenus').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  await logHistorique({
    req, perimetre: 'comptable', action: 'suppression', entite: 'autre_revenu', entite_id: id,
    description: `a supprimé le revenu "${before?.libelle ?? '—'}" de ${before ? Number(before.montant).toLocaleString('fr-FR') : '—'} DA`,
  });

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

  const { data: revenu } = await supabase
    .from('autres_revenus')
    .select('libelle')
    .eq('id', id)
    .single();

  await logHistorique({
    req, perimetre: 'comptable', action: 'creation', entite: 'bon_autre_revenu', entite_id: data.id,
    description: `a ajouté un bon pour le revenu "${revenu?.libelle ?? '—'}"`,
  });

  res.json(data);
};

const deleteBonRevenu = async (req, res) => {
  const { bonId } = req.params;

  const { data: bon, error: fetchErr } = await supabase
    .from('autres_revenus_bons')
    .select('url, autre_revenu_id')
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

  const { data: revenu } = await supabase
    .from('autres_revenus')
    .select('libelle')
    .eq('id', bon.autre_revenu_id)
    .single();

  await logHistorique({
    req, perimetre: 'comptable', action: 'suppression', entite: 'bon_autre_revenu', entite_id: bonId,
    description: `a supprimé un bon du revenu "${revenu?.libelle ?? '—'}"`,
  });

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

  await logHistorique({
    req, perimetre: 'comptable', action: 'creation', entite: 'categorie_autre_revenu', entite_id: null,
    description: `a ajouté la catégorie "${nom}" (autres revenus)`,
  });

  res.json({ success: true });
};

const renameCategorie = async (req, res) => {
  const { ancien, nouveau } = req.body;
  if (!ancien || !nouveau) return res.status(400).json({ error: 'ancien et nouveau requis.' });
  const { error } = await supabase.rpc('rename_categorie_autre_revenu', { old_value: ancien, new_value: nouveau });
  if (error) return res.status(500).json({ error: error.message });

  await logHistorique({
    req, perimetre: 'comptable', action: 'modification', entite: 'categorie_autre_revenu', entite_id: null,
    description: `a renommé la catégorie "${ancien}" → "${nouveau}" (autres revenus)`,
  });

  res.json({ success: true });
};

const removeCategorie = async (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom requis.' });
  const { error } = await supabase.rpc('remove_categorie_autre_revenu', { old_value: nom });
  if (error) return res.status(500).json({ error: error.message });

  await logHistorique({
    req, perimetre: 'comptable', action: 'suppression', entite: 'categorie_autre_revenu', entite_id: null,
    description: `a supprimé la catégorie "${nom}" (autres revenus)`,
  });

  res.json({ success: true });
};

module.exports = {
  getAutresRevenus, createAutreRevenu, updateAutreRevenu, deleteAutreRevenu,
  uploadBonRevenu, deleteBonRevenu, upload,
  getCategories, addCategorie, renameCategorie, removeCategorie,
};