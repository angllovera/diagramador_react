import { apiFetch, setAccessToken } from './http';

export function register({ name, email, password }) {
  return apiFetch('/api/auth/register', {
    method: 'POST', body: JSON.stringify({ name, email, password })
  }, { auth: false }).then(d => { if (d?.access_token) setAccessToken(d.access_token); return d; });
}

export function login({ email, password }) {
  return apiFetch('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password })
  }, { auth: false }).then(d => { if (d?.access_token) setAccessToken(d.access_token); return d; });
}

export function refresh() {
  return apiFetch('/api/auth/refresh', { method: 'POST' }, { auth: false })
    .then(d => { if (d?.access_token) setAccessToken(d.access_token); return d; });
}

export function logout() {
  setAccessToken(null);
  return apiFetch('/api/auth/logout', { method: 'POST' }, { auth: false });
}

export function getMe() { return apiFetch('/api/users/me'); }
