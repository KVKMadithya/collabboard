const Project = require('../models/Project');
const User = require('../models/User');

// 1. CREATE A NEW PROJECT
exports.createProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: "Project name is required." });
    }

    const existingProject = await Project.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingProject) {
      return res.status(409).json({ message: "A project with this name already exists. Please choose another." });
    }

    const newProject = new Project({
      name: name.trim(),
      description: description || '',
      leader: userId,
      members: [{
        user: userId,
        role: 'Fullstack/Leader'
      }]
    });

    const savedProject = await newProject.save();

    const populatedProject = await Project.findById(savedProject._id)
      .populate('leader', 'name email profilePic university')
      .populate('members.user', 'name email profilePic university');

    res.status(201).json({ 
      message: "Project created successfully!", 
      project: populatedProject 
    });

  } catch (error) {
    console.error("Project Creation Error:", error);
    res.status(500).json({ message: "Failed to create project.", error: error.message });
  }
};

// 2. GET ALL PROJECTS THE LOGGED-IN USER IS A PART OF
exports.getUserProjects = async (req, res) => {
  try {
    const userId = req.user.id;

    const projects = await Project.find({ "members.user": userId })
      .populate('leader', 'name email profilePic university')
      .populate('members.user', 'name email profilePic university')
      .sort({ createdAt: -1 });

    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch your projects.", error: error.message });
  }
};

// 3. GET A SPECIFIC PROJECT
exports.getProjectById = async (req, res) => {
  try {
    const projectId = req.params.id;

    const project = await Project.findById(projectId)
      .populate('leader', 'name email profilePic university')
      .populate('members.user', 'name email profilePic university');

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch project details.", error: error.message });
  }
};

// 4. LIVE VALIDATION: CHECK IF PROJECT NAME IS AVAILABLE
exports.checkProjectName = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ message: "Name query parameter required." });

    const existingProject = await Project.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    
    if (existingProject) {
      return res.status(200).json({ available: false, message: "Name is taken." });
    } else {
      return res.status(200).json({ available: true, message: "Name is available!" });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to validate project name.", error: error.message });
  }
};

// 5. UPDATE GITHUB REPOSITORY LINK (LEADER ONLY)
exports.updateGithubRepo = async (req, res) => {
  try {
    const { githubRepo } = req.body;
    const projectId = req.params.id;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    // Security Check: Only the project leader can link a repository
    if (project.leader.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Access denied. Only the Team Leader can link a repository." });
    }

    // Smart Parser: Handle full URLs or raw 'owner/repo' strings
    let parsedRepo = githubRepo;
    if (githubRepo && githubRepo.includes('github.com')) {
      try {
        const url = new URL(githubRepo);
        parsedRepo = url.pathname.substring(1); // Removes the leading '/'
        if (parsedRepo.endsWith('.git')) {
          parsedRepo = parsedRepo.slice(0, -4); // Removes '.git' if present
        }
      } catch (err) {
        return res.status(400).json({ message: "Invalid GitHub URL." });
      }
    }

    project.githubRepo = parsedRepo || null;
    await project.save();

    res.status(200).json({ 
      message: "GitHub repository updated successfully!", 
      githubRepo: project.githubRepo 
    });
  } catch (error) {
    console.error("GitHub Repo Update Error:", error);
    res.status(500).json({ message: "Failed to update repository.", error: error.message });
  }
};