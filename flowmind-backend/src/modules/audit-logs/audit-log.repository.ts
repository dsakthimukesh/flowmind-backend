/**
 * src/modules/audit-logs/audit-log.repository.ts
 * Data access layer for audit logs.
 */

import { prisma } from '../../prisma/prisma.js';
import type { AuditLogModel } from '../../generated/prisma/models.js';
import type { AuditAction } from '../../generated/prisma/enums.js';
import { Prisma } from '../../generated/prisma/client.js';

type AuditLog = AuditLogModel;

export interface CreateAuditLogInput {
  organizationId: string;
  userId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
  return prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId ?? null,
      action: input.action,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata
        ? (input.metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

export interface FindAuditLogsOptions {
  organizationId: string;
  page: number;
  pageSize: number;
}

export interface PaginatedAuditLogs {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export async function findAuditLogs(
  options: FindAuditLogsOptions,
): Promise<PaginatedAuditLogs> {
  const { organizationId, page, pageSize } = options;
  const skip = (page - 1) * pageSize;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where: { organizationId } }),
  ]);

  return { logs, total, page, pageSize };
}
