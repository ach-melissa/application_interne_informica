const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware'); // ⚠️ adapt the path if needed
const { getProfesseurs, updateFormationRemuneration } = require('../controllers/salairesProfesseursController');

const router = express.Router();

// NB: super_admin bypass in requireRole is not in the file you sent me,
// so I list it explicitly here.
router.use(verifyToken, requireRole('comptable', 'admin', 'super_admin'));

router.get('/', getProfesseurs);
router.put('/:teacherId/formations/:formationId', updateFormationRemuneration);

module.exports = router;