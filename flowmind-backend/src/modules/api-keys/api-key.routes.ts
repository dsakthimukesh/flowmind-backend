import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { authorize } from '../../middleware/authorize.middleware.js';
import * as ctrl from './api-key.controller.js';

const router = Router();
router.use(authenticate);
router.post('/',    authorize(['OWNER', 'ADMIN']), asyncHandler(ctrl.createApiKey));
router.get('/',     authorize(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']), asyncHandler(ctrl.listApiKeys));
router.delete('/:id', authorize(['OWNER', 'ADMIN']), asyncHandler(ctrl.revokeApiKey));
export { router as apiKeyRouter };
