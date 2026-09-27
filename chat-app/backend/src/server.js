require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const createApp = require('./app');

const {
  connectDatabase,
  disconnectDatabase,
} = require('./config/database');

const {
  registerChatSocket,
} = require('./sockets/chatSocket');

const PORT = process.env.PORT || 5000;

const CLIENT_URL = process.env.CLIENT_URL;

if (!CLIENT_URL) {
  throw new Error(
    'CLIENT_URL environment variable is required'
  );
}

// Allowed frontend origins
const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests without an Origin header
    // Example: Postman or server-to-server requests
    if (!origin) {
      return callback(null, true);
    }

    // Allow only known frontend origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(
      `[CORS] Blocked origin: ${origin}`
    );

    return callback(
      new Error(`CORS blocked origin: ${origin}`)
    );
  },

  methods: [
    'GET',
    'POST',
    'DELETE',
    'OPTIONS',
  ],

  credentials: true,
};

async function start() {
  const app = createApp();

  const httpServer = http.createServer(app);

  // Socket.io server
  const io = new Server(httpServer, {
    cors: corsOptions,
  });

  // Make Socket.io available inside Express controllers
  app.set('io', io);

  // Register socket events
  registerChatSocket(io);

  // Connect MongoDB
  connectDatabase();

  // Start server
  httpServer.listen(PORT, () => {
    console.log(
      `[server] Listening on port ${PORT}`
    );

    console.log(
      `[server] Allowed client origins: ${allowedOrigins.join(
        ', '
      )}`
    );
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(
      `[server] Received ${signal}, shutting down gracefully...`
    );

    httpServer.close(async () => {
      await disconnectDatabase();

      console.log(
        '[server] Shutdown complete'
      );

      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(
      () => process.exit(1),
      10000
    ).unref();
  };

  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });

  // Handle unhandled promise rejection
  process.on(
    'unhandledRejection',
    (reason) => {
      console.error(
        '[server] Unhandled promise rejection:',
        reason
      );
    }
  );
}

start();