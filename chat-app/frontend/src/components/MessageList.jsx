import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';
import Message from './Message.jsx';

export default function MessageList({
  messages,
  currentUsername,
  status,
  error,
  onDelete,
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages.length]);

  if (status === 'loading') {
    return (
      <div className="message-list message-list--center">
        <div className="state-block">
          <div
            className="spinner"
            aria-hidden="true"
          />
          <p>Loading messages…</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="message-list message-list--center">
        <div className="state-block state-block--error">
          <p>Couldn&apos;t load chat history.</p>

          <p className="state-block__detail">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="message-list message-list--center">
        <div className="state-block">
          <p>No messages yet.</p>

          <p className="state-block__detail">
            Say hello to start the conversation 👋
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((msg) => (
        <Message
          key={
            msg._id ||
            `${msg.username}-${msg.timestamp}-${msg.message}`
          }
          message={msg}
          isOwn={msg.username === currentUsername}
          onDelete={onDelete}
        />
      ))}

      <div ref={bottomRef} />
    </div>
  );
}

MessageList.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      username: PropTypes.string.isRequired,
      message: PropTypes.string.isRequired,
      timestamp: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.instanceOf(Date),
      ]).isRequired,
    })
  ).isRequired,

  currentUsername: PropTypes.string.isRequired,

  status: PropTypes.oneOf([
    'loading',
    'ready',
    'error',
  ]).isRequired,

  error: PropTypes.string,

  onDelete: PropTypes.func,
};

MessageList.defaultProps = {
  error: null,
  onDelete: undefined,
};