const express = require('express');
const router  = express.Router();
const {
  getStats,
  getPaiements, createPaiement, updatePaiement,
  getSalaires,  createSalaire,  updateSalaire,
  getEtudiants, getFormations,  getStaff,
} = require('../controllers/comptableController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const {
  getAllPayments,
  updatePaymentStatut,
  createPayment,
  getFormationPayments,
} = require('../controllers/comptablePaymentController');

const auth = [verifyToken, requireRole('admin', 'comptable')];
const {
  getAutresRevenus, createAutreRevenu, updateAutreRevenu, deleteAutreRevenu,
  getCategories, addCategorie, renameCategorie, removeCategorie,
} = require('../controllers/comptableAutresRevenusController');

const {
  getCharges, getChargeCategories, createCharge, updateCharge, deleteCharge,
} = require('../controllers/comptableChargesController');

// Dashboard
router.get('/stats',              ...auth, getStats);

// ── Paiements (new controller replaces old handlers) ──────────────────────
// IMPORTANT: specific route /paiements/formation/:id MUST come before /paiements/:id
router.get('/paiements/formation/:formationId', ...auth, getFormationPayments);
router.get   ('/paiements',     ...auth, getAllPayments);
router.post  ('/paiements',     ...auth, createPayment);
router.patch ('/paiements/:id', ...auth, updatePaymentStatut);

// Salaires
router.get('/salaires',           ...auth, getSalaires);
router.post('/salaires',          ...auth, createSalaire);
router.patch('/salaires/:id',     ...auth, updateSalaire);

// Select helpers
router.get('/etudiants',          ...auth, getEtudiants);
router.get('/formations',         ...auth, getFormations);
router.get('/staff',              ...auth, getStaff);

// Autres revenus
router.get   ('/autres-revenus',            ...auth, getAutresRevenus);
router.post  ('/autres-revenus',            ...auth, createAutreRevenu);
router.patch ('/autres-revenus/:id',        ...auth, updateAutreRevenu);
router.delete('/autres-revenus/:id',        ...auth, deleteAutreRevenu);
router.get   ('/autres-revenus/categories', ...auth, getCategories);
router.post  ('/autres-revenus/categories', ...auth, addCategorie);
router.patch ('/autres-revenus/categories', ...auth, renameCategorie);
router.delete('/autres-revenus/categories', ...auth, removeCategorie);


// Charges (formation / autre)
router.get   ('/charges/categories', ...auth, getChargeCategories);
router.get   ('/charges',            ...auth, getCharges);
router.post  ('/charges',            ...auth, createCharge);
router.patch ('/charges/:id',        ...auth, updateCharge);
router.delete('/charges/:id',        ...auth, deleteCharge);

module.exports = router;
