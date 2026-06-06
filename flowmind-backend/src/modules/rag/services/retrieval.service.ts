/**
 * src/modules/rag/services/retrieval.service.ts
 *
 * Retrieves relevant chunks for a query and assembles a context string
 * ready to be injected into an LLM prompt.
 */

import { embedText } from './embedding.service.js';
import {
  similaritySearch,
  type SimilarChunk,
} from '../repositories/vector.repository.js';
import { createLogger } from '../../../common/logger.js';

const log = createLogger('retrieval-service');

export interface RetrievalOptions {
  query: string;
  organizationId: string;
  knowledgeBaseId?: string;
  topK?: number;
  threshold?: number;
}

export interface RetrievalResult {
  chunks: SimilarChunk[];
  context: string;      // formatted context string ready for prompt injection
  chunkCount: number;
  durationMs: number;
}

// ─── retrieveRelevantChunks ───────────────────────────────────────────────────

/**
 * Embed the query, search for similar chunks, return raw chunk results.
 */
export async function retrieveRelevantChunks(
  options: RetrievalOptions,
): Promise<SimilarChunk[]> {
  const queryVector = await embedText(options.query);

  return similaritySearch({
    queryVector,
    organizationId: options.organizationId,
    knowledgeBaseId: options.knowledgeBaseId,
    topK: options.topK ?? 5,
    threshold: options.threshold ?? 0.5,
  });
}

// ─── buildContext ─────────────────────────────────────────────────────────────

/**
 * Format retrieved chunks into a context string for LLM prompt injection.
 * Each chunk is numbered and separated — helps the LLM cite sources.
 */
export function buildContext(chunks: SimilarChunk[]): string {
  if (chunks.length === 0) {
    return 'No relevant context found.';
  }

  return chunks
    .map((chunk, i) =>
      `[${i + 1}] (similarity: ${chunk.similarity.toFixed(3)})\n${chunk.content}`,
    )
    .join('\n\n---\n\n');
}

// ─── Full retrieval pipeline ──────────────────────────────────────────────────

export async function retrieve(options: RetrievalOptions): Promise<RetrievalResult> {
  const start = Date.now();

  const chunks = await retrieveRelevantChunks(options);
  const context = buildContext(chunks);
  const durationMs = Date.now() - start;

  log.info(
    {
      query: options.query.slice(0, 80),
      chunkCount: chunks.length,
      durationMs,
      organizationId: options.organizationId,
      knowledgeBaseId: options.knowledgeBaseId,
    },
    'Retrieval complete',
  );

  return { chunks, context, chunkCount: chunks.length, durationMs };
}
