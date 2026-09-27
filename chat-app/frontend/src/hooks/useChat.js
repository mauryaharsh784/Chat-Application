import { useCallback, useEffect, useRef, useState } from 'react';
import { socket } from '../services/socket';
import { fetchMessages, ApiError } from '../services/api';

const TYPING_TIMEOUT_MS = 2000;

/**
 * Central chat hook. Owns:
 *  - initial history load (REST, once)
 *  - the live Socket.io connection lifecycle
 *  - message list state, kept in sync via the `new_message` broadcast
 *  - connection status, online users, and who's typing
 *
 * Design: history comes from GET /api/messages exactly once on mount.
 * Every message after that (including this user's own) arrives via the
 * `new_message` socket event, so there's a single source of truth for the
 * message list and no duplicate-fetch/poll loop.
 */
export function useChat(username) {
  const [messages, setMessages] = useState([]);
  const [historyStatus, setHistoryStatus] = useState('loading'); // loading | ready | error
  const [historyError, setHistoryError] = useState(null);

  const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting | connected | disconnected
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsernames, setOnlineUsernames] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]); // usernames currently typing (excludes self)
  const [socketError, setSocketError] = useState(null);

  const seenIds = useRef(new Set());
  const typingTimeoutRef = useRef(null);

  const addMessageIfNew = useCallback((msg) => {
    const id = msg._id || `${msg.username}-${msg.timestamp}-${msg.message}`;
    if (seenIds.current.has(id)) return; // guards against duplicate events
    seenIds.current.add(id);
    setMessages((prev) => [...prev, msg]);
  }, []);

  // Load chat history once
  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setHistoryStatus('loading');
      setHistoryError(null);
      try {
        const data = await fetchMessages();
        if (cancelled) return;
        data.forEach((msg) => {
          const id = msg._id || `${msg.username}-${msg.timestamp}-${msg.message}`;
          seenIds.current.add(id);
        });
        setMessages(data);
        setHistoryStatus('ready');
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message
            : 'Could not reach the server. Check your connection and try again.';
        setHistoryError(message);
        setHistoryStatus('error');
      }
    }

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  // Socket.io connection + event wiring
  useEffect(() => {
    if (!username) return undefined;

    setConnectionStatus('connecting');
    socket.connect();

    function handleConnect() {
      setConnectionStatus('connected');
      setSocketError(null);
      socket.emit('join_chat', { username });
    }

    function handleDisconnect() {
      setConnectionStatus('disconnected');
      setTypingUsers([]);
    }

    function handleConnectError() {
      setConnectionStatus('disconnected');
      setSocketError('Unable to connect to the chat server.');
    }

    function handleNewMessage(msg) {
      addMessageIfNew(msg);
    }

    function handleOnlineUsers({ count, usernames }) {
      setOnlineCount(count);
      setOnlineUsernames(usernames || []);
    }

    function handleTyping({ username: typer, isTyping }) {
      if (typer === username) return; // never show your own typing indicator
      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.includes(typer) ? prev : [...prev, typer];
        }
        return prev.filter((u) => u !== typer);
      });
    }

    function handleServerError({ message }) {
      setSocketError(message || 'A chat error occurred.');
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('new_message', handleNewMessage);
    socket.on('online_users', handleOnlineUsers);
    socket.on('typing', handleTyping);
    socket.on('error', handleServerError);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('new_message', handleNewMessage);
      socket.off('online_users', handleOnlineUsers);
      socket.off('typing', handleTyping);
      socket.off('error', handleServerError);
      socket.disconnect();
    };
  }, [username, addMessageIfNew]);

  const sendMessage = useCallback(
    (text) => {
      const trimmed = text.trim();
      if (!trimmed || connectionStatus !== 'connected') return;

      socket.emit('send_message', { username, message: trimmed }, (ack) => {
        if (ack && ack.success === false) {
          setSocketError(ack.message || 'Failed to send message');
        }
      });
      socket.emit('user_stop_typing');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    },
    [username, connectionStatus]
  );

  const notifyTyping = useCallback(() => {
    if (connectionStatus !== 'connected') return;

    if (!typingTimeoutRef.current) {
      socket.emit('user_typing');
    } else {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('user_stop_typing');
      typingTimeoutRef.current = null;
    }, TYPING_TIMEOUT_MS);
  }, [connectionStatus]);

  useEffect(
    () => () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    },
    []
  );

  return {
    messages,
    historyStatus,
    historyError,
    connectionStatus,
    onlineCount,
    onlineUsernames,
    typingUsers,
    socketError,
    sendMessage,
    notifyTyping,
  };
}
