const express = require('express');
const router = express.Router();
const { getEtudiants, updateInscription } = require('../controllers/etudiantController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole('admin'));

router.get('/', getEtudiants);
router.patch('/:id', updateInscription);

module.exports = router;