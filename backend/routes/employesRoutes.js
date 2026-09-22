const express = require('express');
const router = express.Router();
const {
  getEmployes,
  getEmployeById,
  createEmploye,
  updateEmploye,
  deleteEmploye,
} = require('../controllers/employesController');

router.get('/', getEmployes);
router.get('/:id', getEmployeById);
router.post('/', createEmploye);
router.put('/:id', updateEmploye);
router.delete('/:id', deleteEmploye);

module.exports = router;