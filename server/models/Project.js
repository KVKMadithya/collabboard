const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true, // 👈 Enforces that no two projects can have the same name
    trim: true 
  },
  description: { 
    type: String,
    default: ''
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
      enum: [ // 👈 Strict technical roles. The DB will reject any dummy values.
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