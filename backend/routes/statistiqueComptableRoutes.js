const express = require('express');
const router = express.Router();
const { getStatistiques } = require('../controllers/statistiqueComptableController');

// Ajuste le middleware d'auth selon la convention du projet, ex :
// const { requireRole } = require('../middleware/authMiddleware');
// router.get('/', requireRole('comptable'), getStatistiques);

router.get('/', getStatistiques);

module.exports = router;