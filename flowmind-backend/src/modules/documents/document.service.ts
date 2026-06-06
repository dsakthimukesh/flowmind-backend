/**
 * src/modules/documents/document.service.ts
 *
 * Handles document metadata registration and indexing job dispatch.
 * File parsing is deferred to the worker — this service only creates
 * the DB record and enqueues the indexing job.
 */

import { v4 as uuidv4 } from 'uuid';
import { NotFoundError } from '../../common/errors/index.js';
import { findKnowledgeBaseByIdAndOrg } from '../knowledge-bases/knowledge-base.repository.js';
import {
  findDocumentsByKB,
  findDocumentByIdAndOrg,
  createDocument,
} from './document.repository.js';
import { getStorageProvider } from '../../infrastructure/storage/local-storage.provider.js';
import { documentIndexingQueue, addJob } from '../../queues/index.js';
import { createLogger } from '../../common/logger.js';

const log = createLogger('document-service');

export interface DocumentView {
  id: string;
  knowledgeBaseId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toView(d: {
  id: string; knowledgeBaseId: string; fileName: string; mimeType: string;
  fileSize: number; storageKey: string; status: string; errorMessage: string | null;
  createdAt: Date; updatedAt: Date;
}): DocumentView {
  return {
    id: d.id, knowledgeBaseId: d.knowledgeBaseId, fileName: d.fileName,
    mimeType: d.mimeType, fileSize: d.fileSize, storageKey: d.storageKey,
    status: d.status, errorMessage: d.errorMessage,
    createdAt: d.createdAt, updatedAt: d.updatedAt,
  };
}

export interface UploadDocumentInput {
  knowledgeBaseId: string;
  organizationId: string;
  fileName: string;
  mimeType: string;
  content: Buffer;
}

/**
 * Register document metadata, store the file, and enqueue for indexing.
 * Returns immediately — indexing is async.
 */
export async function uploadDocument(
  input: UploadDocumentInput,
): Promise<{ document: DocumentView; jobId: string | undefined }> {
  // Verify KB belongs to org
  const kb = await findKnowledgeBaseByIdAndOrg(input.knowledgeBaseId, input.organizationId);
  if (!kb) throw new NotFoundError('KnowledgeBase');

  // Generate a unique storage key: {orgId}/{kbId}/{uuid}-{filename}
  const storageKey = `${input.organizationId}/${input.knowledgeBaseId}/${uuidv4()}-${input.fileName}`;

  const storage = getStorageProvider();
  await storage.upload({
    key: storageKey,
    content: input.content,
    mimeType: input.mimeType,
    size: input.content.length,
  });

  const doc = await createDocument({
    knowledgeBaseId: input.knowledgeBaseId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    fileSize: input.content.length,
    storageKey,
  });

  // Enqueue indexing job — worker drives PENDING → PROCESSING → READY | FAILED
  const job = await addJob(documentIndexingQueue, 'index-document', {
    documentId: doc.id,
  });

  log.info({ documentId: doc.id, jobId: job.id }, 'Document uploaded, indexing queued');

  return { document: toView(doc), jobId: job.id };
}

export async function listDocuments(
  knowledgeBaseId: string,
  organizationId: string,
): Promise<DocumentView[]> {
  const docs = await findDocumentsByKB(knowledgeBaseId, organizationId);
  return docs.map(toView);
}

export async function getDocument(
  id: string,
  organizationId: string,
): Promise<DocumentView> {
  const doc = await findDocumentByIdAndOrg(id, organizationId);
  if (!doc) throw new NotFoundError('Document');
  return toView(doc);
}
