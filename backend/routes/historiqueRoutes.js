const express = require('express');
const router = express.Router();
const { getHistorique, getHistoriqueUnread, markHistoriqueSeen } = require('../controllers/historiqueController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, requireRole('admin', 'super_admin', 'comptable'), getHistorique);
router.get('/unread', verifyToken, requireRole('admin', 'super_admin', 'comptable'), getHistoriqueUnread);
router.patch('/seen', verifyToken, requireRole('admin', 'super_admin', 'comptable'), markHistoriqueSeen);
module.exports = router;