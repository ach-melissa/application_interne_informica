const supabase = require('../supabaseClient');

const getInscriptions = async (req, res) => {
  const { statut, formation_id, ids } = req.query;

  let query = supabase
    .from('inscriptions')
    .select(`*, etudiant:etudiant_id(*), formation:formation_id(nom)`)
    .order('created_at', { ascending: false });

  if (statut) query = query.eq('statut', statut);
  if (formation_id) query = query.eq('formation_id', formation_id);

  // Permet de récupérer une sélection précise d'inscriptions
  // (utilisé par la page d'impression des attestations) :
  // GET /api/inscriptions?ids=uuid1,uuid2,uuid3
  let idList = [];
  if (ids) {
    idList = ids.split(',').map((id) => id.trim()).filter(Boolean);
    if (idList.length > 0) {
      query = query.in('id', idList);
    }
  }

const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
};

// Marque les attestations comme imprimées — appelé uniquement
// quand l'admin confirme réellement l'impression
const markAttestationsPrinted = async (req, res) => {
  const { ids } = req.body; // tableau d'UUIDs

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids requis' });
  }

  const { error } = await supabase
    .from('inscriptions')
    .update({ attestation_imprimee: true })
    .in('id', ids);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

const assignToGroup = async (req, res) => {
  const { id } = req.params; // inscription_id
  const { group_id } = req.body;

  const { data, error } = await supabase
    .from('inscriptions')
    .update({ group_id })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
module.exports = { getInscriptions, assignToGroup, markAttestationsPrinted };