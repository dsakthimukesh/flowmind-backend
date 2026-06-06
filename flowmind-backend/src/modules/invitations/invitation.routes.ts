import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { authorize } from '../../middleware/authorize.middleware.js';
import { createInvitation, acceptInvitation } from './invitation.controller.js';

const router = Router();
router.use(authenticate);
router.post('/',       authorize(['OWNER', 'ADMIN']), asyncHandler(createInvitation));
router.post('/accept', authorize(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']), asyncHandler(acceptInvitation));
export { router as invitationRouter };
