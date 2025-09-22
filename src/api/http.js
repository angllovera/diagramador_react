// src/api/http.js
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let _accessToken = localStorage.getItem('accessToken') || null;

export function setAccessToken(token) {
  _accessToken = token || null;
  if (token) localStorage.setItem('accessToken', token);
  else localStorage.removeItem('accessToken');
}
export function getAccessToken() { return _accessToken; }

function getShareToken() {
  return localStorage.getItem('shareToken') || null;
}

function buildUrl(path) {
  const base = (API || '').replace(/\/+$/, '');
  const p = (path || '').startsWith('/') ? path : `/${path}`;
  return p.startsWith('/api') ? `${base}${p}` : `${base}/api${p}`;
}

export async function apiFetch(path, { method='GET', body, headers={}, auth=true } = {}) {
  const url = buildUrl(path);
  const opts = { method, headers: { 'Content-Type': 'application/json', ...headers }, credentials: 'include' };

  if (body !== undefined) opts.body = typeof body === 'string' ? body : JSON.stringify(body);

  const at = getAccessToken();
  if (auth && at) opts.headers.Authorization = `Bearer ${at}`;

  const share = getShareToken();
  if (!at && share) {                     // 👈 solo si NO hay access token
    opts.headers['X-Share-Token'] = share;
  }

  const res = await fetch(url, opts);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}
