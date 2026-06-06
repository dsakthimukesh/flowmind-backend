-- FlowMind AI — Execution Logs Migration

CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

CREATE TABLE "execution_logs" (
    "id"          UUID       NOT NULL DEFAULT gen_random_uuid(),
    "executionId" UUID       NOT NULL,
    "nodeId"      TEXT,
    "level"       "LogLevel" NOT NULL DEFAULT 'INFO',
    "message"     TEXT       NOT NULL,
    "metadata"    JSONB,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "execution_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "execution_logs_executionId_idx"       ON "execution_logs"("executionId");
CREATE INDEX "execution_logs_executionId_level_idx" ON "execution_logs"("executionId", "level");

ALTER TABLE "execution_logs"
    ADD CONSTRAINT "execution_logs_executionId_fkey"
    FOREIGN KEY ("executionId") REFERENCES "workflow_executions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
