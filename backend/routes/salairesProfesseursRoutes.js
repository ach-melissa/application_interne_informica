const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware'); 
const { getProfesseurs, updateFormationRemuneration } = require('../controllers/salairesProfesseursController');

const router = express.Router();

router.use(verifyToken, requireRole('comptable', 'admin', 'super_admin'));

router.get('/', getProfesseurs);
router.put('/:teacherId/formations/:formationId', updateFormationRemuneration);

module.exports = router;