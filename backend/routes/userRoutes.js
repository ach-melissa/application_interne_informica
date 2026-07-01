const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getMe, updateMe, changeMyPassword, uploadMyPhoto, deleteMyPhoto, getUsers,
  createUser, updateUser, deleteUser, archiveUser, restoreUser,
} = require('../controllers/userController');

const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

// Routes "self" — accessibles à tout utilisateur connecté
router.get('/me', verifyToken, getMe);
router.patch('/me', verifyToken, updateMe);
router.put('/me/password', verifyToken, changeMyPassword);
router.post('/me/photo', verifyToken, upload.single('photo'), uploadMyPhoto);
router.delete('/me/photo', verifyToken, deleteMyPhoto);

// Routes admin — gestion des autres utilisateurs
router.get('/', verifyToken, requireRole('admin'), getUsers);
router.post('/', verifyToken, requireRole('admin'), upload.single('photo'), createUser);
router.patch('/:id', verifyToken, requireRole('admin'), updateUser);
router.patch('/:id/archive', verifyToken, requireRole('admin'), archiveUser);
router.patch('/:id/restore', verifyToken, requireRole('admin'), restoreUser);
router.delete('/:id', verifyToken, requireRole('admin'), deleteUser);
module.exports = router;