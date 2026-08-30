const supabase = require('../supabaseClient');

const FIELD_LABELS = {
  nom: 'nom',
  prenom: 'prénom',
  email: 'email',
  nom_utilisateur: "nom d'utilisateur",
  telephone: 'téléphone',
  date_naissance: 'date de naissance',
  role: 'rôle',
  photo_path: 'photo',
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

module.exports = { logHistorique, buildDiffDescription };