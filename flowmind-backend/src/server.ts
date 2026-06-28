/**
 * src/server.ts — Server Entry Point & Bootstrap Orchestrator
 *
 * STARTUP SEQUENCE (order matters):
 *   1. dotenv/config  — populate process.env BEFORE any module reads it
 *   2. env validation — fail fast if config is missing/invalid
 *   3. connectRedis   — establish Redis connection (BullMQ + cache)
 *   4. createApp      — build Express app with all middleware
 *   5. http.createServer — wrap in raw HTTP server for graceful shutdown control
 *   6. server.listen  — bind to port
 *   7. register shutdown handlers — SIGTERM (Docker/k8s), SIGINT (Ctrl+C)
 *
 * GRACEFUL SHUTDOWN SEQUENCE:
 *   1. Stop accepting new HTTP connections (server.close)
 *   2. Let in-flight requests finish (server.close callback)
 *   3. Disconnect Prisma (closes connection pool)
 *   4. Disconnect Redis (flushes pending commands)
 *   5. Exit with code 0
 *
 * Force-kill after 10s ensures the process always terminates even if a
 * request hangs — critical for Docker rolling deployments and k8s pod eviction.
 */

import 'dotenv/config';
import http from 'http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { logger } from './common/logger.js';
import { connectRedis, disconnectRedis } from './infrastructure/redis/redis.js';
import { prisma } from './prisma/prisma.js';
import { closeAllQueues } from './queues/index.js';
import { initSocketServer, getSocketServer } from './sockets/index.js';
import { createWorkflowWorker } from './workers/workflow.worker.js';
import { createAiWorker } from './workers/ai.worker.js';
import { createEmailWorker } from './workers/email.worker.js';
import { createDocumentIndexingWorker } from './workers/document-indexing.worker.js';

// ─── Bootstrap ───────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  // ── Connect infrastructure dependencies ──────────────────────────────────

  // Redis must be connected before the app starts handling requests,
  // because health checks and BullMQ queues both depend on it.
  await connectRedis();

  // Start background workers in the same process to simplify hosting and ensure queues are processed
  logger.info('⚙️ Starting background workers in API process');
  const workers = [
    createWorkflowWorker(),
    createAiWorker(),
    createEmailWorker(),
    createDocumentIndexingWorker(),
  ];

  // ── Initialize Express app ───────────────────────────────────────────────
  const app = createApp();
  const server = http.createServer(app);

  // ── Initialize Socket.io ──────────────────────────────────────────────────
  // Must be attached to the same http.Server as Express so both share port 4000.
  initSocketServer(server);

  // ── Start listening ──────────────────────────────────────────────────────
  await new Promise<void>((resolve) => {
    server.listen(env.PORT, () => resolve());
  });

  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      pid: process.pid,
      nodeVersion: process.version,
    },
    '🚀 FlowMind API server started',
  );

  // ─── Graceful Shutdown ───────────────────────────────────────────────────

  let isShuttingDown = false;

  async function shutdown(signal: string): Promise<void> {
    // Guard against double-invocation (SIGTERM + SIGINT in quick succession)
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, 'Shutdown signal received — starting graceful shutdown');

    // Force-kill timeout — if shutdown takes longer than 10s, bail out.
    // This prevents stuck processes from blocking rolling deployments.
    const forceKillTimer = setTimeout(() => {
      logger.error('Graceful shutdown timed out after 10s — forcing exit');
      process.exit(1);
    }, 10_000);

    // Don't let this timer keep the event loop alive
    forceKillTimer.unref();

    try {
      // 1. Stop accepting new connections (in-flight requests still finish)
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      logger.info('HTTP server closed — no new connections accepted');

      // 2. Close Socket.io (drains existing connections cleanly)
      await new Promise<void>((resolve) => {
        try { getSocketServer().close(() => resolve()); }
        catch { resolve(); } // socket server may not be init'd in test env
      });
      logger.info('Socket.io server closed');

      // 3. Close in-process BullMQ workers — wait for current jobs to finish
      logger.info('Closing background workers...');
      await Promise.all(workers.map((w) => w.close().catch(() => {})));
      logger.info('Background workers closed');

      // 4. Disconnect Prisma — closes the connection pool cleanly
      await prisma.$disconnect();
      logger.info('Prisma disconnected');

      // 5. Close BullMQ queue connections
      await closeAllQueues();

      // 6. Disconnect Redis — flushes pending commands, sends QUIT
      await disconnectRedis();

      logger.info('Graceful shutdown complete. Goodbye 👋');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during graceful shutdown');
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Catch unhandled promise rejections — these are bugs, always log + exit
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled Promise rejection — exiting');
    process.exit(1);
  });

  // Catch uncaught exceptions — same treatment
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — exiting');
    process.exit(1);
  });
}

// ─── Execute ─────────────────────────────────────────────────────────────────

bootstrap().catch((err: unknown) => {
  logger.fatal({ err }, 'Fatal error during server bootstrap');
  process.exit(1);
});
