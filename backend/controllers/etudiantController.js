// etduinats controllr 
const supabase = require('../supabaseClient');

const getEtudiants = async (req, res) => {
  const { data, error } = await supabase
    .from('inscriptions')
    .select(`
      *,
      etudiant:etudiant_id(*),
      formation:formation_id(nom)
    `)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const updateInscription = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const { data, error } = await supabase
    .from('inscriptions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
const createEtudiant = async (req, res) => {
  const {
    nom, prenom, telephone, email, adresse,
    niveau_scolaire, date_naissance,
    formation_id, source, registered_by
  } = req.body;

  // 1. create etudiant
  const { data: etudiant, error: etudiantErr } = await supabase
    .from('etudiants')
    .insert({ nom, prenom, telephone, email, adresse, niveau_scolaire, date_naissance })
    .select()
    .single();

  if (etudiantErr) return res.status(500).json({ error: etudiantErr.message });

  // 2. create inscription
  const { data: inscription, error: insErr } = await supabase
    .from('inscriptions')
    .insert({
      etudiant_id: etudiant.id,
      formation_id,
      source,
      registered_by,
      date_inscription: new Date().toISOString().split('T')[0],
      statut: 'pending',
    })
    .select()
    .single();

  if (insErr) return res.status(500).json({ error: insErr.message });

  res.json({ etudiant, inscription });
};

const updateEtudiant = async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, telephone, email, adresse, niveau_scolaire, date_naissance } = req.body;

  const { data, error } = await supabase
    .from('etudiants')
    .update({ nom, prenom, telephone, email, adresse, niveau_scolaire, date_naissance })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
const deleteEtudiant = async (req, res) => {
  const { id } = req.params;

  // deleting the inscription (id = inscription id)
  const { error } = await supabase
    .from('inscriptions')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

module.exports = { getEtudiants, updateInscription, createEtudiant, updateEtudiant, deleteEtudiant };