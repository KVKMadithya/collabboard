const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, // Enforces that no two projects can have the same name
    trim: true 
  },
  description: { 
    type: String,
    default: ''
  },
  // 🛑 NEW: Stores the 'owner/repo' string for the GitHub API bridge
  githubRepo: {
    type: String,
    default: null
  },
  leader: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  members: [{
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    role: { 
      type: String, 
      enum: [ 
        'Fullstack/Leader', 
        'Frontend Developer', 
        'Backend Developer', 
        'UI/UX Designer', 
        'Database Administrator', 
        'DevOps Engineer', 
        'QA Tester',
        'Viewer'
      ], 
      required: true 
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);