// src/api/http.js

// Puedes dejar VITE_API_URL sin /api, el builder lo agrega si falta.
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let _accessToken = localStorage.getItem('accessToken') || null;

export function setAccessToken(token) {
  _accessToken = token || null;
  if (token) localStorage.setItem('accessToken', token);
  else localStorage.removeItem('accessToken');
}

export function getAccessToken() {
  return _accessToken;
}

// Fuerza el prefijo /api si falta, respeta /api si ya viene en path
function buildUrl(path) {
  const base = (API || '').replace(/\/+$/, '');
  const p = (path || '').startsWith('/') ? path : `/${path}`;
  return p.startsWith('/api') ? `${base}${p}` : `${base}/api${p}`;
}

export async function apiFetch(
  path,
  { method = 'GET', body, headers = {}, auth = true } = {}
) {
  const url = buildUrl(path);
  console.log('[apiFetch] →', url); // DEBUG: verifica a dónde pega

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    credentials: 'include', // necesario si usas cookies httpOnly
  };

  if (body !== undefined) {
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  // Adjunta Authorization si hay token
  const at = getAccessToken();
  if (auth && at) opts.headers.Authorization = `Bearer ${at}`;

  const res = await fetch(url, opts);

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}
