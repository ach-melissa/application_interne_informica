const express = require('express');
const router = express.Router();
const { getAttendance, createAttendance, updateAttendance, deleteAttendance, batchAttendance } = require('../controllers/attendanceController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole('admin', 'teacher'));
router.get('/', getAttendance);
router.post('/', createAttendance);
router.post('/batch', batchAttendance);
router.put('/:id', updateAttendance);
router.delete('/:id', deleteAttendance);

module.exports = router;