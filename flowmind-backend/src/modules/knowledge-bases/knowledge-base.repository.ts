import { prisma } from '../../prisma/prisma.js';
import type { KnowledgeBaseModel } from '../../generated/prisma/models.js';

type KnowledgeBase = KnowledgeBaseModel;

export async function findKnowledgeBasesByOrg(
  organizationId: string,
): Promise<KnowledgeBase[]> {
  return prisma.knowledgeBase.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findKnowledgeBaseByIdAndOrg(
  id: string,
  organizationId: string,
): Promise<KnowledgeBase | null> {
  return prisma.knowledgeBase.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
}

export interface CreateKBInput {
  organizationId: string;
  name: string;
  description?: string;
}

export async function createKnowledgeBase(
  input: CreateKBInput,
): Promise<KnowledgeBase> {
  return prisma.knowledgeBase.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      description: input.description ?? null,
    },
  });
}
