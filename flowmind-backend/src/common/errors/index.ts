/**
 * src/common/errors/index.ts — Error barrel export
 *
 * Single import point for all error classes.
 * Consumers: import { NotFoundError, ValidationError } from '@/common/errors/index.js'
 */

export { AppError } from './app-error.js';
export { NotFoundError } from './not-found-error.js';
export { ValidationError, type ValidationDetail } from './validation-error.js';
export { UnauthorizedError } from './unauthorized-error.js';
export { ForbiddenError } from './forbidden-error.js';
