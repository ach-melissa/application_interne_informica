const express = require('express');
const router = express.Router();
const { getGroupSchedule, createSchedule, updateSchedule, deleteSchedule, getProfSchedule } = require('../controllers/scheduleController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Admin
router.get('/group/:groupId', verifyToken, requireRole('admin'), getGroupSchedule);
router.post('/', verifyToken, requireRole('admin'), createSchedule);
router.put('/:id', verifyToken, requireRole('admin'), updateSchedule);
router.delete('/:id', verifyToken, requireRole('admin'), deleteSchedule);

// Prof
router.get('/me', verifyToken, requireRole('prof'), getProfSchedule);

module.exports = router;