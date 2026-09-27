import { useState } from 'react';
import UsernameModal from './components/UsernameModal.jsx';
import Chat from './components/Chat.jsx';

const STORAGE_KEY = 'realtime-chat-username';

function getStoredUsername() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    // localStorage may be unavailable (e.g. privacy mode) - fall back
    // gracefully to always asking for a username.
    return '';
  }
}

export default function App() {
  const [username, setUsername] = useState(getStoredUsername);

  function handleJoin(name) {
    setUsername(name);
    try {
      window.localStorage.setItem(STORAGE_KEY, name);
    } catch {
      // Ignore storage failures; the session still works for this tab.
    }
  }

  function handleLeave() {
    setUsername('');
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  if (!username) {
    return <UsernameModal onSubmit={handleJoin} />;
  }

  return <Chat username={username} onLeave={handleLeave} />;
}
