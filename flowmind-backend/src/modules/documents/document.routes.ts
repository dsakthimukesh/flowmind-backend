/**
 * Document routes are nested under knowledge-bases (/:kbId/documents).
 * This router is mounted inside knowledge-base.routes.ts.
 *
 * POST /:kbId/documents       — upload + enqueue (OWNER, ADMIN, MEMBER)
 * GET  /:kbId/documents       — list             (all roles)
 * GET  /:kbId/documents/:id   — get              (all roles)
 */

import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { authorize } from '../../middleware/authorize.middleware.js';
import * as docController from './document.controller.js';

// mergeParams: true so :kbId from the parent router is accessible
const router = Router({ mergeParams: true });

router.post('/', authorize(['OWNER', 'ADMIN', 'MEMBER']), asyncHandler(docController.uploadDocument));
router.get('/', authorize(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']), asyncHandler(docController.listDocuments));
router.get('/:id', authorize(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']), asyncHandler(docController.getDocument));

export { router as documentRouter };
