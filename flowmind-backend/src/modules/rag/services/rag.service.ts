/**
 * src/modules/rag/services/rag.service.ts
 *
 * Orchestrates the full RAG pipeline:
 *   query → embed → vector search → retrieve chunks → build context
 *
 * This is the single entry point for all RAG operations.
 * Node executors call this service — never the retrieval or vector layer directly.
 */

import { retrieve, type RetrievalOptions, type RetrievalResult } from './retrieval.service.js';
import { AppError } from '../../../common/errors/index.js';
import { createLogger } from '../../../common/logger.js';

const log = createLogger('rag-service');

export interface RagQueryOptions {
  query: string;
  organizationId: string;
  knowledgeBaseId?: string;
  topK?: number;
  threshold?: number;
}

export interface RagResult {
  context: string;
  chunkCount: number;
  durationMs: number;
  hasResults: boolean;
}

/**
 * Run the full RAG pipeline for a query.
 * Returns a RagResult with the context string ready for prompt injection.
 * Never throws on "no results" — returns hasResults: false with an empty context string.
 */
export async function ragQuery(options: RagQueryOptions): Promise<RagResult> {
  if (!options.query.trim()) {
    throw new AppError('RAG query cannot be empty', 400, 'RAG_EMPTY_QUERY');
  }

  let result: RetrievalResult;

  try {
    result = await retrieve({
      query: options.query,
      organizationId: options.organizationId,
      knowledgeBaseId: options.knowledgeBaseId,
      topK: options.topK ?? 5,
      threshold: options.threshold ?? 0.5,
    });
  } catch (err) {
    // Embedding or DB failure — surface as a proper AppError
    log.error({ err, query: options.query.slice(0, 80) }, 'RAG pipeline failed');
    throw new AppError('RAG retrieval failed', 502, 'RAG_RETRIEVAL_ERROR');
  }

  return {
    context: result.context,
    chunkCount: result.chunkCount,
    durationMs: result.durationMs,
    hasResults: result.chunkCount > 0,
  };
}
