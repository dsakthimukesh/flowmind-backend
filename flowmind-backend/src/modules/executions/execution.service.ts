/**
 * src/modules/executions/execution.service.ts
 * Business logic for triggering and querying workflow executions.
 */

import { AppError, NotFoundError } from '../../common/errors/index.js';
import { findWorkflowByIdAndOrg, findPublishedVersion } from '../workflows/workflow.repository.js';
import {
  createExecution,
  findExecutionsByOrg,
  findExecutionByIdAndOrg,
} from './execution.repository.js';
import { workflowQueue, addJob } from '../../queues/index.js';
import { createLogger } from '../../common/logger.js';

const log = createLogger('execution-service');

// ─── View type ────────────────────────────────────────────────────────────────

export interface ExecutionView {
  id: string;
  workflowId: string;
  workflowVersionId: string;
  status: string;
  triggeredBy: string;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toView(e: {
  id: string;
  workflowId: string;
  workflowVersionId: string;
  status: string;
  triggeredBy: string;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ExecutionView {
  return {
    id: e.id,
    workflowId: e.workflowId,
    workflowVersionId: e.workflowVersionId,
    status: e.status,
    triggeredBy: e.triggeredBy,
    startedAt: e.startedAt,
    completedAt: e.completedAt,
    errorMessage: e.errorMessage,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

// ─── Trigger execution ────────────────────────────────────────────────────────

export interface TriggerExecutionResult {
  execution: ExecutionView;
  jobId: string | undefined;
}

/**
 * Trigger a new execution for a workflow:
 *   1. Verify workflow exists and belongs to the org
 *   2. Require a published version to exist
 *   3. Create execution record in PENDING state
 *   4. Enqueue job with executionId — worker picks it up and drives status
 */
export async function triggerExecution(
  workflowId: string,
  organizationId: string,
  triggeredBy: string,
): Promise<TriggerExecutionResult> {
  // Org-scoped workflow lookup
  const workflow = await findWorkflowByIdAndOrg(workflowId, organizationId);
  if (!workflow) throw new NotFoundError('Workflow');

  // Only ACTIVE workflows with a published version can be executed
  if (workflow.status !== 'ACTIVE') {
    throw new AppError(
      'Workflow must be ACTIVE to execute. Publish a version first.',
      400,
      'WORKFLOW_NOT_ACTIVE',
    );
  }

  const publishedVersion = await findPublishedVersion(workflowId);
  if (!publishedVersion) {
    throw new AppError(
      'No published version found for this workflow.',
      400,
      'NO_PUBLISHED_VERSION',
    );
  }

  // Create the execution record — PENDING until worker picks it up
  const execution = await createExecution({
    workflowId,
    workflowVersionId: publishedVersion.id,
    triggeredBy,
  });

  log.info({ executionId: execution.id, workflowId }, 'Execution created, enqueueing job');

  // Push to queue — job payload carries the executionId
  // Worker uses this ID to update status as it progresses
  const job = await addJob(workflowQueue, 'execute-workflow', {
    executionId: execution.id,
    workflowId,
    workflowVersionId: publishedVersion.id,
    organizationId,
  });

  return { execution: toView(execution), jobId: job.id };
}

// ─── Query executions ─────────────────────────────────────────────────────────

export async function listExecutions(organizationId: string): Promise<ExecutionView[]> {
  const executions = await findExecutionsByOrg(organizationId);
  return executions.map(toView);
}

export async function getExecution(
  id: string,
  organizationId: string,
): Promise<ExecutionView> {
  const execution = await findExecutionByIdAndOrg(id, organizationId);
  if (!execution) throw new NotFoundError('Execution');
  return toView(execution);
}
