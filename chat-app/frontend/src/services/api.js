const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function handleResponse(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON response (e.g. server crashed / network gateway error)
  }

  if (!res.ok) {
    const message = (body && body.message) || `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status);
  }

  return body;
}

/**
 * Fetches chat history from GET /api/messages.
 * Called once on load — the app does NOT poll this endpoint; new messages
 * after the initial load arrive exclusively via Socket.io.
 */
export async function fetchMessages() {
  const res = await fetch(`${API_URL}/api/messages`);
  const body = await handleResponse(res);
  return body.data;
}

/**
 * Creates a message via REST, as required by the assignment. The primary
 * send path used by the chat UI is Socket.io's `send_message` event (see
 * services/socket.js) so a message is never written twice; this function
 * exists so the REST API is fully usable independent of the socket layer.
 */
export async function postMessage({ username, message }) {
  const res = await fetch(`${API_URL}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, message }),
  });
  const body = await handleResponse(res);
  return body.data;
}

export { ApiError };
