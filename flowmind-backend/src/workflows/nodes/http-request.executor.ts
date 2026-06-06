import axios, { type AxiosRequestConfig } from 'axios';
import type { NodeExecutor } from './types.js';

/**
 * HTTP_REQUEST node — performs an outbound HTTP call and stores the response.
 *
 * Config shape:
 *   {
 *     url: string,
 *     method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
 *     headers?: Record<string, string>,
 *     body?: unknown,          // request body for POST/PUT/PATCH
 *     timeoutMs?: number,      // default 10_000, max 30_000
 *     outputKey?: string       // key to store response in context.data (default: "httpResponse")
 *   }
 *
 * Supports simple {{context.data.field}} interpolation in url and body strings.
 */

function interpolate(value: string, data: Record<string, unknown>): string {
  return value.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const keys = path.trim().replace(/^context\.data\./, '').split('.');
    const resolved = keys.reduce<unknown>((acc, k) => {
      if (acc !== null && acc !== undefined && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[k];
      }
      return undefined;
    }, data);
    return resolved !== undefined ? String(resolved) : '';
  });
}

export const httpRequestExecutor: NodeExecutor = async (node, context) => {
  const url       = interpolate(node.config['url'] as string, context.data);
  const method    = ((node.config['method'] as string) ?? 'GET').toUpperCase();
  const headers   = (node.config['headers'] as Record<string, string>) ?? {};
  const body      = node.config['body'];
  const timeoutMs = Math.min((node.config['timeoutMs'] as number) ?? 10_000, 30_000);
  const outputKey = (node.config['outputKey'] as string) ?? 'httpResponse';

  const config: AxiosRequestConfig = {
    url,
    method,
    headers,
    timeout: timeoutMs,
    // Don't throw on non-2xx — let the workflow decide how to handle it
    validateStatus: () => true,
  };

  if (body !== undefined && ['POST', 'PUT', 'PATCH'].includes(method)) {
    config.data = body;
  }

  const response = await axios(config);

  const output = {
    status: response.status,
    data: response.data,
    headers: response.headers,
  };

  // Store in context so downstream nodes can reference the response
  context.data[outputKey] = output;

  return { output: { [outputKey]: output } };
};
