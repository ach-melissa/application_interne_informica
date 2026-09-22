const supabase = require('../supabaseClient');

// ============================================================
// EMPLOYES — list (avec leurs postes)
// ============================================================
const getEmployes = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('employes')
      .select('*, postes(*)')
      .order('nom');

    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
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
      return res.status(201).json({ ...employe, postes: postesData });
    }

    res.status(201).json({ ...employe, postes: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// EMPLOYES — update (infos + diff des postes)
// ============================================================
// Le frontend doit renvoyer, pour chaque poste :
//   - un `id` existant si le poste n'a pas changé de nature (juste modifié)
//   - pas d'`id` (ou id: null) si c'est un nouveau poste ajouté dans le formulaire
// Un poste présent en base mais absent du tableau envoyé = poste supprimé par l'utilisateur.
const updateEmploye = async (req, res) => {
  const employeId = req.params.id;
  try {
    const { nom, prenom, telephone, statut, postes } = req.body;

    const { data: employe, error: empError } = await supabase
      .from('employes')
      .update({ nom, prenom, telephone, statut })
      .eq('id', employeId)
      .select()
      .single();

    if (empError) return res.status(500).json({ message: empError.message });

    if (!Array.isArray(postes)) {
      return res.json({ ...employe, postes: [] });
    }

    const { data: postesExistants, error: fetchError } = await supabase
      .from('postes')
      .select('id')
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

    // 2. Insérer les nouveaux postes en premier (si ça échoue, rien n'est perdu côté existant)
    if (aInserer.length > 0) {
      const payload = aInserer.map(({ id, ...rest }) => ({ ...rest, employe_id: employeId }));
      const { error: insError } = await supabase.from('postes').insert(payload);
      if (insError) return res.status(500).json({ message: insError.message });
    }

    // 3. Mettre à jour les postes existants (id stable conservé)
    for (const p of aModifier) {
      const { id, ...rest } = p;
      const { error: updError } = await supabase.from('postes').update(rest).eq('id', id);
      if (updError) return res.status(500).json({ message: updError.message });
    }

    // 4. Supprimer les postes retirés (déjà vérifié : aucun mouvement lié)
    if (idsASupprimer.length > 0) {
      const { error: delError } = await supabase.from('postes').delete().in('id', idsASupprimer);
      if (delError) return res.status(500).json({ message: delError.message });
    }

    const { data: postesFinal, error: finalError } = await supabase
      .from('postes')
      .select('*')
      .eq('employe_id', employeId);

    if (finalError) return res.status(500).json({ message: finalError.message });

    res.json({ ...employe, postes: postesFinal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// EMPLOYES — delete
// ============================================================
const deleteEmploye = async (req, res) => {
  try {
    const { error } = await supabase.from('employes').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ message: error.message });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = { getEmployes, createEmploye, updateEmploye, deleteEmploye };