import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const socketURL = import.meta.env.VITE_API_URL || '/';
    socket = io(socketURL, { transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function useSocket(event: string, callback: (data: any) => void) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    const s = getSocket();
    const handler = (data: any) => savedCallback.current(data);
    s.on(event, handler);
    return () => { s.off(event, handler); };
  }, [event]);
}
