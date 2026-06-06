-- FlowMind AI — RAG Foundation Migration

CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- ─── Knowledge Bases ─────────────────────────────────────────────────────────

CREATE TABLE "knowledge_bases" (
    "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID         NOT NULL,
    "name"           TEXT         NOT NULL,
    "description"    TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    "deletedAt"      TIMESTAMP(3),
    CONSTRAINT "knowledge_bases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "knowledge_bases_organizationId_idx" ON "knowledge_bases"("organizationId");

ALTER TABLE "knowledge_bases"
    ADD CONSTRAINT "knowledge_bases_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Documents ───────────────────────────────────────────────────────────────

CREATE TABLE "documents" (
    "id"              UUID             NOT NULL DEFAULT gen_random_uuid(),
    "knowledgeBaseId" UUID             NOT NULL,
    "fileName"        TEXT             NOT NULL,
    "mimeType"        TEXT             NOT NULL,
    "fileSize"        INTEGER          NOT NULL,
    "storageKey"      TEXT             NOT NULL,
    "status"          "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage"    TEXT,
    "createdAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)     NOT NULL,
    "deletedAt"       TIMESTAMP(3),
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "documents_knowledgeBaseId_idx"        ON "documents"("knowledgeBaseId");
CREATE INDEX "documents_knowledgeBaseId_status_idx" ON "documents"("knowledgeBaseId", "status");

ALTER TABLE "documents"
    ADD CONSTRAINT "documents_knowledgeBaseId_fkey"
    FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Document Chunks ─────────────────────────────────────────────────────────

CREATE TABLE "document_chunks" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "documentId"  UUID         NOT NULL,
    "chunkIndex"  INTEGER      NOT NULL,
    "content"     TEXT         NOT NULL,
    "tokenCount"  INTEGER      NOT NULL,
    "embeddingId" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "document_chunks_documentId_idx" ON "document_chunks"("documentId");

ALTER TABLE "document_chunks"
    ADD CONSTRAINT "document_chunks_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "documents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
