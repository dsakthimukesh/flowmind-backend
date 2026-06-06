/**
 * src/middleware/authorize.middleware.ts — RBAC Authorization Middleware
 *
 * Works in tandem with authenticate middleware:
 *   authenticate → verifies identity (who are you?)
 *   authorize    → enforces permissions (what can you do?)
 *
 * Always use authenticate BEFORE authorize in route chains.
 *
 * ROLE HIERARCHY:
 *   OWNER > ADMIN > MEMBER > VIEWER
 *
 * `allowedRoles` is an explicit allowlist — if the user's role is not in
 * the array, access is denied. This is safer than a denylist because new
 * roles added to the enum default to no-access rather than accidental access.
 *
 * Usage:
 *   router.patch('/:id', authenticate, authorize(['OWNER', 'ADMIN']), handler)
 *   router.get('/',      authenticate, authorize(['OWNER', 'ADMIN', 'MEMBER']), handler)
 */

import type { Request, Response, NextFunction } from 'express';
import type { OrgRole } from '../generated/prisma/enums.js';
import { ForbiddenError } from '../common/errors/index.js';

export function authorize(allowedRoles: OrgRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const role = req.user?.role;

    if (!role || !allowedRoles.includes(role)) {
      throw new ForbiddenError(
        `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      );
    }

    next();
  };
}
