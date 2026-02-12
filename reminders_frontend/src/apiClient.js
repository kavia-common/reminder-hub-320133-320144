const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Returns API base URL from environment variables.
 * CRA exposes env vars prefixed with REACT_APP_.
 */
function getApiBaseUrl() {
  // Prefer explicit API URL; fallback to same-origin proxy-like usage.
  const raw =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    '';

  return raw.replace(/\/+$/, ''); // trim trailing slashes
}

async function parseJsonSafe(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text ? { detail: text } : null;
}

async function request(path, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl}${path}` : path;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.headers || {}),
        'Content-Type': 'application/json',
      },
    });

    if (resp.status === 204) return null;

    const data = await parseJsonSafe(resp);

    if (!resp.ok) {
      const detail =
        (data && typeof data === 'object' && data.detail) ||
        `Request failed (${resp.status})`;
      const err = new Error(detail);
      err.status = resp.status;
      err.data = data;
      throw err;
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}

// PUBLIC_INTERFACE
export async function listReminders({ includeCompleted = true } = {}) {
  /** List reminders from the backend. */
  const qs = new URLSearchParams({
    include_completed: String(includeCompleted),
    limit: '200',
    offset: '0',
  });
  return request(`/reminders?${qs.toString()}`, { method: 'GET' });
}

// PUBLIC_INTERFACE
export async function createReminder(payload) {
  /** Create a reminder via the backend. */
  return request('/reminders', { method: 'POST', body: JSON.stringify(payload) });
}

// PUBLIC_INTERFACE
export async function updateReminder(id, payload) {
  /** Update a reminder via the backend. */
  return request(`/reminders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// PUBLIC_INTERFACE
export async function deleteReminder(id) {
  /** Delete a reminder via the backend. */
  return request(`/reminders/${id}`, { method: 'DELETE' });
}

// PUBLIC_INTERFACE
export async function setReminderCompleted(id, completed) {
  /** Set completion state of a reminder via the backend. */
  return request(`/reminders/${id}/completed`, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  });
}

// PUBLIC_INTERFACE
export function getConfiguredApiBaseUrl() {
  /** Get the configured API base URL for diagnostics in the UI. */
  return getApiBaseUrl();
}
