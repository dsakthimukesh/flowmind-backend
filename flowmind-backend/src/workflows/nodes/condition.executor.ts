import type { NodeExecutor } from './types.js';

/**
 * CONDITION node — evaluates a simple expression against context.data
 * and routes to trueNextNodeId or falseNextNodeId.
 *
 * Config shape:
 *   {
 *     field: string,        // dot-notation key into context.data, e.g. "user.age"
 *     operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "exists" | "not_exists",
 *     value?: unknown       // comparison value (not needed for exists/not_exists)
 *   }
 *
 * The node definition must set trueNextNodeId and falseNextNodeId.
 * Returns the appropriate nextNodeId based on evaluation result.
 */

type Operator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'exists' | 'not_exists';

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && acc !== undefined && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function evaluate(actual: unknown, operator: Operator, expected: unknown): boolean {
  switch (operator) {
    case 'eq':         return actual === expected;
    case 'neq':        return actual !== expected;
    case 'gt':         return (actual as number) > (expected as number);
    case 'gte':        return (actual as number) >= (expected as number);
    case 'lt':         return (actual as number) < (expected as number);
    case 'lte':        return (actual as number) <= (expected as number);
    case 'exists':     return actual !== undefined && actual !== null;
    case 'not_exists': return actual === undefined || actual === null;
    default:           return false;
  }
}

export const conditionExecutor: NodeExecutor = async (node, context) => {
  const field    = node.config['field'] as string;
  const operator = node.config['operator'] as Operator;
  const value    = node.config['value'];

  const actual = resolvePath(context.data, field);
  const result = evaluate(actual, operator, value);

  return {
    output: { conditionResult: result, field, actual },
    // Engine uses this to pick the correct branch
    nextNodeId: result ? node.trueNextNodeId : node.falseNextNodeId,
  };
};
