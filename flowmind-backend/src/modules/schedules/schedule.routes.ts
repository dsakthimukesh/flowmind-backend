/**
 * Schedule routes — mounted inside workflowRouter at /:id/schedules
 * mergeParams: true so :id from the parent is accessible as req.params.id
 */
import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { authorize } from '../../middleware/authorize.middleware.js';
import { createSchedule, listSchedules, deleteSchedule } from './schedule.controller.js';

const router = Router({ mergeParams: true });

router.post('/',                authorize(['OWNER', 'ADMIN']),                          asyncHandler(createSchedule));
router.get('/',                 authorize(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),      asyncHandler(listSchedules));
router.delete('/:scheduleId',   authorize(['OWNER', 'ADMIN']),                          asyncHandler(deleteSchedule));

export { router as scheduleRouter };
