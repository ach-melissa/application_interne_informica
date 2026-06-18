const express = require('express');
const router = express.Router();
const { getTeachers } = require('../controllers/teacherController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole('admin'));

router.get('/', getTeachers);

module.exports = router;