import { prisma } from '../../prisma/prisma.js';
import type { DocumentModel } from '../../generated/prisma/models.js';

type Document = DocumentModel;

/** List documents for a KB, newest first. Enforces org scope via KB join. */
export async function findDocumentsByKB(
  knowledgeBaseId: string,
  organizationId: string,
): Promise<Document[]> {
  return prisma.document.findMany({
    where: {
      knowledgeBaseId,
      deletedAt: null,
      knowledgeBase: { organizationId, deletedAt: null },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findDocumentByIdAndOrg(
  id: string,
  organizationId: string,
): Promise<any | null> {
  return prisma.document.findFirst({
    where: {
      id,
      deletedAt: null,
      knowledgeBase: { organizationId, deletedAt: null },
    },
    include: {
      _count: { select: { chunks: true } },
    },
  });
}

export interface CreateDocumentInput {
  knowledgeBaseId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
}

export async function createDocument(input: CreateDocumentInput): Promise<Document> {
  return prisma.document.create({
    data: {
      knowledgeBaseId: input.knowledgeBaseId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      storageKey: input.storageKey,
      status: 'PENDING',
    },
  });
}
