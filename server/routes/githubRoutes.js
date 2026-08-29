const express = require('express');
const router = express.Router();
const githubController = require('../controllers/githubController');
const { protect } = require('../middleware/authMiddleware');

// GET /api/github/commits?projectId=...
// Fetches the live commit history using the linked GitHub repo
router.get('/commits', protect, githubController.getCommits);

module.exports = router;