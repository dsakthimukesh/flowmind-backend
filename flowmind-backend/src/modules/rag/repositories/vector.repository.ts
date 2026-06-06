/**
 * src/modules/rag/repositories/vector.repository.ts
 *
 * All pgvector operations via Prisma $queryRaw / $executeRaw.
 * Prisma doesn't support the vector() column type natively, so raw SQL
 * is the correct approach — this isolates all vector SQL in one file.
 *
 * Similarity metric: cosine distance (1 - cosine_similarity).
 * Matches the HNSW index operator class (vector_cosine_ops).
 *
 * All similarity searches are scoped to an organization through the
 * document → knowledge_base → organization join chain.
 */

import { prisma } from '../../../prisma/prisma.js';
import { createLogger } from '../../../common/logger.js';

const log = createLogger('vector-repository');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimilarChunk {
  chunkId: string;
  documentId: string;
  knowledgeBaseId: string;
  content: string;
  similarity: number;   // 0–1, higher = more similar
}

// ─── Store ────────────────────────────────────────────────────────────────────

/**
 * Write the embedding vector for a chunk.
 * Called by the document-indexing worker after creating the chunk record.
 * The vector() cast converts the JS number array to a pgvector literal.
 */
export async function storeEmbedding(
  chunkId: string,
  vector: number[],
): Promise<void> {
  const vectorLiteral = `[${vector.join(',')}]`;

  await prisma.$executeRaw`
    UPDATE "document_chunks"
    SET    "embedding" = ${vectorLiteral}::vector
    WHERE  "id"        = ${chunkId}::uuid
  `;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SimilaritySearchOptions {
  queryVector: number[];
  organizationId: string;
  knowledgeBaseId?: string;  // narrow to a specific KB if provided
  topK?: number;             // default 5
  threshold?: number;        // minimum similarity 0–1, default 0.5
}

/**
 * Approximate nearest-neighbour search via the HNSW index.
 * Uses cosine distance operator (<=>).
 * Results are scoped to the caller's organization via a JOIN.
 */
export async function similaritySearch(
  options: SimilaritySearchOptions,
): Promise<SimilarChunk[]> {
  const {
    queryVector,
    organizationId,
    knowledgeBaseId,
    topK = 5,
    threshold = 0.5,
  } = options;

  const vectorLiteral = `[${queryVector.join(',')}]`;
  // cosine distance → similarity: 1 - distance
  const minDistance = 1 - threshold;

  const start = Date.now();

  let rows: SimilarChunk[];

  if (knowledgeBaseId) {
    rows = await prisma.$queryRaw<SimilarChunk[]>`
      SELECT
        dc."id"                                   AS "chunkId",
        dc."documentId",
        d."knowledgeBaseId",
        dc."content",
        (1 - (dc."embedding" <=> ${vectorLiteral}::vector)) AS "similarity"
      FROM "document_chunks" dc
      JOIN "documents"        d  ON d."id"  = dc."documentId"
      JOIN "knowledge_bases"  kb ON kb."id" = d."knowledgeBaseId"
      WHERE kb."organizationId" = ${organizationId}::uuid
        AND d."knowledgeBaseId" = ${knowledgeBaseId}::uuid
        AND d."deletedAt"       IS NULL
        AND kb."deletedAt"      IS NULL
        AND dc."embedding"      IS NOT NULL
        AND (dc."embedding" <=> ${vectorLiteral}::vector) <= ${minDistance}
      ORDER BY dc."embedding" <=> ${vectorLiteral}::vector
      LIMIT ${topK}
    `;
  } else {
    rows = await prisma.$queryRaw<SimilarChunk[]>`
      SELECT
        dc."id"                                   AS "chunkId",
        dc."documentId",
        d."knowledgeBaseId",
        dc."content",
        (1 - (dc."embedding" <=> ${vectorLiteral}::vector)) AS "similarity"
      FROM "document_chunks" dc
      JOIN "documents"        d  ON d."id"  = dc."documentId"
      JOIN "knowledge_bases"  kb ON kb."id" = d."knowledgeBaseId"
      WHERE kb."organizationId" = ${organizationId}::uuid
        AND d."deletedAt"       IS NULL
        AND kb."deletedAt"      IS NULL
        AND dc."embedding"      IS NOT NULL
        AND (dc."embedding" <=> ${vectorLiteral}::vector) <= ${minDistance}
      ORDER BY dc."embedding" <=> ${vectorLiteral}::vector
      LIMIT ${topK}
    `;
  }

  log.debug(
    { organizationId, knowledgeBaseId, topK, results: rows.length, durationMs: Date.now() - start },
    'Vector similarity search complete',
  );

  return rows;
}
