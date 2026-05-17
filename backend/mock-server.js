/**
 * Mock API Server - Temporary solution for testing
 * This server provides mock responses to resolve network errors
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const mockUser = {
  _id: 'user123',
  email: 'test@goalconnect.com',
  role: 'academy',
  status: 'approved'
};

const mockProfile = {
  _id: 'profile123',
  name: 'Test Academy',
  logoUrl: ''
};

const mockNotifications = [
  {
    _id: 'notif1',
    message: 'Welcome to GoalConnect!',
    type: 'info',
    isRead: false,
    createdAt: new Date().toISOString()
  }
];

const mockVideos = [
  {
    _id: 'video1',
    title: 'Test Video',
    description: 'Test Description',
    processingStatus: 'uploaded',
    privacy: 'public',
    createdAt: new Date().toISOString()
  }
];

const mockPlayers = [
  {
    _id: 'player1',
    fullName: 'John Doe',
    position: 'Forward',
    status: 'active'
  }
];

// Mock Routes
app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    data: {
      user: mockUser,
      profile: mockProfile
    }
  });
});

app.get('/api/notifications', (req, res) => {
  res.json({
    success: true,
    data: mockNotifications
  });
});

app.get('/api/notifications/unread-count', (req, res) => {
  res.json({
    success: true,
    data: 1
  });
});

app.get('/api/videos', (req, res) => {
  res.json({
    success: true,
    data: mockVideos,
    count: mockVideos.length
  });
});

app.get('/api/academies/me/players', (req, res) => {
  res.json({
    success: true,
    data: mockPlayers
  });
});

app.post('/api/videos', (req, res) => {
  const newVideo = {
    _id: 'video' + Date.now(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  res.json({
    success: true,
    data: newVideo
  });
});

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Mock GoalConnect API Server',
    version: '1.0.0'
  });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Mock API is running'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ⚽ Mock GoalConnect API Server                          ║
║                                                           ║
║   Environment: mock                                      ║
║   Port: ${PORT}                                             ║
║   API URL: http://localhost:${PORT}/api                    ║
║                                                           ║
║   Ready for testing! 🇪🇹                                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
