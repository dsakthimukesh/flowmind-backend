/**
 * src/workflows/nodes/registry.ts — Node Executor Registry
 *
 * Maps NodeType → NodeExecutor function.
 * Adding a new node type is a two-step operation:
 *   1. Add the type to NODE_TYPES in types.ts
 *   2. Register the executor here
 */

import { NODE_TYPES, type NodeType, type NodeExecutor } from './types.js';
import { startExecutor }       from './start.executor.js';
import { endExecutor }         from './end.executor.js';
import { conditionExecutor }   from './condition.executor.js';
import { delayExecutor }       from './delay.executor.js';
import { httpRequestExecutor } from './http-request.executor.js';
import { transformExecutor }   from './transform.executor.js';
import { promptExecutor }      from './prompt.executor.js';
import { chatExecutor }        from './chat.executor.js';
import { summarizeExecutor }   from './summarize.executor.js';
import { classifyExecutor }    from './classify.executor.js';
import { ragQueryExecutor }    from './rag-query.executor.js';

const registry = new Map<NodeType, NodeExecutor>([
  // ── Core nodes ──────────────────────────────────────────────────
  [NODE_TYPES.START,        startExecutor],
  [NODE_TYPES.END,          endExecutor],
  [NODE_TYPES.CONDITION,    conditionExecutor],
  [NODE_TYPES.DELAY,        delayExecutor],
  [NODE_TYPES.HTTP_REQUEST, httpRequestExecutor],
  [NODE_TYPES.TRANSFORM,    transformExecutor],
  // ── AI nodes ────────────────────────────────────────────────────
  [NODE_TYPES.PROMPT,       promptExecutor],
  [NODE_TYPES.CHAT,         chatExecutor],
  [NODE_TYPES.SUMMARIZE,    summarizeExecutor],
  [NODE_TYPES.CLASSIFY,     classifyExecutor],
  // ── RAG nodes ───────────────────────────────────────────────────
  [NODE_TYPES.RAG_QUERY,    ragQueryExecutor],
]);

export function getExecutor(type: NodeType): NodeExecutor {
  const executor = registry.get(type);
  if (!executor) {
    throw new Error(`No executor registered for node type: ${type}`);
  }
  return executor;
}
