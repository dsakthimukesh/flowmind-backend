/**
 * src/sockets/index.ts — Socket module public API
 * Import from here everywhere outside the sockets directory.
 */

export { initSocketServer, getSocketServer, emitToExecution } from './socket-server.js';
export { SOCKET_EVENTS } from './events.js';
export type {
  SocketEvent,
  ExecutionStartedPayload,
  ExecutionCompletedPayload,
  ExecutionFailedPayload,
  NodeStartedPayload,
  NodeCompletedPayload,
  NodeFailedPayload,
} from './events.js';
