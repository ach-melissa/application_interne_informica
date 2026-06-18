const express = require('express');
const router = express.Router();
const { getEtudiants, updateInscription } = require('../controllers/etudiantController');

router.get('/', getEtudiants);
router.patch('/:id', updateInscription);

module.exports = router;