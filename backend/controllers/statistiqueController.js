// statistiqueController.js
const supabase = require('../supabaseClient');

const moisAbrege = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const calculerAge = (dateNaissance) => {
  if (!dateNaissance) return null;
  const naissance = new Date(dateNaissance);
  const aujourdHui = new Date();
  let age = aujourdHui.getFullYear() - naissance.getFullYear();
  const m = aujourdHui.getMonth() - naissance.getMonth();
  if (m < 0 || (m === 0 && aujourdHui.getDate() < naissance.getDate())) age -= 1;
  return age;
};


//           2) une ligne aplatie par inscription confirmée (annee, mois, formation, wilaya, age, apporteur, source)
const getStatistiques = async (req, res) => {
const { data: formations, error: formationsErr } = await supabase
  .from('formations')
  .select('nom');

  if (formationsErr) return res.status(500).json({ error: formationsErr.message });

// Canonical rapporteur labels — same source Préinscription uses to fill its dropdown.
const { data: rapporteursRef, error: rapErr } = await supabase
  .from('parametre_valeurs')
  .select('label')
  .eq('categorie', 'registered_by')
  .eq('actif', true);
if (rapErr) return res.status(500).json({ error: rapErr.message });

const rapporteursCanoniques = (rapporteursRef ?? []).map((r) => r.label);
// lowercase, trimmed → canonical label, so stray casing/whitespace in old
// inscriptions still matches the real rapporteur instead of splitting off.
const rapporteurLookup = new Map(
  rapporteursCanoniques.map((label) => [label.trim().toLowerCase(), label])
);
const { data: inscriptionsBrutes, error: insErr } = await supabase
  .from('inscriptions')
  .select(`
    date_inscription,
    source,
    registered_by,
    formation:formation_id(nom),
    etudiant:etudiant_id(wilaya, date_naissance)
  `)
  .eq('statut', 'confirmed')
  .or('statut_scolarite.is.null,statut_scolarite.neq.abandonne');
  // 👈 no .eq('archived', ...) — we want both active AND archived inscriptions,
  // so every year that ever had activity shows up in the stats.

if (insErr) return res.status(500).json({ error: insErr.message });

const inscriptions = inscriptionsBrutes
  .filter((i) => i.date_inscription)
  .map((i) => {
      const date = new Date(i.date_inscription);
      const rawApporteur = i.registered_by ? i.registered_by.trim() : '';
      // Match against the canonical list case/whitespace-insensitively so a
      // stale or mistyped value still counts toward the real rapporteur.
      const apporteur = rawApporteur
        ? (rapporteurLookup.get(rawApporteur.toLowerCase()) || rawApporteur)
        : null;
      return {
        annee: date.getFullYear(),
        mois: moisAbrege[date.getMonth()],
        formation: i.formation?.nom || null,
        wilaya: i.etudiant?.wilaya || null,
        age: calculerAge(i.etudiant?.date_naissance),
        apporteur,
        source: i.source || null,
      };
    });

  res.json({
    formations: formations.map((f) => f.nom),
    inscriptions,
    rapporteurs: rapporteursCanoniques,
  });
};

module.exports = { getStatistiques };