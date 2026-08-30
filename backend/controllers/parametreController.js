const supabase = require('../supabaseClient');
const { logHistorique } = require('../utils/historique');

const PARAM_FIELD_LABELS = {
  label: 'libellé',
  valeur: 'valeur',
  ordre: 'ordre',
};
const PARAM_TRACKED_FIELDS = ['label', 'valeur', 'ordre'];

const buildParamDiffDescription = (before, patch) => {
  return Object.keys(patch)
    .filter((key) => PARAM_TRACKED_FIELDS.includes(key))
    .filter((key) => String(before[key] ?? '') !== String(patch[key] ?? ''))
    .map((key) => {
      const label = PARAM_FIELD_LABELS[key] || key;
      return `${label} : "${before[key] ?? '—'}" → "${patch[key] ?? '—'}"`;
    });
};

const listValeurs = async (req, res) => {
  try {
    const { categorie } = req.query;
    let query = supabase.from('parametre_valeurs').select('*').order('ordre');
    if (categorie) query = query.eq('categorie', categorie);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('listValeurs:', err);
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
};

const creerValeur = async (req, res) => {
  try {
    const { categorie, valeur, label } = req.body;

    const { data: existing, error: checkErr } = await supabase
      .from('parametre_valeurs')
      .select('id')
      .eq('categorie', categorie)
      .ilike('label', label)
      .maybeSingle();
    if (checkErr) return res.status(500).json({ error: checkErr.message });
    if (existing) return res.status(409).json({ message: 'Cette valeur existe déjà.' });

    const { data, error } = await supabase
      .from('parametre_valeurs')
      .insert({ categorie, valeur, label })
      .select().single();
    if (error) return res.status(500).json({ error: error.message });

    await logHistorique({
      req,
      perimetre: 'admin',
            action: 'creation',
      entite: 'parametre_valeur',
      entite_id: data.id,
      description: `a ajouté la valeur "${label}" dans le paramètre "${categorie}"`,
    });

    res.json(data);
  } catch (err) {
    console.error('creerValeur:', err);
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
};

const modifierValeur = async (req, res) => {
  try {
    const { data: before, error: beforeErr } = await supabase
      .from('parametre_valeurs')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (beforeErr) return res.status(500).json({ error: beforeErr.message });

    if (req.body.label !== undefined) {
      const { data: existing, error: checkErr } = await supabase
        .from('parametre_valeurs')
        .select('id')
        .eq('categorie', before.categorie)
        .ilike('label', req.body.label)
        .neq('id', req.params.id)
        .maybeSingle();
      if (checkErr) return res.status(500).json({ error: checkErr.message });
      if (existing) return res.status(409).json({ message: 'Cette valeur existe déjà.' });
    }

    const { data, error } = await supabase
      .from('parametre_valeurs')
      .update(req.body)
      .eq('id', req.params.id)
      .select().single();
    if (error) return res.status(500).json({ error: error.message });

    const changes = buildParamDiffDescription(before, req.body);
    if (changes.length > 0) {
      await logHistorique({
        req,
        perimetre: 'admin',
                action: 'modification',
        entite: 'parametre_valeur',
        entite_id: data.id,
        description: `a modifié la valeur "${before.label}" du paramètre "${before.categorie}" (${changes.join(', ')})`,
      });
    }

    res.json(data);
  } catch (err) {
    console.error('modifierValeur:', err);
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
};

const desactiverValeur = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('parametre_valeurs')
      .update({ actif: false })
      .eq('id', req.params.id)
      .select().single();
    if (error) return res.status(500).json({ error: error.message });

    await logHistorique({
      req,
      perimetre: 'admin',
            action: 'modification',
      entite: 'parametre_valeur',
      entite_id: data.id,
      description: `a désactivé la valeur "${data.label}" du paramètre "${data.categorie}"`,
    });

    res.json(data);
  } catch (err) {
    console.error('desactiverValeur:', err);
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
};

const reactiverValeur = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('parametre_valeurs')
      .update({ actif: true })
      .eq('id', req.params.id)
      .select().single();
    if (error) return res.status(500).json({ error: error.message });

    await logHistorique({
      req,
      perimetre: 'admin',
         action: 'modification',
      entite: 'parametre_valeur',
      entite_id: data.id,
      description: `a réactivé la valeur "${data.label}" du paramètre "${data.categorie}"`,
    });

    res.json(data);
  } catch (err) {
    console.error('reactiverValeur:', err);
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
};

module.exports = { listValeurs, creerValeur, modifierValeur, desactiverValeur, reactiverValeur };