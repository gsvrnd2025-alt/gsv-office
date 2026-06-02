import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

let socket: Socket | null = null;

export function getSocket(): Socket {
  const token = useAuthStore.getState().accessToken;
  const isSecure = window.location.protocol === 'https:';

  if (!socket) {
    console.log('[Socket] Initializing connection to:', window.location.origin);
    socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket'],
      secure: isSecure,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
  } else if (token && (socket.auth as any)?.token !== token) {
    console.log('[Socket] Token updated, refreshing auth...');
    socket.auth = { token };
    socket.disconnect().connect();
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
