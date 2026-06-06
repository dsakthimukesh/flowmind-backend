/**
 * src/modules/workflows/workflow.controller.ts
 * Thin HTTP layer — parse → service → respond.
 */

import type { Request, Response } from 'express';
import { getRequestUser } from '../../common/utils/request-user.js';
import { successResponse } from '../../common/utils/api-response.js';
import { ValidationError } from '../../common/errors/index.js';
import {
  parseBody,
  createWorkflowSchema,
  createVersionSchema,
} from './workflow.validation.js';
import * as workflowService from './workflow.service.js';

// ─── Workflow handlers ────────────────────────────────────────────────────────

// POST /api/v1/workflows
export async function createWorkflow(req: Request, res: Response): Promise<void> {
  const dto = parseBody(createWorkflowSchema, req.body);
  const { organizationId } = getRequestUser(req);

  const workflow = await workflowService.createNewWorkflow(dto, organizationId);

  res.status(201).json(successResponse('Workflow created', { workflow }));
}

// GET /api/v1/workflows
export async function listWorkflows(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);

  const workflows = await workflowService.listWorkflows(organizationId);

  res.status(200).json(successResponse('Workflows fetched', { workflows }));
}

// GET /api/v1/workflows/:id
export async function getWorkflow(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const id = String(req.params['id']);

  const workflow = await workflowService.getWorkflow(id, organizationId);

  res.status(200).json(successResponse('Workflow fetched', { workflow }));
}

// ─── Version handlers ─────────────────────────────────────────────────────────

// POST /api/v1/workflows/:id/versions
export async function createVersion(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const workflowId = String(req.params['id']);
  const dto = parseBody(createVersionSchema, req.body);

  const version = await workflowService.createWorkflowVersion(
    workflowId,
    organizationId,
    dto,
  );

  res.status(201).json(successResponse('Version created', { version }));
}

// GET /api/v1/workflows/:id/versions
export async function listVersions(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const workflowId = String(req.params['id']);

  const versions = await workflowService.listWorkflowVersions(workflowId, organizationId);

  res.status(200).json(successResponse('Versions fetched', { versions }));
}

// GET /api/v1/workflows/:id/versions/:versionId
export async function getVersion(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const workflowId = String(req.params['id']);
  const versionId = String(req.params['versionId']);

  const version = await workflowService.getWorkflowVersion(
    workflowId,
    versionId,
    organizationId,
  );

  res.status(200).json(successResponse('Version fetched', { version }));
}

// POST /api/v1/workflows/:id/publish
export async function publishVersion(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const workflowId = String(req.params['id']);
  const { versionId } = req.body as { versionId?: string };

  if (!versionId || typeof versionId !== 'string') {
    throw new ValidationError('Validation failed', [
      { field: 'versionId', message: 'versionId is required' },
    ]);
  }

  const version = await workflowService.publishWorkflowVersion(
    workflowId,
    versionId,
    organizationId,
  );

  res.status(200).json(successResponse('Version published', { version }));
}
