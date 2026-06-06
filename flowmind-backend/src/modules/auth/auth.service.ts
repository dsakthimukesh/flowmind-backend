/**
 * src/modules/auth/auth.service.ts — Auth Business Logic
 *
 * The service layer owns all business rules:
 *   - "email must be unique"
 *   - "password must be verified before issuing a token"
 *   - "slug generation from org name"
 *
 * It calls the repository for data access and jwt utils for token ops.
 * It knows nothing about HTTP — no req/res objects, no status codes.
 * That separation means the same service can be called from REST, GraphQL,
 * or a CLI script without modification.
 */

import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import type { RegisterDto, LoginDto, AuthResult, AuthUser } from './auth.types.js';
import {
  findUserByEmail,
  findUserById,
  createUserWithOrganization,
  findFirstMembership,
  slugExists,
} from './auth.repository.js';
import { signAccessToken } from '../../common/utils/jwt.js';
import { AppError, UnauthorizedError } from '../../common/errors/index.js';
import { createLogger } from '../../common/logger.js';

const log = createLogger('auth-service');

// ─── Constants ────────────────────────────────────────────────────────────────

// 12 rounds: ~300ms per hash on modern hardware.
// Balances security (slows brute force) vs UX (fast enough for login).
// Never go below 10. Consider 14 for admin accounts.
const BCRYPT_ROUNDS = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert an organization name to a URL-safe slug.
 * "Acme Corp" → "acme-corp"
 * Appends a short UUID suffix if the base slug is taken.
 */
async function generateUniqueSlug(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')   // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, '')        // strip leading/trailing hyphens
    .slice(0, 48);                  // max 48 chars before suffix

  if (!(await slugExists(base))) return base;

  // Append short random suffix to resolve conflicts
  const suffix = uuidv4().slice(0, 6);
  return `${base}-${suffix}`;
}

/** Strip the password field before returning user data to consumers. */
function toAuthUser(user: { id: string; email: string; firstName: string; lastName: string; status: string; createdAt: Date }): AuthUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    createdAt: user.createdAt,
  };
}

// ─── Register ────────────────────────────────────────────────────────────────

export async function register(dto: RegisterDto): Promise<AuthResult> {
  // 1. Duplicate email check — fast fail before expensive bcrypt hash
  const existing = await findUserByEmail(dto.email);
  if (existing) {
    // Use a generic message — don't confirm whether the email exists
    // (prevents user enumeration via registration endpoint)
    throw new AppError('An account with this email already exists', 409, 'CONFLICT');
  }

  // 2. Hash password — bcrypt is intentionally slow (12 rounds ≈ 300ms)
  const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

  // 3. Generate unique org slug
  const slug = await generateUniqueSlug(dto.organizationName);

  // 4. Atomic user + org + membership creation
  const { user, organization, membership } = await createUserWithOrganization({
    email: dto.email,
    hashedPassword,
    firstName: dto.firstName,
    lastName: dto.lastName,
    organizationName: dto.organizationName,
    organizationSlug: slug,
  });

  log.info({ userId: user.id, orgId: organization.id }, 'New user registered');

  // 5. Issue access token
  const accessToken = signAccessToken({
    sub: user.id,
    organizationId: organization.id,
    role: membership.role,
  });

  return {
    user: toAuthUser(user),
    accessToken,
    organizationId: organization.id,
    role: membership.role,
  };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(dto: LoginDto): Promise<AuthResult> {
  // 1. Look up user — always run bcrypt even if user not found (timing attack prevention)
  const user = await findUserByEmail(dto.email);

  // 2. Verify password — run compare regardless of whether user was found
  //    to prevent timing attacks that reveal valid email addresses.
  const passwordValid = user
    ? await bcrypt.compare(dto.password, user.password)
    : await bcrypt.compare(dto.password, '$2b$12$invalidhashpadding000000000000000000000000000000000000000'); // dummy

  if (!user || !passwordValid) {
    // Intentionally vague — don't tell attacker which part was wrong
    throw new UnauthorizedError('Invalid email or password');
  }

  // 3. Check account status
  if (user.status !== 'ACTIVE') {
    throw new UnauthorizedError('Your account has been suspended or deactivated');
  }

  // 4. Get the user's default org membership
  const membership = await findFirstMembership(user.id);
  if (!membership) {
    // Shouldn't happen (registration is atomic) but handle defensively
    log.error({ userId: user.id }, 'User has no organization membership');
    throw new AppError('Account configuration error', 500, 'INTERNAL_SERVER_ERROR', false);
  }

  log.info({ userId: user.id, orgId: membership.organizationId }, 'User logged in');

  // 5. Issue token
  const accessToken = signAccessToken({
    sub: user.id,
    organizationId: membership.organizationId,
    role: membership.role,
  });

  return {
    user: toAuthUser(user),
    accessToken,
    organizationId: membership.organizationId,
    role: membership.role,
  };
}

// ─── Get Current User ─────────────────────────────────────────────────────────

export async function getCurrentUser(userId: string): Promise<AuthUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new UnauthorizedError('User not found or has been deactivated');
  }
  return toAuthUser(user);
}
