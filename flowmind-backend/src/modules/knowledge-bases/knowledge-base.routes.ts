/**
 * POST /api/v1/knowledge-bases            — create  (OWNER, ADMIN, MEMBER)
 * GET  /api/v1/knowledge-bases            — list    (all roles)
 * GET  /api/v1/knowledge-bases/:id        — get     (all roles)
 *
 * Nested document routes:
 * POST /api/v1/knowledge-bases/:kbId/documents
 * GET  /api/v1/knowledge-bases/:kbId/documents
 * GET  /api/v1/knowledge-bases/:kbId/documents/:id
 */

import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { authorize } from '../../middleware/authorize.middleware.js';
import * as kbController from './knowledge-base.controller.js';
import { documentRouter } from '../documents/document.routes.js';

const router = Router();
router.use(authenticate);

router.post('/', authorize(['OWNER', 'ADMIN', 'MEMBER']), asyncHandler(kbController.createKnowledgeBase));
router.get('/', authorize(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']), asyncHandler(kbController.listKnowledgeBases));
router.get('/:id', authorize(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']), asyncHandler(kbController.getKnowledgeBase));

// Nested: /api/v1/knowledge-bases/:kbId/documents
router.use('/:kbId/documents', documentRouter);

export { router as knowledgeBaseRouter };
