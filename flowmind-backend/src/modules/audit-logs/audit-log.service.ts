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

  // Fetch related users to populate the actor details
  const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, firstName: true, lastName: true },
      })
    : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  const logsWithActor = logs.map((l) => {
    const user = l.userId ? userMap.get(l.userId) : null;
    return {
      id: l.id,
      timestamp: l.createdAt.toISOString(),
      action: l.action,
      resourceType: l.resourceType || "",
      resourceId: l.resourceId || "",
      actor: user
        ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          }
        : {
            id: "system",
            email: "system@flowmind.ai",
            firstName: "System",
            lastName: "Process",
          },
      metadata: (l.metadata as any) || {},
    };
  });

  return { logs: logsWithActor, total, page, pageSize };
}
