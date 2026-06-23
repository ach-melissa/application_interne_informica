const supabase = require('../supabaseClient');

/**
 * GET /api/comptable/paiements
 * Returns all payments with nested etudiant + formation info (for Vue Globale).
 */
const getAllPayments = async (req, res) => {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      id,
      montant,
      date_paiement,
      tranche,
      statut,
      etudiant_id,
      formation_id,
      etudiants:etudiant_id ( id, nom, prenom ),
      formations:formation_id ( id, nom )
    `)
    .order('date_paiement', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
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