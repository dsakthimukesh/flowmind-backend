import type { NodeExecutor } from './types.js';

/**
 * END node — terminal node. Signals the engine to stop traversal.
 * Returns nextNodeId: null to tell the engine the walk is complete.
 *
 * Config shape: { message?: string }
 */
export const endExecutor: NodeExecutor = async (node, context) => {
  const message = (node.config['message'] as string) ?? 'Workflow completed';

  return {
    output: { message },
    nextNodeId: null,  // null = stop execution
  };
};
