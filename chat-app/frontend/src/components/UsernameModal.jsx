import { useState } from 'react';

const MAX_USERNAME_LENGTH = 30;

export default function UsernameModal({ onSubmit }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Please enter a username.');
      return;
    }
    if (trimmed.length > MAX_USERNAME_LENGTH) {
      setError(`Username must be ${MAX_USERNAME_LENGTH} characters or fewer.`);
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h1 className="modal-title">Realtime Chat</h1>
        <p className="modal-subtitle">Choose a username to join the conversation.</p>
        <form onSubmit={handleSubmit} noValidate>
          <input
            autoFocus
            type="text"
            className="modal-input"
            placeholder="e.g. Alice"
            value={value}
            maxLength={MAX_USERNAME_LENGTH}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError('');
            }}
          />
          {error && <p className="modal-error">{error}</p>}
          <button type="submit" className="modal-button">
            Join Chat
          </button>
        </form>
      </div>
    </div>
  );
}
