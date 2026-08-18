const express = require('express');
const router = express.Router();
const { runPaymentAlerts } = require('../jobs/paymentAlerts');
const authMiddleware = require('../middleware/authMiddleware'); // adjust path/name to match your project

router.post('/run', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé.' });
  }
  try {
    await runPaymentAlerts();
    res.json({ success: true, message: 'Payment alerts job executed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;