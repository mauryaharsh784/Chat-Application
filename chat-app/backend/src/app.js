const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const messageRoutes = require('./routes/messageRoutes');

const {
  errorHandler,
  notFoundHandler,
} = require('./middleware/errorHandler');

const {
  isDatabaseConnected,
} = require('./config/database');

function createApp() {
  const app = express();

  const clientUrl = process.env.CLIENT_URL;

  if (!clientUrl) {
    console.warn(
      '[CORS] CLIENT_URL is not set'
    );
  }

  // Allowed frontend origins
  const allowedOrigins = [
    clientUrl,
    'http://localhost:5173',
    'http://localhost:5174',
  ].filter(Boolean);

  console.log(
    `[CORS] Allowed origins: ${allowedOrigins.join(
      ', '
    )}`
  );

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: function (origin, callback) {
        // Allow requests without Origin header
        // Example: Postman/server-to-server
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        console.warn(
          `[CORS] Blocked origin: ${origin}`
        );

        return callback(
          new Error(
            `CORS blocked origin: ${origin}`
          )
        );
      },

      methods: [
        'GET',
        'POST',
        'DELETE',
        'OPTIONS',
      ],

      credentials: true,
    })
  );

  // JSON body parser
  app.use(
    express.json({
      limit: '10kb',
    })
  );

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        database: isDatabaseConnected()
          ? 'connected'
          : 'disconnected',
        timestamp: new Date().toISOString(),
      },
    });
  });

  // API routes
  app.use('/api', messageRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);

  return app;
}

module.exports = createApp;