const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const {
  getMouvements,
  createMouvement,
  updateMouvement,
  deleteMouvement,
  uploadBon,
  deleteBon,
} = require('../controllers/mouvementsController');

const auth = [verifyToken, requireRole('admin', 'comptable')];

router.get('/', ...auth, getMouvements);
router.post('/', ...auth, createMouvement);
router.put('/:id', ...auth, updateMouvement);
router.delete('/:id', ...auth, deleteMouvement);
router.post('/:id/bons', ...auth, upload.single('fichier'), uploadBon);
router.delete('/:id/bons/:bonId', ...auth, deleteBon);

module.exports = router;