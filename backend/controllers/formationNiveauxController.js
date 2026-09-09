const supabase = require('../supabaseClient');
const { logHistorique } = require('../utils/historique');
const getFormationNiveaux = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('formation_niveaux')
    .select('*')
    .eq('formation_id', id)
    .order('ordre', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const withPeriods = await Promise.all(
    data.map(async (n) => {
      const { data: periods, error: pErr } = await supabase
        .from('formation_payment_periods')
        .select('jours_offset, montant')
        .eq('niveau_id', n.id)
        .order('numero', { ascending: true });
      if (pErr) return { ...n, periods: [] };
      return { ...n, periods: periods || [] };
    })
  );

  res.json(withPeriods);
};

const setFormationNiveaux = async (req, res) => {
  const { id } = req.params;
  const { niveaux } = req.body; // [{ nom, prix, duree_valeur, type_duree }, ...]

  if (!Array.isArray(niveaux)) {
    return res.status(400).json({ error: 'niveaux doit être un tableau.' });
  }

  const { data: beforeNiveaux } = await supabase
    .from('formation_niveaux')
    .select('id, nom, prix, duree_valeur, type_duree, capacite_groupe')
    .eq('formation_id', id);

    const { data: formation, error: fErr } = await supabase
  .from('formations')
  .select('prix, prix_uniforme, duree_uniforme, type_duree_uniforme, echeancier_uniforme, capacite_uniforme')
  .eq('id', id)
  .single();
  if (fErr) return res.status(500).json({ error: fErr.message });

  for (const n of niveaux) {
    if (!n.nom || !n.nom.trim()) {
      return res.status(400).json({ error: 'Chaque niveau doit avoir un nom.' });
    }
    if (!formation.prix_uniforme && (n.prix === '' || n.prix === undefined || n.prix === null || Number(n.prix) <= 0)) {
      return res.status(400).json({ error: `Prix requis pour le niveau "${n.nom}".` });
    }
    if (!formation.duree_uniforme && (n.duree_valeur === '' || n.duree_valeur === undefined || n.duree_valeur === null || Number(n.duree_valeur) <= 0)) {
      return res.status(400).json({ error: `Durée requise pour le niveau "${n.nom}".` });
    }
    if (!formation.duree_uniforme && !formation.type_duree_uniforme && !n.type_duree) {
      return res.status(400).json({ error: `Unité requise pour le niveau "${n.nom}".` });
    }
        if (n.type_duree && !['heures', 'seances'].includes(n.type_duree)) {
      return res.status(400).json({ error: `type_duree invalide pour le niveau "${n.nom}".` });
    }
    if (!formation.capacite_uniforme && (n.capacite_groupe === '' || n.capacite_groupe === undefined || n.capacite_groupe === null || Number(n.capacite_groupe) <= 0)) {
      return res.status(400).json({ error: `Capacité requise pour le niveau "${n.nom}".` });
    }
    if (!formation.echeancier_uniforme) {
  if (!Array.isArray(n.periods) || n.periods.length === 0) {
    return res.status(400).json({ error: `Ajoutez au moins une période de paiement pour le niveau "${n.nom}".` });
  }
  for (const p of n.periods) {
    if (p.jours_offset === undefined || p.jours_offset === null || isNaN(p.jours_offset)) {
      return res.status(400).json({ error: `Décalage en jours invalide pour une période du niveau "${n.nom}".` });
    }
    if (p.montant === undefined || p.montant === null || isNaN(p.montant) || Number(p.montant) <= 0) {
      return res.status(400).json({ error: `Montant invalide pour une période du niveau "${n.nom}".` });
    }
  }
    const sum = n.periods.reduce((s, p) => s + Number(p.montant), 0);
  const expected = formation.prix_uniforme
    ? Number( formation.prix ?? 0)
    : Number(n.prix);
  if (Math.abs(sum - expected) > 0.01) {
    return res.status(400).json({
      error: `Le total des tranches du niveau "${n.nom}" (${sum.toLocaleString('fr-FR')} DA) doit être égal à son prix (${expected.toLocaleString('fr-FR')} DA).`,
    });
  }
}
  }

  // Niveaux présents avant mais absents du nouveau payload = niveaux qui vont être supprimés
  const incomingNoms = new Set(niveaux.map((n) => n.nom.trim()));
  const niveauxASupprimer = (beforeNiveaux || []).filter((n) => !incomingNoms.has(n.nom));

  if (niveauxASupprimer.length > 0) {
    for (const n of niveauxASupprimer) {
      const { count, error: cErr } = await supabase
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('niveau_id', n.id);

      if (cErr) return res.status(500).json({ error: cErr.message });

      if (count > 0) {
        return res.status(409).json({
          error: `Impossible de supprimer le niveau "${n.nom}" : ${count} étudiant(s) y sont inscrits (confirmés, en attente ou archivés).`,
        });
      }
    }
  }

  const { error: delErr } = await supabase.from('formation_niveaux').delete().eq('formation_id', id);
  if (delErr) return res.status(500).json({ error: delErr.message });
  if (niveaux.length === 0) return res.json([]);

   const rows = niveaux.map((n, idx) => ({
    formation_id: id,
    nom: n.nom.trim(),
    ordre: idx + 1,
    prix: n.prix !== '' && n.prix !== undefined && n.prix !== null ? Number(n.prix) : null,
    duree_valeur: n.duree_valeur !== '' && n.duree_valeur !== undefined && n.duree_valeur !== null ? Number(n.duree_valeur) : null,
    type_duree: n.type_duree || null,
    capacite_groupe: n.capacite_groupe !== '' && n.capacite_groupe !== undefined && n.capacite_groupe !== null ? Number(n.capacite_groupe) : null,
  }));

  const { data, error } = await supabase.from('formation_niveaux').insert(rows).select();
  if (error) return res.status(500).json({ error: error.message });


if (!formation.echeancier_uniforme) {
  for (let i = 0; i < data.length; i++) {
    const niveauId = data[i].id;
    const periods = niveaux[i].periods || [];
    const periodRows = periods.map((p, idx) => ({
      niveau_id: niveauId,
      formation_id: id,
      numero: idx + 1,
      jours_offset: Number(p.jours_offset),
      montant: Number(p.montant),
    }));
    if (periodRows.length > 0) {
      const { error: ppErr } = await supabase.from('formation_payment_periods').insert(periodRows);
      if (ppErr) return res.status(500).json({ error: ppErr.message });
    }
  }
}

const { data: formationRow } = await supabase.from('formations').select('nom').eq('id', id).single();

const beforeByNom = new Map((beforeNiveaux || []).map((n) => [n.nom, n]));
const afterByNom = new Map(data.map((n) => [n.nom, n]));

const ajoutes = data.filter((n) => !beforeByNom.has(n.nom)).map((n) => n.nom);
const supprimes = (beforeNiveaux || []).filter((n) => !afterByNom.has(n.nom)).map((n) => n.nom);
const modifies = data
  .filter((n) => beforeByNom.has(n.nom))
  .filter((n) => {
    const b = beforeByNom.get(n.nom);
    return String(b.prix ?? '') !== String(n.prix ?? '')
      || String(b.duree_valeur ?? '') !== String(n.duree_valeur ?? '')
      || String(b.type_duree ?? '') !== String(n.type_duree ?? '')
      || String(b.capacite_groupe ?? '') !== String(n.capacite_groupe ?? '');
  })
  .map((n) => n.nom);

const parts = [];
if (ajoutes.length) parts.push(`ajouté(s) : ${ajoutes.join(', ')}`);
if (supprimes.length) parts.push(`supprimé(s) : ${supprimes.join(', ')}`);
if (modifies.length) parts.push(`modifié(s) : ${modifies.join(', ')}`);

if (parts.length > 0) {
  await logHistorique({
    req, perimetre: 'admin', action: 'modification', entite: 'formation', entite_id: id,
    description: `a modifié les niveaux de "${formationRow?.nom}" — ${parts.join(' ; ')}`,
    details: { before: beforeNiveaux, after: data },
  });
}

res.json(data);
};

module.exports = { getFormationNiveaux, setFormationNiveaux };