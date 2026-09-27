import PropTypes from 'prop-types';

import { useChat } from '../hooks/useChat.js';
import MessageList from './MessageList.jsx';
import MessageInput from './MessageInput.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import OnlineUsers from './OnlineUsers.jsx';

const STATUS_LABEL = {
  connecting: 'Connecting…',
  connected: 'Connected',
  disconnected: 'Disconnected',
};

export default function Chat({ username, onLeave }) {
  const {
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
  } = useChat(username);

  const isDisabled =
    connectionStatus !== 'connected';

  return (
    <div className="chat-app">
      <header className="chat-header">
        <div className="chat-header__left">
          <h1 className="chat-header__title">
            Realtime Chat
          </h1>

          <span
            className={`status-pill status-pill--${connectionStatus}`}
          >
            <span className="status-pill__dot" />

            {STATUS_LABEL[connectionStatus]}
          </span>
        </div>

        <div className="chat-header__right">
          <OnlineUsers
            count={onlineCount}
            usernames={onlineUsernames}
          />

          <button
            type="button"
            className="leave-button"
            onClick={onLeave}
          >
            Leave
          </button>
        </div>
      </header>

      {socketError && (
        <div className="banner banner--error">
          {socketError}
        </div>
      )}

      <MessageList
        messages={messages}
        currentUsername={username}
        status={historyStatus}
        error={historyError}
        onDelete={removeMessage}
      />

      <TypingIndicator
        typingUsers={typingUsers}
      />

      <MessageInput
        disabled={isDisabled}
        onSend={sendMessage}
        onTyping={notifyTyping}
      />
    </div>
  );
}

Chat.propTypes = {
  username: PropTypes.string.isRequired,
  onLeave: PropTypes.func.isRequired,
};