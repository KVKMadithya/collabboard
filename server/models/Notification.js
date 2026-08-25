const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true // 👈 Locks the invite securely to a specific workspace
  },
  type: { 
    type: String, 
    enum: ['invite', 'alert'], 
    default: 'invite' 
  },
  roleOffered: { 
    type: String, 
    enum: [ // 👈 Matches the Project roles 1:1
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
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'declined'], 
    default: 'pending' 
  },
  read: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);