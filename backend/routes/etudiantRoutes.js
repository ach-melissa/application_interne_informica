const express = require('express');
const router = express.Router();
const { upload, getEtudiants, updateInscription, createEtudiant, updateEtudiant, deleteEtudiant, getGroupsByFormation, assignGroup } = require('../controllers/etudiantController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', getEtudiants);
router.post('/', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'piece_identite', maxCount: 1 }]), createEtudiant);
router.patch('/etudiant/:id', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'piece_identite', maxCount: 1 }]), updateEtudiant);
router.get('/formations/:formation_id/groups', verifyToken, getGroupsByFormation);
router.patch('/:id/group', verifyToken, assignGroup);
router.patch('/:id', updateInscription);
router.delete('/:id', deleteEtudiant);

module.exports = router;