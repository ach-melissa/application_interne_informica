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

module.exports = router;
