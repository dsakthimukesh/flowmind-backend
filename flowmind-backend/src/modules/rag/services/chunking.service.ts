/**
 * src/modules/rag/services/chunking.service.ts
 *
 * Splits plain text into overlapping chunks for embedding.
 *
 * Strategy: character-window with overlap.
 *   chunkSize    — target characters per chunk (default 1000)
 *   overlap      — characters shared between adjacent chunks (default 200)
 *
 * Overlap prevents context loss at chunk boundaries — a sentence split
 * across two chunks is still represented in both.
 *
 * tokenCount is estimated at 1 token ≈ 4 characters (GPT-style approximation).
 * Accurate token counts require the provider's tokenizer — good enough for MVP.
 */

export interface TextChunk {
  chunkIndex: number;
  content: string;
  tokenCount: number;
}

export interface ChunkOptions {
  chunkSize?: number;   // characters, default 1000
  overlap?: number;     // characters, default 200
}

export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const chunkSize = options.chunkSize ?? 1000;
  const overlap   = Math.min(options.overlap ?? 200, Math.floor(chunkSize / 2));

  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  if (cleaned.length === 0) return [];

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < cleaned.length) {
    let end = start + chunkSize;

    // Try to break on a sentence boundary (period + space) or newline
    if (end < cleaned.length) {
      const searchWindow = cleaned.slice(start, end);
      const lastBreak = Math.max(
        searchWindow.lastIndexOf('. '),
        searchWindow.lastIndexOf('\n'),
      );
      if (lastBreak > chunkSize * 0.5) {
        end = start + lastBreak + 1;
      }
    }

    const content = cleaned.slice(start, end).trim();

    if (content.length > 0) {
      chunks.push({
        chunkIndex: index++,
        content,
        tokenCount: Math.ceil(content.length / 4),
      });
    }

    start = end - overlap;
  }

  return chunks;
}
