const supabase = require('../supabaseClient');
const { logHistorique, buildDiffDescription } = require('../utils/historique');
const getFormations = async (req, res) => {
  const { data, error } = await supabase
    .from('formations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const result = await Promise.all(
    data.map(async (f) => {
      const { count: nb_groupes } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true })
        .eq('formation_id', f.id)
        .eq('archived', false);

      const { count: nb_groupes_archives } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true })
        .eq('formation_id', f.id)
        .eq('archived', true);

      const { data: inscData } = await supabase
        .from('inscriptions')
        .select('id, group_id, statut_scolarite, groups(archived)')
        .eq('formation_id', f.id)
        .eq('statut', 'confirmed')
        .eq('archived', false);
      const nb_etudiants = (inscData || []).filter(
        i => (!i.group_id || i.groups?.archived === false) && i.statut_scolarite !== 'abandonne'
      ).length;
      let nb_inscriptions_total = 0;
      if (f.a_niveaux) {
        const { data: niveauIds } = await supabase
          .from('formation_niveaux')
          .select('id')
          .eq('formation_id', f.id);
        const ids = (niveauIds || []).map(n => n.id);

        const { data: byFormation } = await supabase
          .from('inscriptions')
          .select('id')
          .eq('formation_id', f.id);

        let byNiveau = [];
        if (ids.length > 0) {
          const { data: byNiveauData } = await supabase
            .from('inscriptions')
            .select('id')
            .in('niveau_id', ids);
          byNiveau = byNiveauData || [];
        }

        const uniqueIds = new Set([...(byFormation || []).map(r => r.id), ...byNiveau.map(r => r.id)]);
        nb_inscriptions_total = uniqueIds.size;
      } else {
        const { count } = await supabase
          .from('inscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('formation_id', f.id);
        nb_inscriptions_total = count ?? 0;
      }
        console.log('DEBUG', f.nom, '| a_niveaux:', f.a_niveaux, '| nb_inscriptions_total:', nb_inscriptions_total);

      // NEW: pull the actual levels so the card can show/expand them
      let niveaux = [];
      if (f.a_niveaux) {
        const { data: niveauxData } = await supabase
          .from('formation_niveaux')
          .select('id, nom, prix, duree_valeur, type_duree')
          .eq('formation_id', f.id)
          .order('ordre', { ascending: true });
        niveaux = niveauxData ?? [];
      }

    return { ...f, nb_groupes: nb_groupes ?? 0, nb_groupes_archives: nb_groupes_archives ?? 0, nb_etudiants: nb_etudiants ?? 0, nb_inscriptions_total: nb_inscriptions_total ?? 0, niveaux };
    })
  );

  res.json(result);
};
const getFormationById = async (req, res) => {
  const { id } = req.params;

  const { data: formation, error } = await supabase
    .from('formations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return res.status(404).json({ error: 'Formation introuvable.' });

  const { data: niveaux, error: nErr } = await supabase
    .from('formation_niveaux')
    .select('*')
    .eq('formation_id', id)
    .order('ordre', { ascending: true });

  if (nErr) return res.status(500).json({ error: nErr.message });

    const niveauxWithCounts = await Promise.all(
    (niveaux ?? []).map(async (n) => {
      const { count: nb_groupes } = await supabase
        .from('groups')
        .select('*', { count: 'exact', head: true })
        .eq('niveau_id', n.id)
        .eq('archived', false);

      const { data: inscData } = await supabase
        .from('inscriptions')
        .select('id, group_id, statut_scolarite, groups(archived)')
        .eq('niveau_id', n.id)
        .eq('statut', 'confirmed')
        .eq('archived', false);
      const nb_etudiants = (inscData || []).filter(
        i => (!i.group_id || i.groups?.archived === false) && i.statut_scolarite !== 'abandonne'
      ).length;
      const { data: periods } = await supabase
        .from('formation_payment_periods')
        .select('jours_offset, montant')
        .eq('niveau_id', n.id)
        .order('numero', { ascending: true });

      return { ...n, nb_groupes: nb_groupes ?? 0, nb_etudiants: nb_etudiants ?? 0, periods: periods ?? [] };
    })
  );

  res.json({ ...formation, niveaux: niveauxWithCounts });
};
const createFormation = async (req, res) => {
const { nom, prix, heures, description, capacite_groupe, a_niveaux, type_duree, prix_uniforme, duree_uniforme, type_duree_uniforme, echeancier_uniforme, statut, capacite_uniforme } = req.body;  if (type_duree && !['heures', 'seances'].includes(type_duree)) {
    return res.status(400).json({ error: "type_duree doit être 'heures' ou 'seances'." });
  }
  if (!nom || !nom.trim()) {
    return res.status(400).json({ error: 'Le nom de la formation est obligatoire.' });
  }

  const needsGlobalPrix = !a_niveaux || prix_uniforme !== false;
  const needsGlobalHeures = !a_niveaux || duree_uniforme !== false;

  if (needsGlobalPrix && (prix === undefined || prix === null || prix === '' || isNaN(prix) || Number(prix) < 0)) {
    return res.status(400).json({ error: 'Le prix doit être un nombre valide.' });
  }
  if (needsGlobalHeures && (heures === undefined || heures === null || heures === '' || isNaN(heures) || Number(heures) <= 0)) {
    return res.status(400).json({ error: "Le nombre d'heures doit être un nombre valide." });
  }
const needsGlobalCapacite = !a_niveaux || capacite_uniforme !== false;
if (needsGlobalCapacite && (capacite_groupe === undefined || capacite_groupe === null || isNaN(capacite_groupe) || Number(capacite_groupe) <= 0)) {
  return res.status(400).json({ error: "La capacité est obligatoire et doit être un nombre valide." });
}
    const { data, error } = await supabase
    .from('formations')
            .insert([{
  nom: nom.trim(),
  prix: needsGlobalPrix ? Number(prix) : null,
  heures: needsGlobalHeures ? Number(heures) : null,
  description: description?.trim() || null,
  capacite_groupe: needsGlobalCapacite ? Number(capacite_groupe) : null,
  a_niveaux: !!a_niveaux,
  type_duree: type_duree || 'heures',
  prix_uniforme: prix_uniforme === undefined ? true : !!prix_uniforme,
  duree_uniforme: duree_uniforme === undefined ? true : !!duree_uniforme,
  type_duree_uniforme: type_duree_uniforme === undefined ? true : !!type_duree_uniforme,
echeancier_uniforme: echeancier_uniforme === undefined ? true : !!echeancier_uniforme,
capacite_uniforme: capacite_uniforme === undefined ? true : !!capacite_uniforme,
statut: statut === 'non_active' ? 'non_active' : 'active',
}])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await logHistorique({
    req, perimetre: 'admin', action: 'creation', entite: 'formation', entite_id: data.id,
    description: `a créé la formation "${data.nom}"`,
  });

  res.status(201).json(data);
};

const updateFormation = async (req, res) => {
  const { id } = req.params;
const { nom, prix, heures, description, capacite_groupe, a_niveaux, type_duree, prix_uniforme, duree_uniforme, type_duree_uniforme, echeancier_uniforme, capacite_uniforme, statut, confirm_deactivation } = req.body;

  const { data: before } = await supabase.from('formations').select('*').eq('id', id).single(); 
if (type_duree && !['heures', 'seances'].includes(type_duree)) {
    return res.status(400).json({ error: "type_duree doit être 'heures' ou 'seances'." });
  }

  if (statut === 'non_active') {
    const today = new Date().toISOString().slice(0, 10);
    const { count, error: gErr } = await supabase
      .from('groups')
      .select('*', { count: 'exact', head: true })
      .eq('formation_id', id)
      .eq('archived', false)
      .or(`date_fin.is.null,date_fin.gte.${today}`);

    if (gErr) return res.status(500).json({ error: gErr.message });

    if (count > 0 && !confirm_deactivation) {
      return res.status(409).json({
        needs_confirmation: true,
        warning: `${count} groupe(s) sont actuellement en cours sur cette formation et n'ont pas encore terminé. Désactiver quand même ?`,
      });
    }
  }

  if (!nom || !nom.trim()) {
    return res.status(400).json({ error: 'Le nom de la formation est obligatoire.' });
  }

  const needsGlobalPrix = !a_niveaux || prix_uniforme !== false;
  const needsGlobalHeures = !a_niveaux || duree_uniforme !== false;

  if (needsGlobalPrix && (prix === undefined || prix === null || prix === '' || isNaN(prix) || Number(prix) < 0)) {
    return res.status(400).json({ error: 'Le prix doit être un nombre valide.' });
  }
  if (needsGlobalHeures && (heures === undefined || heures === null || heures === '' || isNaN(heures) || Number(heures) <= 0)) {
    return res.status(400).json({ error: "Le nombre d'heures doit être un nombre valide." });
  }
  const needsGlobalCapacite = !a_niveaux || capacite_uniforme !== false;
  if (needsGlobalCapacite && (capacite_groupe === undefined || capacite_groupe === null || isNaN(capacite_groupe) || Number(capacite_groupe) <= 0)) {
    return res.status(400).json({ error: "La capacité est obligatoire et doit être un nombre valide." });
  }
 const { data, error } = await supabase
    .from('formations')
  .update({
  nom: nom.trim(),
  prix: needsGlobalPrix ? Number(prix) : null,
  heures: needsGlobalHeures ? Number(heures) : null,
  description: description?.trim() || null,
  capacite_groupe: needsGlobalCapacite ? Number(capacite_groupe) : null,
  a_niveaux: !!a_niveaux,
  type_duree: type_duree || 'heures',
  prix_uniforme: prix_uniforme === undefined ? true : !!prix_uniforme,
  duree_uniforme: duree_uniforme === undefined ? true : !!duree_uniforme,
  type_duree_uniforme: type_duree_uniforme === undefined ? true : !!type_duree_uniforme,
  echeancier_uniforme: echeancier_uniforme === undefined ? true : !!echeancier_uniforme,
  capacite_uniforme: capacite_uniforme === undefined ? true : !!capacite_uniforme,
  statut: statut === 'non_active' ? 'non_active' : 'active',
})
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const changes = buildDiffDescription(before, data);
  if (changes.length > 0) {
    await logHistorique({
      req, perimetre: 'admin', action: 'modification', entite: 'formation', entite_id: id,
      description: `a modifié la formation "${data.nom}" — ${changes.join(', ')}`,
      details: { changes },
    });
  }

  res.json(data);
};

const archiveFormation = async (req, res) => {
  const { id } = req.params;
  const { annee_scolaire } = req.body;

  const updates = { archived: true };
  if (annee_scolaire?.trim()) updates.annee_scolaire = annee_scolaire.trim();

  const { data, error } = await supabase
    .from('formations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await logHistorique({
    req, perimetre: 'admin', action: 'modification', entite: 'formation', entite_id: id,
    description: `a archivé la formation "${data.nom}" (année ${data.annee_scolaire || '—'})`,
  });

  res.json(data);
};

const restoreFormation = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('formations')
    .update({ archived: false })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await logHistorique({
    req, perimetre: 'admin', action: 'modification', entite: 'formation', entite_id: id,
    description: `a restauré la formation "${data.nom}"`,
  });

  res.json(data);
};

const deleteFormation = async (req, res) => {
  const { id } = req.params;

  // Bloque la suppression si des étudiants sont/ont été inscrits, quel que soit le statut
  const { data: formationRowForDelete, error: fErrForDelete } = await supabase
    .from('formations')
    .select('a_niveaux')
    .eq('id', id)
    .single();
  if (fErrForDelete) return res.status(500).json({ error: fErrForDelete.message });

  let nb_etudiants = 0;
  if (formationRowForDelete.a_niveaux) {
    const { data: niveauIds } = await supabase
      .from('formation_niveaux')
      .select('id')
      .eq('formation_id', id);
    const ids = (niveauIds || []).map(n => n.id);

    const { data: byFormation, error: e1 } = await supabase
      .from('inscriptions')
      .select('id')
      .eq('formation_id', id);
    if (e1) return res.status(500).json({ error: e1.message });

    let byNiveau = [];
    if (ids.length > 0) {
      const { data: byNiveauData, error: e2 } = await supabase
        .from('inscriptions')
        .select('id')
        .in('niveau_id', ids);
      if (e2) return res.status(500).json({ error: e2.message });
      byNiveau = byNiveauData || [];
    }

    const uniqueIds = new Set([...(byFormation || []).map(r => r.id), ...byNiveau.map(r => r.id)]);
    nb_etudiants = uniqueIds.size;
  } else {
    const { count, error: cErr } = await supabase
      .from('inscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('formation_id', id);
    if (cErr) return res.status(500).json({ error: cErr.message });
    nb_etudiants = count ?? 0;
  }

  if (nb_etudiants > 0) {
    return res.status(409).json({
      error: `Impossible de supprimer cette formation : ${nb_etudiants} étudiant(s) y sont ou ont été inscrits (confirmés, en attente, abandonnés ou archivés).`,
    });
  }

  // Bloque aussi si des groupes archivés existent (historique à conserver)
  const { count: nb_groupes_archives, error: gaErr } = await supabase
    .from('groups')
    .select('*', { count: 'exact', head: true })
    .eq('formation_id', id)
    .eq('archived', true);

  if (gaErr) return res.status(500).json({ error: gaErr.message });

  if (nb_groupes_archives > 0) {
    return res.status(409).json({
      error: `Impossible de supprimer cette formation : ${nb_groupes_archives} groupe(s) archivé(s) existent pour cette formation.`,
    });
  }

  const { data: toDelete } = await supabase.from('formations').select('nom').eq('id', id).single();
  const { error } = await supabase
    .from('formations')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  await logHistorique({
    req, perimetre: 'admin', action: 'suppression', entite: 'formation', entite_id: id,
    description: `a supprimé la formation "${toDelete?.nom}"`,
  });

  res.json({ success: true });
};

// GET /api/formations/:id/periods
const getFormationPeriods = async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('formation_payment_periods')
    .select('*')
    .eq('formation_id', id)
    .order('numero', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const setFormationPeriods = async (req, res) => {
  const { id } = req.params;
  const { periods } = req.body; // [{ jours_offset, montant }, ...]

  if (!Array.isArray(periods)) {
    return res.status(400).json({ error: 'periods doit être un tableau.' });
  }

  const { data: beforePeriods } = await supabase
    .from('formation_payment_periods')
    .select('jours_offset, montant')
    .eq('formation_id', id)
    .order('numero', { ascending: true });
  for (const p of periods) {
    if (p.jours_offset === undefined || p.jours_offset === null || isNaN(p.jours_offset)) {
      return res.status(400).json({ error: 'Chaque période doit avoir un décalage en jours valide.' });
    }
    if (p.montant === undefined || p.montant === null || isNaN(p.montant) || Number(p.montant) <= 0) {
      return res.status(400).json({ error: 'Chaque période doit avoir un montant valide.' });
    }
  }
if (periods.length > 0) {
    const { data: formation, error: fErr } = await supabase
      .from('formations')
      .select('prix')
      .eq('id', id)
      .single();
    if (fErr) return res.status(500).json({ error: fErr.message });

    const expectedTotal = Number(formation.prix_etudiant ?? formation.prix ?? 0);
    const sum = periods.reduce((s, p) => s + Number(p.montant), 0);
    if (Math.abs(sum - expectedTotal) > 0.01) {
      return res.status(400).json({
        error: `Le total des tranches (${sum.toLocaleString('fr-FR')} DA) doit être égal au prix de la formation (${expectedTotal.toLocaleString('fr-FR')} DA).`,
      });
    }
  }
  const { error: delErr } = await supabase.from('formation_payment_periods').delete().eq('formation_id', id);
  if (delErr) return res.status(500).json({ error: delErr.message });

  if (periods.length === 0) return res.json([]);

  const rows = periods.map((p, idx) => ({
    formation_id: id,
    numero: idx + 1,
    jours_offset: Number(p.jours_offset),
    montant: Number(p.montant),
  }));

  const { data, error } = await supabase.from('formation_payment_periods').insert(rows).select();
  if (error) return res.status(500).json({ error: error.message });

  const normalize = (list) => (list || [])
    .map((p) => `${p.jours_offset}:${p.montant}`)
    .sort()
    .join('|');
  const changed = normalize(beforePeriods) !== normalize(data);

  if (changed) {
    const { data: formationRow } = await supabase.from('formations').select('nom').eq('id', id).single();
    const periodsText = data.length > 0
      ? data.map((p) => `J+${p.jours_offset} : ${p.montant} DA`).join(' ; ')
      : 'échéancier vidé (aucune période)';

    await logHistorique({
      req, perimetre: 'admin', action: 'modification', entite: 'formation', entite_id: id,
      description: `a modifié l'échéancier de paiement de "${formationRow?.nom}" — ${periodsText}`,
      details: { periods: data },
    });
  }

  res.json(data);
};
const getFormationStatutOptions = async (req, res) => {
  const { data, error } = await supabase.rpc('get_formation_status_values');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const getStatutScolariteOptions = async (req, res) => {
  const { data, error } = await supabase.rpc('get_statut_scolarite_values');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

module.exports = { getFormations, getFormationById, createFormation, updateFormation, archiveFormation, restoreFormation, deleteFormation, getFormationPeriods, setFormationPeriods, getFormationStatutOptions, getStatutScolariteOptions };