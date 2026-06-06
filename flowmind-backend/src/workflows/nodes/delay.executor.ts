import type { NodeExecutor } from './types.js';

/**
 * DELAY node — pauses execution for a fixed duration.
 * Useful for rate-limiting, retry windows, or timed sequences.
 *
 * Config shape: { delayMs: number }  (default: 1000ms, max: 30_000ms)
 *
 * NOTE: In a production engine this would be implemented as a separate
 * delayed BullMQ job rather than a process sleep, so the worker thread
 * isn't blocked. For the current foundation this is acceptable.
 */
export const delayExecutor: NodeExecutor = async (node, _context) => {
  const raw    = node.config['delayMs'];
  const delay  = typeof raw === 'number' ? Math.min(raw, 30_000) : 1_000;

  await new Promise((resolve) => setTimeout(resolve, delay));

  return { output: { delayedMs: delay } };
};
