const express = require('express');
const router = express.Router();
const { getEtudiants, updateInscription, createEtudiant, updateEtudiant } = require('../controllers/etudiantController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole('admin'));
router.get('/', getEtudiants);
router.patch('/:id', updateInscription);
router.post('/', createEtudiant);
router.patch('/etudiant/:id', updateEtudiant);

module.exports = router;