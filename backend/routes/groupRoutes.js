const express = require('express');
const router = express.Router();
const {
  getGroupsByFormation,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupEtudiants,
  getUnassignedStudents,
  archiveGroup,
  restoreGroup,
  getGroupPeriods,
  setGroupPeriods,
  getMyGroups,
} = require('../controllers/groupController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// route prof — doit être déclarée avant le router.use(admin) ci-dessous
router.get('/me', verifyToken, requireRole('prof'), getMyGroups);

router.use(verifyToken, requireRole('admin'));

router.get('/', getGroupsByFormation);
router.post('/', createGroup);
router.patch('/:id', updateGroup);
router.delete('/:id', deleteGroup);
router.patch('/:id/archive', archiveGroup);
router.patch('/:id/restore', restoreGroup);
router.get('/:id/etudiants', getGroupEtudiants);
router.get('/formation/:formation_id/unassigned', getUnassignedStudents);
router.get('/:id/periods', getGroupPeriods);
router.put('/:id/periods', setGroupPeriods);

module.exports = router;