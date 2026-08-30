const fs = require('fs');
const path = require('path');
const ReportModule = require('../models/ReportModule');

// Helper — best-effort delete of a file on disk. Never throws.
const removeFileFromDisk = (filePath) => {
  if (!filePath) return;
  const abs = path.join(__dirname, '..', filePath);
  fs.unlink(abs, () => {}); // ignore errors (already gone, etc.)
};

// GET /api/reports
// Every signed-in user sees every module — there's no per-user filtering.
exports.getModules = async (req, res) => {
  try {
    const modules = await ReportModule.find().sort({ createdAt: 1 });
    res.json(modules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/reports
// Any signed-in user can create a module.
exports.createModule = async (req, res) => {
  try {
    const { name, description, color, requireFinal } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Module name is required' });
    }
    const mod = await ReportModule.create({
      name: name.trim(),
      description: (description || '').trim(),
      color: color || '#A855F7',
      requireFinal: requireFinal !== undefined ? requireFinal : true,
    });
    res.status(201).json(mod);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/reports/:id
// Any signed-in user can rename any module.
exports.renameModule = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    const mod = await ReportModule.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true }
    );
    if (!mod) return res.status(404).json({ message: 'Module not found' });
    res.json(mod);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/reports/:id
// Any signed-in user can delete any module (and its files).
exports.deleteModule = async (req, res) => {
  try {
    const mod = await ReportModule.findById(req.params.id);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    removeFileFromDisk(mod.proposal?.filePath);
    removeFileFromDisk(mod.finalReport?.filePath);
    removeFileFromDisk(mod.dataReport?.filePath);

    await mod.deleteOne();
    res.json({ message: 'Module deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/reports/:id/upload  (multipart/form-data: file, docType)
// Any signed-in user can upload/replace a Proposal, Final Report, or Data
// Report on any module.
exports.uploadDoc = async (req, res) => {
  try {
    const { docType } = req.body; // 'proposal' | 'final' | 'data'
    if (!['proposal', 'final', 'data'].includes(docType)) {
      return res.status(400).json({ message: 'docType must be "proposal", "final", or "data"' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const mod = await ReportModule.findById(req.params.id);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    const uploaderName = req.user
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
      : '';

    const fileEntry = {
      name: req.file.originalname,
      originalName: req.file.originalname,
      filePath: `/uploads/${req.file.filename}`,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedByName: uploaderName,
      uploadedAt: new Date(),
    };

    const field = docType === 'proposal' ? 'proposal' : docType === 'final' ? 'finalReport' : 'dataReport';
    removeFileFromDisk(mod[field]?.filePath); // replacing — clean up the old one
    mod[field] = fileEntry;

    await mod.save();
    res.json(mod);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/reports/:id/:docType/rename   ({ name })
// Any signed-in user can rename any uploaded file.
exports.renameDoc = async (req, res) => {
  try {
    const { docType } = req.params;
    const { name } = req.body;
    if (!['proposal', 'final', 'data'].includes(docType)) {
      return res.status(400).json({ message: 'Invalid docType' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const mod = await ReportModule.findById(req.params.id);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    const field = docType === 'proposal' ? 'proposal' : docType === 'final' ? 'finalReport' : 'dataReport';
    if (!mod[field]) return res.status(404).json({ message: 'File not found' });

    mod[field].name = name.trim();
    await mod.save();
    res.json(mod);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/reports/:id/:docType
// Any signed-in user can delete any uploaded file.
exports.deleteDoc = async (req, res) => {
  try {
    const { docType } = req.params;
    if (!['proposal', 'final', 'data'].includes(docType)) {
      return res.status(400).json({ message: 'Invalid docType' });
    }

    const mod = await ReportModule.findById(req.params.id);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    const field = docType === 'proposal' ? 'proposal' : docType === 'final' ? 'finalReport' : 'dataReport';
    removeFileFromDisk(mod[field]?.filePath);
    mod[field] = null;

    await mod.save();
    res.json(mod);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};