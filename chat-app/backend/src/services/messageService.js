const mongoose = require('mongoose');
const Message = require('../models/Message');
const { isDatabaseConnected } = require('../config/database');

class DatabaseUnavailableError extends Error {
  constructor() {
    super('Database is currently unavailable. Please try again shortly.');
    this.name = 'DatabaseUnavailableError';
    this.statusCode = 503;
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

function assertDatabaseAvailable() {
  if (!isDatabaseConnected()) {
    throw new DatabaseUnavailableError();
  }
}

/**
 * Fetches chat history, oldest first, capped at `limit` most recent messages
 * so the payload stays bounded as history grows.
 */
async function getMessages({ limit = 200 } = {}) {
  assertDatabaseAvailable();

  const messages = await Message.find({})
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();

  return messages.reverse();
}

/**
 * Validates and persists a single message. This is the ONLY place a message
 * is written to the database — both the REST controller and the Socket.io
 * `send_message` handler call through here, so a message is never saved
 * twice regardless of which transport triggered it.
 */
async function createMessage({ username, message }) {
  if (typeof username !== 'string' || !username.trim()) {
    throw new ValidationError('Username is required');
  }
  if (typeof message !== 'string' || !message.trim()) {
    throw new ValidationError('Message text is required');
  }

  assertDatabaseAvailable();

  const doc = new Message({
    username: username.trim(),
    message: message.trim(),
    timestamp: new Date(),
  });

  try {
    await doc.save();
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      const firstError = Object.values(err.errors)[0];
      throw new ValidationError(firstError ? firstError.message : 'Invalid message');
    }
    throw err;
  }

  return doc.toObject();
}

module.exports = {
  getMessages,
  createMessage,
  DatabaseUnavailableError,
  ValidationError,
};
