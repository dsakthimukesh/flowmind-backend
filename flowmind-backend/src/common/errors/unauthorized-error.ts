/**
 * src/common/errors/unauthorized-error.ts
 *
 * Thrown when a request lacks valid authentication credentials.
 * Maps to HTTP 401 Unauthorized.
 *
 * 401 vs 403 distinction:
 *   401 — "I don't know who you are" (missing/invalid token)
 *   403 — "I know who you are, but you can't do this" (insufficient permissions)
 *
 * The default message is intentionally vague in production — revealing
 * whether a token is expired vs missing leaks auth implementation details.
 */

import { AppError } from './app-error.js';

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
