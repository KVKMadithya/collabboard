const express = require('express');
const { generateChat } = require('../controllers/aiController');
const router = express.Router();

// This creates an endpoint at POST /chat
router.post('/chat', generateChat);

module.exports = router;