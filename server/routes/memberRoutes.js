const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { protect } = require('../middleware/authMiddleware');

// 🛑 Moved the requirement to the top so your linter stops yelling!
const Notification = require('../models/Notification');

router.get('/', protect, memberController.getMembers);
router.get('/search', protect, memberController.searchUsers);
router.post('/invite', protect, memberController.sendInvite);
router.get('/notifications', protect, memberController.getNotifications);
router.put('/notifications/:id/respond', protect, memberController.respondToInvite);
router.put('/role', protect, memberController.updateMemberRole);
router.delete('/remove', protect, memberController.removeMember);

// PUT /api/members/notifications/:id/read
router.put('/notifications/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    if (!notification) return res.status(404).json({ message: "Not found" });
    res.status(200).json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}); // 👈 Semicolon added for strict formatters

// 🛑 ALWAYS keep this at the very bottom of the file
module.exports = router;