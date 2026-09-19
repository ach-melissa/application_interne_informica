// controllers/comptableChargesController.js
// Charges "formation" et "autre" (table `charges`, enums charge_type / charge_categorie)

// ⚠️ LIGNE À REMPLACER : copiez ici l'import du client Supabase qui se trouve
// tout en haut de comptableAutresRevenusController.js (même variable, même chemin).
const supabase = require('../supabaseClient');

// Doit rester identique à la contrainte `charges_categorie_matches_type` en base.
const CATEGORIES = {
  formation: ['Matières premières', 'Outils', 'Certificats', 'Impressions'],
  autre: ['Loyer', 'Électricité', 'Eau', 'Internet', 'Maintenance', 'Publicité Facebook'],
};
const TYPES = Object.keys(CATEGORIES);

// Colonnes renvoyées au frontend (même forme que les anciennes données de test)
const COLUMNS = 'id, date, description, montant, categorie, formation, groupe';
const validate = ({ type, categorie, montant, date, formation }) => {
  if (!TYPES.includes(type)) return 'Type invalide.';
  if (!CATEGORIES[type].includes(categorie)) return 'Catégorie invalide pour ce type.';
  if (type === 'formation' && (typeof formation !== 'string' || !formation.trim())) return 'Formation obligatoire.';
  if (montant === '' || montant == null || !Number.isFinite(Number(montant)) || Number(montant) < 0) {
    return 'Montant invalide.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return 'Date invalide.';
  return null;
};
const extraFields = ({ type, formation, groupe }) =>
  type === 'formation'
    ? { formation: formation.trim(), groupe: groupe?.trim() || null }
    : { formation: null, groupe: null };
// Évite une requête qui reste bloquée si une exception inattendue survient
const safe = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// GET /charges?type=formation|autre
const getCharges = safe(async (req, res) => {
  const { type } = req.query;
  if (!TYPES.includes(type)) return res.status(400).json({ error: 'Type invalide.' });

  const { data, error } = await supabase
    .from('charges')
    .select(COLUMNS)
    .eq('type', type)
    .order('date', { ascending: true })
    .order('id', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /charges/categories?type=formation|autre  → [{ name }]
const getChargeCategories = safe(async (req, res) => {
  const { type } = req.query;
  if (!TYPES.includes(type)) return res.status(400).json({ error: 'Type invalide.' });
 res.json(CATEGORIES[type].map((name) => ({ name, active: true })));
});

// POST /charges
const createCharge = safe(async (req, res) => {
  const { type, categorie, montant, date, description } = req.body;
  const invalid = validate(req.body);
  if (invalid) return res.status(400).json({ error: invalid });

  const { data, error } = await supabase
    .from('charges')
    .insert({ type, categorie, montant: Number(montant), date, description: description ?? '', ...extraFields(req.body) })
    .select(COLUMNS)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});
// PATCH /charges/:id
const updateCharge = safe(async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Identifiant invalide.' });

  const { type, categorie, montant, date, description } = req.body;
  const invalid = validate(req.body);
  if (invalid) return res.status(400).json({ error: invalid });

  // .eq('type', type) : une page "formation" ne peut pas modifier une charge "autre"
  const { data, error } = await supabase
    .from('charges')
    .update({ categorie, montant: Number(montant), date, description: description ?? '', ...extraFields(req.body) })
    .eq('id', id)
    .eq('type', type)
    .select(COLUMNS)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Charge introuvable.' });
  res.json(data);
});

// DELETE /charges/:id
const deleteCharge = safe(async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Identifiant invalide.' });

  const { data, error } = await supabase
    .from('charges')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) return res.status(404).json({ error: 'Charge introuvable.' });
  res.status(204).send();
});
// GET /charges/formations → [{ id, nom, groupes: [{ id, nom }] }]
const getChargeFormations = safe(async (req, res) => {
  const { data, error } = await supabase
    .from('formations')
    .select('id, nom, groupes(id, nom)')
    .order('nom', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});module.exports = { getCharges, getChargeCategories, getChargeFormations, createCharge, updateCharge, deleteCharge };