const supabase = require('../supabaseClient');
const multer = require('multer');
const { resolveGroupPeriods, computeStudentTotal } = require('../utils/periods');
const upload = multer({ storage: multer.memoryStorage() });

const getGroupPayments = async (req, res) => {
  const { groupId } = req.params;

  const { data: group, error: groupErr } = await supabase
    .from('groups')
    .select('id, formation_id, en_promotion, prix_promotion, date_debut, use_default_periods, formation:formation_id(prix, prix_etudiant)')
    .eq('id', groupId)
    .single();
  if (groupErr) return res.status(500).json({ error: groupErr.message });

  const baseTotal = Number(group.formation?.prix_etudiant ?? group.formation?.prix ?? 0);
  const formationId = group.formation_id;

  const { data: formationPeriods } = await supabase
    .from('formation_payment_periods')
    .select('numero, jours_offset, montant')
    .eq('formation_id', formationId)
    .order('numero', { ascending: true });

  let groupPeriods = [];
  if (!group.use_default_periods) {
    const { data } = await supabase
      .from('group_payment_periods')
      .select('numero, jours_offset, montant')
      .eq('group_id', groupId)
      .order('numero', { ascending: true });
    groupPeriods = data ?? [];
  }

  // Same schedule (dates + montants) applies to every student in the
  // group, whether it comes from the formation template or the group's
  // own custom échéancier — resolveGroupPeriods already picks the right one.
  const resolvedPeriods = resolveGroupPeriods(group, formationPeriods ?? [], groupPeriods);
  const scheduleTotal = resolvedPeriods.reduce((sum, p) => sum + Number(p.montant), 0);

  const today = new Date().toISOString().split('T')[0];

  // Raw amount "due by today" according to the schedule's own montants.
  const cumulativeRawToday = resolvedPeriods
    .filter((p) => p.due_date && p.due_date <= today)
    .reduce((sum, p) => sum + Number(p.montant), 0);

  // What fraction of the whole schedule is due by today. This is the key
  // piece: a promo'd student doesn't owe the schedule's raw montants, they
  // owe the same PROPORTION of their own total. If a period's montant
  // doesn't match a student's price 1:1 (promo cases), we still judge them
  // fairly by "how much of the timeline has elapsed", not raw DA amounts.
  const fractionDueToday = scheduleTotal > 0 ? cumulativeRawToday / scheduleTotal : 0;

  const { data: inscriptions, error: insErr } = await supabase
    .from('inscriptions')
    .select('id, etudiant_id, statut_scolarite, en_promotion, prix_promotion, etudiant:etudiant_id(id, nom, prenom, telephone)')
    .eq('group_id', groupId);
  if (insErr) return res.status(500).json({ error: insErr.message });

  const etudiantIds = inscriptions.map((i) => i.etudiant_id);
  const { data: payments, error: payErr } = await supabase
    .from('payments')
    .select('etudiant_id, montant, tranche, bon_photo, date_paiement')
    .eq('formation_id', formationId)
    .in('etudiant_id', etudiantIds.length ? etudiantIds : ['00000000-0000-0000-0000-000000000000']);
  if (payErr) return res.status(500).json({ error: payErr.message });

  // Small tolerance so floating point rounding doesn't falsely flag "late".
  const EPSILON = 0.01;

  const result = inscriptions.map((i) => {
    const studentPayments = payments.filter((p) => p.etudiant_id === i.etudiant_id);
    const paid = studentPayments.reduce((sum, p) => sum + Number(p.montant), 0);

    // Respects student promo > group promo > formation price already.
    const total = computeStudentTotal(baseTotal, i, group);

    // This student's own expected-cumulative-by-today, scaled to THEIR price.
    const expectedToday = total * fractionDueToday;

    const isOverdue = expectedToday > 0 && paid < expectedToday - EPSILON;
    const overdueAmount = isOverdue ? expectedToday - paid : 0;

    // Per-period breakdown, same proportional logic, for future detail views.
    let runningRaw = 0;
    const periodsStatus = resolvedPeriods.map((per) => {
      runningRaw += Number(per.montant);
      const cumulativeFraction = scheduleTotal > 0 ? runningRaw / scheduleTotal : 0;
      const expectedAtPeriod = total * cumulativeFraction;
      const isPastDue = per.due_date && per.due_date <= today;
      const status = paid >= expectedAtPeriod - EPSILON ? 'paye' : isPastDue ? 'en_retard' : 'a_venir';
      return { numero: per.numero, due_date: per.due_date, status };
    });

    return {
      studentId: i.etudiant_id,
      inscriptionId: i.id,
      nom: `${i.etudiant?.nom ?? ''} ${i.etudiant?.prenom ?? ''}`.trim(),
            telephone: i.etudiant?.telephone ?? null,
      statutScolarite: i.statut_scolarite || 'en_cours',
      enPromotion: i.en_promotion ?? false,
      prixPromotion: i.prix_promotion != null ? Number(i.prix_promotion) : null,
      total, paid, remaining: total - paid, isOverdue, overdueAmount,
      periodsStatus,
      tranches: studentPayments.map((p) => ({ tranche: p.tranche, bon_photo: p.bon_photo, date_paiement: p.date_paiement })),
    };
  });

  res.json(result);
};
const getStudentPaymentHistory = async (req, res) => {
  const { etudiantId, formationId } = req.params;

  // ← CHANGED: added bon_photo to select
  const { data, error } = await supabase
    .from('payments')
    .select('id, montant, date_paiement, tranche, statut, bon_photo')
    .eq('etudiant_id', etudiantId)
    .eq('formation_id', formationId)
    .order('date_paiement', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const createPayment = async (req, res) => {
  const { etudiant_id, formation_id, montant } = req.body;

  const { count, error: countErr } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('etudiant_id', etudiant_id)
    .eq('formation_id', formation_id);

  if (countErr) return res.status(500).json({ error: countErr.message });

  const { data, error } = await supabase
    .from('payments')
    .insert({
      etudiant_id,
      formation_id,
      montant,
      tranche: (count ?? 0) + 1,
      date_paiement: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const updatePayment = async (req, res) => {
  const { id } = req.params;
  const { montant } = req.body;

  const { data, error } = await supabase
    .from('payments')
    .update({ montant })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

const deletePayment = async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
};

// ← NEW: upload photo bon for a payment
const uploadBon = async (req, res) => {
  const { id } = req.params;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Aucun fichier reçu' });

  const ext = file.mimetype.split('/')[1] || 'jpg';
  const path = `${id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('bons-paiement')
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });

  if (uploadError) return res.status(500).json({ error: uploadError.message });

  const { data: { publicUrl } } = supabase.storage
    .from('bons-paiement')
    .getPublicUrl(path);

  const { data, error } = await supabase
    .from('payments')
    .update({ bon_photo: publicUrl })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ bon_photo: publicUrl, payment: data });
};

module.exports = {
  getGroupPayments,
  getStudentPaymentHistory,
  createPayment,
  updatePayment,
  deletePayment,
  uploadBon,
  upload,
};