// Defaults to the dev proxy (/api). REACT_APP_API_URL lets a developer call Express
// directly (CORS is enabled); needed when the dev proxy truncates large responses.
const BASE = process.env.REACT_APP_API_URL || '/api';

// Drop undefined / null / '' so empty form fields are never sent to the backend.
export function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== ''),
  );
}

async function request(path, params, { signal } = {}) {
  const qs = new URLSearchParams(cleanParams(params)).toString();
  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`;

  let response;
  try {
    response = await fetch(url, { signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error('Unable to reach the server. Please check that the backend is running.');
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body && body.error) message = body.error;
    } catch {
      // Non-JSON error body: keep the generic status message.
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export const fetchProperties = (params, options) => request('/properties', params, options);

export const fetchPropertyDetail = (id, options) =>
  request(`/properties/${encodeURIComponent(id)}`, undefined, options);

export const fetchOpenHouses = (id, options) =>
  request(`/properties/${encodeURIComponent(id)}/openhouses`, undefined, options);
