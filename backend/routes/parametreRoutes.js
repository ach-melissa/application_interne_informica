const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/parametreController');

router.get('/', verifyToken, ctrl.listValeurs);
router.post('/', verifyToken, requireRole('admin'), ctrl.creerValeur);
router.patch('/:id', verifyToken, requireRole('admin'), ctrl.modifierValeur);
router.patch('/:id/desactiver', verifyToken, requireRole('admin'), ctrl.desactiverValeur);
router.patch('/:id/reactiver', verifyToken, requireRole('admin'), ctrl.reactiverValeur);

module.exports = router;