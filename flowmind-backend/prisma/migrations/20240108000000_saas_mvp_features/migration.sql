-- FlowMind AI — SaaS MVP Features Migration

CREATE TYPE "AuditAction" AS ENUM (
  'USER_LOGIN','USER_REGISTER','USER_LOGOUT',
  'API_KEY_CREATED','API_KEY_REVOKED',
  'MEMBER_INVITED','MEMBER_REMOVED','MEMBER_ROLE_UPDATED',
  'WORKFLOW_CREATED','WORKFLOW_PUBLISHED','WORKFLOW_EXECUTED',
  'ORG_CREATED','ORG_UPDATED'
);

-- API Keys
CREATE TABLE "api_keys" (
  "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID         NOT NULL,
  "name"           TEXT         NOT NULL,
  "keyHash"        TEXT         NOT NULL,
  "keyPrefix"      TEXT         NOT NULL,
  "lastUsedAt"     TIMESTAMP(3),
  "expiresAt"      TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt"      TIMESTAMP(3),
  "createdBy"      UUID         NOT NULL,
  CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");
CREATE INDEX "api_keys_organizationId_idx" ON "api_keys"("organizationId");
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invitations
CREATE TABLE "invitations" (
  "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID         NOT NULL,
  "email"          TEXT         NOT NULL,
  "role"           "OrgRole"    NOT NULL DEFAULT 'MEMBER',
  "token"          TEXT         NOT NULL,
  "invitedBy"      UUID         NOT NULL,
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "acceptedAt"     TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");
CREATE INDEX "invitations_organizationId_idx" ON "invitations"("organizationId");
CREATE INDEX "invitations_token_idx" ON "invitations"("token");
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Audit Logs
CREATE TABLE "audit_logs" (
  "id"             UUID          NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID          NOT NULL,
  "userId"         UUID,
  "action"         "AuditAction" NOT NULL,
  "resourceType"   TEXT,
  "resourceId"     TEXT,
  "metadata"       JSONB,
  "ipAddress"      TEXT,
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_organizationId_idx"        ON "audit_logs"("organizationId");
CREATE INDEX "audit_logs_organizationId_action_idx" ON "audit_logs"("organizationId", "action");
CREATE INDEX "audit_logs_createdAt_idx"             ON "audit_logs"("createdAt");
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Workflow Schedules
CREATE TABLE "workflow_schedules" (
  "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
  "workflowId"     UUID         NOT NULL,
  "organizationId" UUID         NOT NULL,
  "cronExpression" TEXT         NOT NULL,
  "enabled"        BOOLEAN      NOT NULL DEFAULT true,
  "timezone"       TEXT         NOT NULL DEFAULT 'UTC',
  "createdBy"      UUID         NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workflow_schedules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "workflow_schedules_workflowId_idx"     ON "workflow_schedules"("workflowId");
CREATE INDEX "workflow_schedules_organizationId_idx" ON "workflow_schedules"("organizationId");
ALTER TABLE "workflow_schedules" ADD CONSTRAINT "workflow_schedules_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_schedules" ADD CONSTRAINT "workflow_schedules_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
