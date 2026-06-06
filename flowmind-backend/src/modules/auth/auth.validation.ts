/**
 * src/modules/auth/auth.validation.ts — Zod Validation Schemas
 *
 * WHY ZOD AT THE ROUTE LEVEL:
 * Validation is the first line of defense. Parsing and rejecting bad input
 * before it reaches the service layer means services can assume valid data
 * and contain only business logic — no defensive checks throughout.
 *
 * `parseBody` is a helper that runs validation and throws a ValidationError
 * (which the error middleware handles) if the input is invalid. Controllers
 * call it as one line and receive a typed, guaranteed-valid DTO.
 */

import { z } from 'zod';
import { ValidationError, type ValidationDetail } from '../../common/errors/index.js';

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password cannot exceed 72 characters') // bcrypt truncates at 72 bytes
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    ),

  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters')
    .trim(),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name cannot exceed 50 characters')
    .trim(),

  organizationName: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name cannot exceed 100 characters')
    .trim(),
});

export const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

// ─── Types inferred from schemas ─────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ─── Parse Helper ─────────────────────────────────────────────────────────────

/**
 * Parse and validate request body against a Zod schema.
 * Throws ValidationError (→ error middleware → 422) on failure.
 * Returns typed, validated data on success.
 */
export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);

  if (!result.success) {
    const details: ValidationDetail[] = result.error.issues.map((issue) => ({
      field: issue.path.map(String).join('.'),
      message: issue.message,
    }));
    throw new ValidationError('Validation failed', details);
  }

  return result.data;
}
