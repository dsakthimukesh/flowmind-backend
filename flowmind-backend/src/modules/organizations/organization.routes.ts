import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { authorize } from '../../middleware/authorize.middleware.js';
import * as orgController from './organization.controller.js';
import { listMembers, updateRole, removeMemberHandler } from './team.controller.js';

const router = Router();
router.use(authenticate);

router.post('/',  asyncHandler(orgController.createOrganization));
router.get('/',   asyncHandler(orgController.listOrganizations));
router.get('/me', authorize(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']), asyncHandler(orgController.getCurrentOrganization));

// ─── Team management ──────────────────────────────────────────────────────────
router.get('/me/members',                   authorize(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']), asyncHandler(listMembers));
router.patch('/me/members/:userId/role',    authorize(['OWNER']),                              asyncHandler(updateRole));
router.delete('/me/members/:userId',        authorize(['OWNER', 'ADMIN']),                     asyncHandler(removeMemberHandler));

export { router as organizationRouter };
