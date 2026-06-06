/**
 * src/common/utils/request-user.ts — Authenticated User Accessor
 *
 * Provides a typed, assertion-safe way to access the authenticated user
 * from within controllers that are already behind the authenticate middleware.
 *
 * Using `req.user!` (non-null assertion) in every controller is noise and
 * masks intent. This utility makes the contract explicit: if the middleware
 * chain is correctly configured, req.user is always present on protected routes.
 *
 * Usage:
 *   const user = getRequestUser(req);
 *   // user.sub, user.organizationId, user.role — all typed, no assertion needed
 */

import type { Request } from 'express';
import type { JwtPayload } from '../../modules/auth/auth.types.js';
import { UnauthorizedError } from '../errors/index.js';

/**
 * Retrieve the authenticated user from the request.
 * Throws UnauthorizedError if called on an unauthenticated request
 * (indicates a route is missing the authenticate middleware).
 */
export function getRequestUser(req: Request): JwtPayload {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  return req.user;
}
