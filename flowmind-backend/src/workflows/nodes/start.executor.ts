import type { NodeExecutor } from './types.js';

/**
 * START node — entry point of every workflow.
 * Optionally injects static input data from config into context.
 *
 * Config shape: { input?: Record<string, unknown> }
 */
export const startExecutor: NodeExecutor = async (node, context) => {
  const input = (node.config['input'] as Record<string, unknown>) ?? {};

  // Seed context with any static inputs defined in the node config
  Object.assign(context.data, input);

  return { output: input };
};
