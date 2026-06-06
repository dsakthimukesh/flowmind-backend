/**
 * src/modules/executions/execution.routes.ts
 *
 *   POST /api/v1/workflows/:id/execute  — trigger (OWNER, ADMIN, MEMBER)
 *   GET  /api/v1/executions             — list
 *   GET  /api/v1/executions/:id         — get details
 *   GET  /api/v1/executions/:id/logs    — get paginated logs
 *   GET  /api/v1/metrics/executions     — org-level metrics
 */

import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { authorize } from '../../middleware/authorize.middleware.js';
import * as executionController from './execution.controller.js';

// ── Trigger router ────────────────────────────────────────────────────────────
export const executionTriggerRouter = Router({ mergeParams: true });
executionTriggerRouter.use(authenticate);
executionTriggerRouter.post(
  '/',
  authorize(['OWNER', 'ADMIN', 'MEMBER']),
  asyncHandler(executionController.triggerExecution),
);

// ── Executions router — /api/v1/executions ────────────────────────────────────
export const executionRouter = Router();
executionRouter.use(authenticate);
executionRouter.get('/', authorize(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
  asyncHandler(executionController.listExecutions));
executionRouter.get('/:id', authorize(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
  asyncHandler(executionController.getExecution));
executionRouter.get('/:id/logs', authorize(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
  asyncHandler(executionController.getExecutionLogsHandler));

// ── Metrics router — /api/v1/metrics ─────────────────────────────────────────
export const metricsRouter = Router();
metricsRouter.use(authenticate);
metricsRouter.get('/executions', authorize(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
  asyncHandler(executionController.getMetrics));
