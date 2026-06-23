const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { getSessions, createSession, deleteSession, updateSession } = require('../controllers/sessionController');

router.use(verifyToken, requireRole('admin'));
router.get('/', getSessions);
router.post('/', createSession);
router.delete('/:id', deleteSession);
router.patch('/:id', verifyToken, requireRole('admin'), updateSession);

module.exports = router;