const express = require('express');
const router = express.Router();
const multer = require('multer');
const { generateAttestations, getTemplate, uploadTemplate, getNextRef } = require('../controllers/attestations');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/generate', generateAttestations);
router.get('/template/:formationId', getTemplate);
router.post('/template/:formationId', upload.single('template'), uploadTemplate);
router.get('/next-ref/:formationId', getNextRef);
module.exports = router;