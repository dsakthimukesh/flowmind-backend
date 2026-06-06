import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestUser } from '../../common/utils/request-user.js';
import { successResponse } from '../../common/utils/api-response.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../../common/errors/index.js';
import { findOrgMembers, updateMemberRole, removeMember } from './organization.repository.js';
import { logAuditEvent } from '../audit-logs/audit-log.service.js';
import type { OrgRole } from '../../generated/prisma/enums.js';

function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) throw new ValidationError('Validation failed',
    r.error.issues.map((i) => ({ field: i.path.map(String).join('.'), message: i.message })));
  return r.data;
}

// GET /api/v1/organizations/me/members
export async function listMembers(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const members = await findOrgMembers(organizationId);
  res.status(200).json(successResponse('Members fetched', { members }));
}

// PATCH /api/v1/organizations/me/members/:userId/role
export async function updateRole(req: Request, res: Response): Promise<void> {
  const { sub: actorId, organizationId, role: actorRole } = getRequestUser(req);
  if (actorRole !== 'OWNER') throw new ForbiddenError('Only OWNER can change roles');

  const targetUserId = String(req.params['userId']);
  const { role } = parseBody(z.object({
    role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
  }), req.body);

  const updated = await updateMemberRole(targetUserId, organizationId, role as OrgRole);
  if (!updated) throw new NotFoundError('Member');

  logAuditEvent({ organizationId, userId: actorId, action: 'MEMBER_ROLE_UPDATED',
    resourceType: 'OrganizationMember', resourceId: targetUserId, metadata: { role } });

  res.status(200).json(successResponse('Role updated', { member: updated }));
}

// DELETE /api/v1/organizations/me/members/:userId
export async function removeMemberHandler(req: Request, res: Response): Promise<void> {
  const { sub: actorId, organizationId } = getRequestUser(req);
  const targetUserId = String(req.params['userId']);

  if (targetUserId === actorId) throw new ForbiddenError('Cannot remove yourself');

  const removed = await removeMember(targetUserId, organizationId);
  if (!removed) throw new NotFoundError('Member');

  logAuditEvent({ organizationId, userId: actorId, action: 'MEMBER_REMOVED',
    resourceType: 'OrganizationMember', resourceId: targetUserId });

  res.status(200).json(successResponse('Member removed', {}));
}
