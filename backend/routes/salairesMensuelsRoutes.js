const express = require('express');
const router = express.Router();
const {
  getSalaireMensuel,
  validerSalaireMensuel,
} = require('../controllers/salairesMensuelsController');

router.get('/', getSalaireMensuel);
router.post('/', validerSalaireMensuel);

module.exports = router;