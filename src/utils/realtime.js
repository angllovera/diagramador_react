// src/utils/realtime.js (FRONTEND)
import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  if (socket) return socket;
  const base = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/+$/, "");
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  socket = io(base, {
    transports: ["websocket"],
    auth: token ? { token } : undefined,
  });
  return socket;
}
