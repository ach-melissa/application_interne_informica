const express = require('express');
const router = express.Router();
const { getTeachers, getTeacherFormationsByUser } = require('../controllers/teacherController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.use(verifyToken, requireRole('admin'));

router.get('/', getTeachers);
router.get('/by-user/:user_id', getTeacherFormationsByUser);
module.exports = router;