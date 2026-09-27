const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const messageRoutes = require('./routes/messageRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { isDatabaseConnected } = require('./config/database');

function createApp() {
  const app = express();

  const clientUrl = process.env.CLIENT_URL;

  if (!clientUrl) {
    console.warn('[CORS] CLIENT_URL is not set');
  } else {
    console.log(`[CORS] Allowed origin: ${clientUrl}`);
  }

  app.use(helmet());

  app.use(
    cors({
      origin: clientUrl,
      methods: ['GET', 'POST'],
    })
  );

  app.use(express.json({ limit: '10kb' }));

  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        database: isDatabaseConnected() ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use('/api', messageRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;