import PropTypes from 'prop-types';

function formatTime(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Message({
  message,
  isOwn,
  onDelete,
}) {
  function handleDelete() {
    if (!message._id) {
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this message?'
    );

    if (!confirmed) {
      return;
    }

    onDelete?.(message._id);
  }

  return (
    <div
      className={`message-row ${
        isOwn ? 'message-row--own' : ''
      }`}
    >
      <div
        className={`message-bubble ${
          isOwn ? 'message-bubble--own' : ''
        }`}
      >
        {!isOwn && (
          <div className="message-username">
            {message.username}
          </div>
        )}

        <div className="message-text">
          {message.message}
        </div>

        <div className="message-time">
          {formatTime(message.timestamp)}
        </div>

        {isOwn && (
          <button
            type="button"
            className="delete-message-button"
            onClick={handleDelete}
            title="Delete message"
            aria-label="Delete message"
          >
            🗑️ Delete
          </button>
        )}
      </div>
    </div>
  );
}

Message.propTypes = {
  message: PropTypes.shape({
    _id: PropTypes.string,
    username: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    timestamp: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.instanceOf(Date),
    ]).isRequired,
  }).isRequired,

  isOwn: PropTypes.bool.isRequired,

  onDelete: PropTypes.func,
};

Message.defaultProps = {
  onDelete: undefined,
};