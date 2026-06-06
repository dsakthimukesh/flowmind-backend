import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestUser } from '../../common/utils/request-user.js';
import { successResponse } from '../../common/utils/api-response.js';
import { ValidationError } from '../../common/errors/index.js';
import * as apiKeyService from './api-key.service.js';

function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    throw new ValidationError('Validation failed',
      r.error.issues.map((i) => ({ field: i.path.map(String).join('.'), message: i.message })));
  }
  return r.data;
}

const createSchema = z.object({
  name: z.string().min(1).max(100).trim(),
});

export async function createApiKey(req: Request, res: Response): Promise<void> {
  const { sub: userId, organizationId } = getRequestUser(req);
  const { name } = parseBody(createSchema, req.body);
  const result = await apiKeyService.createKey(name, organizationId, userId);
  res.status(201).json(successResponse('API key created. Store the rawKey securely — it will not be shown again.', result));
}

export async function listApiKeys(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const apiKeys = await apiKeyService.listKeys(organizationId);
  res.status(200).json(successResponse('API keys fetched', { apiKeys }));
}

export async function revokeApiKey(req: Request, res: Response): Promise<void> {
  const { sub: userId, organizationId } = getRequestUser(req);
  await apiKeyService.revokeKey(String(req.params['id']), organizationId, userId);
  res.status(200).json(successResponse('API key revoked', {}));
}
