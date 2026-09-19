const supabase = require('../supabaseClient');
const { resolveGroupPeriods, computeStudentTotal } = require('../utils/periods');
/**
 * GET /api/comptable/paiements
 * Returns all payments with nested etudiant + formation info (for Vue Globale).
 */

const getAllPayments = async (req, res) => {
  // ALL inscriptions, no statut/archived/abandonné filter — Comptable shows everyone.
  const { data: inscriptions, error: insErr } = await supabase
    .from('inscriptions')
    .select(`
      id, etudiant_id, formation_id, group_id, en_promotion, prix_promotion, statut_scolarite,
      etudiant:etudiant_id ( id, nom, prenom, telephone ),
      formation:formation_id ( id, nom, prix, prix_etudiant, prix_uniforme, a_niveaux ),
      niveau:niveau_id ( id, nom, prix ),
      group:group_id ( id, nom, formation_id, niveau_id, date_debut, date_fin, statut,
                        use_default_periods, en_promotion, prix_promotion,
                        teacher:teacher_id ( user:user_id ( nom, prenom ) ) )
    `);
  if (insErr) return res.status(500).json({ error: insErr.message });

  const { data: payments, error: payErr } = await supabase
    .from('payments')
    .select('id, etudiant_id, formation_id, montant, tranche, date_paiement, statut, bon_photo');
  if (payErr) return res.status(500).json({ error: payErr.message });

  const paymentsByKey = new Map();
  for (const p of payments) {
    const key = `${p.etudiant_id}_${p.formation_id}`;
    if (!paymentsByKey.has(key)) paymentsByKey.set(key, []);
    paymentsByKey.get(key).push(p);
  }

  // Show a student if they're in a group OR already have a payment — regardless of archived/abandonné.
  const relevant = inscriptions.filter((i) => {
    const key = `${i.etudiant_id}_${i.formation_id}`;
    return i.group_id != null || paymentsByKey.has(key);
  });

  const groupIds = [...new Set(relevant.map((i) => i.group?.id).filter(Boolean))];
  let allFormationPeriods = [], allGroupPeriods = [];
  if (groupIds.length) {
    const formationIds = [...new Set(relevant.map((i) => i.group?.formation_id).filter(Boolean))];
    const { data: fp } = await supabase
      .from('formation_payment_periods')
      .select('formation_id, niveau_id, numero, jours_offset, montant')
      .in('formation_id', formationIds.length ? formationIds : ['00000000-0000-0000-0000-000000000000']);
    allFormationPeriods = fp ?? [];

    const customGroupIds = relevant.filter((i) => i.group && !i.group.use_default_periods).map((i) => i.group.id);
    if (customGroupIds.length) {
      const { data: gp } = await supabase
        .from('group_payment_periods')
        .select('group_id, numero, jours_offset, montant')
        .in('group_id', customGroupIds);
      allGroupPeriods = gp ?? [];
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const EPSILON = 0.01;

  const rows = relevant.map((i) => {
    const key = `${i.etudiant_id}_${i.formation_id}`;
    const studentPayments = paymentsByKey.get(key) ?? [];
    const paid = studentPayments.reduce((s, p) => s + Number(p.montant), 0);
    const tranches = {};
    studentPayments.forEach((p) => {
      if (p.tranche != null) {
        tranches[p.tranche] = { montant: p.montant, date_paiement: p.date_paiement, statut: p.statut, bon_photo: p.bon_photo };
      }
    });

    let total, isOverdue = false;
    const group = i.group;

    if (group) {
      const baseTotal = i.formation?.prix_uniforme === false
        ? Number(i.niveau?.prix ?? 0)
        : Number(i.formation?.prix_etudiant ?? i.formation?.prix ?? 0);

      const periodsForFormation = allFormationPeriods.filter((p) => p.formation_id === group.formation_id);
      const periodsForNiveau = group.niveau_id
        ? periodsForFormation.filter((p) => p.niveau_id === group.niveau_id)
        : periodsForFormation.filter((p) => p.niveau_id === null);
      const formationPeriods = periodsForNiveau.length > 0 ? periodsForNiveau : periodsForFormation.filter((p) => p.niveau_id === null);
      const groupPeriods = allGroupPeriods.filter((p) => p.group_id === group.id);
      const resolvedPeriods = resolveGroupPeriods(group, formationPeriods, groupPeriods);
      const scheduleTotal = resolvedPeriods.reduce((s, p) => s + Number(p.montant), 0);

      total = computeStudentTotal(baseTotal, i, group);

      const lastPeriod = resolvedPeriods[resolvedPeriods.length - 1];
      const isPastFinalDueDate = !!lastPeriod?.due_date && lastPeriod.due_date <= todayStr;
      let running = 0, nextDue = null;
      for (const per of resolvedPeriods) {
        running += Number(per.montant);
        const expectedAtPeriod = scheduleTotal > 0 ? total * (running / scheduleTotal) : 0;
        if (paid < expectedAtPeriod - EPSILON) { nextDue = per.due_date; break; }
      }
      const isPastNextDue = !!nextDue && nextDue <= todayStr;
      const hasPaidNothing = paid <= EPSILON;
      const isAbandonne = i.statut_scolarite === 'abandonne';
      isOverdue = !isAbandonne && (
        (isPastFinalDueDate && paid < total - EPSILON) ||
        (isPastNextDue && hasPaidNothing)
      );
    } else {
      total = Number(i.formation?.prix_etudiant ?? i.formation?.prix ?? 0);
      isOverdue = false; // no group → no schedule → can't be judged "late"
    }

    return {
      etudiant_id: i.etudiant_id,
      formation_id: i.formation_id,
      etudiants: i.etudiant,
      formations: i.formation,
      groupe: group ?? null,
      professeurNom: group?.teacher?.user ? `${group.teacher.user.nom} ${group.teacher.user.prenom}` : '—',
      statutScolarite: i.statut_scolarite || 'en_cours',
      niveauNom: i.niveau?.nom ?? null,
      formationANiveaux: i.formation?.a_niveaux ?? false,
      enPromotion: i.en_promotion ?? false,
      prixPromotion: i.prix_promotion != null ? Number(i.prix_promotion) : null,
      groupEnPromotion: group?.en_promotion ?? false,
      groupPrixPromotion: group?.prix_promotion != null ? Number(group.prix_promotion) : null,
      total, paid, remaining: total - paid, isOverdue,
      tranches,
    };
  });

  res.json(rows);
};
/**
 * PATCH /api/comptable/paiements/:id
 * Update statut (and optionally montant) of a payment.
 */
const updatePaymentStatut = async (req, res) => {
  const { id } = req.params;
  const fields = {};
  if (req.body.statut  !== undefined) fields.statut  = req.body.statut;
  if (req.body.montant !== undefined) fields.montant = req.body.montant;

  const { data, error } = await supabase
    .from('payments')
    .update(fields)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

/**
 * POST /api/comptable/paiements
 * Create a new payment (tranche auto-numbered).
 */
const createPayment = async (req, res) => {
  const { etudiant_id, formation_id, montant, tranche, date_paiement, statut } = req.body;

  // Auto-number tranche if not provided
  let trancheNum = tranche;
  if (!trancheNum) {
    const { count } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('etudiant_id', etudiant_id)
      .eq('formation_id', formation_id);
    trancheNum = (count ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from('payments')
    .insert({
      etudiant_id,
      formation_id,
      montant: parseFloat(montant),
      tranche: trancheNum,
      date_paiement: date_paiement || new Date().toISOString().split('T')[0],
      statut: statut || 'payé',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

/**
 * GET /api/comptable/paiements/formation/:formationId
 * Returns rows GROUPED BY GROUPE for the tranche-matrix table:
 * [
 *   {
 *     groupId: uuid,
 *     groupNom: 'Groupe A',
 *     students: [
 *       { studentId: uuid, nom: 'Nom Prénom', tranches: { 1: { montant }, 2: { montant }, ... } },
 *       ...
 *     ]
 *   },
 *   ...
 * ]
 */

const getFormationPayments = async (req, res) => {
  const { formationId } = req.params;

  // 1 – Get all students enrolled in this formation, with their group info.
  // !inner is required, otherwise the formation_id filter on the embedded
  // `group` resource is silently ignored by PostgREST.
  const { data: inscriptions, error: insErr } = await supabase
    .from('inscriptions')
    .select(`
      etudiant_id,
      etudiant:etudiant_id ( id, nom, prenom ),
      group:group_id!inner ( id, nom, formation_id )
    `)
    .eq('group.formation_id', formationId);

  if (insErr) return res.status(500).json({ error: insErr.message });

  // De-duplicate (etudiant_id + group_id) pairs
  const seen = new Set();
  const students = [];
  for (const ins of inscriptions) {
    if (!ins.etudiant || !ins.group) continue;
    const key = `${ins.etudiant_id}_${ins.group.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    students.push({
      id: ins.etudiant_id,
      nom: ins.etudiant.nom,
      prenom: ins.etudiant.prenom,
      groupId: ins.group.id,
      groupNom: ins.group.nom,
    });
  }

  if (students.length === 0) return res.json([]);

  const etudiantIds = students.map((s) => s.id);

  // 2 – Get all payments for this formation + these students
  const { data: payments, error: payErr } = await supabase
    .from('payments')
    .select('id, etudiant_id, montant, tranche')
    .eq('formation_id', formationId)
    .in('etudiant_id', etudiantIds)
    .order('tranche', { ascending: true });

  if (payErr) return res.status(500).json({ error: payErr.message });

  // 3 – Build per-student tranche map
  const studentRows = students.map((s) => {
    const studentPayments = payments.filter((p) => p.etudiant_id === s.id);
    const tranches = {};
    for (const p of studentPayments) {
      tranches[p.tranche] = { montant: p.montant };
    }
    return {
      studentId: s.id,
      nom: `${s.nom ?? ''} ${s.prenom ?? ''}`.trim(),
      groupId: s.groupId,
      groupNom: s.groupNom,
      tranches,
    };
  });

  // 4 – Bucket students into their group
  const groupsMap = new Map();
  for (const row of studentRows) {
    if (!groupsMap.has(row.groupId)) {
      groupsMap.set(row.groupId, {
        groupId: row.groupId,
        groupNom: row.groupNom,
        students: [],
      });
    }
    groupsMap.get(row.groupId).students.push({
      studentId: row.studentId,
      nom: row.nom,
      tranches: row.tranches,
    });
  }

  // Sort groups by name for stable display order
  const result = Array.from(groupsMap.values()).sort((a, b) =>
    (a.groupNom ?? '').localeCompare(b.groupNom ?? '')
  );

  res.json(result);
};

module.exports = { getAllPayments, updatePaymentStatut, createPayment, getFormationPayments };