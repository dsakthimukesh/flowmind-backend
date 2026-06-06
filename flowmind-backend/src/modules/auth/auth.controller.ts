/**
 * src/modules/auth/auth.controller.ts — Auth HTTP Layer
 *
 * Controllers are thin. Their only jobs:
 *   1. Parse and validate the request (via parseBody)
 *   2. Call the service
 *   3. Shape and send the response
 *
 * No business logic here. No Prisma. No bcrypt. Just HTTP in → service call → HTTP out.
 */

import type { Request, Response } from 'express';
import * as authService from './auth.service.js';
import { registerSchema, loginSchema, parseBody } from './auth.validation.js';
import { successResponse } from '../../common/utils/api-response.js';

// ─── Register ────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response): Promise<void> {
  const dto = parseBody(registerSchema, req.body);
  const result = await authService.register(dto);

  res.status(201).json(
    successResponse('Account created successfully', {
      user: result.user,
      accessToken: result.accessToken,
      organizationId: result.organizationId,
      role: result.role,
    }),
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  const dto = parseBody(loginSchema, req.body);
  const result = await authService.login(dto);

  res.status(200).json(
    successResponse('Login successful', {
      user: result.user,
      accessToken: result.accessToken,
      organizationId: result.organizationId,
      role: result.role,
    }),
  );
}

// ─── Get Current User ─────────────────────────────────────────────────────────

export async function getMe(req: Request, res: Response): Promise<void> {
  // req.user is set by authenticate middleware — guaranteed present on this route
  const user = await authService.getCurrentUser(req.user!.sub);

  res.status(200).json(
    successResponse('User profile fetched', {
      user,
      organizationId: req.user!.organizationId,
      role: req.user!.role,
    }),
  );
}
