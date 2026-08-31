const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true }, 
  title: { type: String, required: true },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['todo', 'in-progress', 'in-review', 'done'], 
    default: 'todo' 
  },
  priority: { 
    type: String, 
    enum: ['High', 'Medium', 'Low'], 
    default: 'Medium' 
  },
  tags: [{ type: String }],
  startDate: { type: Date }, 
  dueDate: { type: Date },
  isOverdue: { type: Boolean, default: false },
  commentsCount: { type: Number, default: 0 },
  attachmentsCount: { type: Number, default: 0 },
  attachments: [{            
    filename: String,
    path: String
  }],
  assignees: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    name: String,
    initials: String
  }],
  subtasks: [{
    title: String,
    completed: { type: Boolean, default: false }
  }],
  // ⭐ NEW: Tracks which specific users have starred this task
  starredBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }]
}, { timestamps: true }); 

module.exports = mongoose.model('Task', taskSchema);