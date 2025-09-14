// src/api/auth.js
import { apiFetch, setAccessToken } from "./http";

export const getMe = () => apiFetch("/users/me", { auth: true });

export async function login(data) {
  return apiFetch("/auth/login", { method: "POST", body: data, auth: false });
}

export async function register(data) {
  const r = await apiFetch("/auth/register", {
    method: "POST",
    body: data,
    auth: false,
  });
  if (r?.accessToken) setAccessToken(r.accessToken);
  if (r?.refreshToken) localStorage.setItem("refreshToken", r.refreshToken);
  return r;
}
export async function refresh() {
  const rt = localStorage.getItem("refreshToken");
  if (!rt) throw new Error("No refresh token");
  const r = await apiFetch("/auth/refresh-token", {
    method: "POST",
    body: { refreshToken: rt },
    auth: false,
  });
  if (r?.accessToken) setAccessToken(r.accessToken);
  if (r?.refreshToken) localStorage.setItem("refreshToken", r.refreshToken);
  return r;
}
export async function logout() {
  try {
    await apiFetch("/auth/logout", { method: "POST", auth: true });
  } catch {
  } finally {
    setAccessToken(null);
    localStorage.removeItem("refreshToken");
  }
}
