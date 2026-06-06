/**
 * src/sockets/events.ts — Socket event name constants and payload types.
 *
 * Single source of truth for all event names and their payloads.
 * Both server (emit) and future client (listen) use these constants.
 */

export const SOCKET_EVENTS = {
  // Execution lifecycle
  EXECUTION_STARTED:   'execution.started',
  EXECUTION_COMPLETED: 'execution.completed',
  EXECUTION_FAILED:    'execution.failed',

  // Node lifecycle
  NODE_STARTED:        'node.started',
  NODE_COMPLETED:      'node.completed',
  NODE_FAILED:         'node.failed',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

// ─── Payload types ────────────────────────────────────────────────────────────

export interface ExecutionStartedPayload {
  executionId: string;
  workflowId: string;
  organizationId: string;
  startedAt: string; // ISO
}

export interface ExecutionCompletedPayload {
  executionId: string;
  workflowId: string;
  organizationId: string;
  completedAt: string;
  nodeCount: number;
}

export interface ExecutionFailedPayload {
  executionId: string;
  workflowId: string;
  organizationId: string;
  failedAt: string;
  error: string;
}

export interface NodeStartedPayload {
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
}

export interface NodeCompletedPayload {
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  durationMs: number;
}

export interface NodeFailedPayload {
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  error: string;
  durationMs: number;
}
