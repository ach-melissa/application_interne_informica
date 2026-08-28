const express = require('express');
const router = express.Router();
const { runPaymentAlerts } = require('../jobs/paymentAlerts');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.post('/run', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await runPaymentAlerts();
    res.json({ success: true, message: 'Payment alerts job executed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;