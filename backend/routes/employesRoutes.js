const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const {
  getEmployes,
  getEmployeById,
  createEmploye,
  updateEmploye,
  deleteEmploye,
} = require('../controllers/employesController');

const auth = [verifyToken, requireRole('admin', 'comptable')];

router.get('/', ...auth, getEmployes);
router.get('/:id', ...auth, getEmployeById);
router.post('/', ...auth, createEmploye);
router.put('/:id', ...auth, updateEmploye);
router.delete('/:id', ...auth, deleteEmploye);

module.exports = router;