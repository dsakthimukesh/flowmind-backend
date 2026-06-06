/**
 * src/modules/workflows/workflow.routes.ts
 *
 * Workflow routes:
 *   POST /api/v1/workflows                          — create (OWNER, ADMIN, MEMBER)
 *   GET  /api/v1/workflows                          — list   (all roles)
 *   GET  /api/v1/workflows/:id                      — get    (all roles)
 *
 * Version routes:
 *   POST /api/v1/workflows/:id/versions             — create version  (OWNER, ADMIN)
 *   GET  /api/v1/workflows/:id/versions             — list versions   (all roles)
 *   GET  /api/v1/workflows/:id/versions/:versionId  — get version     (all roles)
 *   POST /api/v1/workflows/:id/publish              — publish version (OWNER, ADMIN)
 */

import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { authorize } from '../../middleware/authorize.middleware.js';
import * as wf from './workflow.controller.js';
import { executionTriggerRouter } from '../executions/execution.routes.js';
import { scheduleRouter } from '../schedules/schedule.routes.js';

const router = Router();

router.use(authenticate);

// ─── Workflow CRUD ────────────────────────────────────────────────────────────

router.post('/', authorize(['OWNER', 'ADMIN', 'MEMBER']), asyncHandler(wf.createWorkflow));
router.get('/', authorize(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']), asyncHandler(wf.listWorkflows));
router.get('/:id', authorize(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']), asyncHandler(wf.getWorkflow));

// ─── Version management ───────────────────────────────────────────────────────

router.post('/:id/versions', authorize(['OWNER', 'ADMIN']), asyncHandler(wf.createVersion));
router.get('/:id/versions', authorize(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']), asyncHandler(wf.listVersions));
router.get('/:id/versions/:versionId', authorize(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']), asyncHandler(wf.getVersion));

// Publish a specific version — promotes workflow to ACTIVE
router.post('/:id/publish', authorize(['OWNER', 'ADMIN']), asyncHandler(wf.publishVersion));

// Trigger an execution of the published version
router.use('/:id/execute', executionTriggerRouter);

// Schedules
router.use('/:id/schedules', scheduleRouter);

export { router as workflowRouter };
