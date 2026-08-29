const Task = require('../models/Task');
const Note = require('../models/Note');
const Project = require('../models/Project');

// Smart function to prevent special characters from crashing the database search
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

exports.globalSearch = async (req, res) => {
  try {
    const { q, projectId } = req.query;
    
    if (!q || !projectId) {
      return res.status(400).json({ message: "Search query and Project ID are required." });
    }

    // 🛑 THE FIX: Safely escape the query so special characters don't break the regex
    const safeQuery = escapeRegex(q);
    const searchRegex = new RegExp(safeQuery, 'i');

    // 1. Search Tasks inside this project
    const tasks = await Task.find({
      project: projectId,
      $or: [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } }
      ]
    }).select('title description').limit(10);

    // 2. Search Notes inside this project
    const notes = await Note.find({
      project: projectId,
      $or: [
        { title: { $regex: searchRegex } },
        { content: { $regex: searchRegex } }
      ]
    }).select('title content').limit(10);

    // 3. Search Members inside this project
    const project = await Project.findById(projectId).populate({
      path: 'members.user',
      select: 'firstName lastName email profilePic'
    });

    let members = [];
    if (project && project.members) {
      members = project.members
        .map(m => m.user)
        .filter(u => u !== null) // 🛑 THE FIX: Prevents crash if a user was deleted from the DB
        .filter(u => 
          (u.firstName && searchRegex.test(u.firstName)) || 
          (u.lastName && searchRegex.test(u.lastName)) || 
          (u.email && searchRegex.test(u.email))
        );
    }

    res.status(200).json({
      tasks,
      notes,
      members
    });

  } catch (error) {
    console.error("Global Search Error:", error);
    res.status(500).json({ message: "Server error during search." });
  }
};