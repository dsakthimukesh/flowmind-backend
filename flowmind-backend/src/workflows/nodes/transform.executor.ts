import type { NodeExecutor } from './types.js';

/**
 * TRANSFORM node — maps and reshapes context.data into a new output object.
 *
 * Config shape:
 *   {
 *     mappings: Array<{
 *       from: string,   // dot-notation source key in context.data
 *       to: string,     // dot-notation destination key in output
 *       default?: unknown  // fallback if source is undefined
 *     }>,
 *     outputKey?: string  // key to store result in context.data (default: "transformed")
 *   }
 *
 * Example:
 *   mappings: [
 *     { from: "httpResponse.data.id",   to: "userId" },
 *     { from: "httpResponse.data.name", to: "fullName", default: "Unknown" }
 *   ]
 *   → context.data.transformed = { userId: "...", fullName: "..." }
 */

interface Mapping {
  from: string;
  to: string;
  default?: unknown;
}

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && acc !== undefined && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let cursor: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (cursor[key] === undefined || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]!] = value;
}

export const transformExecutor: NodeExecutor = async (node, context) => {
  const mappings  = (node.config['mappings'] as Mapping[]) ?? [];
  const outputKey = (node.config['outputKey'] as string) ?? 'transformed';

  const result: Record<string, unknown> = {};

  for (const mapping of mappings) {
    const value = getPath(context.data, mapping.from);
    const resolved = value !== undefined ? value : mapping.default;
    setPath(result, mapping.to, resolved);
  }

  // Write to context so downstream nodes can access the transformed data
  context.data[outputKey] = result;

  return { output: { [outputKey]: result } };
};
