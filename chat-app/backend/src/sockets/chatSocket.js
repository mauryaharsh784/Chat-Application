const messageService = require('../services/messageService');

const MAX_USERNAME_LENGTH = Number(process.env.MAX_USERNAME_LENGTH) || 30;

/**
 * In-memory map of currently connected sockets -> username.
 * This is ONLY used to track who is online right now; it is intentionally
 * not persisted to MongoDB because "online" is a live property of the
 * current Socket.io connections, not chat history.
 *   socketId -> username
 */
const onlineUsers = new Map();

/** username -> Set<socketId>, so the same person open in two tabs still
 * only appears once in the online list and disconnecting one tab doesn't
 * incorrectly mark them offline. */
const usernameToSockets = new Map();

function getOnlineUsernames() {
  return Array.from(usernameToSockets.keys());
}

function broadcastOnlineUsers(io) {
  const usernames = getOnlineUsernames();
  io.emit('online_users', {
    count: usernames.length,
    usernames,
  });
}

function sanitizeUsername(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().slice(0, MAX_USERNAME_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Registers all Socket.io event handlers.
 *
 * Event naming convention used throughout:
 *   join_chat        (client -> server) register a username for this socket
 *   send_message      (client -> server) send a new chat message
 *   new_message        (server -> client) a message was persisted, broadcast to all
 *   user_typing        (client -> server) user started typing
 *   user_stop_typing    (client -> server) user stopped typing
 *   typing              (server -> client) relays who is currently typing
 *   online_users        (server -> client) current online count + usernames
 *   error                (server -> client) a recoverable error (validation, DB down, etc.)
 *   disconnect          (built-in) socket connection closed
 */
function registerChatSocket(io) {
  io.on('connection', (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    socket.on('join_chat', (payload) => {
      const username = sanitizeUsername(payload && payload.username);
      if (!username) {
        socket.emit('error', { message: 'A valid username is required to join the chat' });
        return;
      }

      socket.data.username = username;
      onlineUsers.set(socket.id, username);

      if (!usernameToSockets.has(username)) {
        usernameToSockets.set(username, new Set());
      }
      usernameToSockets.get(username).add(socket.id);

      broadcastOnlineUsers(io);
    });

    socket.on('send_message', async (payload, ack) => {
      try {
        const username = socket.data.username || sanitizeUsername(payload && payload.username);
        const message = payload && payload.message;

        const saved = await messageService.createMessage({ username, message });

        // Single write, single broadcast: every connected client (including
        // the sender) gets the message back with its server-generated
        // timestamp and _id, which is what the UI renders.
        io.emit('new_message', saved);

        if (typeof ack === 'function') {
          ack({ success: true, data: saved });
        }
      } catch (err) {
        const statusMessage = err.message || 'Failed to send message';
        socket.emit('error', { message: statusMessage });
        if (typeof ack === 'function') {
          ack({ success: false, message: statusMessage });
        }
      }
    });

    socket.on('user_typing', () => {
      const username = socket.data.username;
      if (!username) return;
      socket.broadcast.emit('typing', { username, isTyping: true });
    });

    socket.on('user_stop_typing', () => {
      const username = socket.data.username;
      if (!username) return;
      socket.broadcast.emit('typing', { username, isTyping: false });
    });

    socket.on('disconnect', (reason) => {
      console.log(`[socket] client disconnected: ${socket.id} (${reason})`);

      const username = onlineUsers.get(socket.id);
      onlineUsers.delete(socket.id);

      if (username && usernameToSockets.has(username)) {
        const sockets = usernameToSockets.get(username);
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          usernameToSockets.delete(username);
          io.emit('user_disconnected', { username });
        }
      }

      broadcastOnlineUsers(io);
    });
  });
}

module.exports = { registerChatSocket, getOnlineUsernames };
