/**
 * src/workflows/nodes/types.ts — Node Engine Type Contracts
 *
 * A workflow definition (stored as JSON in WorkflowVersion.definition) is
 * a graph of nodes connected by edges. Each node has a type, config, and
 * optional connection to next node(s).
 *
 * DESIGN:
 * - NodeExecutor is a single async function — easy to register, test, mock
 * - ExecutionContext is the shared mutable data bag passed node-to-node
 * - NodeResult carries the output and routing decision (next node)
 * - All executors are stateless — context holds all state
 */

// ─── Node Types ───────────────────────────────────────────────────────────────

export const NODE_TYPES = {
  START: 'START',
  END: 'END',
  CONDITION: 'CONDITION',
  DELAY: 'DELAY',
  HTTP_REQUEST: 'HTTP_REQUEST',
  TRANSFORM: 'TRANSFORM',
  // ── AI nodes ──────────────────────────────────────────────────
  PROMPT: 'PROMPT',
  CHAT: 'CHAT',
  SUMMARIZE: 'SUMMARIZE',
  CLASSIFY: 'CLASSIFY',
  // ── RAG nodes ─────────────────────────────────────────────────
  RAG_QUERY: 'RAG_QUERY',
} as const;

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];

// ─── Node Definition (stored in workflow version JSON) ────────────────────────

export interface WorkflowNode {
  id: string;          // unique within the workflow
  type: NodeType;
  name: string;
  config: Record<string, unknown>;  // type-specific configuration
  nextNodeId?: string;              // default next node
  // CONDITION nodes use these instead of nextNodeId:
  trueNextNodeId?: string;
  falseNextNodeId?: string;
}

export interface WorkflowDefinition {
  startNodeId: string;
  nodes: WorkflowNode[];
}

// ─── Execution Context ────────────────────────────────────────────────────────

/**
 * Shared data bag threaded through every node in an execution.
 * Nodes read from and write to `data` — this is how nodes pass
 * values to downstream nodes.
 */
export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  organizationId: string;
  /** Mutable key-value store — nodes write outputs here for downstream use */
  data: Record<string, unknown>;
  /** Append-only execution log — one entry per node */
  logs: NodeLogEntry[];
  /**
   * Optional event emitter injected by the worker process.
   * The engine calls this at node lifecycle points; the socket server
   * is never imported by the engine (clean separation of concerns).
   */
  emit?: (event: string, payload: unknown) => void;
}

export interface NodeLogEntry {
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  status: 'started' | 'success' | 'failed';
  durationMs?: number;
  error?: string;
  output?: unknown;
}

// ─── Node Result ──────────────────────────────────────────────────────────────

export interface NodeResult {
  /** Data written to context by this node */
  output: Record<string, unknown>;
  /**
   * Which node to execute next.
   * - Explicit ID: go to that node
   * - undefined: use node.nextNodeId from definition
   * - null: stop execution (END node)
   */
  nextNodeId?: string | null;
}

// ─── Executor Interface ───────────────────────────────────────────────────────

export type NodeExecutor = (
  node: WorkflowNode,
  context: ExecutionContext,
) => Promise<NodeResult>;
