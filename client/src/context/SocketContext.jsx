import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_ORIGIN } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext({ socket: null, connected: false, joinRoom: () => () => {} });

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  // room key -> number of components currently interested in it
  const roomsRef = useRef(new Map());

  useEffect(() => {
    const instance = io(API_ORIGIN || undefined, {
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
    // Connect on the next tick so React StrictMode's mount/unmount/mount in development
    // doesn't open (and immediately abort) an extra connection.
    const connectTimer = setTimeout(() => instance.connect(), 0);

    instance.on('connect', () => {
      setConnected(true);
      // Rooms are lost on reconnect, so join them again.
      for (const key of roomsRef.current.keys()) {
        const [type, id] = key.split(':');
        instance.emit('subscribe', { type, id });
      }
    });
    instance.on('disconnect', () => setConnected(false));

    // Personal notifications: a toast in the app, plus a system notification when the tab is hidden.
    instance.on('notification', (n) => {
      toast(
        (t) => (
          <button
            type="button"
            className="text-left"
            onClick={() => {
              toast.dismiss(t.id);
              if (n.link) navigateRef.current(n.link);
            }}
          >
            <span className="block font-semibold text-temple-900">{n.title}</span>
            <span className="block text-sm text-temple-600">{n.message}</span>
          </button>
        ),
        { duration: 7000, icon: n.level === 'warning' ? '⚠️' : '🔔' },
      );
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(n.title, { body: n.message, icon: '/favicon.svg' });
      }
    });

    setSocket(instance);
    return () => {
      clearTimeout(connectTimer);
      instance.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [token]);

  const joinRoom = useCallback(
    (type, id) => {
      const key = `${type}:${id}`;
      const rooms = roomsRef.current;
      rooms.set(key, (rooms.get(key) || 0) + 1);
      if (rooms.get(key) === 1 && socket?.connected) socket.emit('subscribe', { type, id });

      return () => {
        const count = (rooms.get(key) || 1) - 1;
        if (count > 0) {
          rooms.set(key, count);
        } else {
          rooms.delete(key);
          if (socket?.connected) socket.emit('unsubscribe', { type, id });
        }
      };
    },
    [socket],
  );

  const value = useMemo(() => ({ socket, connected, joinRoom }), [socket, connected, joinRoom]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}

/** Listens to a socket event for the lifetime of the component. */
export function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return undefined;
    const listener = (payload) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event]);
}

/** Joins a server room ('temple' | 'token' | 'admin') while the component is mounted. */
export function useRoom(type, id) {
  const { joinRoom } = useSocket();
  useEffect(() => {
    if (!id) return undefined;
    return joinRoom(type, String(id));
  }, [joinRoom, type, id]);
}
