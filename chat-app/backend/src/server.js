require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const createApp = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { registerChatSocket } = require('./sockets/chatSocket');

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL;

if (!CLIENT_URL) {
  throw new Error('CLIENT_URL environment variable is required');
}

async function start() {
  const app = createApp();
  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: CLIENT_URL,
      methods: ['GET', 'POST'],
    },
  });

  app.set('io', io);

  registerChatSocket(io);

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

    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    console.error('[server] Unhandled promise rejection:', reason);
  });
}

start();