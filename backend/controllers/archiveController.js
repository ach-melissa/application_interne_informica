// archiveController.js

const supabase = require('../supabaseClient');

// Distinct years with archived content, plus counts
const getArchivedYears = async (req, res) => {
  const [{ data: groups, error: gErr }, { data: inscriptions, error: iErr }] =
    await Promise.all([
      supabase.from('groups').select('annee_scolaire').eq('archived', true),
      supabase.from('inscriptions').select('annee_scolaire').eq('archived', true),
    ]);

  if (gErr) return res.status(500).json({ error: gErr.message });
  if (iErr) return res.status(500).json({ error: iErr.message });

  const years = new Set([
    ...groups.map((g) => g.annee_scolaire).filter(Boolean),
    ...inscriptions.map((i) => i.annee_scolaire).filter(Boolean),
  ]);

  const result = [...years].sort().reverse().map((year) => ({
    year,
    nb_groupes_archives: groups.filter((g) => g.annee_scolaire === year).length,
    nb_inscriptions_archivees: inscriptions.filter((i) => i.annee_scolaire === year).length,
  }));

  res.json(result);
};

// Formations that have archived content in a given year, with counts
const getArchivedFormationsForYear = async (req, res) => {
  const { year } = req.params;

  const [{ data: groups, error: gErr }, { data: inscriptions, error: iErr }] =
    await Promise.all([
      supabase.from('groups').select('id, formation_id').eq('archived', true).eq('annee_scolaire', year),
      supabase.from('inscriptions').select('id, formation_id').eq('archived', true).eq('annee_scolaire', year),
    ]);

  if (gErr) return res.status(500).json({ error: gErr.message });
  if (iErr) return res.status(500).json({ error: iErr.message });

  const formationIds = new Set([
    ...groups.map((g) => g.formation_id),
    ...inscriptions.map((i) => i.formation_id),
  ]);

  if (formationIds.size === 0) return res.json([]);

  const { data: formations, error: fErr } = await supabase
    .from('formations')
    .select('*')
    .in('id', [...formationIds]);

  if (fErr) return res.status(500).json({ error: fErr.message });

  const result = formations.map((f) => ({
    ...f,
    nb_groupes_archives: groups.filter((g) => g.formation_id === f.id).length,
    nb_inscriptions_archivees: inscriptions.filter((i) => i.formation_id === f.id).length,
  }));

  res.json(result);
};

// All archived inscriptions (students) for a given year — global table
const getArchivedEtudiantsForYear = async (req, res) => {
  const { year } = req.params;

  const { data, error } = await supabase
    .from('inscriptions')
    .select(`
      *,
      etudiant:etudiant_id(*),
      formation:formation_id(nom),
      groups(nom, jours_formation, heure_formation)
    `)
    .eq('archived', true)
    .eq('annee_scolaire', year)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

module.exports = { getArchivedYears, getArchivedFormationsForYear, getArchivedEtudiantsForYear };