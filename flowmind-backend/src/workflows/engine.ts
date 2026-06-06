/**
 * src/workflows/engine.ts — Workflow Execution Engine
 *
 * Walks the node graph from startNodeId, executing each node via its
 * registered executor, threading context.data between nodes.
 *
 * TRAVERSAL:
 *   1. Resolve startNodeId from definition
 *   2. Execute current node → get NodeResult
 *   3. Log the outcome
 *   4. Determine next node:
 *      - result.nextNodeId === null → stop (END reached)
 *      - result.nextNodeId is a string → use it
 *      - result.nextNodeId is undefined → use node.nextNodeId from definition
 *      - no next → stop
 *   5. Repeat until no next node
 *
 * CYCLE PROTECTION:
 * A visited-set prevents infinite loops from misconfigured graphs.
 * Max 100 nodes per execution (configurable).
 */

import { createLogger } from '../common/logger.js';
import { getExecutor } from './nodes/registry.js';
import type {
  WorkflowDefinition,
  WorkflowNode,
  ExecutionContext,
  NodeLogEntry,
} from './nodes/types.js';

const log = createLogger('workflow-engine');
const MAX_NODES = 100;

export interface EngineResult {
  success: boolean;
  logs: NodeLogEntry[];
  error?: string;
}

export async function executeWorkflow(
  definition: WorkflowDefinition,
  context: ExecutionContext,
): Promise<EngineResult> {
  const nodeMap = new Map<string, WorkflowNode>(
    definition.nodes.map((n) => [n.id, n]),
  );

  let currentNodeId: string | null | undefined = definition.startNodeId;
  const visited = new Set<string>();
  let stepCount = 0;

  while (currentNodeId != null) {
    if (stepCount++ >= MAX_NODES) {
      const error = `Execution exceeded maximum node limit (${MAX_NODES}). Possible cycle.`;
      log.error({ executionId: context.executionId }, error);
      return { success: false, logs: context.logs, error };
    }

    if (visited.has(currentNodeId)) {
      const error = `Cycle detected at node: ${currentNodeId}`;
      log.error({ executionId: context.executionId, nodeId: currentNodeId }, error);
      return { success: false, logs: context.logs, error };
    }

    const node = nodeMap.get(currentNodeId);
    if (!node) {
      const error = `Node not found in definition: ${currentNodeId}`;
      log.error({ executionId: context.executionId, nodeId: currentNodeId }, error);
      return { success: false, logs: context.logs, error };
    }

    visited.add(currentNodeId);

    // ── Execute node ──────────────────────────────────────────────────────

    const entry: NodeLogEntry = {
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      status: 'started',
    };
    context.logs.push(entry);

    log.debug(
      { executionId: context.executionId, nodeId: node.id, nodeType: node.type },
      `Executing node: ${node.name}`,
    );

    // Emit node.started
    context.emit?.('node.started', {
      executionId: context.executionId,
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
    });

    const startTime = Date.now();

    try {
      const executor = getExecutor(node.type);
      const result = await executor(node, context);

      entry.status = 'success';
      entry.durationMs = Date.now() - startTime;
      entry.output = result.output;

      // Merge node output into context data
      Object.assign(context.data, result.output);

      log.debug(
        { executionId: context.executionId, nodeId: node.id, durationMs: entry.durationMs },
        `Node succeeded: ${node.name}`,
      );

      // Emit node.completed
      context.emit?.('node.completed', {
        executionId: context.executionId,
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        durationMs: entry.durationMs,
      });

      // Determine next node
      if (result.nextNodeId === null) {
        currentNodeId = null;
      } else if (typeof result.nextNodeId === 'string') {
        currentNodeId = result.nextNodeId;
      } else {
        currentNodeId = node.nextNodeId ?? null;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      entry.status = 'failed';
      entry.durationMs = Date.now() - startTime;
      entry.error = message;

      log.error(
        { executionId: context.executionId, nodeId: node.id, err },
        `Node failed: ${node.name}`,
      );

      // Emit node.failed
      context.emit?.('node.failed', {
        executionId: context.executionId,
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        error: message,
        durationMs: entry.durationMs ?? 0,
      });

      return { success: false, logs: context.logs, error: message };
    }
  }

  return { success: true, logs: context.logs };
}
