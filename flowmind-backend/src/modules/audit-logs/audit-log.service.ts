import { prisma } from '../../prisma/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuditAction } from '../../generated/prisma/enums.js';
import { createLogger } from '../../common/logger.js';

const log = createLogger('audit-log');

export interface AuditEventInput {
  organizationId: string;
  userId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/** Fire-and-forget — never throws, never awaited in critical paths. */
export function logAuditEvent(input: AuditEventInput): void {
  prisma.auditLog
    .create({
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
    })
    .catch((err) => log.error({ err }, 'Failed to write audit log'));
}

export async function getAuditLogs(
  organizationId: string,
  page = 1,
  pageSize = 50,
) {
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
