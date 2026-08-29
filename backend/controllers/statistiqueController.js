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

const { data: inscriptionsBrutes, error: insErr } = await supabase
  .from('inscriptions')
  .select(`
    date_inscription,
    source,
    registered_by,
    formation:formation_id(nom),
    etudiant:etudiant_id(wilaya, date_naissance)
  `)
  .eq('statut', 'confirmed');
  // 👈 no .eq('archived', ...) — we want both active AND archived inscriptions,
  // so every year that ever had activity shows up in the stats.

if (insErr) return res.status(500).json({ error: insErr.message });

const inscriptions = inscriptionsBrutes
  .filter((i) => i.date_inscription)
  .map((i) => {
      const date = new Date(i.date_inscription);
      return {
        annee: date.getFullYear(),
        mois: moisAbrege[date.getMonth()],
        formation: i.formation?.nom || null,
        wilaya: i.etudiant?.wilaya || null,
        age: calculerAge(i.etudiant?.date_naissance),
        apporteur: i.registered_by || null,
        source: i.source || null,
      };
    });

  res.json({
    formations: formations.map((f) => f.nom),
    inscriptions,
  });
};

module.exports = { getStatistiques };