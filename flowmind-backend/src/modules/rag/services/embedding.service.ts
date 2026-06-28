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
const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmbeddingResult {
  chunkIndex: number;
  vector: number[];
}

// ─── Client singletons ────────────────────────────────────────────────────────

let _geminiClient: GoogleGenAI | null = null;
let _openaiClient: OpenAI | null = null;

function getEmbeddingProvider(): { type: 'openai' | 'gemini'; client: any; model: string } {
  // If OpenAI key is set and valid, prioritize it
  const openaiApiKey = process.env['OPENAI_API_KEY'];
  if (openaiApiKey && !openaiApiKey.includes('your-openai-api-key')) {
    if (!_openaiClient) {
      _openaiClient = new OpenAI({ apiKey: openaiApiKey });
    }
    return { type: 'openai', client: _openaiClient, model: OPENAI_EMBEDDING_MODEL };
  }

  // Fall back to Gemini API key
  const geminiApiKey = process.env['GEMINI_API_KEY'];
  if (geminiApiKey) {
    if (!_geminiClient) {
      _geminiClient = new GoogleGenAI({ apiKey: geminiApiKey });
    }
    return { type: 'gemini', client: _geminiClient, model: GEMINI_EMBEDDING_MODEL };
  }

  throw new AppError(
    'No AI provider configured for embeddings. Please set GEMINI_API_KEY or OPENAI_API_KEY.',
    500,
    'AI_NOT_CONFIGURED',
  );
}

// ─── Embed single text ────────────────────────────────────────────────────────

export async function embedText(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider();

  try {
    if (provider.type === 'openai') {
      const response = await (provider.client as OpenAI).embeddings.create({
        model: provider.model,
        input: text,
        dimensions: 768, // Force 768 dimensions to fit pgvector schema
      });

      const values = response.data?.[0]?.embedding;
      if (!values || values.length === 0) {
        throw new Error('Empty embedding response from OpenAI');
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
 */
export async function embedChunks(
  chunks: Array<{ chunkIndex: number; content: string }>,
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  for (const chunk of chunks) {
    const vector = await embedText(chunk.content);
    results.push({ chunkIndex: chunk.chunkIndex, vector });

    if (chunks.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  }

  log.debug({ count: results.length }, 'Chunks embedded');
  return results;
}
