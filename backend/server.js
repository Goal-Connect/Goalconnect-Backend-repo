const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initSocket } = require('./src/realtime/socket');

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ⚽ GoalConnect API Server                               ║
║                                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                                ║
║   Port: ${PORT}                                              ║
║   API URL: http://localhost:${PORT}/api                      ║
║                                                           ║
║   Ready to connect Ethiopian football talent! 🇪🇹          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Initialize WebSocket server (Socket.IO)
initSocket(server);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated.');
    process.exit(0);
  });
});

