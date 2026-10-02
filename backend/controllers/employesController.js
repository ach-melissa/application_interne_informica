const supabase = require('../supabaseClient');
const { logHistorique, buildDiffDescription } = require('../utils/historique');

// ------------------------------------------------------------
// Aide : décrire précisément ce qui a changé dans un poste
// ------------------------------------------------------------
const POSTE_LABELS = {
  poste: 'poste',
  type: 'type',
  montant: 'montant',
  jours: 'jours',
  jours_fixes: 'jours fixes',
  nb_jours: 'jours/semaine',
  heures_par_jour: 'heures/jour',
  date_debut: 'date de début',
};
const NUMERIC = ['montant', 'nb_jours', 'heures_par_jour'];
const norm = (v) => (Array.isArray(v) ? v.join(', ') : v === null || v === undefined ? '' : String(v));

const diffPoste = (avant, apres) =>
  Object.keys(POSTE_LABELS)
    .filter((k) => k in apres)
    .filter((k) => (NUMERIC.includes(k)
      ? Number(avant[k] || 0) !== Number(apres[k] || 0)
      : norm(avant[k]) !== norm(apres[k])))
    .map((k) => `${POSTE_LABELS[k]} : "${norm(avant[k]) || '—'}" → "${norm(apres[k]) || '—'}"`);

// ============================================================
// EMPLOYES — list (avec leurs postes)
// ============================================================
const getEmployes = async (req, res) => {
  try {
    const { data: employes, error } = await supabase
      .from('employes')
      .select('*, postes(*)')
      .order('nom');

    if (error) return res.status(500).json({ message: error.message });

    const allPosteIds = employes.flatMap((e) => e.postes.map((p) => p.id));
    let nbParPoste = {};

    if (allPosteIds.length > 0) {
      const { data: mouvements, error: mvtError } = await supabase
        .from('mouvements_salaire')
        .select('poste_id')
        .in('poste_id', allPosteIds);

      if (mvtError) return res.status(500).json({ message: mvtError.message });

      nbParPoste = mouvements.reduce((acc, m) => {
        acc[m.poste_id] = (acc[m.poste_id] || 0) + 1;
        return acc;
      }, {});
    }

    const withCounts = employes.map((e) => ({
      ...e,
      nb_mouvements: e.postes.reduce((s, p) => s + (nbParPoste[p.id] || 0), 0),
    }));

    res.json(withCounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
};

// ============================================================
// EMPLOYES — get one (avec ses postes)
// ============================================================
const getEmployeById = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('employes')
      .select('*, postes(*)')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ message: 'Employé introuvable' });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
};

// ============================================================
// EMPLOYES — create (employé + ses postes en une fois)
// ============================================================
const createEmploye = async (req, res) => {
  try {
    const { nom, prenom, telephone, statut, postes } = req.body;
    if (!nom || !prenom) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }

    const { data: employe, error: empError } = await supabase
      .from('employes')
      .insert({ nom, prenom, telephone, statut })
      .select()
      .single();

    if (empError) return res.status(500).json({ message: empError.message });

    if (Array.isArray(postes) && postes.length > 0) {
      // on ignore un éventuel id envoyé par erreur : à la création, tout est nouveau
      const postesPayload = postes.map(({ id, ...rest }) => ({ ...rest, employe_id: employe.id }));
      const { data: postesData, error: postesError } = await supabase
        .from('postes')
        .insert(postesPayload)
        .select();

      if (postesError) return res.status(500).json({ message: postesError.message });

      await logHistorique({
        req,
        perimetre: 'comptable',
        action: 'creation',
        entite: 'employe',
        entite_id: employe.id,
        description: `a ajouté l'employé ${prenom} ${nom} (${postesData.length} poste${postesData.length > 1 ? 's' : ''})`,
      });

      return res.status(201).json({ ...employe, postes: postesData });
    }

    await logHistorique({
      req,
      perimetre: 'comptable',
      action: 'creation',
      entite: 'employe',
      entite_id: employe.id,
      description: `a ajouté l'employé ${prenom} ${nom}`,
    });

    res.status(201).json({ ...employe, postes: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// EMPLOYES — update (infos + diff des postes)
// ============================================================
const updateEmploye = async (req, res) => {
  const employeId = req.params.id;
  try {
    const { nom, prenom, telephone, statut, postes } = req.body;

    const { data: before, error: beforeError } = await supabase
      .from('employes')
      .select('nom, prenom, telephone, statut')
      .eq('id', employeId)
      .single();

    if (beforeError) return res.status(500).json({ message: beforeError.message });

    const { data: employe, error: empError } = await supabase
      .from('employes')
      .update({ nom, prenom, telephone, statut })
      .eq('id', employeId)
      .select()
      .single();

    if (empError) return res.status(500).json({ message: empError.message });

    const champsChanges = buildDiffDescription(before, { nom, prenom, telephone, statut });

    if (!Array.isArray(postes)) {
      if (champsChanges.length > 0) {
        await logHistorique({
          req,
          perimetre: 'comptable',
          action: 'modification',
          entite: 'employe',
          entite_id: employeId,
          description: `a modifié l'employé ${before.prenom} ${before.nom} : ${champsChanges.join(' | ')}`,
        });
      }
      return res.json({ ...employe, postes: [] });
    }

    const { data: postesExistants, error: fetchError } = await supabase
      .from('postes')
      .select('*')
      .eq('employe_id', employeId);

    if (fetchError) return res.status(500).json({ message: fetchError.message });

    const idsExistants = postesExistants.map((p) => p.id);
    const idsEnvoyes = postes.filter((p) => p.id).map((p) => p.id);

    const aInserer = postes.filter((p) => !p.id);
    const aModifier = postes.filter((p) => p.id && idsExistants.includes(p.id));
    const idsASupprimer = idsExistants.filter((id) => !idsEnvoyes.includes(id));

    // 1. Bloquer la suppression d'un poste qui a encore des mouvements liés
    if (idsASupprimer.length > 0) {
      const { data: mouvementsLies, error: mvtError } = await supabase
        .from('mouvements_salaire')
        .select('id')
        .in('poste_id', idsASupprimer);

      if (mvtError) return res.status(500).json({ message: mvtError.message });

      if (mouvementsLies.length > 0) {
        return res.status(400).json({
          message: "Impossible de supprimer un ou plusieurs postes : des mouvements y sont encore liés.",
        });
      }
    }

    // 2. Insérer les nouveaux postes
    if (aInserer.length > 0) {
      const payload = aInserer.map(({ id, ...rest }) => ({ ...rest, employe_id: employeId }));
      const { error: insError } = await supabase.from('postes').insert(payload);
      if (insError) return res.status(500).json({ message: insError.message });
    }

    // 3. Mettre à jour les postes existants
    for (const p of aModifier) {
      const { id, ...rest } = p;
      const { error: updError } = await supabase.from('postes').update(rest).eq('id', id);
      if (updError) return res.status(500).json({ message: updError.message });
    }

    // 4. Supprimer les postes retirés
    if (idsASupprimer.length > 0) {
      const { error: delError } = await supabase.from('postes').delete().in('id', idsASupprimer);
      if (delError) return res.status(500).json({ message: delError.message });
    }

    const { data: postesFinal, error: finalError } = await supabase
      .from('postes')
      .select('*')
      .eq('employe_id', employeId);

    if (finalError) return res.status(500).json({ message: finalError.message });

    const posteChanges = [];

    for (const p of aInserer) {
      posteChanges.push(`poste ajouté : "${p.poste}"`);
    }
    for (const p of aModifier) {
      const avant = postesExistants.find((x) => x.id === p.id);
      const diffs = avant ? diffPoste(avant, p) : [];
      if (diffs.length > 0) posteChanges.push(`poste "${avant.poste}" (${diffs.join(', ')})`);
    }
    for (const id of idsASupprimer) {
      const avant = postesExistants.find((x) => x.id === id);
      posteChanges.push(`poste supprimé : "${avant?.poste ?? '—'}"`);
    }

    const allChanges = [...champsChanges, ...posteChanges];

    if (allChanges.length > 0) {
      await logHistorique({
        req,
        perimetre: 'comptable',
        action: 'modification',
        entite: 'employe',
        entite_id: employeId,
        description: `a modifié l'employé ${before.prenom} ${before.nom} : ${allChanges.join(' | ')}`,
      });
    }

    res.json({ ...employe, postes: postesFinal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// EMPLOYES — delete (bloqué si des mouvements sont liés)
// ============================================================
const deleteEmploye = async (req, res) => {
  const employeId = req.params.id;
  try {
    const { data: employeInfo, error: infoError } = await supabase
      .from('employes')
      .select('nom, prenom')
      .eq('id', employeId)
      .single();

    if (infoError) return res.status(500).json({ message: infoError.message });

    const { data: postes, error: postesError } = await supabase
      .from('postes')
      .select('id')
      .eq('employe_id', employeId);

    if (postesError) return res.status(500).json({ message: postesError.message });

    const posteIds = postes.map((p) => p.id);

    if (posteIds.length > 0) {
      const { data: mouvementsLies, error: mvtError } = await supabase
        .from('mouvements_salaire')
        .select('id')
        .in('poste_id', posteIds);

      if (mvtError) return res.status(500).json({ message: mvtError.message });

      if (mouvementsLies.length > 0) {
        return res.status(400).json({
          message: "Impossible de supprimer cet employé : des mouvements de salaire sont encore liés à un ou plusieurs de ses postes.",
        });
      }
    }

    if (posteIds.length > 0) {
      const { error: delPostesError } = await supabase.from('postes').delete().eq('employe_id', employeId);
      if (delPostesError) return res.status(500).json({ message: delPostesError.message });
    }

    const { error } = await supabase.from('employes').delete().eq('id', employeId);
    if (error) return res.status(500).json({ message: error.message });

    await logHistorique({
      req,
      perimetre: 'comptable',
      action: 'suppression',
      entite: 'employe',
      entite_id: employeId,
      description: `a supprimé l'employé ${employeInfo.prenom} ${employeInfo.nom}`,
    });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { getEmployes, getEmployeById, createEmploye, updateEmploye, deleteEmploye };