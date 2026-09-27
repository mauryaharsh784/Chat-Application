import { useRef, useState } from 'react';

const MAX_MESSAGE_LENGTH = 1000;

export default function MessageInput({ disabled, onSend, onTyping }) {
  const [value, setValue] = useState('');
  const sendingRef = useRef(false); // guards against double-send (e.g. double Enter)

  function handleChange(e) {
    setValue(e.target.value);
    if (e.target.value.trim()) {
      onTyping();
    }
  }

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled || sendingRef.current) return;

    sendingRef.current = true;
    onSend(trimmed);
    setValue('');
    // Release the guard on the next tick so legitimate subsequent sends work.
    setTimeout(() => {
      sendingRef.current = false;
    }, 150);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="message-input">
      <input
        type="text"
        className="message-input__field"
        placeholder={disabled ? 'Reconnecting…' : 'Type a message…'}
        value={value}
        maxLength={MAX_MESSAGE_LENGTH}
        disabled={disabled}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className="message-input__button"
        disabled={disabled || !value.trim()}
        onClick={handleSend}
      >
        Send
      </button>
    </div>
  );
}
