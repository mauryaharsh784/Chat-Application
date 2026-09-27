const messageService = require('../services/messageService');

/**
 * GET /api/messages
 * Returns chat history, oldest first.
 */
async function getMessages(req, res, next) {
  try {
    const messages = await messageService.getMessages();

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (err) {
    next(err);
  }
}

function getIo(req) {
  return req.app.get('io');
}

/**
 * POST /api/messages
 * Creates and persists a message via REST.
 */
async function createMessage(req, res, next) {
  try {
    const { username, message } = req.body || {};

    const saved = await messageService.createMessage({
      username,
      message,
    });

    const io = getIo(req);

    if (io) {
      io.emit('new_message', saved);
    }

    res.status(201).json({
      success: true,
      data: saved,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/messages/:id
 * Deletes a message from MongoDB.
 */
async function deleteMessage(req, res, next) {
  try {
    const { id } = req.params;

    const deleted = await messageService.deleteMessage(id);

    const io = getIo(req);

    // Tell all connected clients to remove this message
    if (io) {
      io.emit('message_deleted', {
        _id: String(deleted._id),
      });
    }

    res.status(200).json({
      success: true,
      data: deleted,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMessages,
  createMessage,
  deleteMessage,
};