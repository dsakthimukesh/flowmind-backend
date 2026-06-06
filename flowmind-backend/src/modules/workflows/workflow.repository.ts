/**
 * src/modules/workflows/workflow.repository.ts
 * All Prisma queries for the workflow domain. Organization-scoped on every query.
 */

import { prisma } from '../../prisma/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { WorkflowModel, WorkflowVersionModel } from '../../generated/prisma/models.js';
import type { WorkflowStatus } from '../../generated/prisma/enums.js';

type Workflow = WorkflowModel;
type WorkflowVersion = WorkflowVersionModel;

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * List all non-deleted workflows for an organization.
 * Returns newest first.
 */
export async function findWorkflowsByOrg(organizationId: string): Promise<Workflow[]> {
  return prisma.workflow.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Find a single workflow by ID, scoped to organization.
 * Returns null if not found OR if it belongs to a different org.
 * This is the multi-tenancy guard — never query by ID alone.
 */
export async function findWorkflowByIdAndOrg(
  id: string,
  organizationId: string,
): Promise<Workflow | null> {
  return prisma.workflow.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
}

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateWorkflowInput {
  organizationId: string;
  name: string;
  description?: string;
}

export async function createWorkflow(input: CreateWorkflowInput): Promise<Workflow> {
  return prisma.workflow.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      description: input.description ?? null,
    },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateWorkflowStatus(
  id: string,
  organizationId: string,
  status: WorkflowStatus,
): Promise<Workflow | null> {
  // findFirst verifies org ownership before we attempt the update
  const exists = await findWorkflowByIdAndOrg(id, organizationId);
  if (!exists) return null;

  return prisma.workflow.update({
    where: { id },
    data: { status },
  });
}

// ─── Version Queries ──────────────────────────────────────────────────────────

/** All versions for a workflow, newest first. */
export async function findVersionsByWorkflow(
  workflowId: string,
): Promise<WorkflowVersion[]> {
  return prisma.workflowVersion.findMany({
    where: { workflowId },
    orderBy: { version: 'desc' },
  });
}

/** Single version by its UUID. */
export async function findVersionById(
  versionId: string,
  workflowId: string,
): Promise<WorkflowVersion | null> {
  return prisma.workflowVersion.findFirst({
    where: { id: versionId, workflowId },
  });
}

/** The currently published version for a workflow, or null. */
export async function findPublishedVersion(
  workflowId: string,
): Promise<WorkflowVersion | null> {
  return prisma.workflowVersion.findFirst({
    where: { workflowId, isPublished: true },
  });
}

/** Highest version number for a workflow. Returns 0 if no versions exist. */
export async function getLatestVersionNumber(workflowId: string): Promise<number> {
  const latest = await prisma.workflowVersion.findFirst({
    where: { workflowId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  return latest?.version ?? 0;
}

// ─── Version Create ───────────────────────────────────────────────────────────

export interface CreateVersionInput {
  workflowId: string;
  definition: Record<string, unknown>;
}

export async function createVersion(input: CreateVersionInput): Promise<WorkflowVersion> {
  const nextVersion = (await getLatestVersionNumber(input.workflowId)) + 1;

  return prisma.workflowVersion.create({
    data: {
      workflowId: input.workflowId,
      version: nextVersion,
      definition: input.definition as Prisma.InputJsonValue,
    },
  });
}

// ─── Publish ──────────────────────────────────────────────────────────────────

/**
 * Atomically:
 *   1. Unpublish all other versions of this workflow
 *   2. Publish the target version (set isPublished + publishedAt)
 *   3. Set the workflow status to ACTIVE
 *
 * Uses an interactive transaction so the three writes are all-or-nothing.
 */
export async function publishVersion(
  versionId: string,
  workflowId: string,
): Promise<WorkflowVersion> {
  return prisma.$transaction(async (tx) => {
    // Unpublish every currently published version
    await tx.workflowVersion.updateMany({
      where: { workflowId, isPublished: true },
      data: { isPublished: false, publishedAt: null },
    });

    // Publish the target version
    const published = await tx.workflowVersion.update({
      where: { id: versionId },
      data: { isPublished: true, publishedAt: new Date() },
    });

    // Promote the workflow to ACTIVE
    await tx.workflow.update({
      where: { id: workflowId },
      data: { status: 'ACTIVE' },
    });

    return published;
  });
}
