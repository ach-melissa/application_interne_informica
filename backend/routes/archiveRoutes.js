const express = require('express');
const router = express.Router();

const {
  getArchivedYears,
  getArchivedFormationsForYear,
  getArchivedEtudiantsForYear, 
} = require('../controllers/archiveController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/years', verifyToken, getArchivedYears);
router.get('/years/:year/formations', verifyToken, getArchivedFormationsForYear);
router.get('/years/:year/etudiants', verifyToken, getArchivedEtudiantsForYear);
module.exports = router;