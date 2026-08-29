const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:id', protect, userController.getUserProfile);
router.post('/:id/follow', protect, userController.toggleFollow);
router.post('/:id/rate', protect, userController.rateUser);

// New Settings Routes
router.put('/email', protect, userController.updateEmail);
router.put('/password', protect, userController.updatePassword);
router.put('/preferences', protect, userController.updatePreferences);

module.exports = router;