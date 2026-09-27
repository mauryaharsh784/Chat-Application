const messageService = require('../services/messageService');

/**
 * GET /api/messages
 * Returns chat history, oldest first.
 */
async function getMessages(req, res, next) {
  try {
    const messages = await messageService.getMessages();
    res.status(200).json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/messages
 * Creates and persists a message via REST (e.g. for non-socket clients,
 * or as a fallback). The Socket.io layer does NOT also insert this same
 * message again — see sockets/chatSocket.js and services/messageService.js
 * for the single-write design.
 *
 * Note: messages created through this endpoint are broadcast to connected
 * Socket.io clients so every client stays in sync regardless of which
 * transport was used to send the message.
 */
function getIo(req) {
  return req.app.get('io');
}

async function createMessage(req, res, next) {
  try {
    const { username, message } = req.body || {};
    const saved = await messageService.createMessage({ username, message });

    const io = getIo(req);
    if (io) {
      io.emit('new_message', saved);
    }

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMessages, createMessage };
