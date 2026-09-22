const express = require('express');
const router = express.Router();
const { generateAttestations } = require('../controllers/attestations');

router.post('/generate', generateAttestations);

module.exports = router;