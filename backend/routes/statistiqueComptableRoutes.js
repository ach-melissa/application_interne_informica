const express = require('express');
const router = express.Router();
const { getStatistiques, getRapportMensuel } = require('../controllers/statistiqueComptableController');

// Ajuste le middleware d'auth selon la convention du projet, ex :
// const { requireRole } = require('../middleware/authMiddleware');
// router.get('/', requireRole('comptable'), getStatistiques);
// router.get('/rapport-mensuel', requireRole('comptable'), getRapportMensuel);

router.get('/', getStatistiques);
router.get('/rapport-mensuel', getRapportMensuel);

module.exports = router;