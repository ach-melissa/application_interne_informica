const express = require('express');
const router = express.Router();
const { getFormations, createFormation } = require('../controllers/formationController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', getFormations);
router.post('/', verifyToken, createFormation);

module.exports = router;