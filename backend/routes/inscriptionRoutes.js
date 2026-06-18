const express = require('express');
const router = express.Router();
const { getInscriptions } = require('../controllers/inscriptionController');

router.get('/', getInscriptions);

module.exports = router;