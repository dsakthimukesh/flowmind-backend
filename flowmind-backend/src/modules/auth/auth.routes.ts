/**
 * src/modules/auth/auth.routes.ts — Auth Route Definitions
 *
 * All routes are wrapped with asyncHandler so thrown errors (including
 * AppError subclasses and Zod errors) flow to the global error middleware.
 *
 * Route table:
 *   POST /api/v1/auth/register  — public
 *   POST /api/v1/auth/login     — public
 *   GET  /api/v1/auth/me        — protected (requires valid JWT)
 */

import { Router } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import * as authController from './auth.controller.js';

const router = Router();

// Public routes
router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));

// Protected routes — authenticate middleware verifies the JWT
router.get('/me', authenticate, asyncHandler(authController.getMe));

export { router as authRouter };
