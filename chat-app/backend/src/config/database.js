const mongoose = require('mongoose');

/**
 * Tracks whether we currently have a usable Mongo connection.
 * Exposed so other layers (controllers/sockets) can fail fast with a
 * friendly error instead of hanging when the DB is unreachable.
 */
let isConnected = false;

function isDatabaseConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Connects to MongoDB using MONGODB_URI. Retries with backoff instead of
 * crashing the whole process, since the app should still start (and report
 * a clear "database unavailable" error on data routes) even if Mongo is
 * temporarily down.
 */
async function connectDatabase({ retries = 5, delayMs = 3000 } = {}) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('[database] MONGODB_URI is not set. Check your .env file.');
    return;
  }

  mongoose.connection.on('connected', () => {
    isConnected = true;
    console.log('[database] MongoDB connected');
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('[database] MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    console.error('[database] MongoDB connection error:', err.message);
  });

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      return;
    } catch (err) {
      console.error(
        `[database] Connection attempt ${attempt}/${retries} failed: ${err.message}`
      );
      if (attempt === retries) {
        console.error(
          '[database] Could not connect to MongoDB. The server will keep running, ' +
            'but message endpoints will return 503 until the database is reachable.'
        );
        return;
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function disconnectDatabase() {
  await mongoose.disconnect();
  isConnected = false;
}

module.exports = { connectDatabase, disconnectDatabase, isDatabaseConnected };
