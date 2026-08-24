const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const upload = require('../middleware/uploadMiddleware'); // Import Multer middleware

// GET requests
router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTaskById);

// POST request (Intercepts up to 5 files under the field name 'attachments')
router.post('/', upload.array('attachments', 5), taskController.createTask);

// PUT request (Updates task status/details)
router.put('/:id', taskController.updateTask);

module.exports = router;