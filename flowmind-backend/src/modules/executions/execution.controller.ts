/**
 * src/modules/executions/execution.controller.ts
 */

import type { Request, Response } from 'express';
import { getRequestUser } from '../../common/utils/request-user.js';
import { successResponse } from '../../common/utils/api-response.js';
import * as executionService from './execution.service.js';
import { getExecutionLogs } from './services/execution-log.service.js';
import { getExecutionMetrics } from './services/execution-metrics.service.js';
import { NotFoundError } from '../../common/errors/index.js';

// POST /api/v1/workflows/:id/execute
export async function triggerExecution(req: Request, res: Response): Promise<void> {
  const { sub: userId, organizationId } = getRequestUser(req);
  const workflowId = String(req.params['id']);
  const payload = req.body || {};
  const result = await executionService.triggerExecution(workflowId, organizationId, userId, payload);
  res.status(202).json(successResponse('Execution triggered', {
    execution: result.execution, jobId: result.jobId,
  }));
}

// GET /api/v1/executions
export async function listExecutions(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const executions = await executionService.listExecutions(organizationId);
  res.status(200).json(successResponse('Executions fetched', { executions }));
}

// GET /api/v1/executions/:id
export async function getExecution(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const id = String(req.params['id']);
  const execution = await executionService.getExecution(id, organizationId);
  res.status(200).json(successResponse('Execution fetched', { execution }));
}

// GET /api/v1/executions/:id/logs
export async function getExecutionLogsHandler(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const id = String(req.params['id']);

  // Verify org scope before returning logs
  await executionService.getExecution(id, organizationId);

  const page     = Math.max(1, parseInt(String(req.query['page']  ?? '1'), 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query['pageSize'] ?? '50'), 10)));

  const result = await getExecutionLogs(id, page, pageSize);

  res.status(200).json(successResponse('Execution logs fetched', result));
}

// GET /api/v1/metrics/executions
export async function getMetrics(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const metrics = await getExecutionMetrics(organizationId);
  res.status(200).json(successResponse('Execution metrics fetched', { metrics }));
}
