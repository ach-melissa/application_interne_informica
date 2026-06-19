const express = require('express');
const router = express.Router();
const { getGroupPayments, getStudentPaymentHistory, createPayment, updatePayment, deletePayment } = require('../controllers/paymentController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole('admin'));

router.get('/group/:groupId', getGroupPayments);
router.get('/student/:etudiantId/formation/:formationId', getStudentPaymentHistory);
router.post('/', createPayment);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);

module.exports = router;