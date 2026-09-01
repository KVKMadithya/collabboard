require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const http = require('http'); 
const { Server } = require('socket.io'); 

const app = express();

// Standard middleware with explicit CORS support for production frontend
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://collabboard-nu.vercel.app'
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // High-res payload limit
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount all standard API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/notes', require('./routes/noteRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/members', require('./routes/memberRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/github', require('./routes/githubRoutes'));
app.use('/api/search', require('./routes/searchRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// ==========================================
// ⚡ WEBSOCKET ENGINE (REAL-TIME WHITEBOARD)
// ==========================================

// 1. Wrap Express in a native Node HTTP Server
const server = http.createServer(app);

// 2. Initialize Socket.io with matching CORS rules
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://collabboard-nu.vercel.app'
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// 3. Define Real-Time Events
io.on('connection', (socket) => {
  console.log(`🔌 Client connected via WebSockets: ${socket.id}`);

  // Room Subscription: Isolate drawings to a specific workspace
  socket.on('join-board', (data) => {
    // 🛑 FORCE STRING: Normalizes ObjectIds so users don't end up in parallel rooms
    const projectId = String(typeof data === 'object' ? data.projectId : data);
    socket.join(projectId);
    console.log(`👤 User ${socket.id} joined whiteboard room: ${projectId}`);
  });

  // Relay drawing coordinates to everyone else in the workspace
  socket.on('draw-line', ({ projectId, drawingData }) => {
    socket.to(String(projectId)).emit('draw-line', drawingData); // 🛑 String cast
  });

  // Relay live cursor movements (Google Docs style)
  socket.on('cursor-move', (data) => {
    socket.to(String(data.projectId)).emit('cursor-move', data); // 🛑 String cast
  });

  // Relay board wipe commands
  socket.on('clear-board', (projectId) => {
    socket.to(String(projectId)).emit('clear-board'); // 🛑 String cast
  });

  socket.on('disconnect', () => {
    console.log(`🛑 Client disconnected: ${socket.id}`);
  });
});

// ==========================================
// 🗄️ DATABASE & SERVER IGNITION
// ==========================================

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Successfully connected to CollabBoard MongoDB'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server & WebSockets running on port ${PORT}`);
});