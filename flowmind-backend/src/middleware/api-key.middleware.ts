/**
 * API Key authentication middleware.
 * Accepts: `Authorization: ApiKey fm_<key>`
 * Attaches a synthetic req.user with organizationId from the key's record.
 */
import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { UnauthorizedError } from '../common/errors/index.js';
import { findAllApiKeysByOrg } from '../modules/api-keys/api-key.repository.js';
import { prisma } from '../prisma/prisma.js';
import { touchApiKeyLastUsed } from '../modules/api-keys/api-key.repository.js';
import type { OrgRole } from '../generated/prisma/enums.js';
import { createLogger } from '../common/logger.js';

const log = createLogger('api-key-middleware');

export async function authenticateApiKey(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('ApiKey ')) {
    next();   // not an API key request — let JWT middleware handle it
    return;
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) { throw new UnauthorizedError('Invalid API key'); }

  // We need to find the matching key by checking all active keys.
  // For MVP: load active keys for the org prefix and bcrypt.compare.
  // Production optimisation: store a fast-lookup prefix index.
  const allActiveKeys = await prisma.apiKey.findMany({
    where: { revokedAt: null },
    select: { id: true, keyHash: true, organizationId: true },
  });

  let matchedKey: { id: string; organizationId: string } | null = null;

  for (const key of allActiveKeys) {
    const match = await bcrypt.compare(rawKey, key.keyHash);
    if (match) { matchedKey = key; break; }
  }

  if (!matchedKey) { throw new UnauthorizedError('Invalid API key'); }

  // Touch lastUsedAt async (fire-and-forget)
  touchApiKeyLastUsed(matchedKey.id).catch((e) =>
    log.error({ e }, 'Failed to touch API key lastUsedAt'),
  );

  // Attach a synthetic user context — API keys act as MEMBER-level by default
  req.user = {
    sub: matchedKey.id,
    organizationId: matchedKey.organizationId,
    role: 'MEMBER' as OrgRole,
  };

  next();
}
