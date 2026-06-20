const supabase = require('../supabaseClient');

// ============================================================
// STATS — dashboard overview
// ============================================================
const getStats = async (req, res) => {
  try {
    const now   = new Date();
    const mois  = now.getMonth() + 1;
    const annee = now.getFullYear();

    const [{ data: payments }, { data: salaires }] = await Promise.all([
      supabase.from('payments').select('montant, statut'),
      supabase.from('salaires').select('montant').eq('mois', mois).eq('annee', annee),
    ]);

    const totalPaiements     = payments?.filter((p) => p.statut === 'payé').reduce((s, p) => s + parseFloat(p.montant), 0) ?? 0;
    const paiementsPayes     = payments?.filter((p) => p.statut === 'payé').length ?? 0;
    const paiementsEnAttente = payments?.filter((p) => p.statut === 'en_attente').length ?? 0;
    const totalSalaires      = salaires?.reduce((s, p) => s + parseFloat(p.montant), 0) ?? 0;

    res.json({ totalPaiements, paiementsPayes, paiementsEnAttente, totalSalaires });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PAIEMENTS — list
// ============================================================
const getPaiements = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*, etudiants(nom, prenom), formations(nom)')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// PAIEMENTS — create
// ============================================================
const createPaiement = async (req, res) => {
  try {
    const { etudiant_id, formation_id, montant, date_paiement, tranche, statut } = req.body;
    if (!etudiant_id || !formation_id || !montant) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }

    const { data, error } = await supabase
      .from('payments')
      .insert({ etudiant_id, formation_id, montant, date_paiement, tranche, statut })
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
// PAIEMENTS — update statut
// ============================================================
const updatePaiement = async (req, res) => {
  try {
    const { statut } = req.body;
    const { data, error } = await supabase
      .from('payments')
      .update({ statut })
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
// SALAIRES — list (filtered by mois + annee)
// ============================================================
const getSalaires = async (req, res) => {
  try {
    const { mois, annee } = req.query;
    let query = supabase
      .from('salaires')
      .select('*, users(nom, prenom, role)')
      .order('created_at', { ascending: false });

    if (mois)  query = query.eq('mois',  parseInt(mois));
    if (annee) query = query.eq('annee', parseInt(annee));

    const { data, error } = await query;
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// SALAIRES — create
// ============================================================
const createSalaire = async (req, res) => {
  try {
    const { user_id, montant, mois, annee, statut, note } = req.body;
    if (!user_id || !montant || !mois || !annee) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }

    const { data, error } = await supabase
      .from('salaires')
      .insert({ user_id, montant, mois, annee, statut, note })
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
// SALAIRES — update statut
// ============================================================
const updateSalaire = async (req, res) => {
  try {
    const { statut } = req.body;
    const { data, error } = await supabase
      .from('salaires')
      .update({ statut })
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
// HELPERS — etudiants + formations + staff lists for modals
// ============================================================
const getEtudiants = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('etudiants')
      .select('id, nom, prenom')
      .order('nom');
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const getFormations = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('formations')
      .select('id, nom')
      .eq('archived', false)
      .order('nom');
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const getStaff = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, nom, prenom, role')
      .eq('archived', false)
      .order('nom');
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = {
  getStats,
  getPaiements, createPaiement, updatePaiement,
  getSalaires,  createSalaire,  updateSalaire,
  getEtudiants, getFormations,  getStaff,
};