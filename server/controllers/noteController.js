const Note = require('../models/Note');

// Get all notes (Populates the author's name so we can display who wrote it)
exports.getNotes = async (req, res) => {
  try {
    const notes = await Note.find().populate('author', 'firstName lastName role');
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching notes' });
  }
};

// Create a new note
exports.createNote = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const note = await Note.create({
      title,
      content,
      category,
      author: req.user._id // Automatically assigned from the logged-in user
    });
    
    // We populate it immediately so the frontend has the author details right away
    const populatedNote = await Note.findById(note._id).populate('author', 'firstName lastName role');
    res.status(201).json(populatedNote);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating note' });
  }
};

// Delete a note (Only author or Team Leader)
exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).populate('author');
    if (!note) return res.status(404).json({ message: 'Note not found' });

    // SECURITY CHECK: Are they the author OR a Team Leader?
    if (note.author._id.toString() !== req.user._id.toString() && req.user.role !== 'Team Leader') {
      return res.status(401).json({ message: 'Not authorized to delete this note' });
    }

    await note.deleteOne();
    res.json({ message: 'Note removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error deleting note' });
  }
};