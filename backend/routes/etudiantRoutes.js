const express = require('express');
const router = express.Router();
const {
  upload, getEtudiants, updateInscription, createEtudiant, updateEtudiant,
  deleteEtudiant, getGroupsByFormation, assignGroup, archiveInscription, restoreInscription,
} = require('../controllers/etudiantController');
const { verifyToken, requireRole, verifyTokenOptional } = require('../middleware/authMiddleware');

// Public (formulaire en ligne) — pas de token requis, mais on le lit s'il existe
router.post('/', verifyTokenOptional, upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'piece_identite', maxCount: 1 }]), createEtudiant);

// Admin uniquement — token requis
router.get('/', verifyToken, getEtudiants);
router.patch('/etudiant/:id', verifyToken, upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'piece_identite', maxCount: 1 }]), updateEtudiant);
router.get('/formations/:formation_id/groups', verifyToken, getGroupsByFormation);
router.patch('/:id/archive', verifyToken, archiveInscription);
router.patch('/:id/restore', verifyToken, restoreInscription);
router.patch('/:id/group', verifyToken, assignGroup);
router.patch('/:id', verifyToken, updateInscription);
router.delete('/:id', verifyToken, deleteEtudiant);

module.exports = router;