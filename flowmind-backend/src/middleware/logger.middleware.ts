/**
 * src/middleware/logger.middleware.ts — HTTP Request/Response Logger
 *
 * WHY PINO-HTTP:
 * pino-http is the official Express integration for Pino. It auto-serializes
 * the full request and response (method, url, status, latency) into a single
 * structured log entry per request — including the response time in ms.
 *
 * WHY NOT morgan:
 * Morgan outputs plain text strings. pino-http outputs machine-parseable JSON
 * that integrates natively with Pino's log aggregation pipeline and includes
 * the same `requestId` correlation field as the rest of the app logs.
 *
 * REQUEST ID INTEGRATION:
 * We inject req.requestId (set by request-id.middleware) into every
 * pino-http log entry. This means every log line — request log, controller
 * logs, service logs — shares the same requestId for full trace correlation.
 *
 * SENSITIVE DATA:
 * Authorization headers and cookies are redacted via the parent logger's
 * redact config. pino-http inherits the parent logger's serializers and
 * redaction rules automatically.
 */

import { pinoHttp } from 'pino-http';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Logger } from 'pino';
import { logger } from '../common/logger.js';

export const loggerMiddleware = pinoHttp({
  // Use our configured pino instance so log level, transport, and
  // redaction rules are inherited — no duplicate configuration.
  // Cast needed: pino-http expects Logger<string> but pino v10 types Logger<never>
  // for the base instance. Runtime behavior is identical.
  logger: logger as unknown as Logger<string>,

  // Inject requestId into every request log entry for correlation
  genReqId: (req: IncomingMessage) => (req as any).requestId as string,

  // Customize log level per status code range
  customLogLevel: (
    _req: IncomingMessage,
    res: ServerResponse,
    err: Error | undefined,
  ): string => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },

  // Human-readable message on success
  customSuccessMessage: (req: IncomingMessage, res: ServerResponse): string =>
    `${req.method} ${(req as any).url} ${res.statusCode}`,

  // Human-readable message on error
  customErrorMessage: (
    _req: IncomingMessage,
    _res: ServerResponse,
    err: Error,
  ): string => `Request failed: ${err.message}`,

  // Rename default keys to more readable names in logs
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'durationMs',
  },

  // Skip health check endpoint logs in production to reduce log volume.
  // Health probes fire every 10s from load balancers — they're noise, not signal.
  autoLogging: {
    ignore: (req: IncomingMessage): boolean =>
      (req as any).url === '/health' &&
      process.env['NODE_ENV'] === 'production',
  },
});
