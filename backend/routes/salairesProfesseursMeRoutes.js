// salairesProfesseursMeRoutes.js  (nouveau fichier, petit)
const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { getMesSalaires } = require('../controllers/salairesProfesseursController');
const router = express.Router();

router.get('/me', verifyToken, requireRole('prof'), getMesSalaires);

module.exports = router;