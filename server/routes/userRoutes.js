const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// 1. STATIC ROUTES (Must come first!)
router.get('/starred', protect, userController.getStarredItems); // 👈 The missing Starred route!
router.put('/email', protect, userController.updateEmail);
router.put('/password', protect, userController.updatePassword);
router.put('/preferences', protect, userController.updatePreferences);
router.put('/settings', protect, userController.updatePreferences); 

// 2. DYNAMIC ROUTES (Must come last so they don't swallow the static routes)
router.get('/:id', protect, userController.getUserProfile);
router.post('/:id/follow', protect, userController.toggleFollow);
router.post('/:id/rate', protect, userController.rateUser);

module.exports = router;