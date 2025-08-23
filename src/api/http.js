let accessToken = localStorage.getItem('accessToken') || null;

export function setAccessToken(token) {
  accessToken = token;
  if (token) localStorage.setItem('accessToken', token);
  else localStorage.removeItem('accessToken');
}

async function safeJson(res) { try { return await res.json(); } catch { return null; } }

async function refreshToken() {
  const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error('No se pudo refrescar el token');
  const data = await safeJson(res);
  if (data?.access_token) setAccessToken(data.access_token);
  return data;
}

/** Wrapper de fetch con Authorization y auto‑refresh */
export async function apiFetch(path, options = {}, cfg = { auth: true }) {
  const headers = new Headers(options.headers || {});
  if (cfg.auth && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const exec = () => fetch(path, { ...options, headers, credentials: 'include' });
  let res = await exec();

  if (cfg.auth && res.status === 401) {
    try {
      await refreshToken();
      const h2 = new Headers(headers);
      if (accessToken) h2.set('Authorization', `Bearer ${accessToken}`);
      res = await fetch(path, { ...options, headers: h2, credentials: 'include' });
    } catch {
      setAccessToken(null);
      throw new Error('Sesión expirada. Inicia sesión.');
    }
  }

  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return safeJson(res);
}
