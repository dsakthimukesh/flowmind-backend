-- FlowMind AI — Initial Auth Migration
-- Creates all tables required for the authentication foundation.
-- Run via: pnpm prisma:migrate (requires live DB connection)

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
CREATE TYPE "PlanType" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- ─── Users ───────────────────────────────────────────────────────────────────

CREATE TABLE "users" (
    "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
    "email"     TEXT NOT NULL,
    "password"  TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName"  TEXT NOT NULL,
    "status"    "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_email_idx" ON "users"("email");

-- ─── Sessions ────────────────────────────────────────────────────────────────

CREATE TABLE "sessions" (
    "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId"       UUID NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "userAgent"    TEXT,
    "ipAddress"    TEXT,
    "expiresAt"    TIMESTAMP(3) NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions"("refreshToken");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "sessions_refreshToken_idx" ON "sessions"("refreshToken");

ALTER TABLE "sessions"
    ADD CONSTRAINT "sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Organizations ───────────────────────────────────────────────────────────

CREATE TABLE "organizations" (
    "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
    "name"      TEXT NOT NULL,
    "slug"      TEXT NOT NULL,
    "plan"      "PlanType" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");

-- ─── Organization Members ────────────────────────────────────────────────────

CREATE TABLE "organization_members" (
    "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId"         UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "role"           "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_members_userId_organizationId_key"
    ON "organization_members"("userId", "organizationId");
CREATE INDEX "organization_members_userId_idx"
    ON "organization_members"("userId");
CREATE INDEX "organization_members_organizationId_idx"
    ON "organization_members"("organizationId");

ALTER TABLE "organization_members"
    ADD CONSTRAINT "organization_members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_members"
    ADD CONSTRAINT "organization_members_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
