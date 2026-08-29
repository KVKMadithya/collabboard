const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware'); 

// 1. Live Name Validation 
// (Must be above /:id to prevent routing conflicts. No auth required to just check a name)
router.get('/check', projectController.checkProjectName);

// 2. Fetch all projects for the logged-in user 
// (Must be above /:id)
router.get('/user', protect, projectController.getUserProjects);

// 3. Create a new project
router.post('/', protect, projectController.createProject);

// 4. Update GitHub Repo Link 
// (PUT request to attach the GitHub repo string to a specific project)
router.put('/:id/github', protect, projectController.updateGithubRepo);

// 5. Get a specific project by ID 
// (Keep this at the bottom of the GET requests!)
router.get('/:id', protect, projectController.getProjectById);

module.exports = router;