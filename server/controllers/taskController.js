const Task = require('../models/Task');

// GET /api/tasks (Fetch all tasks for the board and timeline)
exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find(); 
    res.status(200).json(tasks);     
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// GET /api/tasks/:id (Fetch a single task for the Task Detail page)
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// POST /api/tasks (Create a new task with files)
exports.createTask = async (req, res) => {
  try {
    let { title, description, status, priority, startDate, dueDate, tags, assignees } = req.body;
    
    // If sending via FormData (for files), arrays come in as strings. We must parse them.
    if (typeof tags === 'string') tags = JSON.parse(tags);
    if (typeof assignees === 'string') assignees = JSON.parse(assignees);

    // Process file attachments intercepted by Multer
    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          filename: file.originalname,
          path: `/uploads/${file.filename}` // The public URL to access the file
        });
      });
    }

    // Create a new Mongoose document
    const newTask = new Task({
      title,
      description,
      status,
      priority,
      startDate: startDate || null,
      dueDate: dueDate || null,
      tags: tags || [],
      assignees: assignees || [],
      attachments: attachments,
      attachmentsCount: attachments.length
    });

    // Save it to MongoDB
    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    console.error("Task Creation Error:", error);
    res.status(500).json({ message: "Failed to create task", error });
  }
};

// PUT /api/tasks/:id (Update a task, e.g., Mark as Done)
exports.updateTask = async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: req.body }, // Only updates the specific fields sent in the request
      { new: true }       // Returns the newly updated document
    );
    
    if (!updatedTask) return res.status(404).json({ message: "Task not found" });
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: "Failed to update task", error });
  }
};