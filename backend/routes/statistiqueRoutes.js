// routes/statistiqueRoutes.js
const express = require('express');
const router = express.Router();
const { getStatistiques } = require('../controllers/statistiqueController');

router.get('/', getStatistiques);

module.exports = router;