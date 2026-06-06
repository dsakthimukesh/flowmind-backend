import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { NotFoundError, AppError } from '../../common/errors/index.js';
import {
  findApiKeysByOrg,
  createApiKey,
  revokeApiKey,
} from './api-key.repository.js';
import { logAuditEvent } from '../audit-logs/audit-log.service.js';

const BCRYPT_ROUNDS = 10;

export interface ApiKeyView {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

function toView(k: {
  id: string; name: string; keyPrefix: string; lastUsedAt: Date | null;
  expiresAt: Date | null; createdAt: Date; revokedAt: Date | null;
}): ApiKeyView {
  return {
    id: k.id, name: k.name, keyPrefix: k.keyPrefix,
    lastUsedAt: k.lastUsedAt, expiresAt: k.expiresAt,
    createdAt: k.createdAt, revokedAt: k.revokedAt,
  };
}

export interface CreateKeyResult {
  apiKey: ApiKeyView;
  /** Raw key shown once — never stored */
  rawKey: string;
}

export async function createKey(
  name: string,
  organizationId: string,
  createdBy: string,
): Promise<CreateKeyResult> {
  const rawKey   = `fm_${crypto.randomBytes(32).toString('hex')}`;
  const prefix   = rawKey.slice(0, 12);                 // "fm_" + 9 hex chars
  const keyHash  = await bcrypt.hash(rawKey, BCRYPT_ROUNDS);

  const key = await createApiKey({ organizationId, name, keyHash, keyPrefix: prefix, createdBy });

  logAuditEvent({
    organizationId,
    userId: createdBy,
    action: 'API_KEY_CREATED',
    resourceType: 'ApiKey',
    resourceId: key.id,
    metadata: { name },
  });

  return { apiKey: toView(key), rawKey };
}

export async function listKeys(organizationId: string): Promise<ApiKeyView[]> {
  const keys = await findApiKeysByOrg(organizationId);
  return keys.map(toView);
}

export async function revokeKey(
  id: string,
  organizationId: string,
  revokedBy: string,
): Promise<void> {
  const key = await revokeApiKey(id, organizationId);
  if (!key) throw new NotFoundError('ApiKey');

  logAuditEvent({
    organizationId,
    userId: revokedBy,
    action: 'API_KEY_REVOKED',
    resourceType: 'ApiKey',
    resourceId: id,
  });
}
