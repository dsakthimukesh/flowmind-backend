-- FlowMind AI — pgvector Extension + Embedding Column
--
-- Requires the pgvector-enabled Postgres image.
-- docker-compose uses ankane/pgvector:latest instead of postgres:16-alpine.
-- The vector column is NOT managed by Prisma — raw SQL only.

-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add 768-dimensional embedding column to document_chunks
-- (text-embedding-004 from Google produces 768-dim vectors)
ALTER TABLE "document_chunks"
    ADD COLUMN IF NOT EXISTS "embedding" vector(768);

-- HNSW index for approximate nearest-neighbour search.
-- cosine distance is appropriate for normalised embedding vectors.
-- m=16, ef_construction=64 are sensible defaults for up to ~1M vectors.
CREATE INDEX IF NOT EXISTS "document_chunks_embedding_hnsw_idx"
    ON "document_chunks"
    USING hnsw ("embedding" vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
