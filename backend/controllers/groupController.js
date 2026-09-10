const supabase = require('../supabaseClient');
const { resolveGroupPeriods } = require('../utils/periods');
const { logHistorique, buildDiffDescription } = require('../utils/historique');
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Calcule dynamiquement, pour chaque group_id fourni, un résumé lisible de
// son planning à partir de la table `schedules` — jamais depuis des colonnes
// stockées sur `groups` (jours_formation/heure_formation supprimées).
// L'ordre des jours vient de la même RPC que /api/schedules/jours
// (get_day_enum_values) — jamais codé en dur, pour rester synchro avec
// l'enum réel de la DB (qui commence par samedi et n'a pas de vendredi).
const getScheduleSummaries = async (groupIds) => {
  const summaries = {};
  if (!groupIds || groupIds.length === 0) return summaries;

  const { data: joursOrdre, error: joursErr } = await supabase.rpc('get_day_enum_values');
  if (joursErr) throw joursErr;
  const ordre = joursOrdre || [];
  const jourRank = (j) => {
    const i = ordre.indexOf((j || '').toLowerCase());
    return i === -1 ? ordre.length : i;
  };

  const { data, error } = await supabase
    .from('schedules')
    .select('group_id, jour_semaine, heure_debut, heure_fin')
    .in('group_id', groupIds);

  if (error) throw error;

  const byGroup = {};
  (data || []).forEach((row) => {
    (byGroup[row.group_id] ??= []).push(row);
  });

  Object.entries(byGroup).forEach(([groupId, rows]) => {
    const sorted = rows.slice().sort((a, b) => {
      const r = jourRank(a.jour_semaine) - jourRank(b.jour_semaine);
      if (r !== 0) return r;
      return (a.heure_debut || '').localeCompare(b.heure_debut || '');
    });

    const joursDistincts = [...new Set(sorted.map((r) => r.jour_semaine))]
      .sort((a, b) => jourRank(a) - jourRank(b))
      .map(capitalize);

    const creneaux = sorted
      .filter((r) => r.heure_debut && r.heure_fin)
      .map((r) => `${capitalize(r.jour_semaine)} : ${r.heure_debut.slice(0, 5)}-${r.heure_fin.slice(0, 5)}`);

    summaries[groupId] = {
      jours_formation: joursDistincts.join(', '),
      heure_formation: creneaux.join(', '),
    };
  });

  return summaries;
};

const getGroupsByFormation = async (req, res) => {
  const { formation_id, niveau_id, archived, annee_scolaire } = req.query;

  let query = supabase
    .from('groups')
    .select(`
      *,
      teacher:teacher_id(id, user:user_id(nom, prenom)),
      formations:formation_id(nom),
      niveau:niveau_id(id, nom)
    `)
    .eq('formation_id', formation_id)
    .eq('archived', archived === 'true')
    .order('created_at', { ascending: true });

  if (niveau_id) query = query.eq('niveau_id', niveau_id);
  if (annee_scolaire) query = query.eq('annee_scolaire', annee_scolaire); // 👈 add this line

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const groupIds = data.map((g) => g.id);
  let scheduleSummaries = {};
  try {
    scheduleSummaries = await getScheduleSummaries(groupIds);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const result = await Promise.all(
    data.map(async (g) => {
      const { count } = await supabase
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', g.id)
        .eq('statut', 'confirmed')
        .eq('archived', false);
      return {
        ...g,
        nb_etudiants: count ?? 0,
        jours_formation: scheduleSummaries[g.id]?.jours_formation ?? '',
        heure_formation: scheduleSummaries[g.id]?.heure_formation ?? '',
      };
    })
  );

  res.json(result);
};

const createGroup = async (req, res) => {
const { nom, formation_id, niveau_id, teacher_id, en_promotion, prix_promotion, date_debut,
        use_default_duree, duree_valeur, type_duree } = req.body;

  if (!nom || !formation_id) {
    return res.status(400).json({ error: 'Nom et formation sont obligatoires.' });
  }

  const { data: formation, error: fErr } = await supabase
    .from('formations')
    .select('a_niveaux')
    .eq('id', formation_id)
    .single();
  if (fErr) return res.status(500).json({ error: fErr.message });
    if (formation.a_niveaux && !niveau_id) {
    return res.status(400).json({ error: 'Cette formation nécessite un niveau.' });
  }
  if (use_default_duree === false && (!duree_valeur || isNaN(duree_valeur) || Number(duree_valeur) <= 0)) {
    return res.status(400).json({ error: 'La durée personnalisée du groupe doit être un nombre valide.' });
  }

  const { data, error } = await supabase
    .from('groups')
        .insert({
      nom, formation_id, niveau_id: niveau_id || null, teacher_id: teacher_id || null,
      en_promotion: !!en_promotion,
      prix_promotion: en_promotion ? (prix_promotion || null) : null,
      date_debut: date_debut || null,
      use_default_periods: true,
      use_default_duree: use_default_duree === undefined ? true : !!use_default_duree,
      duree_valeur: use_default_duree === false ? Number(duree_valeur) : null,
      type_duree: use_default_duree === false ? (type_duree || 'heures') : null,
    })
    .select('*, formations:formation_id(nom), niveau:niveau_id(nom)')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const contexte = data.niveau?.nom ? `${data.formations?.nom} — ${data.niveau.nom}` : data.formations?.nom;
  await logHistorique({
    req, perimetre: 'admin', action: 'creation', entite: 'groupe', entite_id: data.id,
    description: `a créé le groupe "${data.nom}" (${contexte})`,
  });

  res.json(data);
};

const updateGroup = async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };
  const { data: before } = await supabase
    .from('groups')
    .select('nom, statut, date_fin, date_debut, teacher_id, en_promotion, use_default_duree, duree_valeur, type_duree, teacher:teacher_id(user:user_id(nom, prenom)), formations:formation_id(nom), niveau:niveau_id(nom)')
    .eq('id', id)
    .single();

  if (updates.date_debut === '') updates.date_debut = null;
  if (updates.date_fin === '') updates.date_fin = null;

  // Synchronise le statut avec date_fin, quelle que soit l'origine du PATCH
  // (bouton "Terminer" dans Groups, toggle dans GroupFormModal, ou confirmFinishGroup dans PointageTab)
  if ('date_fin' in updates) {
    updates.statut = updates.date_fin ? 'terminer' : 'active';
  }

  if (updates.use_default_duree === false && (!updates.duree_valeur || isNaN(updates.duree_valeur) || Number(updates.duree_valeur) <= 0)) {
    return res.status(400).json({ error: 'La durée personnalisée du groupe doit être un nombre valide.' });
  }
  if (updates.use_default_duree === true) {
    updates.duree_valeur = null;
    updates.type_duree = null;
  }
  // Jamais de prix promo si la promo est désactivée
  if ('en_promotion' in updates) {
    updates.prix_promotion = updates.en_promotion ? (updates.prix_promotion || null) : null;
  }
  const { data, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (updates.use_default_periods === true) {
    await supabase.from('group_payment_periods').delete().eq('group_id', id);
  }

  if (updates.date_fin) {
    await supabase
      .from('notifications')
      .update({ lu: true, lu_admin: true })
      .eq('type', 'groupe_complete')
      .eq('data->>groupe_id', String(id));
  }

  const beforeForDiff = { ...before, teacher_id: before?.teacher?.user ? `${before.teacher.user.prenom} ${before.teacher.user.nom}` : null };
  const updatesForDiff = { ...updates };
  if ('teacher_id' in updates) {
    if (updates.teacher_id) {
      const { data: newTeacher } = await supabase
        .from('teachers').select('user:user_id(nom, prenom)').eq('id', updates.teacher_id).single();
      updatesForDiff.teacher_id = newTeacher?.user ? `${newTeacher.user.prenom} ${newTeacher.user.nom}` : updates.teacher_id;
    } else {
      updatesForDiff.teacher_id = null;
    }
  }

  const changes = buildDiffDescription(beforeForDiff, updatesForDiff);
  if (changes.length > 0) {
    const contexte = before?.niveau?.nom ? `${before.formations?.nom} — ${before.niveau.nom}` : before?.formations?.nom;
    await logHistorique({
      req, perimetre: 'admin', action: 'modification', entite: 'groupe', entite_id: id,
      description: `a modifié le groupe "${data.nom}" (${contexte ?? '—'}) — ${changes.join(', ')}`,
      details: { changes },
    });
  }
  res.json(data);
};

const deleteGroup = async (req, res) => {
  const { id } = req.params;

  const { data: toDelete } = await supabase
    .from('groups')
    .select('nom, formations:formation_id(nom), niveau:niveau_id(nom)')
    .eq('id', id)
    .single();
  // Remettre group_id à null pour les étudiants de ce groupe
// Bloquer la suppression si des étudiants sont encore inscrits à ce groupe
  const { count, error: countError } = await supabase
    .from('inscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', id);

  if (countError) return res.status(500).json({ error: countError.message });
  if (count > 0) {
    return res.status(400).json({
      error: `Ce groupe a ${count} étudiant(s) inscrit(s). Retirez-les ou réaffectez-les à un autre groupe avant de le supprimer.`,
    });
  }

  // Nettoyer les données liées avant la suppression réelle
  const { error: schedErr } = await supabase.from('schedules').delete().eq('group_id', id);
  if (schedErr) return res.status(500).json({ error: schedErr.message });

  const { data: sessions, error: sessErr } = await supabase
    .from('sessions')
    .select('id')
    .eq('group_id', id);
  if (sessErr) return res.status(500).json({ error: sessErr.message });

  if (sessions?.length) {
    const sessionIds = sessions.map(s => s.id);
    const { error: attErr } = await supabase.from('attendance').delete().in('session_id', sessionIds);
    if (attErr) return res.status(500).json({ error: attErr.message });

    const { error: sessDelErr } = await supabase.from('sessions').delete().eq('group_id', id);
    if (sessDelErr) return res.status(500).json({ error: sessDelErr.message });
  }

  // Suppression réelle du groupe
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });

  const contexteDelete = toDelete?.niveau?.nom ? `${toDelete.formations?.nom} — ${toDelete.niveau.nom}` : toDelete?.formations?.nom;
  await logHistorique({
    req, perimetre: 'admin', action: 'suppression', entite: 'groupe', entite_id: id,
    description: `a supprimé le groupe "${toDelete?.nom}" (${contexteDelete ?? '—'})`,
  });

  res.json({ success: true });
};
const archiveGroup = async (req, res) => {
  const { id } = req.params;
  const { annee_scolaire } = req.body || {};

  const { data: existing, error: fetchErr } = await supabase
    .from('groups')
    .select('date_fin, formations:formation_id(nom), niveau:niveau_id(nom)')
    .eq('id', id)
    .single();
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  const today = new Date().toISOString().slice(0, 10);
  if (!existing.date_fin || existing.date_fin > today) {
    return res.status(400).json({
      error: "Ce groupe n'est pas encore terminé — impossible de l'archiver tant que la date de fin n'est pas atteinte.",
    });
  }

  if (!annee_scolaire?.trim()) {
    return res.status(400).json({ error: "L'année scolaire est obligatoire pour archiver un groupe." });
  }

  const groupUpdates = { archived: true, annee_scolaire: annee_scolaire.trim() };
  const { data, error } = await supabase
    .from('groups')
    .update(groupUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Archiver aussi les étudiants inscrits dans ce groupe, avec la même année scolaire.
  const inscriptionUpdates = { archived: true };
  if (annee_scolaire?.trim()) inscriptionUpdates.annee_scolaire = annee_scolaire.trim();

  const { error: insErr } = await supabase
    .from('inscriptions')
    .update(inscriptionUpdates)
    .eq('group_id', id);

  if (insErr) return res.status(500).json({ error: insErr.message });

  const contexteArchive = existing?.niveau?.nom ? `${existing.formations?.nom} — ${existing.niveau.nom}` : existing?.formations?.nom;
  await logHistorique({
    req, perimetre: 'admin', action: 'modification', entite: 'groupe', entite_id: id,
    description: `a archivé le groupe "${data.nom}" (${contexteArchive ?? '—'}, année ${data.annee_scolaire || '—'})`,
  });

  res.json(data);
};
const restoreGroup = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('groups')
    .update({ archived: false })
    .eq('id', id)
    .select('*, formations:formation_id(nom), niveau:niveau_id(nom)')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const contexte = data.niveau?.nom
    ? `${data.formations?.nom} — ${data.niveau.nom}`
    : data.formations?.nom;

  await logHistorique({
    req,
    perimetre: 'admin',
    action: 'modification',
    entite: 'groupe',
    entite_id: id,
    description: `a restauré le groupe "${data.nom}" (${contexte})`,
  });

  res.json(data);
};

const getGroupEtudiants = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('inscriptions')
    .select(`
      *,
      etudiant:etudiant_id(*),
      formation:formation_id(nom),
      niveau:niveau_id(id, nom)
    `)
    .eq('group_id', id)
    .eq('statut', 'confirmed')
    .eq('archived', false);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
const getUnassignedStudents = async (req, res) => {
  const { formation_id } = req.params;
  const { niveau_id } = req.query;

  let query = supabase
    .from('inscriptions')
    .select('id, etudiant_id, niveau_id, etudiant:etudiant_id(id, nom, prenom, telephone)')
    .eq('formation_id', formation_id)
    .eq('statut', 'confirmed')
    .eq('archived', false)          // 👈 ligne ajoutée
    .is('group_id', null);

  if (niveau_id) {
    query = query.or(`niveau_id.eq.${niveau_id},niveau_id.is.null`);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};
const getGroupPeriods = async (req, res) => {
  const { id } = req.params;

 const { data: group, error: gErr } = await supabase
  .from('groups')
  .select('formation_id, niveau_id, use_default_periods, en_promotion, prix_promotion, date_debut, formation:formation_id(prix, prix_uniforme), niveau:niveau_id(prix)')
  .eq('id', id)
  .single();
if (gErr) return res.status(500).json({ error: gErr.message });
  let periodsQuery = supabase
    .from('formation_payment_periods')
    .select('numero, jours_offset, montant')
    .eq('formation_id', group.formation_id);
  periodsQuery = group.niveau_id ? periodsQuery.eq('niveau_id', group.niveau_id) : periodsQuery.is('niveau_id', null);
  const { data: formationPeriods } = await periodsQuery.order('numero', { ascending: true });

  let groupPeriods = [];
  if (!group.use_default_periods) {
    const { data } = await supabase
      .from('group_payment_periods')
      .select('numero, jours_offset, montant')
      .eq('group_id', id)
      .order('numero', { ascending: true });
    groupPeriods = data ?? [];
  }

  const resolved = resolveGroupPeriods(group, formationPeriods ?? [], groupPeriods);
   const basePrice = group.formation?.prix_uniforme === false
    ? Number(group.niveau?.prix ?? 0)
    : Number(group.formation?.prix ?? 0);
  const expected_total = group.en_promotion && group.prix_promotion != null
    ? Number(group.prix_promotion)
    : basePrice;

  res.json({
    use_default_periods: group.use_default_periods,
    date_debut: group.date_debut,
    expected_total,
    periods: resolved,
  });
};

const setGroupPeriods = async (req, res) => {
  const { id } = req.params;
  const { periods } = req.body; // [{ jours_offset, montant }] — empty array = revert to default

  if (!Array.isArray(periods)) return res.status(400).json({ error: 'periods doit être un tableau.' });

  const { data: beforePeriods } = await supabase
    .from('group_payment_periods')
    .select('jours_offset, montant')
    .eq('group_id', id)
    .order('numero', { ascending: true });
  const { data: groupBefore } = await supabase.from('groups').select('nom, use_default_periods').eq('id', id).single();

  if (periods.length === 0) {
    await supabase.from('group_payment_periods').delete().eq('group_id', id);
    const { error } = await supabase.from('groups').update({ use_default_periods: true }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    if (!groupBefore?.use_default_periods) {
      await logHistorique({
        req, perimetre: 'admin', action: 'modification', entite: 'groupe', entite_id: id,
        description: `a réinitialisé l'échéancier du groupe "${groupBefore?.nom}" (retour à l'échéancier par défaut)`,
      });
    }
    return res.json([]);
  }

  for (const p of periods) {
    if (p.jours_offset === undefined || p.jours_offset === null || isNaN(p.jours_offset) || Number(p.jours_offset) < 0) {
      return res.status(400).json({ error: 'Chaque période doit avoir un nombre de jours valide.' });
    }
    if (p.montant === undefined || p.montant === null || isNaN(p.montant) || Number(p.montant) <= 0) {
      return res.status(400).json({ error: 'Chaque période doit avoir un montant valide.' });
    }
  }

const { data: group, error: gErr } = await supabase
    .from('groups')
    .select('en_promotion, prix_promotion, date_debut, niveau_id, formation:formation_id(prix, prix_uniforme), niveau:niveau_id(prix)')
    .eq('id', id)
    .single();
  if (gErr) return res.status(500).json({ error: gErr.message });

  const expectedBasePrice = group.formation?.prix_uniforme === false
    ? Number(group.niveau?.prix ?? 0)
    : Number(group.formation?.prix ?? 0);
  const expectedTotal = group.en_promotion && group.prix_promotion != null
    ? Number(group.prix_promotion)
    : expectedBasePrice;

  const sum = periods.reduce((s, p) => s + Number(p.montant), 0);
  if (Math.abs(sum - expectedTotal) > 0.01) {
    return res.status(400).json({
      error: `Le total des tranches (${sum.toLocaleString('fr-FR')} DA) doit être égal au prix du groupe (${expectedTotal.toLocaleString('fr-FR')} DA).`,
    });
  }

 const { error: delErr } = await supabase.from('group_payment_periods').delete().eq('group_id', id);
  if (delErr) return res.status(500).json({ error: delErr.message });

  if (!group.date_debut) {
    return res.status(400).json({ error: "Impossible de calculer l'échéancier : ce groupe n'a pas de date de début." });
  }

  let currentDate = new Date(group.date_debut);
  const rows = periods.map((p, idx) => {
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + Number(p.jours_offset));
    return {
      group_id: id,
      numero: idx + 1,
      jours_offset: Number(p.jours_offset),
      montant: Number(p.montant),
      due_date: currentDate.toISOString().slice(0, 10),
    };
  });

  const { data, error } = await supabase.from('group_payment_periods').insert(rows).select();
  if (error) return res.status(500).json({ error: error.message });
  const { error: updErr } = await supabase.from('groups').update({ use_default_periods: false }).eq('id', id);
  if (updErr) return res.status(500).json({ error: updErr.message });

  const normalize = (list) => (list || [])
    .map((p) => `${p.jours_offset}:${p.montant}`)
    .sort()
    .join('|');
  const changed = normalize(beforePeriods) !== normalize(data);

  if (changed) {
    const periodsText = data.map((p) => `J+${p.jours_offset} : ${p.montant} DA`).join(' ; ');
    await logHistorique({
      req, perimetre: 'admin', action: 'modification', entite: 'groupe', entite_id: id,
      description: `a modifié l'échéancier du groupe "${groupBefore?.nom}" — ${periodsText}`,
      details: { periods: data },
    });
  }

  res.json(data);
};
const getMyGroups = async (req, res) => {
  const { data: teacher, error: tErr } = await supabase
    .from('teachers').select('id').eq('user_id', req.user.id).single();
  if (tErr || !teacher) return res.status(404).json({ error: 'Professeur introuvable' });

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Algiers' });
  const { data, error } = await supabase
    .from('groups')
    .select(`
      id, nom, formation_id, date_debut, date_fin, statut,
      formations:formation_id(id, nom, a_niveaux),
      teacher:teacher_id(id, user:user_id(nom, prenom)),
      niveau:niveau_id(id, nom)
    `)
    .eq('teacher_id', teacher.id)
    .eq('archived', false)
    .neq('statut', 'terminer')
    .or(`date_fin.is.null,date_fin.gte.${today}`);

  if (error) return res.status(500).json({ error: error.message });

  const groupIds = data.map((g) => g.id);

  let scheduleSummaries = {};
  try {
    scheduleSummaries = await getScheduleSummaries(groupIds);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  // Raw per-session rows so the frontend can filter "today" itself
  let schedulesByGroup = {};
  if (groupIds.length > 0) {
    const { data: rawSchedules, error: schedErr } = await supabase
      .from('schedules')
      .select('group_id, jour_semaine, heure_debut, heure_fin')
      .in('group_id', groupIds);
    if (schedErr) return res.status(500).json({ error: schedErr.message });
    (rawSchedules || []).forEach((s) => {
      (schedulesByGroup[s.group_id] ??= []).push(s);
    });
  }

  const result = await Promise.all(
    data.map(async (g) => {
      const { count } = await supabase
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', g.id)
        .eq('statut', 'confirmed')
        .eq('archived', false)
        .or('statut_scolarite.is.null,statut_scolarite.neq.abandonne');
      return {
        ...g,
        nb_etudiants: count ?? 0,
        schedules: schedulesByGroup[g.id] ?? [],
        jours_formation: scheduleSummaries[g.id]?.jours_formation ?? '',
        heure_formation: scheduleSummaries[g.id]?.heure_formation ?? '',
      };
    })
  );

  res.json(result);
};
module.exports = { getGroupsByFormation, createGroup, updateGroup, deleteGroup, getGroupEtudiants, getUnassignedStudents, archiveGroup, restoreGroup, getGroupPeriods, setGroupPeriods, getMyGroups };