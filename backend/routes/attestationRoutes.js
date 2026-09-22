const express = require('express');
const router = express.Router();
const multer = require('multer');
const { generateAttestations, getTemplate, uploadTemplate } = require('../controllers/attestations');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/generate', generateAttestations);
router.get('/template/:formationId', getTemplate);
router.post('/template/:formationId', upload.single('template'), uploadTemplate);

module.exports = router;