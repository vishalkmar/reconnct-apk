import { io } from 'socket.io-client';
import { API_ORIGIN } from '../config';

// Connects to the backend `/support` Socket.IO namespace as the party (user or
// host). `role` picks the queue: 'user' or 'supplier'. Real-time messages,
// read receipts and typing flow through here; REST is the history/fallback.

let socket = null;

export function connectSupport(token, role = 'user') {
  if (!token) return null;
  // Reconnect fresh if the role (queue) or token changed.
  if (socket) { socket.disconnect(); socket = null; }
  socket = io(`${API_ORIGIN}/support`, {
    auth: { token, role },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });
  return socket;
}

export function getSupportSocket() { return socket; }

export function disconnectSupport() {
  if (socket) { socket.disconnect(); socket = null; }
}
