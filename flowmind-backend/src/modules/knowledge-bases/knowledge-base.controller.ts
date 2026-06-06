import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestUser } from '../../common/utils/request-user.js';
import { successResponse } from '../../common/utils/api-response.js';
import { parseBody } from '../auth/auth.validation.js';
import * as kbService from './knowledge-base.service.js';

const createKBSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).trim().optional(),
});

// POST /api/v1/knowledge-bases
export async function createKnowledgeBase(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const { name, description } = parseBody(createKBSchema, req.body);
  const kb = await kbService.createKB(name, organizationId, description);
  res.status(201).json(successResponse('Knowledge base created', { knowledgeBase: kb }));
}

// GET /api/v1/knowledge-bases
export async function listKnowledgeBases(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const knowledgeBases = await kbService.listKBs(organizationId);
  res.status(200).json(successResponse('Knowledge bases fetched', { knowledgeBases }));
}

// GET /api/v1/knowledge-bases/:id
export async function getKnowledgeBase(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const id = String(req.params['id']);
  const knowledgeBase = await kbService.getKB(id, organizationId);
  res.status(200).json(successResponse('Knowledge base fetched', { knowledgeBase }));
}
