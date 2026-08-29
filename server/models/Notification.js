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
    required: false 
  },
  type: { 
    type: String, 
    enum: ['invite', 'alert', 'follow', 'rating', 'mention'], 
    default: 'alert' 
  },
  message: {
    type: String,
    required: true
  },
  roleOffered: { 
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
    required: false 
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'declined', 'info'], // 👈 Added 'info' for social alerts
    default: 'pending' 
  },
  isRead: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);