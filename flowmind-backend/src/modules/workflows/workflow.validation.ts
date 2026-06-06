import { z } from 'zod';
import { ValidationError, type ValidationDetail } from '../../common/errors/index.js';

export const createWorkflowSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .trim()
    .optional(),
});

// Version definition must be a non-null JSON object (not array, not primitive).
// The workflow engine will enforce deeper structure in a later phase.
export const createVersionSchema = z.object({
  definition: z
    .record(z.string(), z.unknown())
    .refine((v) => v !== null && typeof v === 'object' && !Array.isArray(v), {
      message: 'definition must be a JSON object',
    }),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type CreateVersionInput = z.infer<typeof createVersionSchema>;

export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const details: ValidationDetail[] = result.error.issues.map((i) => ({
      field: i.path.map(String).join('.'),
      message: i.message,
    }));
    throw new ValidationError('Validation failed', details);
  }
  return result.data;
}
