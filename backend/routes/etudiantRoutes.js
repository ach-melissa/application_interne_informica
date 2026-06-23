const express = require('express');
const router = express.Router();
const { getEtudiants, updateInscription, createEtudiant, updateEtudiant, deleteEtudiant } = require('../controllers/etudiantController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', getEtudiants);
router.patch('/:id', updateInscription);
router.post('/', createEtudiant);
router.patch('/etudiant/:id', updateEtudiant);
router.delete('/:id', deleteEtudiant);
module.exports = router;
