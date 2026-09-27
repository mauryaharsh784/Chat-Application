require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const createApp = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { registerChatSocket } = require('./sockets/chatSocket');

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

async function start() {
  const app = createApp();
  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: CLIENT_URL,
      methods: ['GET', 'POST'],
    },
  });

  // Make io available to REST controllers (e.g. so POST /api/messages can
  // also broadcast to connected sockets).
  app.set('io', io);

  registerChatSocket(io);

  // Connect to MongoDB. This does not block server start: the server will
  // start listening even if Mongo is briefly unavailable, and API routes
  // will return 503 until the connection is established.
  connectDatabase();

  httpServer.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
    console.log(`[server] Allowed client origin (CORS): ${CLIENT_URL}`);
  });

  const shutdown = async (signal) => {
    console.log(`[server] Received ${signal}, shutting down gracefully...`);
    httpServer.close(async () => {
      await disconnectDatabase();
      console.log('[server] Shutdown complete');
      process.exit(0);
    });

    // Force-exit if shutdown hangs
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    console.error('[server] Unhandled promise rejection:', reason);
  });
}

start();
