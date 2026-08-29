const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const reportUpload = require('../middleware/reportUploadMiddleware');
const reportController = require('../controllers/reportController');

// Every route just requires being signed in ("protect") — there are no
// ownership or role checks, since any signed-in user can view and control
// everything on the Reports page.

router.route('/')
  .get(protect, reportController.getModules)
  .post(protect, reportController.createModule);

router.route('/:id')
  .patch(protect, reportController.renameModule)
  .delete(protect, reportController.deleteModule);

router.post('/:id/upload', protect, reportUpload.single('file'), reportController.uploadDoc);
router.patch('/:id/:docType/rename', protect, reportController.renameDoc);
router.delete('/:id/:docType', protect, reportController.deleteDoc);

module.exports = router;