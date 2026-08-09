const API = '/api';

export async function api(path, opts = {}) {
  const token = localStorage.getItem('abkhan_token');
  const method = opts.method || (opts.body !== undefined ? 'POST' : 'GET');
  const isFormData = opts.body instanceof FormData;

  const headers = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...opts.headers,
  };

  if (!isFormData && opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const fetchOpts = { method, headers };
  if (opts.body !== undefined) {
    fetchOpts.body = isFormData ? opts.body : JSON.stringify(opts.body);
  }

  const res = await fetch(API + path, fetchOpts);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      data.message ||
      (data.errors && Object.values(data.errors).flat()[0]) ||
      'Request failed';
    throw new Error(typeof msg === 'string' ? msg : 'Request failed');
  }

  return data;
}

export function setAuthToken(token) {
  if (token) localStorage.setItem('abkhan_token', token);
  else localStorage.removeItem('abkhan_token');
}

export function getAuthToken() {
  return localStorage.getItem('abkhan_token');
}
