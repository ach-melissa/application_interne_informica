const supabase = require('../supabaseClient');
const multer = require('multer');
const { logHistorique, buildDiffDescription } = require('../utils/historique');
const upload = multer({ storage: multer.memoryStorage() });

const TYPES = ['formation', 'autre'];
const TYPE_LABEL = { formation: 'de formation', autre: 'autre' };

const COLUMNS = 'id, date, description, montant, categorie, type, formation_id, group_id, formation:formation_id(nom), groupe:group_id(nom), bons:charges_bons(id, url)';

const validate = async ({ type, categorie, montant, date, formation_id }) => {
  if (!TYPES.includes(type)) return 'Type invalide.';
  if (!categorie) return 'Catégorie invalide pour ce type.';
  if (type === 'formation' && !formation_id) return 'Formation obligatoire.';
  if (montant === '' || montant == null || !Number.isFinite(Number(montant)) || Number(montant) < 0) {
    return 'Montant invalide.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return 'Date invalide.';

  const { data: cat } = await supabase
    .from('charge_categories')
    .select('id')
    .eq('type', type)
    .eq('name', categorie)
    .maybeSingle();
  if (!cat) return 'Catégorie invalide pour ce type.';

  return null;
};

const extraFields = ({ type, formation_id, group_id }) =>
  type === 'formation'
    ? { formation_id, group_id: group_id || null }
    : { formation_id: null, group_id: null };

const safe = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// ============================================================
// CHARGES
// ============================================================

const getCharges = safe(async (req, res) => {
  const { type } = req.query;
  if (!TYPES.includes(type)) return res.status(400).json({ error: 'Type invalide.' });

  const { data, error } = await supabase
    .from('charges')
    .select(COLUMNS)
    .eq('type', type)
    .order('date', { ascending: false })
    .order('id', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

const createCharge = safe(async (req, res) => {
  const { type, categorie, montant, date, description } = req.body;
  const invalid = await validate(req.body);
  if (invalid) return res.status(400).json({ error: invalid });

  const { data, error } = await supabase
    .from('charges')
    .insert({ type, categorie, montant: Number(montant), date, description: description ?? '', ...extraFields(req.body) })
    .select(COLUMNS)
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await logHistorique({
    req, perimetre: 'comptable', action: 'creation', entite: `charge_${type}`, entite_id: data.id,
    description: `a ajouté une charge ${TYPE_LABEL[type]} "${data.description || data.categorie}" de ${Number(data.montant).toLocaleString('fr-FR')} DA`,
  });

  res.status(201).json(data);
});

const updateCharge = safe(async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Identifiant invalide.' });

  const { type, categorie, montant, date, description } = req.body;
  const invalid = await validate(req.body);
  if (invalid) return res.status(400).json({ error: invalid });

  const { data: before } = await supabase
    .from('charges')
    .select('categorie, montant, date, description, formation_id, group_id')
    .eq('id', id)
    .single();

  const patch = { categorie, montant: Number(montant), date, description: description ?? '', ...extraFields(req.body) };

  const { data, error } = await supabase
    .from('charges')
    .update(patch)
    .eq('id', id)
    .eq('type', type)
    .select(COLUMNS)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Charge introuvable.' });

  if (before) {
    // Resolve formation_id / group_id to readable names before diffing,
    // so the log shows "formation : X → Y" instead of raw UUIDs.
    const beforeReadable = { ...before };
    const patchReadable = { ...patch };

    const formationIds = [before.formation_id, patch.formation_id].filter(Boolean);
    const groupIds = [before.group_id, patch.group_id].filter(Boolean);

    if (formationIds.length) {
      const { data: formationsData } = await supabase
        .from('formations')
        .select('id, nom')
        .in('id', [...new Set(formationIds)]);
      const formationNameById = Object.fromEntries((formationsData ?? []).map((f) => [f.id, f.nom]));
      if (before.formation_id) beforeReadable.formation_id = formationNameById[before.formation_id] ?? before.formation_id;
      if (patch.formation_id) patchReadable.formation_id = formationNameById[patch.formation_id] ?? patch.formation_id;
    }

    if (groupIds.length) {
      const { data: groupsData } = await supabase
        .from('groups')
        .select('id, nom')
        .in('id', [...new Set(groupIds)]);
      const groupNameById = Object.fromEntries((groupsData ?? []).map((g) => [g.id, g.nom]));
      if (before.group_id) beforeReadable.group_id = groupNameById[before.group_id] ?? before.group_id;
      if (patch.group_id) patchReadable.group_id = groupNameById[patch.group_id] ?? patch.group_id;
    }

    const changes = buildDiffDescription(beforeReadable, patchReadable);
    if (changes.length > 0) {
      await logHistorique({
        req, perimetre: 'comptable', action: 'modification', entite: `charge_${type}`, entite_id: id,
        description: `a modifié la charge ${TYPE_LABEL[type]} "${before.description || before.categorie}" : ${changes.join(', ')}`,
      });
    }
  }

  res.json(data);
});

const deleteCharge = safe(async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Identifiant invalide.' });

  const { data: before } = await supabase
    .from('charges')
    .select('type, categorie, montant, description')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('charges')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) return res.status(404).json({ error: 'Charge introuvable.' });

  await logHistorique({
    req, perimetre: 'comptable', action: 'suppression', entite: `charge_${before?.type ?? ''}`, entite_id: id,
    description: `a supprimé la charge ${TYPE_LABEL[before?.type] ?? ''} "${before?.description || before?.categorie || '—'}" de ${before ? Number(before.montant).toLocaleString('fr-FR') : '—'} DA`,
  });

  res.status(204).send();
});

// ============================================================
// BONS — multiple photos per charge
// ============================================================

const uploadBonCharge = safe(async (req, res) => {
  const { id } = req.params; // charge id
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Aucun fichier reçu' });

  const ext = file.mimetype.split('/')[1] || 'jpg';
  const path = `charges/${id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('bons-paiement')
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
  if (uploadError) return res.status(500).json({ error: uploadError.message });

  const { data: { publicUrl } } = supabase.storage
    .from('bons-paiement')
    .getPublicUrl(path);

  const { data, error } = await supabase
    .from('charges_bons')
    .insert({ charge_id: id, url: publicUrl })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  const { data: charge } = await supabase
    .from('charges')
    .select('type, categorie, description')
    .eq('id', id)
    .single();

  await logHistorique({
    req, perimetre: 'comptable', action: 'creation', entite: 'bon_charge', entite_id: data.id,
    description: `a ajouté un bon pour la charge ${TYPE_LABEL[charge?.type] ?? ''} "${charge?.description || charge?.categorie || '—'}"`,
  });

  res.json(data);
});

const deleteBonCharge = safe(async (req, res) => {
  const { bonId } = req.params;

  const { data: bon, error: fetchErr } = await supabase
    .from('charges_bons')
    .select('url, charge_id')
    .eq('id', bonId)
    .single();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });

  const marker = '/bons-paiement/';
  const idx = bon.url.indexOf(marker);
  if (idx !== -1) {
    const storagePath = bon.url.slice(idx + marker.length);
    await supabase.storage.from('bons-paiement').remove([storagePath]);
  }

  const { error } = await supabase.from('charges_bons').delete().eq('id', bonId);
  if (error) return res.status(500).json({ error: error.message });

  const { data: charge } = await supabase
    .from('charges')
    .select('type, categorie, description')
    .eq('id', bon.charge_id)
    .single();

  await logHistorique({
    req, perimetre: 'comptable', action: 'suppression', entite: 'bon_charge', entite_id: bonId,
    description: `a supprimé un bon de la charge ${TYPE_LABEL[charge?.type] ?? ''} "${charge?.description || charge?.categorie || '—'}"`,
  });

  res.json({ success: true });
});

// ============================================================
// CATEGORIES — real table now, not a hardcoded array
// ============================================================

const getChargeCategories = safe(async (req, res) => {
  const { type } = req.query;
  if (!TYPES.includes(type)) return res.status(400).json({ error: 'Type invalide.' });

  const { data, error } = await supabase
    .from('charge_categories')
    .select('id, name, active')
    .eq('type', type)
    .order('name', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

const addChargeCategory = safe(async (req, res) => {
  const { type, name } = req.body;
  if (!TYPES.includes(type)) return res.status(400).json({ error: 'Type invalide.' });
  if (!name) return res.status(400).json({ error: 'Nom requis.' });

  const { data, error } = await supabase
    .from('charge_categories')
    .insert({ type, name })
    .select('id, name, active')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  await logHistorique({
    req, perimetre: 'comptable', action: 'creation', entite: 'categorie_charge', entite_id: data.id,
    description: `a ajouté la catégorie "${name}" (charges ${TYPE_LABEL[type]})`,
  });

  res.json(data);
});

const updateChargeCategory = safe(async (req, res) => {
  const { id } = req.params;
  const { data: before } = await supabase
    .from('charge_categories')
    .select('type, name, active')
    .eq('id', id)
    .single();
  if (!before) return res.status(404).json({ error: 'Catégorie introuvable.' });

  const patch = {};
  if (req.body.name !== undefined) patch.name = req.body.name;
  if (req.body.active !== undefined) patch.active = req.body.active;

  const { data, error } = await supabase
    .from('charge_categories')
    .update(patch)
    .eq('id', id)
    .select('id, name, active')
    .single();
  if (error) return res.status(500).json({ error: error.message });

  // Keep existing charges' categorie text in sync with a rename.
  if (patch.name && patch.name !== before.name) {
    await supabase.from('charges').update({ categorie: patch.name }).eq('type', before.type).eq('categorie', before.name);
    await logHistorique({
      req, perimetre: 'comptable', action: 'modification', entite: 'categorie_charge', entite_id: id,
      description: `a renommé la catégorie "${before.name}" → "${patch.name}" (charges ${TYPE_LABEL[before.type]})`,
    });
  }
  if (patch.active !== undefined && patch.active !== before.active) {
    await logHistorique({
      req, perimetre: 'comptable', action: 'modification', entite: 'categorie_charge', entite_id: id,
      description: `a ${patch.active ? 'réactivé' : 'désactivé'} la catégorie "${before.name}" (charges ${TYPE_LABEL[before.type]})`,
    });
  }

  res.json(data);
});
const deleteChargeCategory = safe(async (req, res) => {
  const { id } = req.params;

  const { data: cat } = await supabase
    .from('charge_categories')
    .select('type, name')
    .eq('id', id)
    .single();
  if (!cat) return res.status(404).json({ error: 'Catégorie introuvable.' });

  const { count, error: countErr } = await supabase
    .from('charges')
    .select('id', { count: 'exact', head: true })
    .eq('type', cat.type)
    .eq('categorie', cat.name);
  if (countErr) return res.status(500).json({ error: countErr.message });

  if (count > 0) {
    return res.status(409).json({
      error: `Impossible de supprimer : ${count} charge(s) utilisent encore la catégorie "${cat.name}".`,
    });
  }

  const { error } = await supabase.from('charge_categories').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  await logHistorique({
    req, perimetre: 'comptable', action: 'suppression', entite: 'categorie_charge', entite_id: id,
    description: `a supprimé la catégorie "${cat.name}" (charges ${TYPE_LABEL[cat.type]})`,
  });

  res.json({ success: true });
});
// GET /charges/formations → [{ id, nom, groupes: [{ id, nom }] }]
const getChargeFormations = safe(async (req, res) => {
  const { data, error } = await supabase
    .from('formations')
    .select('id, nom, groupes:groups(id, nom)')
    .order('nom', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = {
  getCharges, createCharge, updateCharge, deleteCharge,
  uploadBonCharge, deleteBonCharge, upload,
  getChargeCategories, addChargeCategory, updateChargeCategory, deleteChargeCategory,
  getChargeFormations,
};