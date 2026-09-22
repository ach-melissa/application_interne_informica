const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const {
  getMouvements,
  createMouvement,
  updateMouvement,
  deleteMouvement,
  uploadBon,
  deleteBon,
} = require('../controllers/mouvementsController');

router.get('/', getMouvements);
router.post('/', createMouvement);
router.put('/:id', updateMouvement);
router.delete('/:id', deleteMouvement);
router.post('/:id/bons', upload.single('fichier'), uploadBon);
router.delete('/:id/bons/:bonId', deleteBon);

module.exports = router;