const express = require('express');
const router = express.Router();
const {
  getGroupsByFormation,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupEtudiants,
} = require('../controllers/groupController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole('admin'));

router.get('/', getGroupsByFormation);
router.post('/', createGroup);
router.patch('/:id', updateGroup);
router.delete('/:id', deleteGroup);
router.get('/:id/etudiants', getGroupEtudiants);

module.exports = router;