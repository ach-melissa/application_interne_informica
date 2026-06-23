const express = require('express');
const router = express.Router();
const { getFormations } = require('../controllers/formationController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');


router.get('/', getFormations);

module.exports = router;