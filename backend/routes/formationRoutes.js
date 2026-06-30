const express = require('express');
const router = express.Router();
const { getFormations, createFormation, updateFormation, deleteFormation } = require('../controllers/formationController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', getFormations);
router.post('/', verifyToken, createFormation);
router.patch('/:id', verifyToken, updateFormation);
router.delete('/:id', verifyToken, deleteFormation);

module.exports = router;