/**
 * src/modules/workflows/workflow.service.ts
 * Business logic for the workflow domain.
 */

import { NotFoundError, AppError } from '../../common/errors/index.js';
import {
  findWorkflowsByOrg,
  findWorkflowByIdAndOrg,
  createWorkflow,
  findVersionsByWorkflow,
  findVersionById,
  findPublishedVersion,
  createVersion,
  publishVersion,
} from './workflow.repository.js';
import type { CreateWorkflowInput, CreateVersionInput } from './workflow.validation.js';

// ─── View type — safe to return from API ─────────────────────────────────────

export interface WorkflowView {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

function toView(w: {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): WorkflowView {
  return {
    id: w.id,
    organizationId: w.organizationId,
    name: w.name,
    description: w.description,
    status: w.status,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  };
}

// ─── Service methods ──────────────────────────────────────────────────────────

export async function createNewWorkflow(
  dto: CreateWorkflowInput,
  organizationId: string,
): Promise<WorkflowView> {
  const workflow = await createWorkflow({
    organizationId,
    name: dto.name,
    description: dto.description,
  });
  return toView(workflow);
}

export async function listWorkflows(organizationId: string): Promise<WorkflowView[]> {
  const workflows = await findWorkflowsByOrg(organizationId);
  return workflows.map(toView);
}

export async function getWorkflow(
  id: string,
  organizationId: string,
): Promise<WorkflowView> {
  const workflow = await findWorkflowByIdAndOrg(id, organizationId);
  if (!workflow) throw new NotFoundError('Workflow');
  return toView(workflow);
}

// ─── Version view type ────────────────────────────────────────────────────────

export interface WorkflowVersionView {
  id: string;
  workflowId: string;
  version: number;
  definition: unknown;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
}

function toVersionView(v: {
  id: string;
  workflowId: string;
  version: number;
  definition: unknown;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
}): WorkflowVersionView {
  return {
    id: v.id,
    workflowId: v.workflowId,
    version: v.version,
    definition: v.definition,
    isPublished: v.isPublished,
    publishedAt: v.publishedAt,
    createdAt: v.createdAt,
  };
}

// ─── Version service methods ──────────────────────────────────────────────────

/** Ensure the workflow exists and belongs to the org before touching versions. */
async function assertWorkflowOwnership(
  workflowId: string,
  organizationId: string,
): Promise<void> {
  const workflow = await findWorkflowByIdAndOrg(workflowId, organizationId);
  if (!workflow) throw new NotFoundError('Workflow');
}

export async function createWorkflowVersion(
  workflowId: string,
  organizationId: string,
  dto: CreateVersionInput,
): Promise<WorkflowVersionView> {
  await assertWorkflowOwnership(workflowId, organizationId);

  const version = await createVersion({
    workflowId,
    definition: dto.definition,
  });

  return toVersionView(version);
}

export async function listWorkflowVersions(
  workflowId: string,
  organizationId: string,
): Promise<WorkflowVersionView[]> {
  await assertWorkflowOwnership(workflowId, organizationId);

  const versions = await findVersionsByWorkflow(workflowId);
  return versions.map(toVersionView);
}

export async function getWorkflowVersion(
  workflowId: string,
  versionId: string,
  organizationId: string,
): Promise<WorkflowVersionView> {
  await assertWorkflowOwnership(workflowId, organizationId);

  const version = await findVersionById(versionId, workflowId);
  if (!version) throw new NotFoundError('WorkflowVersion');

  return toVersionView(version);
}

export async function publishWorkflowVersion(
  workflowId: string,
  versionId: string,
  organizationId: string,
): Promise<WorkflowVersionView> {
  await assertWorkflowOwnership(workflowId, organizationId);

  // Confirm the version belongs to this workflow
  const version = await findVersionById(versionId, workflowId);
  if (!version) throw new NotFoundError('WorkflowVersion');

  const published = await publishVersion(versionId, workflowId);
  return toVersionView(published);
}
