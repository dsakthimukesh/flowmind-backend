import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestUser } from '../../common/utils/request-user.js';
import { successResponse } from '../../common/utils/api-response.js';
import { ValidationError } from '../../common/errors/index.js';
import * as invitationService from './invitation.service.js';
import type { OrgRole } from '../../generated/prisma/enums.js';

function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) throw new ValidationError('Validation failed',
    r.error.issues.map((i) => ({ field: i.path.map(String).join('.'), message: i.message })));
  return r.data;
}

const createSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  role:  z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

const acceptSchema = z.object({ token: z.string().min(1) });

// POST /api/v1/invitations
export async function createInvitation(req: Request, res: Response): Promise<void> {
  const { sub: invitedBy, organizationId } = getRequestUser(req);
  const { email, role } = parseBody(createSchema, req.body);
  const result = await invitationService.invite(organizationId, email, role as OrgRole, invitedBy);
  res.status(201).json(successResponse('Invitation created', result));
}

// POST /api/v1/invitations/accept
export async function acceptInvitation(req: Request, res: Response): Promise<void> {
  const { sub: userId } = getRequestUser(req);
  const { token } = parseBody(acceptSchema, req.body);
  await invitationService.accept(token, userId);
  res.status(200).json(successResponse('Invitation accepted. You have joined the organization.', {}));
}
