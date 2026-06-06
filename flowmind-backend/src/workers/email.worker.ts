/**
 * src/workers/email.worker.ts — Email Queue Consumer
 *
 * Processes jobs from the 'email' queue.
 * In Phase 6+ this will send transactional emails via Resend/SES/SendGrid.
 *
 * concurrency: 10 — email sends are pure I/O, safe to parallelize heavily.
 */

import { Worker, type Job } from 'bullmq';
import { QUEUE_NAMES } from '../queues/queue-names.js';
import { bullmqConnection } from '../queues/index.js';
import { createLogger } from '../common/logger.js';

const log = createLogger('worker:email');

async function processEmailJob(job: Job): Promise<void> {
  log.info({ jobId: job.id, jobName: job.name, data: job.data }, 'Processing email job');

  // Placeholder — email provider integration added in Phase 6
  await new Promise((resolve) => setTimeout(resolve, 50));

  log.info({ jobId: job.id }, 'Email job completed');
}

export function createEmailWorker(): Worker {
  const worker = new Worker(QUEUE_NAMES.EMAIL, processEmailJob, {
    connection: bullmqConnection,
    concurrency: 10,
  });

  worker.on('completed', (job) => {
    log.info({ jobId: job.id, jobName: job.name }, 'Email job succeeded');
  });

  worker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, jobName: job?.name, err }, 'Email job failed');
  });

  worker.on('error', (err) => {
    log.error({ err }, 'Email worker error');
  });

  return worker;
}
