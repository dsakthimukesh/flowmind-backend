/**
 * src/workers/document-indexing.worker.ts — Document Indexing Consumer
 *
 * Pipeline: PENDING → PROCESSING → chunk → embed → store vectors → READY | FAILED
 * Vectors are stored directly in the `document_chunks.embedding` column via raw SQL.
 * File parsing supports plain text only for MVP.
 */

import { Worker, type Job } from 'bullmq';
import fs from 'fs/promises';
import path from 'path';
import { QUEUE_NAMES } from '../queues/queue-names.js';
import { bullmqConnection } from '../queues/index.js';
import { prisma } from '../prisma/prisma.js';
import { chunkText } from '../modules/rag/services/chunking.service.js';
import { embedChunks } from '../modules/rag/services/embedding.service.js';
import { storeEmbedding } from '../modules/rag/repositories/vector.repository.js';
import { createLogger } from '../common/logger.js';

const log = createLogger('worker:document-indexing');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

interface IndexingJobData { documentId: string }

async function processIndexingJob(job: Job<IndexingJobData>): Promise<void> {
  const { documentId } = job.data;
  log.info({ jobId: job.id, documentId }, 'Document indexing started');

  await prisma.document.update({ where: { id: documentId }, data: { status: 'PROCESSING' } });

  try {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error(`Document not found: ${documentId}`);

    // Read plain text (PDF/DOCX parsing added in future phase)
    const rawText = await fs.readFile(path.join(UPLOADS_DIR, doc.storageKey), 'utf-8');
    const chunks = chunkText(rawText, { chunkSize: 1000, overlap: 200 });
    log.debug({ documentId, chunkCount: chunks.length }, 'Text chunked');

    const embeddings = await embedChunks(chunks);

    // Create chunk records then store vectors via raw SQL
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      const embedding = embeddings[i]!;

      const created = await prisma.documentChunk.create({
        data: {
          documentId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          tokenCount: chunk.tokenCount,
        },
      });

      await storeEmbedding(created.id, embedding.vector);
    }

    await prisma.document.update({ where: { id: documentId }, data: { status: 'READY' } });
    log.info({ documentId, chunks: chunks.length }, 'Document indexed successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'FAILED', errorMessage: message },
    });
    log.error({ documentId, err }, 'Document indexing failed');
    throw err;
  }
}

export function createDocumentIndexingWorker(): Worker {
  const worker = new Worker(QUEUE_NAMES.DOCUMENT_INDEXING, processIndexingJob, {
    connection: bullmqConnection,
    concurrency: 3,
  });

  worker.on('completed', (job) => log.info({ jobId: job.id }, 'Indexing job completed'));
  worker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'Indexing job failed'));
  worker.on('error', (err) => log.error({ err }, 'Indexing worker connection error'));

  return worker;
}
