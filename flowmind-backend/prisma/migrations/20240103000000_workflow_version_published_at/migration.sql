-- Add publishedAt to workflow_versions and index on (workflowId, isPublished)

ALTER TABLE "workflow_versions"
    ADD COLUMN "publishedAt" TIMESTAMP(3);

CREATE INDEX "workflow_versions_workflowId_isPublished_idx"
    ON "workflow_versions"("workflowId", "isPublished");
