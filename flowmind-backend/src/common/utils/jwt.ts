/**
 * src/common/utils/jwt.ts — JWT Utility
 *
 * WHY WRAP jsonwebtoken:
 * jsonwebtoken's `verify()` throws on invalid tokens, and its types are
 * loose (returns string | JwtPayload). Wrapping it gives us:
 *   - A single typed JwtPayload interface used everywhere
 *   - Consistent error handling (bad token → UnauthorizedError, not unhandled throw)
 *   - One place to change algorithm, expiry defaults, or swap libraries
 *
 * ACCESS TOKEN ONLY (Phase 4):
 * Refresh tokens will be added in Phase 5 with the Session model.
 * For now, access tokens are long-lived (per JWT_EXPIRES_IN env var).
 */

import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../errors/index.js';
import type { JwtPayload } from '../../modules/auth/auth.types.js';

// ─── Sign ─────────────────────────────────────────────────────────────────────

/**
 * Sign a JWT access token with the given payload.
 * Algorithm: HS256 (symmetric, fast, appropriate for monolith).
 * For a microservices architecture, swap to RS256 (asymmetric).
 */
export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

// ─── Verify ───────────────────────────────────────────────────────────────────

/**
 * Verify and decode a JWT access token.
 * Throws UnauthorizedError for any invalid/expired token —
 * never leaks the specific reason (expired vs tampered) to the client.
 */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    // jwt.verify returns string | JwtPayload — narrow to our type
    if (typeof decoded === 'string') {
      throw new UnauthorizedError('Invalid token');
    }

    return decoded as JwtPayload;
  } catch (err) {
    // Re-throw our own errors as-is
    if (err instanceof UnauthorizedError) throw err;
    // Map jsonwebtoken errors (TokenExpiredError, JsonWebTokenError, etc.)
    throw new UnauthorizedError('Invalid or expired token');
  }
}

// ─── Extract from Header ──────────────────────────────────────────────────────

/**
 * Extract the Bearer token from an Authorization header.
 * Returns null if header is absent or malformed (not a throw —
 * the middleware decides whether absence is an error).
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}
