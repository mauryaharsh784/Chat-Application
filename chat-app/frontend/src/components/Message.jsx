function formatTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Message({ message, isOwn }) {
  return (
    <div className={`message-row ${isOwn ? 'message-row--own' : ''}`}>
      <div className={`message-bubble ${isOwn ? 'message-bubble--own' : ''}`}>
        {!isOwn && <div className="message-username">{message.username}</div>}
        {/* Rendered as plain text (React escapes this by default) - never
            dangerouslySetInnerHTML - so message content can't inject HTML. */}
        <div className="message-text">{message.message}</div>
        <div className="message-time">{formatTime(message.timestamp)}</div>
      </div>
    </div>
  );
}
