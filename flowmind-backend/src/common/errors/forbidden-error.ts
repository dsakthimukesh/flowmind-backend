/**
 * src/common/errors/forbidden-error.ts
 *
 * Thrown when an authenticated user lacks permission for the requested action.
 * Maps to HTTP 403 Forbidden.
 *
 * Used by RBAC checks — e.g., a MEMBER trying to access ADMIN-only endpoints.
 * The message can be specific here since the user is already identified.
 */

import { AppError } from './app-error.js';

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}
