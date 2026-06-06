/**
 * src/config/env.ts — Centralized Environment Configuration
 *
 * WHY: Scattered process.env access across the codebase creates silent bugs
 * (typos, missing vars, wrong types). Centralizing + validating at startup
 * means the app crashes immediately with a clear error rather than failing
 * mid-request in production.
 *
 * HOW: Zod parses and coerces the raw env object. If any required variable is
 * missing or invalid, `safeParse` returns an error and we exit with code 1.
 * The exported `env` object is fully typed — no string casting needed anywhere.
 */

import { z } from 'zod';

// ─── Schema ──────────────────────────────────────────────────────────────────

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection URL'),

  // Redis
  REDIS_HOST: z.string().min(1, 'REDIS_HOST is required'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // AI Providers — optional at startup; required only in worker process
  // OPENAI_API_KEY kept for future OpenAI/OpenRouter support
  OPENAI_API_KEY: z.string().startsWith('sk-').optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
});

// ─── Type Export ─────────────────────────────────────────────────────────────

/**
 * Infer the TypeScript type directly from the Zod schema.
 * This keeps the type and validation logic in a single source of truth.
 */
export type Env = z.infer<typeof envSchema>;

// ─── Validation ──────────────────────────────────────────────────────────────

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Format Zod errors into a readable list for fast debugging
  // Zod v4: path entries are PropertyKey (string | number | symbol)
  const errors = parsed.error.issues
    .map((issue) => `  • ${issue.path.map(String).join('.')}: ${issue.message}`)
    .join('\n');

  console.error('❌ Invalid environment variables:\n' + errors);
  console.error('\nFix the above errors in your .env file and restart.');
  process.exit(1);
}

// ─── Export ──────────────────────────────────────────────────────────────────

/**
 * The validated, fully-typed environment object.
 * Import this everywhere instead of accessing process.env directly.
 *
 * @example
 * import { env } from '@/config/env';
 * const port = env.PORT; // number, not string
 */
export const env: Env = parsed.data;

export default env;
