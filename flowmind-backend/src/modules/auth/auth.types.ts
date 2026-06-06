/**
 * src/modules/auth/auth.types.ts — Auth Module Type Definitions
 *
 * Centralizing types here means the controller, service, and repository
 * all share the same contracts. Any change to the auth data shape is a
 * single-file edit that TypeScript propagates everywhere.
 *
 * IMPORTANT: AuthUser intentionally omits `password`. This type represents
 * what is safe to return to clients and attach to req.user. The raw Prisma
 * User model (with password) is only used inside the repository layer.
 */

import type { OrgRole } from '../../generated/prisma/enums.js';

// ─── Request / Response DTOs ──────────────────────────────────────────────────

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string; // Creates the first org atomically with registration
}

export interface LoginDto {
  email: string;
  password: string;
}

// ─── Safe User Shape ──────────────────────────────────────────────────────────

/** User fields safe to expose in API responses and JWT payload. No password. */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: Date;
}

// ─── JWT Payload ──────────────────────────────────────────────────────────────

/**
 * The shape signed into the JWT access token.
 *
 * `sub`            — standard JWT subject claim (userId)
 * `organizationId` — the user's active org (default: first/only org at register)
 * `role`           — RBAC role within that org
 *
 * Keeping the payload minimal reduces token size. Never include sensitive
 * data (password hash, PII beyond ID) — JWTs are base64-encoded, not encrypted.
 */
export interface JwtPayload {
  sub: string;          // userId
  organizationId: string;
  role: OrgRole;
  iat?: number;         // issued at (set by jsonwebtoken automatically)
  exp?: number;         // expiry (set by jsonwebtoken automatically)
}

// ─── Auth Result ──────────────────────────────────────────────────────────────

export interface AuthResult {
  user: AuthUser;
  accessToken: string;
  organizationId: string;
  role: OrgRole;
}
