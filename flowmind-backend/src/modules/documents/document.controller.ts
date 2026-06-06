/**
 * src/modules/documents/document.controller.ts
 *
 * POST /api/v1/knowledge-bases/:kbId/documents
 *   Accepts JSON body with base64-encoded content for MVP.
 *   (Multipart file upload will be added when multer is integrated.)
 *
 * GET  /api/v1/knowledge-bases/:kbId/documents
 * GET  /api/v1/knowledge-bases/:kbId/documents/:id
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestUser } from '../../common/utils/request-user.js';
import { successResponse } from '../../common/utils/api-response.js';
import { parseBody } from '../auth/auth.validation.js';
import { ValidationError } from '../../common/errors/index.js';
import * as docService from './document.service.js';

// Base64-encoded content for MVP — avoids multipart complexity until multer is added
const uploadDocumentSchema = z.object({
  fileName: z.string().min(1).max(255).trim(),
  mimeType: z.string().min(1).trim(),
  // Base64-encoded file content
  content: z.string().min(1, 'content (base64) is required'),
});

// POST /api/v1/knowledge-bases/:kbId/documents
export async function uploadDocument(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const knowledgeBaseId = String(req.params['kbId']);
  const dto = parseBody(uploadDocumentSchema, req.body);

  let contentBuffer: Buffer;
  try {
    contentBuffer = Buffer.from(dto.content, 'base64');
  } catch {
    throw new ValidationError('Validation failed', [
      { field: 'content', message: 'content must be valid base64' },
    ]);
  }

  const result = await docService.uploadDocument({
    knowledgeBaseId,
    organizationId,
    fileName: dto.fileName,
    mimeType: dto.mimeType,
    content: contentBuffer,
  });

  res.status(202).json(
    successResponse('Document uploaded and queued for indexing', {
      document: result.document,
      jobId: result.jobId,
    }),
  );
}

// GET /api/v1/knowledge-bases/:kbId/documents
export async function listDocuments(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const knowledgeBaseId = String(req.params['kbId']);
  const documents = await docService.listDocuments(knowledgeBaseId, organizationId);
  res.status(200).json(successResponse('Documents fetched', { documents }));
}

// GET /api/v1/knowledge-bases/:kbId/documents/:id
export async function getDocument(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const id = String(req.params['id']);
  const document = await docService.getDocument(id, organizationId);
  res.status(200).json(successResponse('Document fetched', { document }));
}
