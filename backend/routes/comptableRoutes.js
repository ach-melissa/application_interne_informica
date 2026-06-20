const express = require('express');
const router  = express.Router();
const {
  getStats,
  getPaiements, createPaiement, updatePaiement,
  getSalaires,  createSalaire,  updateSalaire,
  getEtudiants, getFormations,  getStaff,
} = require('../controllers/comptableController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const auth = [verifyToken, requireRole('admin', 'comptable')];

// Dashboard
router.get('/stats',              ...auth, getStats);

// Paiements
router.get('/paiements',          ...auth, getPaiements);
router.post('/paiements',         ...auth, createPaiement);
router.patch('/paiements/:id',    ...auth, updatePaiement);

// Salaires
router.get('/salaires',           ...auth, getSalaires);
router.post('/salaires',          ...auth, createSalaire);
router.patch('/salaires/:id',     ...auth, updateSalaire);

// Select helpers
router.get('/etudiants',          ...auth, getEtudiants);
router.get('/formations',         ...auth, getFormations);
router.get('/staff',              ...auth, getStaff);

module.exports = router;