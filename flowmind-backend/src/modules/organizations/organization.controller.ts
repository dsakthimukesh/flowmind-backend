/**
 * src/modules/organizations/organization.controller.ts
 * Thin HTTP layer — parse → service → respond.
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../auth/auth.validation.js';
import { getRequestUser } from '../../common/utils/request-user.js';
import { successResponse } from '../../common/utils/api-response.js';
import * as orgService from './organization.service.js';

// ─── Validation ───────────────────────────────────────────────────────────────

const createOrgSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name cannot exceed 100 characters')
    .trim(),
});

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/organizations
 * Create a new organization. Caller becomes OWNER.
 */
export async function createOrganization(req: Request, res: Response): Promise<void> {
  const { name } = parseBody(createOrgSchema, req.body);
  const { sub: userId } = getRequestUser(req);

  const result = await orgService.createOrg({ name }, userId);

  res.status(201).json(
    successResponse('Organization created successfully', result),
  );
}

/**
 * GET /api/v1/organizations/me
 * Get the current organization from the JWT (with members).
 */
export async function getCurrentOrganization(req: Request, res: Response): Promise<void> {
  const { sub: userId, organizationId } = getRequestUser(req);

  const organization = await orgService.getOrganization(organizationId, userId);

  res.status(200).json(
    successResponse('Organization fetched successfully', { organization }),
  );
}

/**
 * GET /api/v1/organizations
 * List all organizations the authenticated user belongs to.
 */
export async function listOrganizations(req: Request, res: Response): Promise<void> {
  const { sub: userId } = getRequestUser(req);

  const organizations = await orgService.listUserOrganizations(userId);

  res.status(200).json(
    successResponse('Organizations fetched successfully', { organizations }),
  );
}
