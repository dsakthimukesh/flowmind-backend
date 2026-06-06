/**
 * src/modules/rag/services/embedding.service.ts
 *
 * Generates vector embeddings for text chunks using the Gemini embeddings API.
 * Returns float arrays suitable for storing in pgvector (Phase 2 of RAG).
 *
 * Gemini text-embedding-004 produces 768-dimensional vectors.
 * Batching is used to minimize API round-trips — Gemini supports batch embed.
 */

import { GoogleGenAI } from '@google/genai';
import { AppError } from '../../../common/errors/index.js';
import { createLogger } from '../../../common/logger.js';

const log = createLogger('embedding-service');

const EMBEDDING_MODEL = 'text-embedding-004';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmbeddingResult {
  chunkIndex: number;
  vector: number[];
}

// ─── Client singleton ─────────────────────────────────────────────────────────

let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (_client) return _client;

  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) {
    throw new AppError(
      'GEMINI_API_KEY is not set. Embeddings require a Gemini API key.',
      500,
      'AI_NOT_CONFIGURED',
    );
  }

  _client = new GoogleGenAI({ apiKey });
  return _client;
}

// ─── Embed single text ────────────────────────────────────────────────────────

export async function embedText(text: string): Promise<number[]> {
  const client = getClient();

  try {
    const response = await client.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
    });

    const values = response.embeddings?.[0]?.values;
    if (!values || values.length === 0) {
      throw new Error('Empty embedding response from Gemini');
    }

    return values;
  } catch (err) {
    log.error({ err }, 'Gemini embedContent failed');
    throw new AppError('Embedding generation failed', 502, 'EMBEDDING_ERROR');
  }
}

// ─── Batch embed ─────────────────────────────────────────────────────────────

/**
 * Embed multiple text chunks in sequence.
 * Gemini v1 does not support true batch embedding in a single request,
 * so we run them sequentially with a small delay to respect rate limits.
 * Swap this for parallel batch calls when the Gemini batch API is available.
 */
export async function embedChunks(
  chunks: Array<{ chunkIndex: number; content: string }>,
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  for (const chunk of chunks) {
    const vector = await embedText(chunk.content);
    results.push({ chunkIndex: chunk.chunkIndex, vector });

    // Brief pause between requests to avoid rate limit (1000 QPM on free tier)
    if (chunks.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  }

  log.debug({ count: results.length }, 'Chunks embedded');
  return results;
}
