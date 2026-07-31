const express = require('express');
const router = express.Router();
const {
  getProfs,
  getProfGroups,
  getProfGroup,
  getProfGroupStudents,
  updateProfGroupStudent,
  updateProfGroupSchedule,
  getProfGroupAttendance,
  createProfGroupSession,
  updateProfGroupSession,
  deleteProfGroupSession,
  createAttendanceRecord,
  updateAttendanceRecord,
  deleteAttendanceRecord,
} = require('../controllers/profController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// ── Admin routes ───────────────────────────────────────────
router.get('/', verifyToken, requireRole('admin'), getProfs);
// ── Prof — own groups ──────────────────────────────────────
router.get('/me/groups', verifyToken, requireRole('prof'), getProfGroups);
router.get('/me/groups/:groupId', verifyToken, requireRole('prof'), getProfGroup);

// ── Prof — students ────────────────────────────────────────
router.get(
  '/me/groups/:groupId/students',
  verifyToken, requireRole('prof'),
  getProfGroupStudents
);
router.patch(
  '/me/groups/:groupId/students/:etudiantId',
  verifyToken, requireRole('prof'),
  updateProfGroupStudent
);

// ── Prof — schedule ────────────────────────────────────────
router.patch(
  '/me/groups/:groupId/schedule',
  verifyToken, requireRole('prof'),
  updateProfGroupSchedule
);

// ── Prof — sessions ────────────────────────────────────────
router.post(
  '/me/groups/:groupId/sessions',
  verifyToken, requireRole('prof'),
  createProfGroupSession
);
router.patch(
  '/me/groups/:groupId/sessions/:sessionId',
  verifyToken, requireRole('prof'),
  updateProfGroupSession
);
router.delete(
  '/me/groups/:groupId/sessions/:sessionId',
  verifyToken, requireRole('prof'),
  deleteProfGroupSession
);

// ── Prof — attendance records ──────────────────────────────
router.get(
  '/me/groups/:groupId/attendance',
  verifyToken, requireRole('prof'),
  getProfGroupAttendance
);
router.post(
  '/me/groups/:groupId/attendance',
  verifyToken, requireRole('prof'),
  createAttendanceRecord
);
router.patch(
  '/me/groups/:groupId/attendance/:recordId',
  verifyToken, requireRole('prof'),
  updateAttendanceRecord
);
router.delete(
  '/me/groups/:groupId/attendance/:recordId',
  verifyToken, requireRole('prof'),
  deleteAttendanceRecord
);

module.exports = router;