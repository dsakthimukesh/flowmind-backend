/**
 * src/modules/jobs/jobs.routes.ts — Job Demo Routes
 *
 * POST /api/v1/jobs/test — push a test job into the workflow queue.
 * Protected: requires authentication.
 * This endpoint will evolve into the workflow trigger API in Phase 6.
 */

import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { getRequestUser } from '../../common/utils/request-user.js';
import { successResponse } from '../../common/utils/api-response.js';
import { workflowQueue, addJob } from '../../queues/index.js';

const router = Router();

router.use(authenticate);

router.post(
  '/test',
  asyncHandler(async (req, res) => {
    const { sub: userId, organizationId } = getRequestUser(req);

    const job = await addJob(workflowQueue, 'test-job', {
      userId,
      organizationId,
      triggeredAt: new Date().toISOString(),
    });

    res.status(202).json(
      successResponse('Test job queued successfully', { jobId: job.id }),
    );
  }),
);

export { router as jobsRouter };
