/**
 * RAG_QUERY node — retrieve relevant knowledge-base chunks and inject context.
 *
 * Config shape:
 *   {
 *     query: string,              // supports {{context.data.field}} interpolation
 *     knowledgeBaseId?: string,   // narrow to a specific KB; omit to search all org KBs
 *     topK?: number,              // default 5
 *     threshold?: number,         // similarity threshold 0–1, default 0.5
 *     outputKey?: string          // default: "ragContext"
 *   }
 *
 * Writes to context.data[outputKey]:
 *   { context: string, chunkCount: number, hasResults: boolean }
 *
 * Downstream PROMPT/CHAT nodes can reference {{context.data.ragContext.context}}
 * to inject the retrieved knowledge into their prompts.
 *
 * Graceful fallback: if no chunks match the threshold, context is
 * "No relevant context found." and hasResults is false — the workflow
 * continues rather than failing.
 */

import { ragQuery } from '../../modules/rag/services/rag.service.js';
import type { NodeExecutor } from './types.js';
import { createLogger } from '../../common/logger.js';

const log = createLogger('node:rag-query');

function interpolate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const keys = path.trim().replace(/^context\.data\./, '').split('.');
    const val = keys.reduce<unknown>((acc, k) => {
      if (acc !== null && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[k];
      }
      return undefined;
    }, data);
    return val !== undefined ? String(val) : '';
  });
}

export const ragQueryExecutor: NodeExecutor = async (node, context) => {
  const rawQuery       = node.config['query'] as string;
  const knowledgeBaseId = node.config['knowledgeBaseId'] as string | undefined;
  const topK           = node.config['topK'] as number | undefined;
  const threshold      = node.config['threshold'] as number | undefined;
  const outputKey      = (node.config['outputKey'] as string) ?? 'ragContext';

  const query = interpolate(rawQuery, context.data);

  log.debug(
    { nodeId: node.id, query: query.slice(0, 80), knowledgeBaseId },
    'RAG_QUERY node executing',
  );

  const result = await ragQuery({
    query,
    organizationId: context.organizationId,
    knowledgeBaseId,
    topK,
    threshold,
  });

  log.info(
    {
      nodeId: node.id,
      chunkCount: result.chunkCount,
      hasResults: result.hasResults,
      durationMs: result.durationMs,
    },
    'RAG_QUERY node complete',
  );

  const output = {
    context: result.context,
    chunkCount: result.chunkCount,
    hasResults: result.hasResults,
    durationMs: result.durationMs,
  };

  context.data[outputKey] = output;

  return { output: { [outputKey]: output } };
};
