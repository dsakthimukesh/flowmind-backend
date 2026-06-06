import crypto from 'crypto';
import { AppError } from '../../common/errors/index.js';
import { findUserMembership } from '../organizations/organization.repository.js';
import {
  createInvitation,
  findPendingInvitation,
  findInvitationByToken,
  acceptInvitation,
} from './invitation.repository.js';
import { logAuditEvent } from '../audit-logs/audit-log.service.js';
import type { OrgRole } from '../../generated/prisma/enums.js';

export async function invite(
  organizationId: string,
  email: string,
  role: OrgRole,
  invitedBy: string,
): Promise<{ token: string; expiresAt: Date }> {
  // Check no pending invitation already exists
  const existing = await findPendingInvitation(organizationId, email);
  if (existing) {
    throw new AppError('A pending invitation for this email already exists', 409, 'CONFLICT');
  }

  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await createInvitation({ organizationId, email, role, token, invitedBy, expiresAt });

  logAuditEvent({
    organizationId,
    userId: invitedBy,
    action: 'MEMBER_INVITED',
    resourceType: 'Invitation',
    metadata: { email, role },
  });

  return { token, expiresAt };
}

export async function accept(token: string, userId: string): Promise<void> {
  const inv = await findInvitationByToken(token);
  if (!inv)                       throw new AppError('Invitation not found', 404, 'NOT_FOUND');
  if (inv.acceptedAt)             throw new AppError('Invitation already accepted', 409, 'CONFLICT');
  if (inv.expiresAt < new Date()) throw new AppError('Invitation has expired', 410, 'INVITATION_EXPIRED');

  // Check not already a member
  const membership = await findUserMembership(userId, inv.organizationId);
  if (membership) throw new AppError('You are already a member of this organization', 409, 'CONFLICT');

  const result = await acceptInvitation(token, userId);
  if (!result) throw new AppError('Failed to accept invitation', 500, 'INTERNAL_SERVER_ERROR', false);
}
