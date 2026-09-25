const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const {
  getProfesseurs, getProfesseur, updateFormationRemuneration,
  getBilan, upsertBilanFormationDetail, addMouvement, deleteMouvement,
  setTotalOverride, validerBilan, envoyerBilan, setPaye,
  upload, uploadBonMouvement,
} = require('../controllers/salairesProfesseursController');
const router = express.Router();

router.use(verifyToken, requireRole('comptable', 'admin', 'super_admin'));

router.get('/', getProfesseurs);
router.get('/:teacherId', getProfesseur);
router.put('/:teacherId/formations/:formationId', updateFormationRemuneration);
router.get('/:teacherId/bilan', getBilan);
router.put('/:teacherId/bilan/formation/:formationId', upsertBilanFormationDetail);
router.post('/:teacherId/bilan/mouvements', addMouvement);
router.post('/:teacherId/bilan/mouvements/:mouvementId/bons', upload.single('bon'), uploadBonMouvement);
router.delete('/mouvements/:mouvementId', deleteMouvement);
router.put('/:teacherId/bilan/total', setTotalOverride);
router.post('/:teacherId/bilan/valider', validerBilan);
router.post('/:teacherId/bilan/envoyer', envoyerBilan);
router.put('/:teacherId/bilan/paye', setPaye);

module.exports = router;