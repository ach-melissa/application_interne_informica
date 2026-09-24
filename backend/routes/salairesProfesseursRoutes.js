const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware'); 
const {
  getProfesseurs, updateFormationRemuneration,
  getBilan, upsertBilanFormationDetail, addMouvement, deleteMouvement,
  setTotalOverride, validerBilan, envoyerBilan,
} = require('../controllers/salairesProfesseursController');
const router = express.Router();

router.use(verifyToken, requireRole('comptable', 'admin', 'super_admin'));

router.get('/', getProfesseurs);
router.put('/:teacherId/formations/:formationId', updateFormationRemuneration);
router.get('/:teacherId/bilan', getBilan);
router.put('/:teacherId/bilan/formation/:formationId', upsertBilanFormationDetail);
router.post('/:teacherId/bilan/mouvements', addMouvement);
router.delete('/mouvements/:mouvementId', deleteMouvement);
router.put('/:teacherId/bilan/total', setTotalOverride);
router.post('/:teacherId/bilan/valider', validerBilan);
router.post('/:teacherId/bilan/envoyer', envoyerBilan);

module.exports = router;