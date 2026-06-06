/**
 * src/workers/index.ts — Worker Process Entry Point
 *
 * Runs as a completely separate Node.js process (see Dockerfile.worker).
 * Connects to Redis, starts all workers, and handles graceful shutdown.
 *
 * SHUTDOWN SEQUENCE:
 * worker.close() waits for the currently active job to finish, then stops
 * accepting new jobs. This prevents partial job execution on deploy.
 */

import 'dotenv/config';
import { logger } from '../common/logger.js';
import { env } from '../config/env.js';
import { createWorkflowWorker } from './workflow.worker.js';
import { createAiWorker } from './ai.worker.js';
import { createEmailWorker } from './email.worker.js';
import { createDocumentIndexingWorker } from './document-indexing.worker.js';

async function startWorkers(): Promise<void> {
  logger.info({ env: env.NODE_ENV, pid: process.pid }, '⚙️  Starting FlowMind workers');

  const workers = [
    createWorkflowWorker(),
    createAiWorker(),
    createEmailWorker(),
    createDocumentIndexingWorker(),
  ];

  logger.info({ count: workers.length }, 'All workers started');

  async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, 'Worker shutdown signal received');

    // Close all workers — waits for active jobs to finish
    await Promise.all(workers.map((w) => w.close()));

    logger.info('All workers closed cleanly');
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection in worker process');
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception in worker process');
    process.exit(1);
  });
}

startWorkers().catch((err) => {
  logger.fatal({ err }, 'Failed to start workers');
  process.exit(1);
});
