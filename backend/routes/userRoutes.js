const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getMe, updateMe, changeMyPassword, uploadMyPhoto, deleteMyPhoto, getUsers,
} = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });
router.get('/', verifyToken, getUsers);
router.get('/me', verifyToken, getMe);
router.patch('/me', verifyToken, updateMe);
router.put('/me/password', verifyToken, changeMyPassword);
router.post('/me/photo', verifyToken, upload.single('photo'), uploadMyPhoto);
router.delete('/me/photo', verifyToken, deleteMyPhoto);

module.exports = router;