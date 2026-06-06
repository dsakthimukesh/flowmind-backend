/**
 * src/modules/auth/auth.repository.ts — Auth Data Access Layer
 *
 * WHY REPOSITORY PATTERN:
 * The repository is the ONLY layer that imports Prisma directly.
 * The service layer works with plain TypeScript objects (not Prisma types).
 * This means:
 *   - Swapping Prisma for a different ORM never touches service/controller code
 *   - Repository methods are independently testable with a mock Prisma client
 *   - Prisma query complexity is isolated from business logic
 *
 * ALL Prisma queries live here. Services call repository methods, never prisma.*.
 */

import { prisma } from '../../prisma/prisma.js';
import type { UserModel, OrganizationModel, OrganizationMemberModel } from '../../generated/prisma/models.js';
import type { OrgRole } from '../../generated/prisma/enums.js';

// Convenience aliases matching conventional naming
type User = UserModel;
type Organization = OrganizationModel;
type OrganizationMember = OrganizationMemberModel;

// ─── User Queries ─────────────────────────────────────────────────────────────

/**
 * Find a user by email. Used for login duplicate checks.
 * Returns the full row including password (only within repository layer).
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: { email, deletedAt: null },
  });
}

/**
 * Find a user by ID. Used by the /me endpoint and auth middleware.
 * Excludes soft-deleted users.
 */
export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findFirst({
    where: { id, deletedAt: null },
  });
}

// ─── Registration Transaction ─────────────────────────────────────────────────

export interface CreateUserWithOrgInput {
  email: string;
  hashedPassword: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  organizationSlug: string;
}

export interface UserWithMembership {
  user: User;
  organization: Organization;
  membership: OrganizationMember;
}

/**
 * Atomically create:
 *   1. User record
 *   2. Organization record
 *   3. OrganizationMember join (role: OWNER)
 *
 * WHY A TRANSACTION:
 * All three inserts must succeed together. A user without an org, or an
 * org without an owner, is an invalid state that would break the entire
 * multi-tenant authorization model.
 *
 * Prisma interactive transactions give us full rollback on any failure.
 */
export async function createUserWithOrganization(
  input: CreateUserWithOrgInput,
): Promise<UserWithMembership> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        password: input.hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    });

    const organization = await tx.organization.create({
      data: {
        name: input.organizationName,
        slug: input.organizationSlug,
      },
    });

    const membership = await tx.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'OWNER',
      },
    });

    return { user, organization, membership };
  });
}

// ─── Membership Queries ───────────────────────────────────────────────────────

/**
 * Get a user's membership for a specific organization.
 * Used to resolve their role during token generation.
 */
export async function findMembership(
  userId: string,
  organizationId: string,
): Promise<OrganizationMember | null> {
  return prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
}

/**
 * Get the first (and typically only at registration) org membership for a user.
 * Used to determine the default org/role when issuing the first token.
 */
export async function findFirstMembership(
  userId: string,
): Promise<(OrganizationMember & { organization: Organization }) | null> {
  return prisma.organizationMember.findFirst({
    where: { userId },
    include: { organization: true },
    orderBy: { joinedAt: 'asc' },
  });
}

// ─── Slug Helpers ─────────────────────────────────────────────────────────────

/** Check if an org slug is already taken. */
export async function slugExists(slug: string): Promise<boolean> {
  const count = await prisma.organization.count({ where: { slug } });
  return count > 0;
}
