const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const upload = require('../middleware/uploadMiddleware'); // Import Multer middleware
const { protect } = require('../middleware/authMiddleware'); // 👈 NEW: Bring in Auth Middleware

// GET requests
router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTaskById);
router.delete('/:id', taskController.deleteTask);

// POST request (Intercepts up to 5 files under the field name 'attachments')
router.post('/', upload.array('attachments', 5), taskController.createTask);

// PUT request (Updates task status/details)
router.put('/:id', taskController.updateTask);

// ⭐ NEW: Toggle star status (Protected route to get req.user)
router.put('/:id/star', protect, taskController.toggleStarTask);

module.exports = router;