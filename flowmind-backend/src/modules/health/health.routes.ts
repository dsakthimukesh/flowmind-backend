/**
 * src/modules/health/health.routes.ts — Health Check Routes
 *
 * Mounted at /health in app.ts.
 * Two routes:
 *   GET /health        → liveness  (process alive?)
 *   GET /health/ready  → readiness (deps healthy?)
 *
 * These are NOT behind auth middleware — load balancers and k8s probes
 * don't carry tokens. Registering them before the auth middleware in app.ts
 * ensures they're always reachable.
 */

import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { getLiveness, getReadiness } from './health.controller.js';

const router = Router();

// GET /health
router.get('/', getLiveness);

// GET /health/ready
router.get('/ready', asyncHandler(getReadiness));

export { router as healthRouter };
