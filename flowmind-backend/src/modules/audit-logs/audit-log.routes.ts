import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { authorize } from '../../middleware/authorize.middleware.js';
import { listAuditLogs } from './audit-log.controller.js';

const router = Router();
router.use(authenticate);
router.get('/', authorize(['OWNER', 'ADMIN']), asyncHandler(listAuditLogs));
export { router as auditLogRouter };
