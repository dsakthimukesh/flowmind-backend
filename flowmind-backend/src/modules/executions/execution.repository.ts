/**
 * src/modules/executions/execution.repository.ts
 * All Prisma queries for WorkflowExecution. Always org-scoped via workflow join.
 */

import { prisma } from '../../prisma/prisma.js';
import type { WorkflowExecutionModel } from '../../generated/prisma/models.js';
import type { ExecutionStatus } from '../../generated/prisma/enums.js';

type Execution = WorkflowExecutionModel;

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * List executions for an org. Joins through workflow to enforce org scope.
 * Returns newest first, capped at 50 for list views.
 */
export async function findExecutionsByOrg(
  organizationId: string,
  limit = 50,
): Promise<Execution[]> {
  return prisma.workflowExecution.findMany({
    where: { workflow: { organizationId, deletedAt: null } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Find a single execution by ID, enforcing org ownership through the
 * workflow relation. Returns null for cross-org access attempts.
 */
export async function findExecutionByIdAndOrg(
  id: string,
  organizationId: string,
): Promise<Execution | null> {
  return prisma.workflowExecution.findFirst({
    where: { id, workflow: { organizationId, deletedAt: null } },
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateExecutionInput {
  workflowId: string;
  workflowVersionId: string;
  triggeredBy: string; // userId
}

export async function createExecution(input: CreateExecutionInput): Promise<Execution> {
  return prisma.workflowExecution.create({
    data: {
      workflowId: input.workflowId,
      workflowVersionId: input.workflowVersionId,
      triggeredBy: input.triggeredBy,
      status: 'PENDING',
    },
  });
}

// ─── Status Updates ───────────────────────────────────────────────────────────

export async function markExecutionRunning(id: string): Promise<Execution> {
  return prisma.workflowExecution.update({
    where: { id },
    data: { status: 'RUNNING', startedAt: new Date() },
  });
}

export async function markExecutionSuccess(id: string): Promise<Execution> {
  return prisma.workflowExecution.update({
    where: { id },
    data: { status: 'SUCCESS', completedAt: new Date() },
  });
}

export async function markExecutionFailed(
  id: string,
  errorMessage: string,
): Promise<Execution> {
  return prisma.workflowExecution.update({
    where: { id },
    data: { status: 'FAILED', completedAt: new Date(), errorMessage },
  });
}
