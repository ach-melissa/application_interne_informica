const supabase = require('../supabaseClient');

// ============================================================
// MOUVEMENTS — list (filtré par employe_id + mois/année)
// ============================================================
const getMouvements = async (req, res) => {
  try {
    const { employe_id, mois, annee } = req.query;
    if (!employe_id || !mois || !annee) {
      return res.status(400).json({ message: 'employe_id, mois et annee sont requis' });
    }

    const debut = `${annee}-${String(mois).padStart(2, '0')}-01`;
    const finDate = new Date(Number(annee), Number(mois), 0); // dernier jour du mois
    const fin = finDate.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('mouvements_salaire')
      .select('*')
      .eq('employe_id', employe_id)
      .gte('date', debut)
      .lte('date', fin)
      .order('date');

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// MOUVEMENTS — create
// ============================================================
const createMouvement = async (req, res) => {
  try {
    const { employe_id, poste_id, date, type, description, montant } = req.body;
    if (!employe_id || !type || !description || montant === undefined) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }

    const { data, error } = await supabase
      .from('mouvements_salaire')
      .insert({
        employe_id,
        poste_id: poste_id || null,
        date: date || new Date().toISOString().slice(0, 10),
        type,
        description,
        montant,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// MOUVEMENTS — update
// ============================================================
const updateMouvement = async (req, res) => {
  try {
    const { poste_id, type, description, montant } = req.body;

    const { data, error } = await supabase
      .from('mouvements_salaire')
      .update({ poste_id: poste_id || null, type, description, montant })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// MOUVEMENTS — delete
// ============================================================
const deleteMouvement = async (req, res) => {
  try {
    const { error } = await supabase.from('mouvements_salaire').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ message: error.message });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { getMouvements, createMouvement, updateMouvement, deleteMouvement };