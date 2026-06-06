import { prisma } from '../../prisma/prisma.js';
import type { InvitationModel } from '../../generated/prisma/models.js';
import type { OrgRole } from '../../generated/prisma/enums.js';

type Invitation = InvitationModel;

export async function findInvitationByToken(token: string): Promise<Invitation | null> {
  return prisma.invitation.findUnique({ where: { token } });
}

export async function findPendingInvitation(
  organizationId: string,
  email: string,
): Promise<Invitation | null> {
  return prisma.invitation.findFirst({
    where: { organizationId, email, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
}

export interface CreateInvitationInput {
  organizationId: string;
  email: string;
  role: OrgRole;
  token: string;
  invitedBy: string;
  expiresAt: Date;
}

export async function createInvitation(input: CreateInvitationInput): Promise<Invitation> {
  return prisma.invitation.create({ data: input });
}

export async function acceptInvitation(
  token: string,
  userId: string,
): Promise<Invitation | null> {
  const inv = await findInvitationByToken(token);
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) return null;

  return prisma.$transaction(async (tx) => {
    // Mark accepted
    const updated = await tx.invitation.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });

    // Add user to org (upsert — safe if they re-accept)
    await tx.organizationMember.upsert({
      where: { userId_organizationId: { userId, organizationId: inv.organizationId } },
      update: { role: inv.role },
      create: { userId, organizationId: inv.organizationId, role: inv.role },
    });

    return updated;
  });
}
