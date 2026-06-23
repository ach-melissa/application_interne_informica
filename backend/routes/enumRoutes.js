// enum route
const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

router.get('/', async (req, res) => {
  const { data, error } = await supabase.rpc('get_enums');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;