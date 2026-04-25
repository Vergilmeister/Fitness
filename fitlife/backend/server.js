// backend/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('./config/db');
const logger = require('./middleware/logger');

// Routes
const authRoutes = require('./routes/auth');
const workoutRoutes = require('./routes/workout');
const aiRoutes = require('./routes/ai');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(logger);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// ── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/ai', aiRoutes);

// ── Frontend page routes ────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../frontend/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, '../frontend/register.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../frontend/dashboard.html')));
app.get('/ai', (req, res) => res.sendFile(path.join(__dirname, '../frontend/ai.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, '../frontend/chat.html')));

// Feature detail pages
const features = ['workout-tracker','ai-coach','community-chat','smart-dashboard','secure-private','responsive'];
features.forEach(slug => {
  app.get(`/features/${slug}`, (req, res) =>
    res.sendFile(path.join(__dirname, `../frontend/features/${slug}.html`)));
});

// ── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// ── Socket.IO Chat ──────────────────────────────────────────
const onlineUsers = new Map(); // socketId → { username, room }

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // User joins a room
  socket.on('join_room', ({ username, room }) => {
    socket.join(room);
    onlineUsers.set(socket.id, { username, room });

    // Notify room
    socket.to(room).emit('user_joined', {
      system: true,
      message: `${username} joined the chat`,
      time: new Date().toLocaleTimeString(),
    });

    // Send online users count
    const roomUsers = [...onlineUsers.values()].filter((u) => u.room === room);
    io.to(room).emit('room_users', roomUsers.length);
  });

  // Receive and broadcast message
  socket.on('send_message', ({ username, message, room }) => {
    const msgData = {
      username,
      message,
      time: new Date().toLocaleTimeString(),
      id: socket.id,
    };
    io.to(room).emit('receive_message', msgData);
  });

  // Typing indicator
  socket.on('typing', ({ username, room }) => {
    socket.to(room).emit('user_typing', username);
  });

  socket.on('stop_typing', ({ room }) => {
    socket.to(room).emit('stop_typing');
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      socket.to(user.room).emit('user_left', {
        system: true,
        message: `${user.username} left the chat`,
        time: new Date().toLocaleTimeString(),
      });
      onlineUsers.delete(socket.id);
      const roomUsers = [...onlineUsers.values()].filter((u) => u.room === user.room);
      io.to(user.room).emit('room_users', roomUsers.length);
    }
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// ── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 FitLife server running on http://localhost:${PORT}`);
});
