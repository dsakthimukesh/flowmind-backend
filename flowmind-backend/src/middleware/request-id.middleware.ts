/**
 * src/middleware/request-id.middleware.ts — Request ID Middleware
 *
 * WHY REQUEST IDs:
 * In a distributed system (or even a monolith with multiple workers), tracing
 * a single request through logs is impossible without a correlation ID.
 * Every log entry for a request should carry the same ID so you can filter
 * by requestId in Datadog/CloudWatch and see the full request lifecycle.
 *
 * STRATEGY:
 * 1. Check if the upstream proxy (nginx, ALB, Cloudflare) already set
 *    X-Request-ID or X-Correlation-ID on the incoming request.
 *    This allows end-to-end tracing across services.
 * 2. If not present, generate a new UUIDv4.
 * 3. Attach to req object (for downstream middleware + controllers to read)
 * 4. Echo back in the response header (for client-side debugging)
 *
 * TYPE AUGMENTATION:
 * We extend Express's Request type so req.requestId is typed throughout
 * the entire application without casts.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

// ─── Middleware ───────────────────────────────────────────────────────────────

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Honor upstream correlation IDs (load balancers, API gateways, other services)
  const incoming =
    req.headers['x-request-id'] ??
    req.headers['x-correlation-id'];

  const requestId = Array.isArray(incoming)
    ? incoming[0]
    : (incoming ?? uuidv4());

  // Attach to request for downstream use (controllers, other middleware)
  req.requestId = requestId;

  // Echo in response so clients can correlate their request in support tickets
  res.setHeader('X-Request-ID', requestId);

  next();
}
