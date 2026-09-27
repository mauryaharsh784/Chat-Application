import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * A single shared Socket.io client for the whole app. autoConnect is off so
 * the app can control exactly when the connection is opened (after the
 * user has chosen a username).
 */
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
