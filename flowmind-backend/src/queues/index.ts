/**
 * src/queues/index.ts — BullMQ Queue Registry
 *
 * WHY BULLMQ USES ITS OWN REDIS CONNECTION:
 * BullMQ uses ioredis internally and requires a dedicated connection per
 * Queue/Worker/QueueEvents instance — it cannot share the node-redis client
 * used by the rest of the app. BullMQ manages its own connection lifecycle.
 *
 * We pass a connection config object (host + port) and let BullMQ create
 * its own ioredis instances. This is the recommended BullMQ pattern.
 *
 * QUEUE vs WORKER SEPARATION:
 * Queue instances (defined here) are used by the API process to ADD jobs.
 * Worker instances (in src/workers/) are used by the worker process to
 * CONSUME jobs. They are kept in separate files because they run in
 * separate processes.
 */

import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queue-names.js';
import { createLogger } from '../common/logger.js';

const log = createLogger('queues');

// ─── Shared BullMQ Connection Config ─────────────────────────────────────────

export const bullmqConnection = {
  host: process.env['REDIS_HOST'] ?? 'localhost',
  port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
};

// ─── Queue Instances ──────────────────────────────────────────────────────────

export const workflowQueue = new Queue(QUEUE_NAMES.WORKFLOW, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },  // keep last 100 completed jobs for inspection
    removeOnFail: { count: 500 },       // keep last 500 failed jobs for debugging
  },
});

export const aiQueue = new Queue(QUEUE_NAMES.AI, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 2,                         // AI calls are expensive — limit retries
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export const emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 5,                         // emails should retry more aggressively
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 200 },
  },
});

// Document indexing: chunk + embed + store. Retries are safe (idempotent).
export const documentIndexingQueue = new Queue(QUEUE_NAMES.DOCUMENT_INDEXING, {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

// Collect all queues for health checks and bulk shutdown
export const allQueues = [workflowQueue, aiQueue, emailQueue, documentIndexingQueue];

log.info(
  { queues: Object.values(QUEUE_NAMES) },
  'BullMQ queues initialized',
);

// ─── Job Helpers ──────────────────────────────────────────────────────────────

/**
 * Add a job to a queue with an optional job name and data payload.
 * Returns the created Job instance (contains the generated job ID).
 */
export async function addJob<T extends Record<string, unknown>>(
  queue: Queue,
  jobName: string,
  data: T,
  opts?: Parameters<Queue['add']>[2],
) {
  const job = await queue.add(jobName, data, opts);
  log.debug({ queue: queue.name, jobName, jobId: job.id }, 'Job added');
  return job;
}

/**
 * Retrieve a job by ID from a queue. Returns null if not found.
 */
export async function getJob(queue: Queue, jobId: string) {
  return queue.getJob(jobId);
}

/**
 * Remove a job by ID from a queue.
 * No-op if the job does not exist.
 */
export async function removeJob(queue: Queue, jobId: string): Promise<void> {
  const job = await queue.getJob(jobId);
  if (job) {
    await job.remove();
    log.debug({ queue: queue.name, jobId }, 'Job removed');
  }
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

/**
 * Close all queue connections cleanly.
 * Call this during API server shutdown — queue connections are separate
 * from the main Redis client and must be closed independently.
 */
export async function closeAllQueues(): Promise<void> {
  await Promise.all(allQueues.map((q) => q.close()));
  log.info('All BullMQ queues closed');
}

// ─── Queue Health ─────────────────────────────────────────────────────────────

export interface QueueHealth {
  name: string;
  waiting: number;
  active: number;
  failed: number;
  completed: number;
}

/**
 * Fetch job counts for all queues — used by the health/ready endpoint.
 * Wrapped in try/catch so a Redis hiccup doesn't fail the entire health check.
 */
export async function getQueuesHealth(): Promise<QueueHealth[]> {
  return Promise.all(
    allQueues.map(async (queue) => {
      try {
        const counts = await queue.getJobCounts(
          'waiting',
          'active',
          'failed',
          'completed',
        );
        return {
          name: queue.name,
          waiting: counts['waiting'] ?? 0,
          active: counts['active'] ?? 0,
          failed: counts['failed'] ?? 0,
          completed: counts['completed'] ?? 0,
        };
      } catch {
        return { name: queue.name, waiting: -1, active: -1, failed: -1, completed: -1 };
      }
    }),
  );
}
