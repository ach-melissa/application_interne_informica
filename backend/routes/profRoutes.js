const express = require('express');
const router = express.Router();
const { getProfs, getProfPointage } = require('../controllers/profController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, requireRole('admin'), getProfs);
router.get('/:id/pointage', verifyToken, requireRole('admin'), getProfPointage);

module.exports = router;