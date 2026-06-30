const express = require('express');
const router = express.Router();
const { getInscriptions ,assignToGroup } = require('../controllers/inscriptionController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole('admin'));

router.get('/', getInscriptions);
router.patch('/:id/assign-group', verifyToken, requireRole('admin'), assignToGroup);

module.exports = router;