import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { socket } from '../services/socket';

import {
  fetchMessages,
  deleteMessage,
  ApiError,
} from '../services/api';

const TYPING_TIMEOUT_MS = 2000;

export function useChat(username) {
  const [messages, setMessages] = useState([]);
  const [historyStatus, setHistoryStatus] = useState('loading');
  const [historyError, setHistoryError] = useState(null);

  const [connectionStatus, setConnectionStatus] =
    useState('connecting');

  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsernames, setOnlineUsernames] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [socketError, setSocketError] = useState(null);

  const seenIds = useRef(new Set());
  const typingTimeoutRef = useRef(null);

  // -----------------------------------------
  // ADD MESSAGE
  // -----------------------------------------

  const addMessageIfNew = useCallback((msg) => {
    const id =
      msg._id ||
      `${msg.username}-${msg.timestamp}-${msg.message}`;

    if (seenIds.current.has(id)) {
      return;
    }

    seenIds.current.add(id);

    setMessages((prev) => [...prev, msg]);
  }, []);

  // -----------------------------------------
  // LOAD MESSAGE HISTORY
  // -----------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setHistoryStatus('loading');
      setHistoryError(null);

      try {
        const data = await fetchMessages();

        if (cancelled) return;

        data.forEach((msg) => {
          const id =
            msg._id ||
            `${msg.username}-${msg.timestamp}-${msg.message}`;

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

  // -----------------------------------------
  // SOCKET CONNECTION
  // -----------------------------------------

  useEffect(() => {
    if (!username) {
      return undefined;
    }

    setConnectionStatus('connecting');

    socket.connect();

    function handleConnect() {
      setConnectionStatus('connected');
      setSocketError(null);

      socket.emit('join_chat', {
        username,
      });
    }

    function handleDisconnect() {
      setConnectionStatus('disconnected');
      setTypingUsers([]);
    }

    function handleConnectError() {
      setConnectionStatus('disconnected');

      setSocketError(
        'Unable to connect to the chat server.'
      );
    }

    function handleNewMessage(msg) {
      addMessageIfNew(msg);
    }

    // -----------------------------------------
    // MESSAGE DELETED
    // -----------------------------------------

    function handleMessageDeleted({ _id }) {
      if (!_id) return;

      const deletedId = String(_id);

      // Remove from duplicate tracking
      seenIds.current.delete(deletedId);

      // Remove message from UI
      setMessages((prev) =>
        prev.filter(
          (msg) => String(msg._id) !== deletedId
        )
      );
    }

    function handleOnlineUsers({
      count,
      usernames,
    }) {
      setOnlineCount(count);
      setOnlineUsernames(usernames || []);
    }

    function handleTyping({
      username: typer,
      isTyping,
    }) {
      // Don't show our own typing
      if (typer === username) {
        return;
      }

      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.includes(typer)
            ? prev
            : [...prev, typer];
        }

        return prev.filter(
          (user) => user !== typer
        );
      });
    }

    function handleServerError({ message }) {
      setSocketError(
        message || 'A chat error occurred.'
      );
    }

    socket.on(
      'connect',
      handleConnect
    );

    socket.on(
      'disconnect',
      handleDisconnect
    );

    socket.on(
      'connect_error',
      handleConnectError
    );

    socket.on(
      'new_message',
      handleNewMessage
    );

    socket.on(
      'message_deleted',
      handleMessageDeleted
    );

    socket.on(
      'online_users',
      handleOnlineUsers
    );

    socket.on(
      'typing',
      handleTyping
    );

    socket.on(
      'error',
      handleServerError
    );

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off(
        'connect',
        handleConnect
      );

      socket.off(
        'disconnect',
        handleDisconnect
      );

      socket.off(
        'connect_error',
        handleConnectError
      );

      socket.off(
        'new_message',
        handleNewMessage
      );

      socket.off(
        'message_deleted',
        handleMessageDeleted
      );

      socket.off(
        'online_users',
        handleOnlineUsers
      );

      socket.off(
        'typing',
        handleTyping
      );

      socket.off(
        'error',
        handleServerError
      );

      socket.disconnect();
    };
  }, [username, addMessageIfNew]);

  // -----------------------------------------
  // SEND MESSAGE
  // -----------------------------------------

  const sendMessage = useCallback(
    (text) => {
      const trimmed = text.trim();

      if (
        !trimmed ||
        connectionStatus !== 'connected'
      ) {
        return;
      }

      socket.emit(
        'send_message',
        {
          username,
          message: trimmed,
        },
        (ack) => {
          if (
            ack &&
            ack.success === false
          ) {
            setSocketError(
              ack.message ||
                'Failed to send message'
            );
          }
        }
      );

      socket.emit('user_stop_typing');

      if (typingTimeoutRef.current) {
        clearTimeout(
          typingTimeoutRef.current
        );

        typingTimeoutRef.current = null;
      }
    },
    [username, connectionStatus]
  );

  // -----------------------------------------
  // DELETE MESSAGE
  // -----------------------------------------

  const removeMessage = useCallback(
    async (messageId) => {
      if (!messageId) {
        return;
      }

      try {
        await deleteMessage(messageId);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Failed to delete message';

        setSocketError(message);
      }
    },
    []
  );

  // -----------------------------------------
  // TYPING
  // -----------------------------------------

  const notifyTyping = useCallback(() => {
    if (
      connectionStatus !== 'connected'
    ) {
      return;
    }

    if (!typingTimeoutRef.current) {
      socket.emit('user_typing');
    } else {
      clearTimeout(
        typingTimeoutRef.current
      );
    }

    typingTimeoutRef.current =
      setTimeout(() => {
        socket.emit(
          'user_stop_typing'
        );

        typingTimeoutRef.current = null;
      }, TYPING_TIMEOUT_MS);
  }, [connectionStatus]);

  // -----------------------------------------
  // CLEANUP TYPING TIMER
  // -----------------------------------------

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(
          typingTimeoutRef.current
        );
      }
    };
  }, []);

  // -----------------------------------------
  // RETURN
  // -----------------------------------------

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
    removeMessage,
  };
}