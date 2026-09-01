const supabase = require('../supabaseClient');

const FIELD_LABELS = {
  // utilisateurs
  nom: 'nom',
  prenom: 'prénom',
  email: 'email',
  nom_utilisateur: "nom d'utilisateur",
  telephone: 'téléphone',
  date_naissance: 'date de naissance',
  role: 'rôle',
  photo_path: 'photo',
  // étudiants / inscriptions
  adresse: 'adresse',
  niveau_scolaire: 'niveau scolaire',
  lieu_naissance: 'lieu de naissance',
  wilaya: 'wilaya',
  source: 'source',
  registered_by: 'rapporteur',
  statut: 'statut',
  first_try: '1er appel',
  second_try: '2ème appel',
  third_try: '3ème appel',
  formation_id: 'formation',
  niveau_id: 'niveau',
  group_id: 'groupe',
  statut_scolarite: 'statut scolarité',
  en_promotion: 'promotion',
  prix_promotion: 'prix promo',
  // groupes
  date_fin: 'date de fin',
  teacher_id: 'professeur',
};

const buildDiffDescription = (before, patch) => {
  const changes = Object.keys(patch)
    .filter((key) => key !== 'mot_de_passe')
    .filter((key) => String(before[key] ?? '') !== String(patch[key] ?? ''))
    .map((key) => {
      const label = FIELD_LABELS[key] || key;
      return `${label} : "${before[key] ?? '—'}" → "${patch[key] ?? '—'}"`;
    });

  if (patch.mot_de_passe) changes.push('mot de passe modifié');

  return changes;
};

const logHistorique = async ({ req, perimetre, action, entite, entite_id, description, details }) => {
  try {
    const { data: actor } = await supabase
      .from('users')
      .select('nom, prenom')
      .eq('id', req.user.id)
      .single();

    const { error: insertErr } = await supabase.from('historique').insert({
      utilisateur_id: req.user.id,
      utilisateur_nom: actor ? `${actor.prenom} ${actor.nom}` : 'Utilisateur inconnu',
      role: req.user.role,
      perimetre,
      action,
      entite,
      entite_id,
      description,
      details: details || null,
    });

    if (insertErr) console.error('logHistorique INSERT FAILED:', insertErr);
  } catch (err) {
    console.error('logHistorique:', err);
  }
};

module.exports = { logHistorique, buildDiffDescription, FIELD_LABELS };