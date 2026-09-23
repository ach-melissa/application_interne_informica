const express = require('express');
const router = express.Router();
const {
  getSalaireMensuel,
  validerSalaireMensuel,
  getHistoriqueSalaires,
} = require('../controllers/salairesMensuelsController');

router.get('/historique', getHistoriqueSalaires);
router.get('/', getSalaireMensuel);
router.post('/', validerSalaireMensuel);

module.exports = router;