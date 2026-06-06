/**
 * src/modules/audit-logs/audit-log.validation.ts
 */

import { z } from 'zod';
import { ValidationError, type ValidationDetail } from '../../common/errors/index.js';

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export function parseQuery<T>(schema: z.ZodSchema<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) {
    const details: ValidationDetail[] = result.error.issues.map((issue) => ({
      field: issue.path.map(String).join('.'),
      message: issue.message,
    }));
    throw new ValidationError('Validation failed', details);
  }
  return result.data;
}

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
