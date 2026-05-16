const dotenv = require("dotenv");
const http = require("http");

// Load environment variables
dotenv.config();

const app = require("./src/app");
const connectDB = require("./src/config/db");
const { initSocket } = require("./src/realtime/socket");

// Connect to database
connectDB();

const DEFAULT_PORT = Number(process.env.PORT) || 5000;
let server;

const startServer = (port) => {
  server = http.createServer(app);

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE") {
      const nextPort = port + 1;
      console.warn(`Port ${port} is in use. Retrying on ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    console.error(`Server error: ${error.message}`);
    process.exit(1);
  });

  server.listen(port, () => {
    initSocket(server);

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ⚽ GoalConnect API Server                               ║
║                                                           ║
║   Environment: ${process.env.NODE_ENV || "development"}                                ║
║   Port: ${port}                                              ║
║   API URL: http://localhost:${port}/api                      ║
║                                                           ║
║   Ready to connect Ethiopian football talent! 🇪🇹          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
  });
};

startServer(DEFAULT_PORT);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log("Process terminated.");
    process.exit(0);
  });
};

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));

// Nodemon sends SIGUSR2 on restart; close the server before re-spawning.
process.once("SIGUSR2", () => {
  shutdown("SIGUSR2");
  process.once("exit", () => process.kill(process.pid, "SIGUSR2"));
});
