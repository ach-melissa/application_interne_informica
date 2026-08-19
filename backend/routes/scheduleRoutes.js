const express = require('express');
const router = express.Router();
const { getGroupSchedule, createSchedule, updateSchedule, deleteSchedule, renameSalle, getProfSchedule, getSchedulesByFormation, getAllSchedules, getJours, getSalles, createSalle, deleteSalle } = require('../controllers/scheduleController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
// Prof
router.get('/me', verifyToken, requireRole('prof'), getProfSchedule);

// Admin
router.get('/group/:groupId', verifyToken, requireRole('admin'), getGroupSchedule);
router.post('/', verifyToken, requireRole('admin'), createSchedule);
router.put('/:id', verifyToken, requireRole('admin'), updateSchedule);
router.delete('/:id', verifyToken, requireRole('admin'), deleteSchedule);
router.patch('/salle/rename', verifyToken, requireRole('admin'), renameSalle);
router.delete('/salle/:id', verifyToken, requireRole('admin'), deleteSalle);
router.get('/formation/:formation_id', verifyToken, requireRole('admin'), getSchedulesByFormation);
router.get('/jours', verifyToken, getJours);
router.get('/salles', verifyToken, getSalles);
router.post('/salles', verifyToken, requireRole('admin'), createSalle);
router.get('/', verifyToken, requireRole('admin'), getAllSchedules);

module.exports = router;