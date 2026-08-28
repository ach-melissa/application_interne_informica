const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const notifCtrl = require('../controllers/notificationController');

router.post('/demande-salle', verifyToken, requireRole('prof'), notifCtrl.demanderSalle);
router.get('/', verifyToken, notifCtrl.listerNotifications);
router.get('/mes-demandes', verifyToken, notifCtrl.mesDemandes);
router.patch('/:id/lu', verifyToken, notifCtrl.marquerLu);
router.patch('/:id/traiter', verifyToken, requireRole('admin'), notifCtrl.traiterNotification);
router.patch('/:id/modifier-salle', verifyToken, requireRole('admin'), notifCtrl.modifierSalleAssignee);
router.patch('/:id/proposer', verifyToken, requireRole('admin'), notifCtrl.proposerAlternative);
router.patch('/:id/repondre-proposition', verifyToken, requireRole('prof'), notifCtrl.repondreProposition);
router.post('/:id/repondre', verifyToken, notifCtrl.repondreNotification);
router.post('/groupe-complete', verifyToken, requireRole('admin'), notifCtrl.notifierGroupeComplete);
module.exports = router;