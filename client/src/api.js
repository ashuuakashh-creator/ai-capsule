// Tiny API helper. Every request uses `credentials: 'include'` so the browser
// sends the HttpOnly "token" cookie. We never touch the JWT from JavaScript.

async function request(method, url, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: {},
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);

  // 401 means "not authenticated" - callers use this to redirect to /login.
  if (res.status === 401) {
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.details = data && data.details;
    throw err;
  }
  return data;
}

export const api = {
  me: () => request('GET', '/api/me'),
  logout: () => request('POST', '/auth/logout'),
  listCapsules: () => request('GET', '/api/capsules'),
  createCapsule: (data) => request('POST', '/api/capsules', data),
  updateCapsule: (id, data) => request('PUT', `/api/capsules/${id}`, data),
  deleteCapsule: (id) => request('DELETE', `/api/capsules/${id}`),
};
