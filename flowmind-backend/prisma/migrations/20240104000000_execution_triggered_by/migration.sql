-- Add triggeredBy, rename error to errorMessage, add composite index

ALTER TABLE "workflow_executions"
    ADD COLUMN "triggeredBy" TEXT NOT NULL DEFAULT '',
    RENAME COLUMN "error" TO "errorMessage";

-- Remove default after backfill (in prod, run a data migration first)
ALTER TABLE "workflow_executions"
    ALTER COLUMN "triggeredBy" DROP DEFAULT;

CREATE INDEX "workflow_executions_workflowId_status_idx"
    ON "workflow_executions"("workflowId", "status");
