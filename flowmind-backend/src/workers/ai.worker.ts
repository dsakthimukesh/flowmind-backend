/**
 * src/workers/ai.worker.ts — AI Queue Consumer
 *
 * Processes jobs from the 'ai' queue.
 * In Phase 6+ this will handle OpenAI API calls, embedding generation,
 * and vector storage — all offloaded from the HTTP request cycle.
 *
 * concurrency: 2 — AI jobs are I/O-heavy and rate-limited by the OpenAI API.
 * Low concurrency prevents hitting API rate limits and controls cost.
 */

import { Worker, type Job } from 'bullmq';
import { QUEUE_NAMES } from '../queues/queue-names.js';
import { bullmqConnection } from '../queues/index.js';
import { createLogger } from '../common/logger.js';

const log = createLogger('worker:ai');

async function processAiJob(job: Job): Promise<void> {
  log.info({ jobId: job.id, jobName: job.name, data: job.data }, 'Processing AI job');

  // Placeholder — OpenAI integration added in Phase 6
  await new Promise((resolve) => setTimeout(resolve, 100));

  log.info({ jobId: job.id }, 'AI job completed');
}

export function createAiWorker(): Worker {
  const worker = new Worker(QUEUE_NAMES.AI, processAiJob, {
    connection: bullmqConnection,
    concurrency: 2,
  });

  worker.on('completed', (job) => {
    log.info({ jobId: job.id, jobName: job.name }, 'AI job succeeded');
  });

  worker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, jobName: job?.name, err }, 'AI job failed');
  });

  worker.on('error', (err) => {
    log.error({ err }, 'AI worker error');
  });

  return worker;
}
