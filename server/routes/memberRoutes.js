const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
// const authMiddleware = require('../middleware/authMiddleware'); // Uncomment and add your auth middleware if you have one

router.get('/', memberController.getMembers);
router.get('/search', memberController.searchUsers);
// Replace `(req, res, next) => { req.user = { id: "YOUR_MOCK_USER_ID" }; next(); }` with your actual auth middleware
router.post('/invite', (req, res, next) => { req.user = { id: "64a7c..." }; next(); }, memberController.sendInvite);

module.exports = router;