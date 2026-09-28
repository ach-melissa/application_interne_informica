const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const {
  getSalaireMensuel,
  validerSalaireMensuel,
  getHistoriqueSalaires,
} = require('../controllers/salairesMensuelsController');

const auth = [verifyToken, requireRole('admin', 'comptable')];

router.get('/historique', ...auth, getHistoriqueSalaires);
router.get('/', ...auth, getSalaireMensuel);
router.post('/', ...auth, validerSalaireMensuel);

module.exports = router;