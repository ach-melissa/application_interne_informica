const supabase = require('../supabaseClient');
const listValeurs = async (req, res) => {
  const { categorie } = req.query;
  let query = supabase.from('parametre_valeurs').select('*').order('ordre');
  if (categorie) query = query.eq('categorie', categorie);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const creerValeur = async (req, res) => {
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
  res.json(data);
};

const modifierValeur = async (req, res) => {
  if (req.body.label !== undefined) {
    const { data: current, error: curErr } = await supabase
      .from('parametre_valeurs')
      .select('categorie')
      .eq('id', req.params.id)
      .single();
    if (curErr) return res.status(500).json({ error: curErr.message });

    const { data: existing, error: checkErr } = await supabase
      .from('parametre_valeurs')
      .select('id')
      .eq('categorie', current.categorie)
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
  res.json(data);
};

const desactiverValeur = async (req, res) => {
  const { data, error } = await supabase
    .from('parametre_valeurs')
    .update({ actif: false })
    .eq('id', req.params.id)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const reactiverValeur = async (req, res) => {
  const { data, error } = await supabase
    .from('parametre_valeurs')
    .update({ actif: true })
    .eq('id', req.params.id)
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

module.exports = { listValeurs, creerValeur, modifierValeur, desactiverValeur, reactiverValeur };