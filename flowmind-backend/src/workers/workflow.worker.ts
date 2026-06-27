/**
 * src/workers/workflow.worker.ts — Workflow Queue Consumer
 *
 * Drives execution lifecycle, emits Socket.io events, and writes
 * structured ExecutionLog entries at each lifecycle stage.
 */

import { Worker, type Job } from 'bullmq';
import { QUEUE_NAMES } from '../queues/queue-names.js';
import { bullmqConnection, workflowQueue } from '../queues/index.js';
import {
  markExecutionRunning,
  markExecutionSuccess,
  markExecutionFailed,
} from '../modules/executions/execution.repository.js';
import {
  logInfo,
  logWarn,
  logError,
} from '../modules/executions/services/execution-log.service.js';
import { prisma } from '../prisma/prisma.js';
import { executeWorkflow } from '../workflows/engine.js';
import type { WorkflowDefinition, ExecutionContext } from '../workflows/nodes/types.js';
import { emitToExecution, SOCKET_EVENTS } from '../sockets/index.js';
import { createLogger } from '../common/logger.js';

const log = createLogger('worker:workflow');

interface WorkflowJobData {
  executionId: string;
  workflowId: string;
  workflowVersionId: string;
  organizationId: string;
  inputData?: Record<string, any>;
}

async function processWorkflowJob(job: Job<WorkflowJobData>): Promise<void> {
  if (job.name === 'scheduled-workflow') {
    const { workflowId, organizationId } = job.data as any;
    log.info({ jobId: job.id, workflowId }, 'Scheduled workflow job received');

    // 1. Find published version
    const publishedVersion = await prisma.workflowVersion.findFirst({
      where: { workflowId, isPublished: true },
    });
    if (!publishedVersion) {
      log.warn({ workflowId }, 'Scheduled workflow run failed: No published version found');
      return;
    }

    // 2. Create the execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        workflowVersionId: publishedVersion.id,
        triggeredBy: 'scheduler',
        status: 'PENDING',
      },
    });

    // 3. Enqueue execute-workflow job
    await workflowQueue.add('execute-workflow', {
      executionId: execution.id,
      workflowId,
      workflowVersionId: publishedVersion.id,
      organizationId,
    });
    return;
  }

  const { executionId, workflowVersionId, workflowId, organizationId, inputData } = job.data;

  log.info({ jobId: job.id, executionId }, 'Workflow job received');

  await markExecutionRunning(executionId);
  const startedAt = new Date().toISOString();

  await logInfo(executionId, organizationId, 'Execution started', { workflowId, workflowVersionId });

  emitToExecution(executionId, organizationId, SOCKET_EVENTS.EXECUTION_STARTED, {
    executionId, workflowId, organizationId, startedAt,
  });

  try {
    const version = await prisma.workflowVersion.findFirst({
      where: { id: workflowVersionId },
      select: { definition: true },
    });

    if (!version) throw new Error(`WorkflowVersion not found: ${workflowVersionId}`);

    const definition = version.definition as unknown as WorkflowDefinition;

    const context: ExecutionContext = {
      executionId,
      workflowId,
      organizationId,
      data: inputData || {},
      logs: [],
      emit: (event, payload) => {
        // Write structured DB log for node events
        const p = payload as Record<string, unknown>;
        const nodeId = p['nodeId'] as string | undefined;

        if (event === 'node.started') {
          void logInfo(executionId, organizationId, `Node started: ${p['nodeName']}`,
            { nodeType: p['nodeType'] }, nodeId);
        } else if (event === 'node.completed') {
          let outputSummary = '';
          if (p['output'] && typeof p['output'] === 'object') {
            const out = { ...p['output'] as any };
            delete out._meta; // hide raw meta in console log string for cleaner display
            outputSummary = `\nOutput: ${JSON.stringify(out, null, 2)}`;
          }
          void logInfo(
            executionId,
            organizationId,
            `Node completed: ${p['nodeName']}${outputSummary}`,
            { nodeType: p['nodeType'], durationMs: p['durationMs'], output: p['output'] },
            nodeId,
          );
        } else if (event === 'node.failed') {
          void logError(executionId, organizationId, `Node failed: ${p['nodeName']}`,
            { nodeType: p['nodeType'], error: p['error'], durationMs: p['durationMs'] }, nodeId);
        }

        emitToExecution(executionId, organizationId, event as any, payload);
      },
    };

    const result = await executeWorkflow(definition, context);

    if (result.success) {
      await markExecutionSuccess(executionId);
      const completedAt = new Date().toISOString();

      await logInfo(executionId, organizationId, 'Execution completed successfully',
        { nodeCount: result.logs.length });

      emitToExecution(executionId, organizationId, SOCKET_EVENTS.EXECUTION_COMPLETED, {
        executionId, workflowId, organizationId, completedAt, nodeCount: result.logs.length,
      });

      log.info({ executionId, steps: result.logs.length }, 'Execution succeeded');
    } else {
      await markExecutionFailed(executionId, result.error ?? 'Unknown error');
      const failedAt = new Date().toISOString();

      await logWarn(executionId, organizationId, 'Execution failed in engine',
        { error: result.error });

      emitToExecution(executionId, organizationId, SOCKET_EVENTS.EXECUTION_FAILED, {
        executionId, workflowId, organizationId, failedAt, error: result.error ?? 'Unknown error',
      });

      log.warn({ executionId, error: result.error }, 'Execution failed (engine)');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    await markExecutionFailed(executionId, message);
    const failedAt = new Date().toISOString();

    await logError(executionId, organizationId, 'Execution failed with exception', { error: message });

    emitToExecution(executionId, organizationId, SOCKET_EVENTS.EXECUTION_FAILED, {
      executionId, workflowId, organizationId, failedAt, error: message,
    });

    log.error({ executionId, err }, 'Execution failed (exception)');
    throw err;
  }
}

export function createWorkflowWorker(): Worker {
  const worker = new Worker(QUEUE_NAMES.WORKFLOW, processWorkflowJob, {
    connection: bullmqConnection,
    concurrency: 5,
  });

  worker.on('completed', (job) => log.info({ jobId: job.id }, 'Workflow job completed'));
  worker.on('failed', (job, err) => log.error({ jobId: job?.id, err }, 'Workflow job failed after retries'));
  worker.on('error', (err) => log.error({ err }, 'Workflow worker connection error'));

  return worker;
}
