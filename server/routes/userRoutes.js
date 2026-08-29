const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware'); 

router.get('/:id', protect, userController.getUserProfile);
router.post('/:id/follow', protect, userController.toggleFollow); 
router.post('/:id/rate', protect, userController.rateUser);     

module.exports = router;