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
import { OpenAI } from 'openai';
import { AppError } from '../../../common/errors/index.js';
import { createLogger } from '../../../common/logger.js';

const log = createLogger('embedding-service');

const GEMINI_EMBEDDING_MODEL = 'text-embedding-004';
const GROQ_EMBEDDING_MODEL = 'nomic-embed-text-v1.5';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmbeddingResult {
  chunkIndex: number;
  vector: number[];
}

// ─── Client singletons ────────────────────────────────────────────────────────

let _geminiClient: GoogleGenAI | null = null;
let _groqClient: OpenAI | null = null;

function getEmbeddingProvider(): { type: 'groq' | 'gemini'; client: any; model: string } {
  const groqApiKey = process.env['GROQ_API_KEY'];
  if (groqApiKey) {
    if (!_groqClient) {
      _groqClient = new OpenAI({
        apiKey: groqApiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
    }
    return { type: 'groq', client: _groqClient, model: GROQ_EMBEDDING_MODEL };
  }

  const geminiApiKey = process.env['GEMINI_API_KEY'];
  if (geminiApiKey) {
    if (!_geminiClient) {
      _geminiClient = new GoogleGenAI({ apiKey: geminiApiKey });
    }
    return { type: 'gemini', client: _geminiClient, model: GEMINI_EMBEDDING_MODEL };
  }

  throw new AppError(
    'No AI provider configured for embeddings. Please set GROQ_API_KEY or GEMINI_API_KEY.',
    500,
    'AI_NOT_CONFIGURED',
  );
}

// ─── Embed single text ────────────────────────────────────────────────────────

export async function embedText(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider();

  try {
    if (provider.type === 'groq') {
      const response = await (provider.client as OpenAI).embeddings.create({
        model: provider.model,
        input: text,
      });

      const values = response.data?.[0]?.embedding;
      if (!values || values.length === 0) {
        throw new Error('Empty embedding response from Groq');
      }

      return values;
    } else {
      const response = await provider.client.models.embedContent({
        model: provider.model,
        contents: text,
      });

      const values = response.embeddings?.[0]?.values;
      if (!values || values.length === 0) {
        throw new Error('Empty embedding response from Gemini');
      }

      return values;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err }, `${provider.type} embedding generation failed`);
    throw new AppError(`Embedding generation failed: ${msg}`, 502, 'EMBEDDING_ERROR');
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
