-- FlowMind AI — Workflow Domain Migration

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- ─── Workflows ───────────────────────────────────────────────────────────────

CREATE TABLE "workflows" (
    "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID         NOT NULL,
    "name"           TEXT         NOT NULL,
    "description"    TEXT,
    "status"         "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    "deletedAt"      TIMESTAMP(3),

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workflows_organizationId_idx"        ON "workflows"("organizationId");
CREATE INDEX "workflows_organizationId_status_idx" ON "workflows"("organizationId", "status");

ALTER TABLE "workflows"
    ADD CONSTRAINT "workflows_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Workflow Versions ────────────────────────────────────────────────────────

CREATE TABLE "workflow_versions" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "workflowId"  UUID         NOT NULL,
    "version"     INTEGER      NOT NULL,
    "definition"  JSONB        NOT NULL,
    "isPublished" BOOLEAN      NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workflow_versions_workflowId_version_key"
    ON "workflow_versions"("workflowId", "version");
CREATE INDEX "workflow_versions_workflowId_idx"
    ON "workflow_versions"("workflowId");

ALTER TABLE "workflow_versions"
    ADD CONSTRAINT "workflow_versions_workflowId_fkey"
    FOREIGN KEY ("workflowId") REFERENCES "workflows"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Workflow Executions ──────────────────────────────────────────────────────

CREATE TABLE "workflow_executions" (
    "id"                UUID             NOT NULL DEFAULT gen_random_uuid(),
    "workflowId"        UUID             NOT NULL,
    "workflowVersionId" UUID             NOT NULL,
    "status"            "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt"         TIMESTAMP(3),
    "completedAt"       TIMESTAMP(3),
    "error"             TEXT,
    "createdAt"         TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "workflow_executions_workflowId_idx"
    ON "workflow_executions"("workflowId");
CREATE INDEX "workflow_executions_workflowVersionId_idx"
    ON "workflow_executions"("workflowVersionId");
CREATE INDEX "workflow_executions_status_idx"
    ON "workflow_executions"("status");

ALTER TABLE "workflow_executions"
    ADD CONSTRAINT "workflow_executions_workflowId_fkey"
    FOREIGN KEY ("workflowId") REFERENCES "workflows"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_executions"
    ADD CONSTRAINT "workflow_executions_workflowVersionId_fkey"
    FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_versions"("id")
    ON UPDATE CASCADE;
