const express = require('express');
const router = express.Router();
const { getInscriptions } = require('../controllers/inscriptionController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole('admin'));

router.get('/', getInscriptions);

module.exports = router;