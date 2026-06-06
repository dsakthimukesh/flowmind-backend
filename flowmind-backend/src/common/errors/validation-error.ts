/**
 * src/common/errors/validation-error.ts
 *
 * Thrown when request input fails validation (Zod, manual checks, etc.).
 * Maps to HTTP 422 Unprocessable Entity — more semantically correct than 400
 * for validation failures because the request was syntactically valid but
 * semantically wrong.
 *
 * `details` carries the field-level error map so the frontend can highlight
 * specific form fields without parsing the message string.
 *
 * Shape:
 *   { field: 'email', message: 'Invalid email address' }[]
 */

import { AppError } from './app-error.js';

export interface ValidationDetail {
  field: string;
  message: string;
}

export class ValidationError extends AppError {
  public readonly details: ValidationDetail[];

  constructor(message = 'Validation failed', details: ValidationDetail[] = []) {
    super(message, 422, 'VALIDATION_ERROR');
    this.details = details;
  }
}
