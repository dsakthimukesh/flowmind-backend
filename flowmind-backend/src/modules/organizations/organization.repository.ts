/**
 * src/modules/organizations/organization.repository.ts
 * All Prisma queries for the organizations domain.
 */

import { prisma } from '../../prisma/prisma.js';
import type { OrganizationModel, OrganizationMemberModel } from '../../generated/prisma/models.js';

type Organization = OrganizationModel;
type OrganizationMember = OrganizationMemberModel;

// ─── Read ────────────────────────────────────────────────────────────────────

export async function findOrgById(id: string): Promise<Organization | null> {
  return prisma.organization.findFirst({
    where: { id, deletedAt: null },
  });
}

export async function findOrgBySlug(slug: string): Promise<Organization | null> {
  return prisma.organization.findFirst({
    where: { slug, deletedAt: null },
  });
}

/**
 * Fetch an org with its member list and their user profiles.
 * Used by the "get current organization" endpoint.
 */
export async function findOrgWithMembers(id: string): Promise<
  | (Organization & {
      members: (OrganizationMember & {
        user: { id: string; email: string; firstName: string; lastName: string };
      })[];
    })
  | null
> {
  return prisma.organization.findFirst({
    where: { id, deletedAt: null },
    include: {
      members: {
        where: {
          user: { deletedAt: null },
        },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });
}

// ─── Membership ───────────────────────────────────────────────────────────────

export async function findUserMembership(
  userId: string,
  organizationId: string,
): Promise<OrganizationMember | null> {
  return prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
}

/**
 * List all organizations a user belongs to.
 * Useful for multi-org switcher in the frontend.
 */
export async function findUserOrganizations(userId: string): Promise<
  (OrganizationMember & { organization: Organization })[]
> {
  return prisma.organizationMember.findMany({
    where: { userId, organization: { deletedAt: null } },
    include: { organization: true },
    orderBy: { joinedAt: 'asc' },
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateOrgInput {
  name: string;
  slug: string;
  ownerId: string;
}

/**
 * Create a new organization and make the caller its OWNER.
 * Atomic transaction — partial state is impossible.
 */
export async function createOrganization(
  input: CreateOrgInput,
): Promise<Organization & { membership: OrganizationMember }> {
  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: input.name, slug: input.slug },
    });

    const membership = await tx.organizationMember.create({
      data: {
        userId: input.ownerId,
        organizationId: organization.id,
        role: 'OWNER',
      },
    });

    return { ...organization, membership };
  });
}

// ─── Slug helper ─────────────────────────────────────────────────────────────

export async function orgSlugExists(slug: string): Promise<boolean> {
  const count = await prisma.organization.count({ where: { slug } });
  return count > 0;
}

// ─── Team Management ─────────────────────────────────────────────────────────

import type { OrgRole } from '../../generated/prisma/enums.js';

export async function findOrgMembers(organizationId: string) {
  return prisma.organizationMember.findMany({
    where: { organizationId, user: { deletedAt: null } },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
    },
    orderBy: { joinedAt: 'asc' },
  });
}

export async function updateMemberRole(
  userId: string,
  organizationId: string,
  role: OrgRole,
): Promise<OrganizationMember | null> {
  const existing = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  if (!existing) return null;
  return prisma.organizationMember.update({
    where: { userId_organizationId: { userId, organizationId } },
    data: { role },
  });
}

export async function removeMember(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const existing = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  if (!existing) return false;
  await prisma.organizationMember.delete({
    where: { userId_organizationId: { userId, organizationId } },
  });
  return true;
}
