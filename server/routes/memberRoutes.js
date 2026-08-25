const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, memberController.getMembers);
router.get('/search', protect, memberController.searchUsers);
router.post('/invite', protect, memberController.sendInvite);
router.get('/notifications', protect, memberController.getNotifications);
router.put('/notifications/:id/respond', protect, memberController.respondToInvite);
router.put('/role', protect, memberController.updateMemberRole);

module.exports = router;