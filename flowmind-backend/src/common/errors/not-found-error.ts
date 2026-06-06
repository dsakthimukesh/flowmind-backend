/**
 * src/common/errors/not-found-error.ts
 *
 * Thrown when a requested resource does not exist (or has been soft-deleted).
 * Maps to HTTP 404.
 *
 * Keeping resource-specific errors generic at this level (no "user not found"
 * vs "org not found" distinction) — that context lives in the module layer.
 * The `resource` param allows the message to be descriptive without needing
 * a separate subclass per entity.
 */

import { AppError } from './app-error.js';

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}
