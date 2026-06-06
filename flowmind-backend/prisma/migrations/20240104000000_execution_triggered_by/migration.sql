-- Add triggeredBy, rename error to errorMessage, add composite index
-- Uses IF NOT EXISTS / DO blocks to be idempotent — safe to re-run after partial failure

-- Rename error → errorMessage (only if error column still exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workflow_executions' AND column_name = 'error'
  ) THEN
    ALTER TABLE "workflow_executions" RENAME COLUMN "error" TO "errorMessage";
  END IF;
END $$;

-- Add triggeredBy (only if it doesn't already exist)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workflow_executions' AND column_name = 'triggeredBy'
  ) THEN
    ALTER TABLE "workflow_executions" ADD COLUMN "triggeredBy" TEXT NOT NULL DEFAULT '';
    ALTER TABLE "workflow_executions" ALTER COLUMN "triggeredBy" DROP DEFAULT;
  END IF;
END $$;

-- Add composite index (idempotent with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "workflow_executions_workflowId_status_idx"
    ON "workflow_executions"("workflowId", "status");
