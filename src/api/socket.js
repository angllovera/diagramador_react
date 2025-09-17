import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// singletons por pestaña
let socket;
export function getSocket() {
  if (!socket) {
    socket = io(URL, {
      transports: ['websocket'], // rápido; cae a polling si hace falta
    });
  }
  return socket;
}
