const supabase = require('../supabaseClient');
const { resolveGroupPeriods, computeStudentTotal } = require('../utils/periods');

const SEND_INTERVALS = [7, 3, 3, 3]; // days to wait before 2nd, 3rd, 4th, 5th... notification (repeats 3 after this)

const getOverdueStudentsForGroup = async (group) => {
  let formationPeriodsQuery = supabase
    .from('formation_payment_periods')
    .select('numero, jours_offset, montant')
    .eq('formation_id', group.formation_id);
  formationPeriodsQuery = group.niveau_id
    ? formationPeriodsQuery.eq('niveau_id', group.niveau_id)
    : formationPeriodsQuery.is('niveau_id', null);
  const { data: formationPeriods } = await formationPeriodsQuery.order('numero', { ascending: true });

  let groupPeriods = [];
  if (!group.use_default_periods) {
    const { data } = await supabase
      .from('group_payment_periods')
      .select('numero, jours_offset, montant')
      .eq('group_id', group.id)
      .order('numero', { ascending: true });
    groupPeriods = data ?? [];
  }

  const resolvedPeriods = resolveGroupPeriods(group, formationPeriods ?? [], groupPeriods);
  const scheduleTotal = resolvedPeriods.reduce((sum, p) => sum + Number(p.montant), 0);
  const today = new Date().toISOString().split('T')[0];

  const cumulativeRawToday = resolvedPeriods
    .filter((p) => p.due_date && p.due_date <= today)
    .reduce((sum, p) => sum + Number(p.montant), 0);
  const fractionDueToday = scheduleTotal > 0 ? cumulativeRawToday / scheduleTotal : 0;
  if (fractionDueToday <= 0) return []; // nothing due yet, nobody can be late

   const baseTotal = group.formation?.prix_uniforme === false
    ? Number(group.niveau?.prix ?? 0)
    : Number(group.formation?.prix_etudiant ?? group.formation?.prix ?? 0);
  const { data: inscriptions } = await supabase
    .from('inscriptions')
    .select('id, etudiant_id, statut_scolarite, en_promotion, prix_promotion, etudiant:etudiant_id(nom, prenom)')
    .eq('group_id', group.id)
    .or('statut_scolarite.is.null,statut_scolarite.neq.abandonne');
  if (!inscriptions?.length) return [];
  const etudiantIds = inscriptions.map((i) => i.etudiant_id);
  const { data: payments } = await supabase
    .from('payments')
    .select('etudiant_id, montant')
    .eq('formation_id', group.formation_id)
    .in('etudiant_id', etudiantIds);

  const EPSILON = 0.01;
  const overdue = [];
  for (const i of inscriptions) {
    const paid = (payments ?? [])
      .filter((p) => p.etudiant_id === i.etudiant_id)
      .reduce((sum, p) => sum + Number(p.montant), 0);
    const total = computeStudentTotal(baseTotal, i, group);
    const expectedToday = total * fractionDueToday;
    if (expectedToday > 0 && paid < expectedToday - EPSILON) {
      overdue.push({ etudiant_id: i.etudiant_id, nom: `${i.etudiant?.nom ?? ''} ${i.etudiant?.prenom ?? ''}`.trim() });
    }
  }
  return overdue;
};

const runPaymentAlerts = async () => {
  const today = new Date().toISOString().split('T')[0];

    const { data: groups, error } = await supabase
    .from('groups')
    .select('id, nom, formation_id, niveau_id, en_promotion, prix_promotion, date_debut, date_fin, use_default_periods, formations:formation_id(nom), formation:formation_id(prix, prix_etudiant, prix_uniforme), niveau:niveau_id(prix)')
    .eq('archived', false);
  if (error) { console.error('paymentAlerts: failed to load groups', error); return; }

  console.log(`paymentAlerts: checking ${groups.length} groups, today=${today}`); // add this

  for (const group of groups) {
    const overdue = await getOverdueStudentsForGroup(group);
    console.log(`paymentAlerts: group ${group.nom} → ${overdue.length} overdue`, overdue.map(o => o.nom)); // add this

    const { data: tracker } = await supabase
      .from('group_payment_alerts')
      .select('*')
      .eq('group_id', group.id)
      .maybeSingle();

    if (overdue.length === 0) {
      // Everyone caught up — reset so a future late payment starts a fresh cycle.
      if (tracker && (tracker.send_count > 0 || tracker.active === false)) {
        await supabase.from('group_payment_alerts')
          .update({ send_count: 0, active: true, last_sent_at: null })
          .eq('group_id', group.id);
      }
      continue;
    }

    if (!tracker) {
      // First time this group has ever had overdue students — send immediately.
      await sendGroupAlert(group, overdue, 1);
      await supabase.from('group_payment_alerts')
        .insert({ group_id: group.id, send_count: 1, last_sent_at: today, active: true });
      continue;
    }

    if (!tracker.active) continue;

    const isFinished = group.date_fin && group.date_fin < today;

    // Non-finished: 7, then 3 repeating forever. Finished: every 7 days forever.
    const requiredGap = isFinished
      ? 7
      : (SEND_INTERVALS[tracker.send_count - 1] ?? SEND_INTERVALS[SEND_INTERVALS.length - 1]);

    const daysSinceLastSend = tracker.last_sent_at
      ? Math.floor((new Date(today) - new Date(tracker.last_sent_at)) / (1000 * 60 * 60 * 24))
      : Infinity;

    if (daysSinceLastSend >= requiredGap) {
      const newCount = tracker.send_count + 1;
      await sendGroupAlert(group, overdue, newCount);
      await supabase.from('group_payment_alerts')
        .update({ send_count: newCount, last_sent_at: today, active: true })
        .eq('group_id', group.id);
    }
  }
};

const sendGroupAlert = async (group, overdueStudents, sendCount) => {
  await supabase.from('notifications').insert({
    type: 'retard_paiement',
    titre: `${overdueStudents.length} étudiant(s) en retard de paiement`,
    message: `${group.formations?.nom ?? 'Formation'} — Groupe ${group.nom}`,
    data: {
      group_id: group.id,
      formation_id: group.formation_id,
      formation_nom: group.formations?.nom,
      group_nom: group.nom,
      etudiants: overdueStudents,
      send_count: sendCount,
    },
    lu: false,
    lu_admin: false,
  });
};

module.exports = { runPaymentAlerts };