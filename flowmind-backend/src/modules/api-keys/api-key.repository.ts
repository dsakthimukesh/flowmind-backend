import { prisma } from '../../prisma/prisma.js';
import type { ApiKeyModel } from '../../generated/prisma/models.js';

type ApiKey = ApiKeyModel;

export async function findApiKeysByOrg(organizationId: string): Promise<ApiKey[]> {
  return prisma.apiKey.findMany({
    where: { organizationId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findAllApiKeysByOrg(organizationId: string): Promise<ApiKey[]> {
  // includes revoked — for admin views
  return prisma.apiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
}

/** Used by auth middleware — searches across all orgs by hash */
export async function findApiKeyByHash(keyHash: string): Promise<ApiKey | null> {
  return prisma.apiKey.findFirst({
    where: { keyHash, revokedAt: null },
  });
}

export interface CreateApiKeyInput {
  organizationId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  createdBy: string;
  expiresAt?: Date;
}

export async function createApiKey(input: CreateApiKeyInput): Promise<ApiKey> {
  return prisma.apiKey.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      keyHash: input.keyHash,
      keyPrefix: input.keyPrefix,
      createdBy: input.createdBy,
      expiresAt: input.expiresAt ?? null,
    },
  });
}

export async function revokeApiKey(
  id: string,
  organizationId: string,
): Promise<ApiKey | null> {
  const key = await prisma.apiKey.findFirst({ where: { id, organizationId } });
  if (!key) return null;
  return prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
}

export async function touchApiKeyLastUsed(id: string): Promise<void> {
  await prisma.apiKey.update({ where: { id }, data: { lastUsedAt: new Date() } });
}
