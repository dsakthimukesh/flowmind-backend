/**
 * src/common/logger.ts — Application Logger
 *
 * WHY PINO: Pino is the fastest Node.js logger — it serializes logs
 * asynchronously and has minimal impact on the hot path. It outputs
 * structured JSON in production (machine-parseable by Datadog, CloudWatch,
 * etc.) and pretty-prints in development (human-readable terminal output).
 *
 * WHY NOT console.log: console.log is synchronous and unstructured.
 * In a production SaaS, you need log levels, timestamps, request IDs,
 * and structured metadata for filtering + alerting. Pino gives you all of this.
 *
 * SCALABILITY: The logger instance is a singleton. Child loggers (created via
 * logger.child({ module: 'auth' })) inherit the parent config but add
 * contextual fields — zero overhead, great for tracing across modules.
 */

import pino from 'pino';

// ─── Transport ───────────────────────────────────────────────────────────────

/**
 * In development, pipe output through pino-pretty for human-readable logs.
 * In production, output raw NDJSON — let the log aggregator handle formatting.
 *
 * pino-pretty is a devDependency; it's not bundled in production images.
 * The conditional transport avoids any startup error in production.
 */
const isDev = process.env['NODE_ENV'] !== 'production';

const transport = isDev
  ? pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss.l',
        ignore: 'pid,hostname',
        messageFormat: '{msg}',
        singleLine: false,
      },
    })
  : undefined;

// ─── Logger Instance ─────────────────────────────────────────────────────────

const logger = pino(
  {
    // Log level hierarchy: trace < debug < info < warn < error < fatal
    // In production, set to 'info' to suppress debug noise.
    // Override per-environment via LOG_LEVEL env var if needed.
    level: process.env['LOG_LEVEL'] ?? (isDev ? 'debug' : 'info'),

    // Adds ISO timestamp to every log entry
    timestamp: pino.stdTimeFunctions.isoTime,

    // Base fields included in every log line
    base: {
      service: 'flowmind-api',
      env: process.env['NODE_ENV'] ?? 'development',
    },

    // Redact sensitive fields from logs — never log secrets
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'body.password',
        'body.token',
        'body.apiKey',
      ],
      censor: '[REDACTED]',
    },
  },
  transport,
);

// ─── Exports ─────────────────────────────────────────────────────────────────

export { logger };
export default logger;

/**
 * Create a child logger for a specific module/context.
 * Child loggers add a `module` field to every log entry for easy filtering.
 *
 * @example
 * const log = createLogger('auth');
 * log.info('User logged in', { userId: '...' });
 * // → { module: 'auth', msg: 'User logged in', userId: '...' }
 */
export function createLogger(module: string): pino.Logger {
  return logger.child({ module });
}
