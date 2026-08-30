const express = require('express');
const router = express.Router();
const multer = require('multer');
const { generateChat } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// Setup Multer to temporarily store the chat documents in a 'temp' folder
const upload = multer({ 
  dest: 'uploads/temp/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for chat attachments
});

// We use upload.single('document') because we named the field 'document' in the frontend FormData
router.post('/chat', protect, upload.single('document'), generateChat);

module.exports = router;