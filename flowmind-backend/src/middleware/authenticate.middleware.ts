/**
 * src/middleware/authenticate.middleware.ts — JWT Auth Middleware
 *
 * Attaches the verified JWT payload to req.user.
 * Any route that needs authentication simply applies this middleware.
 *
 * WHAT IT DOES:
 *   1. Extracts Bearer token from Authorization header
 *   2. Verifies signature + expiry via jwt.verify
 *   3. Attaches decoded payload to req.user
 *   4. Calls next() — the route handler proceeds
 *
 * WHAT IT DOESN'T DO:
 *   - It does NOT hit the database on every request (stateless JWT)
 *   - It does NOT check permissions/roles (that's authorize middleware, Phase 5)
 *
 * ERROR HANDLING:
 * Missing or invalid tokens throw UnauthorizedError → error middleware → 401.
 * This means controllers behind this middleware can trust req.user is valid.
 */

import type { Request, Response, NextFunction } from 'express';
import { extractBearerToken, verifyAccessToken } from '../common/utils/jwt.js';
import { UnauthorizedError } from '../common/errors/index.js';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    throw new UnauthorizedError('Authentication required. Provide a Bearer token.');
  }

  // verifyAccessToken throws UnauthorizedError on invalid/expired tokens
  const payload = verifyAccessToken(token);

  req.user = payload;
  next();
}
