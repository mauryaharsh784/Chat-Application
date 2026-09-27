export default function TypingIndicator({ typingUsers }) {
  if (!typingUsers || typingUsers.length === 0) {
    return <div className="typing-indicator typing-indicator--empty">&nbsp;</div>;
  }

  const text =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing…`
      : `${typingUsers.join(', ')} are typing…`;

  return (
    <div className="typing-indicator">
      <span className="typing-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {text}
    </div>
  );
}
