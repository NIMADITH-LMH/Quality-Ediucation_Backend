const express = require('express');
const router = express.Router();

// Define your routes here
router.get('/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

module.exports = router;
