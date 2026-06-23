const supabase = require('../supabaseClient');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const getGroupPayments = async (req, res) => {
  const { groupId } = req.params;

  const { data: group, error: groupErr } = await supabase
    .from('groups')
    .select('id, formation_id, formation:formation_id(prix_etudiant)')
    .eq('id', groupId)
    .single();

  if (groupErr) return res.status(500).json({ error: groupErr.message });

  const total = group.formation?.prix_etudiant ?? 0;
  const formationId = group.formation_id;

  const { data: inscriptions, error: insErr } = await supabase
    .from('inscriptions')
    .select('etudiant_id, etudiant:etudiant_id(id, nom, prenom)')
    .eq('group_id', groupId);

  if (insErr) return res.status(500).json({ error: insErr.message });

  const etudiantIds = inscriptions.map((i) => i.etudiant_id);

  // ← CHANGED: added tranche, bon_photo, date_paiement to select
  const { data: payments, error: payErr } = await supabase
    .from('payments')
    .select('etudiant_id, montant, tranche, bon_photo, date_paiement')
    .eq('formation_id', formationId)
    .in('etudiant_id', etudiantIds.length ? etudiantIds : ['00000000-0000-0000-0000-000000000000']);

  if (payErr) return res.status(500).json({ error: payErr.message });

  const result = inscriptions.map((i) => {
    const studentPayments = payments.filter((p) => p.etudiant_id === i.etudiant_id);
    const paid = studentPayments.reduce((sum, p) => sum + Number(p.montant), 0);

    return {
      studentId: i.etudiant_id,
      nom: `${i.etudiant?.nom ?? ''} ${i.etudiant?.prenom ?? ''}`.trim(),
      total,
      paid,
      remaining: total - paid,
      // ← NEW: tranches array for the bons column in PaymentsTab
      tranches: studentPayments.map((p) => ({
        tranche: p.tranche,
        bon_photo: p.bon_photo,
        date_paiement: p.date_paiement,
      })),
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