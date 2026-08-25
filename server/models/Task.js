const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true }, // 👈 NEW: Locks this task to a specific project
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
  startDate: { type: Date }, // Added for Timeline tracking
  dueDate: { type: Date },
  isOverdue: { type: Boolean, default: false },
  commentsCount: { type: Number, default: 0 },
  attachmentsCount: { type: Number, default: 0 },
  attachments: [{            // Added to store Multer uploaded files
    filename: String,
    path: String
  }],
  assignees: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 👈 NEW: Links assignee to a real database user
    name: String,
    initials: String
  }],
  subtasks: [{
    title: String,
    completed: { type: Boolean, default: false }
  }]
}, { timestamps: true }); // Automatically adds createdAt and updatedAt dates

module.exports = mongoose.model('Task', taskSchema);