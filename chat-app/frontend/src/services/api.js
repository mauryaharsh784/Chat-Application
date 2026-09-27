const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
    // Non-JSON response
  }

  if (!res.ok) {
    const message =
      (body && body.message) ||
      `Request failed with status ${res.status}`;

    throw new ApiError(message, res.status);
  }

  return body;
}

/**
 * Fetches chat history.
 */
export async function fetchMessages() {
  const res = await fetch(
    `${API_URL}/api/messages`
  );

  const body = await handleResponse(res);

  return body.data;
}

/**
 * Creates a message via REST.
 */
export async function postMessage({
  username,
  message,
}) {
  const res = await fetch(
    `${API_URL}/api/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        message,
      }),
    }
  );

  const body = await handleResponse(res);

  return body.data;
}

/**
 * Deletes a message.
 */
export async function deleteMessage(messageId) {
  if (!messageId) {
    throw new ApiError(
      'Message ID is required',
      400
    );
  }

  const res = await fetch(
    `${API_URL}/api/messages/${messageId}`,
    {
      method: 'DELETE',
    }
  );

  const body = await handleResponse(res);

  return body.data;
}

export { ApiError };