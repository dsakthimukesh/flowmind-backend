/**
 * src/middleware/error.middleware.ts — Global Error Handler
 *
 * WHY CENTRALIZED ERROR HANDLING:
 * Scattering try/catch + res.status().json() across every controller means:
 *   • Inconsistent response shapes
 *   • Repeated Prisma error handling logic
 *   • No single place to add monitoring/alerting hooks
 *
 * This middleware is the single exit point for ALL errors. It normalizes every
 * error type into a consistent ApiResponse shape and applies the right rules:
 *
 * ERROR CLASSIFICATION:
 *   1. AppError (isOperational=true)  → Known business error, safe to expose
 *   2. Prisma errors                  → Map to AppError equivalents, never expose internals
 *   3. Zod errors                     → Map to ValidationError with field details
 *   4. Unknown errors (bugs)          → Log as fatal, return generic 500 in production
 *
 * PRODUCTION SAFETY:
 * Stack traces and internal messages are NEVER sent to clients in production.
 * This prevents information disclosure (database schema, file paths, etc.).
 *
 * PLACEMENT: Must be registered LAST in app.ts — Express identifies error
 * handlers by the 4-parameter signature (err, req, res, next).
 */

import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../common/errors/index.js';
import { errorResponse } from '../common/utils/api-response.js';
import { createLogger } from '../common/logger.js';

const log = createLogger('error-middleware');
const isDev = process.env['NODE_ENV'] !== 'production';

// ─── Prisma Error Mapping ─────────────────────────────────────────────────────

/**
 * Map Prisma's error codes to AppErrors.
 * We only expose safe, high-level messages — never Prisma internals.
 *
 * Full Prisma error code reference: https://pris.ly/d/error-reference
 */
function handlePrismaError(err: Prisma.PrismaClientKnownRequestError): AppError {
  switch (err.code) {
    case 'P2002': {
      // Unique constraint violation
      const fields = (err.meta?.['target'] as string[])?.join(', ') ?? 'field';
      return new AppError(
        `A record with this ${fields} already exists`,
        409,
        'CONFLICT',
      );
    }
    case 'P2025':
      // Record not found (e.g., update/delete on non-existent record)
      return new AppError('Record not found', 404, 'NOT_FOUND');

    case 'P2003':
      // Foreign key constraint violation
      return new AppError(
        'Related record not found',
        400,
        'FOREIGN_KEY_VIOLATION',
      );

    case 'P2014':
      // Relation violation
      return new AppError(
        'The operation would violate a relation constraint',
        400,
        'RELATION_VIOLATION',
      );

    default:
      // All other Prisma known errors — don't expose the code
      return new AppError('Database operation failed', 500, 'DATABASE_ERROR', false);
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId;

  // ── Operational AppErrors ─────────────────────────────────────────────────
  if (err instanceof AppError) {
    if (err.isOperational) {
      log.warn(
        { err, requestId, path: req.path, method: req.method },
        `Operational error: ${err.message}`,
      );
    } else {
      // Non-operational AppErrors are programming mistakes — treat as bugs
      log.error(
        { err, requestId, path: req.path, method: req.method },
        `Non-operational AppError: ${err.message}`,
      );
    }

    // ValidationError carries field-level details
    if (err instanceof ValidationError) {
      res.status(err.statusCode).json(
        errorResponse(err.message, err.code, err.details),
      );
      return;
    }

    res.status(err.statusCode).json(
      errorResponse(err.message, err.code),
    );
    return;
  }

  // ── Prisma Known Request Errors ───────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    log.warn(
      { prismaCode: err.code, requestId, meta: err.meta },
      `Prisma known error: ${err.code}`,
    );
    const appError = handlePrismaError(err);
    res.status(appError.statusCode).json(
      errorResponse(appError.message, appError.code),
    );
    return;
  }

  // ── Prisma Validation Errors (schema-level) ───────────────────────────────
  if (err instanceof Prisma.PrismaClientValidationError) {
    log.warn({ requestId }, 'Prisma validation error');
    res.status(400).json(
      errorResponse('Invalid data provided', 'VALIDATION_ERROR'),
    );
    return;
  }

  // ── Prisma Connection Errors ──────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientInitializationError) {
    log.fatal({ err, requestId }, 'Prisma initialization error — database unreachable');
    res.status(503).json(
      errorResponse('Service temporarily unavailable', 'SERVICE_UNAVAILABLE'),
    );
    return;
  }

  // ── Zod Validation Errors ─────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.map(String).join('.'),
      message: issue.message,
    }));
    log.warn({ requestId, details }, 'Zod validation error');
    res.status(422).json(
      errorResponse('Validation failed', 'VALIDATION_ERROR', details),
    );
    return;
  }

  // ── SyntaxError (malformed JSON body) ────────────────────────────────────
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    res.status(400).json(
      errorResponse('Invalid JSON in request body', 'BAD_REQUEST'),
    );
    return;
  }

  // ── Unknown / Unhandled Errors (Bugs) ────────────────────────────────────
  // These are programming errors — always log full details, never expose to client
  log.error(
    { err, requestId, path: req.path, method: req.method },
    'Unhandled error — this is a bug',
  );

  res.status(500).json(
    errorResponse(
      isDev && err instanceof Error
        ? err.message
        : 'An unexpected error occurred',
      'INTERNAL_SERVER_ERROR',
    ),
  );
}
