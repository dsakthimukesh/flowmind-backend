/**
 * src/modules/organizations/organization.service.ts
 * Business logic for the organizations domain.
 */

import { v4 as uuidv4 } from 'uuid';
import { AppError, ForbiddenError, NotFoundError } from '../../common/errors/index.js';
import {
  findOrgById,
  findOrgWithMembers,
  findUserMembership,
  findUserOrganizations,
  createOrganization,
  orgSlugExists,
} from './organization.repository.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateOrgDto {
  name: string;
}

export interface OrgMemberView {
  id: string;
  role: string;
  joinedAt: Date;
  user: { id: string; email: string; firstName: string; lastName: string };
}

export interface OrgView {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: Date;
  updatedAt: Date;
  members: OrgMemberView[];
}

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
  joinedAt: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function generateUniqueSlug(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  if (!(await orgSlugExists(base))) return base;

  return `${base}-${uuidv4().slice(0, 6)}`;
}

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Create a new organization for an existing user.
 * The caller automatically becomes OWNER.
 */
export async function createOrg(
  dto: CreateOrgDto,
  ownerId: string,
): Promise<{ organization: { id: string; name: string; slug: string; plan: string }; role: string }> {
  const slug = await generateUniqueSlug(dto.name);

  const result = await createOrganization({ name: dto.name, slug, ownerId });

  return {
    organization: {
      id: result.id,
      name: result.name,
      slug: result.slug,
      plan: result.plan,
    },
    role: result.membership.role,
  };
}

/**
 * Fetch the full organization view for the requester's current org.
 * Verifies the requesting user is actually a member before returning data.
 */
export async function getOrganization(
  organizationId: string,
  requestingUserId: string,
): Promise<OrgView> {
  // Verify membership — users can only see orgs they belong to
  const membership = await findUserMembership(requestingUserId, organizationId);
  if (!membership) {
    // Return 404 not 403 — don't confirm the org exists to non-members
    throw new NotFoundError('Organization');
  }

  const org = await findOrgWithMembers(organizationId);
  if (!org) throw new NotFoundError('Organization');

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    members: org.members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    })),
  };
}

/**
 * List all organizations the user belongs to.
 * Powers the org-switcher in multi-org SaaS UX.
 */
export async function listUserOrganizations(userId: string): Promise<OrgSummary[]> {
  const memberships = await findUserOrganizations(userId);

  return memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    plan: m.organization.plan,
    role: m.role,
    joinedAt: m.joinedAt,
  }));
}
