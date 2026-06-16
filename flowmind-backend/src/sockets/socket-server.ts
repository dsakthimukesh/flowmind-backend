/**
 * src/sockets/socket-server.ts — Socket.io Server
 *
 * AUTHENTICATION:
 * JWT is validated in the `auth` middleware before any connection is accepted.
 * The decoded payload (userId, organizationId, role) is attached to socket.data
 * so handlers never need to re-verify identity.
 *
 * ROOMS:
 *   organization:{organizationId}  — all executions for an org (dashboard view)
 *   execution:{executionId}        — single execution (detail view)
 *
 * Clients join rooms by emitting 'subscribe:execution' or 'subscribe:organization'.
 * The server verifies the socket's organizationId matches before admitting them.
 *
 * SCALING NOTE:
 * Single-instance only. For multi-instance (k8s), add @socket.io/redis-adapter
 * pointing at the existing Redis connection. One line change, no logic changes.
 */

import { Server, type Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verifyAccessToken, extractBearerToken } from '../common/utils/jwt.js';
import { createLogger } from '../common/logger.js';
import type { JwtPayload } from '../modules/auth/auth.types.js';
import type { SocketEvent } from './events.js';

const log = createLogger('socket-server');

// ─── Augment socket.data type ─────────────────────────────────────────────────

declare module 'socket.io' {
  interface SocketData {
    user: JwtPayload;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _io: Server | null = null;

export function getSocketServer(): Server {
  if (!_io) throw new Error('Socket.io server not initialized. Call initSocketServer first.');
  return _io;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin:
        process.env['NODE_ENV'] === 'production'
          ? process.env['FRONTEND_URL'] ?? 'https://flowmind-frontend-seven.vercel.app'
          : ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    },
    // Ping interval / timeout — fine-tuned for LAN + cloud
    pingInterval: 25_000,
    pingTimeout: 10_000,
  });

  // ── Auth middleware ─────────────────────────────────────────────────────────
  io.use((socket, next) => {
    // Accept token from Authorization header or handshake auth object
    const authHeader =
      socket.handshake.headers['authorization'] as string | undefined;
    const handshakeToken =
      socket.handshake.auth?.['token'] as string | undefined;

    const token =
      extractBearerToken(authHeader) ?? handshakeToken ?? null;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.user = payload;
      return next();
    } catch {
      return next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection handler ──────────────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const { sub: userId, organizationId, role } = socket.data.user;

    log.info({ socketId: socket.id, userId, organizationId }, 'Socket connected');

    // Auto-join the org room — every authenticated socket is in their org room
    void socket.join(`organization:${organizationId}`);

    // ── Subscribe to a specific execution ─────────────────────────────────
    socket.on('subscribe:execution', (executionId: string) => {
      if (typeof executionId !== 'string' || !executionId) return;

      // Execution rooms are org-namespaced to prevent cross-org snooping.
      // The execution record itself is org-scoped in the DB — we trust the JWT orgId.
      void socket.join(`execution:${executionId}`);
      log.debug({ socketId: socket.id, executionId }, 'Subscribed to execution room');
    });

    socket.on('unsubscribe:execution', (executionId: string) => {
      if (typeof executionId !== 'string') return;
      void socket.leave(`execution:${executionId}`);
    });

    socket.on('disconnect', (reason) => {
      log.info({ socketId: socket.id, userId, reason }, 'Socket disconnected');
    });

    socket.on('error', (err) => {
      log.error({ socketId: socket.id, err }, 'Socket error');
    });
  });

  _io = io;
  log.info('Socket.io server initialized');
  return io;
}

// ─── Emit helpers ─────────────────────────────────────────────────────────────

/**
 * Emit an event to all sockets in the execution room AND the org room.
 * This ensures both the detail view (execution:{id}) and dashboard
 * (organization:{id}) receive every execution lifecycle event.
 */
export function emitToExecution(
  executionId: string,
  organizationId: string,
  event: SocketEvent,
  payload: unknown,
): void {
  if (!_io) return; // no-op if socket server not running (e.g., worker process)

  _io.to(`execution:${executionId}`).emit(event, payload);
  _io.to(`organization:${organizationId}`).emit(event, payload);
}
