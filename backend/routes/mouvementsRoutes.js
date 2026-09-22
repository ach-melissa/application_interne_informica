const express = require('express');
const router = express.Router();
const {
  getMouvements,
  createMouvement,
  updateMouvement,
  deleteMouvement,
} = require('../controllers/mouvementsController');

router.get('/', getMouvements);
router.post('/', createMouvement);
router.put('/:id', updateMouvement);
router.delete('/:id', deleteMouvement);

module.exports = router;