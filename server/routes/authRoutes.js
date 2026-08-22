const express = require('express');
const router = express.Router();

// 👇 FIX: Added updateProfile to the import list here!
const { register, login, googleAuth, getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);

router.get('/me', protect, getMe); 

// 👇 Now it knows exactly what updateProfile is!
router.put('/me', protect, updateProfile);

module.exports = router;