/**
 * src/modules/api-keys/api-key.validation.ts
 */

import { z } from 'zod';
import { ValidationError, type ValidationDetail } from '../../common/errors/index.js';

export const createApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

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
