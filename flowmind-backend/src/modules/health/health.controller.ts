/**
 * src/modules/health/health.controller.ts — Health Check Controller
 *
 * WHY A DEDICATED HEALTH MODULE:
 * A shallow /health endpoint (just returns 200) is insufficient for production.
 * Real readiness checks verify the dependencies the API actually needs:
 *   • Database — can we execute a query?
 *   • Redis    — can we reach the cache/queue backend?
 *
 * TWO ENDPOINTS:
 *   GET /health       — Liveness probe. Always returns 200 if the process is up.
 *                       Used by Docker HEALTHCHECK and k8s livenessProbe.
 *                       Should NEVER check downstream deps — a DB being slow
 *                       shouldn't cause k8s to kill and restart the pod.
 *
 *   GET /health/ready — Readiness probe. Returns 200 only if all deps are healthy.
 *                       Used by k8s readinessProbe to gate traffic routing.
 *                       If this returns 503, the load balancer stops sending traffic.
 *
 * TIMEOUT PROTECTION:
 * Both DB and Redis checks are wrapped with a 3-second timeout. If a dependency
 * hangs (e.g., DB under heavy load), we return 503 quickly rather than leaving
 * the health check hanging and blocking the load balancer probe.
 */

import type { Request, Response } from 'express';
import { prisma } from '../../prisma/prisma.js';
import { redis } from '../../infrastructure/redis/redis.js';
import { getQueuesHealth } from '../../queues/index.js';
import { successResponse, errorResponse } from '../../common/utils/api-response.js';
import { createLogger } from '../../common/logger.js';

const log = createLogger('health');

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function checkDatabase(): Promise<{ status: 'ok' | 'error'; latencyMs: number }> {
  const start = Date.now();
  try {
    // $queryRaw is the lightest possible DB roundtrip — no table scan
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch {
    return { status: 'error', latencyMs: Date.now() - start };
  }
}

async function checkRedis(): Promise<{ status: 'ok' | 'error'; latencyMs: number }> {
  const start = Date.now();
  try {
    const pong = await redis.ping();
    if (pong !== 'PONG') throw new Error('Unexpected PING response');
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch {
    return { status: 'error', latencyMs: Date.now() - start };
  }
}

/**
 * Race a promise against a timeout.
 * Prevents a hanging health check from blocking load balancer probes.
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /health — Liveness probe
 * Always returns 200 if the Node.js process is running.
 */
export function getLiveness(_req: Request, res: Response): void {
  res.status(200).json(
    successResponse('Service is running', {
      service: 'flowmind-api',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    }),
  );
}

/**
 * GET /health/ready — Readiness probe
 * Returns 200 only if DB and Redis are reachable.
 * Returns 503 if any dependency is unhealthy.
 */
export async function getReadiness(_req: Request, res: Response): Promise<void> {
  const timeout = 3000;
  const errorFallback = { status: 'error' as const, latencyMs: timeout };

  const [db, redisCheck] = await Promise.all([
    withTimeout(checkDatabase(), timeout, errorFallback),
    withTimeout(checkRedis(), timeout, errorFallback),
  ]);

  const queues = await withTimeout(
    getQueuesHealth(),
    timeout,
    [],
  );

  const isHealthy = db.status === 'ok' && redisCheck.status === 'ok';

  if (!isHealthy) {
    log.warn({ db, redis: redisCheck }, 'Readiness check failed');
  }

  const status = isHealthy ? 200 : 503;

  res.status(status).json(
    isHealthy
      ? successResponse('All systems operational', {
          service: 'flowmind-api',
          uptime: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
          dependencies: { database: db, redis: redisCheck },
          queues,
        })
      : errorResponse('One or more dependencies are unhealthy', 'SERVICE_UNAVAILABLE'),
  );
}
