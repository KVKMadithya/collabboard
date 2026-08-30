const fs = require('fs');
const path = require('path');
const ReportModule = require('../models/ReportModule');
const Project = require('../models/Project'); // 🛑 Added Project model for auth checks

// Helper — best-effort delete of a file on disk. Never throws.
const removeFileFromDisk = (filePath) => {
  if (!filePath) return;
  const abs = path.join(__dirname, '..', filePath);
  fs.unlink(abs, () => {}); // ignore errors (already gone, etc.)
};

// Helper — verifies if the requesting user is a member/leader of the project
const isAuthorizedForProject = async (projectId, userId) => {
  if (!projectId) return false;
  const project = await Project.findById(projectId);
  if (!project) return false;

  const isLeader = project.leader && project.leader.toString() === userId.toString();
  const isMember = project.members && project.members.some(m => m.toString() === userId.toString());
  
  return isLeader || isMember;
};

// GET /api/reports
// Global Read: Every signed-in user sees every module. 
// 🛑 We populate the 'project' so the frontend knows who the owners are!
exports.getModules = async (req, res) => {
  try {
    const modules = await ReportModule.find()
      .populate('project', 'name leader members') 
      .sort({ createdAt: 1 });
    res.json(modules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/reports
// Private Edit: User must belong to the active project to create a module for it.
exports.createModule = async (req, res) => {
  try {
    const { name, description, color, requireFinal, projectId } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Module name is required' });
    }
    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required to link this report.' });
    }

    // Auth Check
    const isAuth = await isAuthorizedForProject(projectId, req.user._id);
    if (!isAuth) {
      return res.status(403).json({ message: 'Only project members can create reports for this workspace.' });
    }

    const mod = await ReportModule.create({
      project: projectId, // Linked!
      name: name.trim(),
      description: (description || '').trim(),
      color: color || '#A855F7',
      requireFinal: requireFinal !== undefined ? requireFinal : true,
    });

    await mod.populate('project', 'name leader members');
    res.status(201).json(mod);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/reports/:id
exports.renameModule = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }

    let mod = await ReportModule.findById(req.params.id);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    // Auth Check
    const isAuth = await isAuthorizedForProject(mod.project, req.user._id);
    if (!isAuth) return res.status(403).json({ message: 'Unauthorized to rename this report.' });

    mod.name = name.trim();
    await mod.save();
    await mod.populate('project', 'name leader members');
    
    res.json(mod);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/reports/:id
exports.deleteModule = async (req, res) => {
  try {
    const mod = await ReportModule.findById(req.params.id);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    // Auth Check
    const isAuth = await isAuthorizedForProject(mod.project, req.user._id);
    if (!isAuth) return res.status(403).json({ message: 'Unauthorized to delete this report.' });

    removeFileFromDisk(mod.proposal?.filePath);
    removeFileFromDisk(mod.finalReport?.filePath);
    removeFileFromDisk(mod.dataReport?.filePath);

    await mod.deleteOne();
    res.json({ message: 'Module deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/reports/:id/upload
exports.uploadDoc = async (req, res) => {
  try {
    const { docType } = req.body; 
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    if (!['proposal', 'final', 'data'].includes(docType)) {
      removeFileFromDisk(`/uploads/${req.file.filename}`); // Cleanup orphaned file
      return res.status(400).json({ message: 'docType must be "proposal", "final", or "data"' });
    }

    const mod = await ReportModule.findById(req.params.id);
    if (!mod) {
      removeFileFromDisk(`/uploads/${req.file.filename}`); 
      return res.status(404).json({ message: 'Module not found' });
    }

    // Auth Check - If they fail, we immediately delete the file Multer just uploaded!
    const isAuth = await isAuthorizedForProject(mod.project, req.user._id);
    if (!isAuth) {
      removeFileFromDisk(`/uploads/${req.file.filename}`);
      return res.status(403).json({ message: 'Unauthorized to upload documents to this project.' });
    }

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
    removeFileFromDisk(mod[field]?.filePath); 
    mod[field] = fileEntry;

    await mod.save();
    await mod.populate('project', 'name leader members');
    res.json(mod);
  } catch (err) {
    // Failsafe cleanup if the database save crashes
    if (req.file) removeFileFromDisk(`/uploads/${req.file.filename}`);
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/reports/:id/:docType/rename
exports.renameDoc = async (req, res) => {
  try {
    const { docType } = req.params;
    const { name } = req.body;
    
    if (!['proposal', 'final', 'data'].includes(docType)) return res.status(400).json({ message: 'Invalid docType' });
    if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required' });

    const mod = await ReportModule.findById(req.params.id);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    // Auth Check
    const isAuth = await isAuthorizedForProject(mod.project, req.user._id);
    if (!isAuth) return res.status(403).json({ message: 'Unauthorized to rename this document.' });

    const field = docType === 'proposal' ? 'proposal' : docType === 'final' ? 'finalReport' : 'dataReport';
    if (!mod[field]) return res.status(404).json({ message: 'File not found' });

    mod[field].name = name.trim();
    await mod.save();
    await mod.populate('project', 'name leader members');
    res.json(mod);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/reports/:id/:docType
exports.deleteDoc = async (req, res) => {
  try {
    const { docType } = req.params;
    if (!['proposal', 'final', 'data'].includes(docType)) return res.status(400).json({ message: 'Invalid docType' });

    const mod = await ReportModule.findById(req.params.id);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    // Auth Check
    const isAuth = await isAuthorizedForProject(mod.project, req.user._id);
    if (!isAuth) return res.status(403).json({ message: 'Unauthorized to delete this document.' });

    const field = docType === 'proposal' ? 'proposal' : docType === 'final' ? 'finalReport' : 'dataReport';
    removeFileFromDisk(mod[field]?.filePath);
    mod[field] = null;

    await mod.save();
    await mod.populate('project', 'name leader members');
    res.json(mod);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};