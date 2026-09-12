const express = require('express');
const router = express.Router();
const {
  getAttendance, createAttendance, updateAttendance, deleteAttendance, batchAttendance,
  getRattrapageCandidates, createRattrapage, deleteRattrapage, deleteRattrapageStudent, getPresenceCounts,
  getGroupRattrapages,
} = require('../controllers/attendanceController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole('admin', 'teacher'));
router.get('/', getAttendance);
router.post('/', createAttendance);
router.post('/batch', batchAttendance);

router.get('/rattrapage-candidates', getRattrapageCandidates);
router.post('/rattrapage', createRattrapage);
router.delete('/rattrapage-student', deleteRattrapageStudent);
router.delete('/rattrapage/:id', deleteRattrapage);
router.get('/presence-counts', getPresenceCounts);
router.get('/group-rattrapages', getGroupRattrapages);

router.put('/:id', updateAttendance);
router.delete('/:id', deleteAttendance);

module.exports = router;