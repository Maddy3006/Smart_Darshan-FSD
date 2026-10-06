import { Server } from 'socket.io';
import env from '../config/env.js';
import { userFromJwt } from '../middleware/auth.js';
import { isObjectId, TOKEN_CODE_REGEX } from '../utils/helpers.js';

/**
 * Rooms:
 *   temple:<templeId>  live queue snapshots + announcements (public)
 *   token:<code>       status changes for one token (public, the code is the secret)
 *   user:<userId>      personal notifications (joined automatically when logged in)
 *   admin:<templeId>   crowd alerts for that temple's staff and admins
 */
let io = null;
let snapshotProvider = null;

export function initSocket(httpServer, { getSnapshot }) {
  snapshotProvider = getSnapshot;
  io = new Server(httpServer, { cors: { origin: env.clientUrls, credentials: true } });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      const user = await userFromJwt(token).catch(() => null);
      if (user) {
        socket.data.user = {
          id: String(user._id),
          role: user.role,
          templeId: user.templeId ? String(user.templeId) : null,
        };
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;
    if (user) socket.join(`user:${user.id}`);

    socket.on('subscribe', async ({ type, id } = {}, ack) => {
      const room = roomFor(type, id, user);
      if (!room) return ack?.({ ok: false });
      socket.join(room);
      ack?.({ ok: true });
      if (type === 'temple' && snapshotProvider) {
        try {
          socket.emit('live:update', await snapshotProvider(id));
        } catch {
          /* temple may not exist; ignore */
        }
      }
      return undefined;
    });

    socket.on('unsubscribe', ({ type, id } = {}) => {
      const room = roomFor(type, id, user);
      if (room) socket.leave(room);
    });
  });

  return io;
}

function roomFor(type, id, user) {
  if (type === 'temple' && isObjectId(id)) return `temple:${id}`;
  if (type === 'token' && TOKEN_CODE_REGEX.test(String(id))) return `token:${id}`;
  if (type === 'admin' && isObjectId(id) && user) {
    const allowed = user.role === 'superadmin' || (['admin', 'staff'].includes(user.role) && user.templeId === id);
    if (allowed) return `admin:${id}`;
  }
  return null;
}

/** Safe to call from scripts where no socket server is running. */
export function emitTo(room, event, payload) {
  io?.to(room).emit(event, payload);
}
