const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// 🛑 THE FIX: We destructure { protect } exactly as it was exported
const { protect } = require('../middleware/authMiddleware'); 

// 1. Live Name Validation (No auth required to just check a name)
router.get('/check', projectController.checkProjectName);

// 2. Fetch all projects for the logged-in user
router.get('/user', protect, projectController.getUserProjects);

// 3. Create a new project
router.post('/', protect, projectController.createProject);

// 4. Get a specific project by ID
router.get('/:id', protect, projectController.getProjectById);

router.put('/:id/github', protect, projectController.updateGithubRepo);

module.exports = router;