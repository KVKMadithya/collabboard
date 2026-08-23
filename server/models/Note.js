const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['Idea', 'Urgent', 'Task', 'Note', 'Done', 'Draft'] 
  },
  // This links the note to the user who created it
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isBookmarked: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);