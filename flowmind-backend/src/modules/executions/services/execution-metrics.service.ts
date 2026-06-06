/**
 * src/modules/executions/services/execution-metrics.service.ts
 * Lightweight query-time metrics. No external tools required.
 */

import { prisma } from '../../../prisma/prisma.js';

export interface ExecutionMetrics {
  total: number;
  pending: number;
  running: number;
  success: number;
  failed: number;
  successRate: number;       // 0–100 percentage
  avgDurationMs: number | null;
}

export async function getExecutionMetrics(
  organizationId: string,
): Promise<ExecutionMetrics> {
  // Single aggregate query — GROUP BY status
  const counts = await prisma.workflowExecution.groupBy({
    by: ['status'],
    where: { workflow: { organizationId, deletedAt: null } },
    _count: { id: true },
  });

  const map: Record<string, number> = {};
  for (const row of counts) {
    map[row.status] = row._count.id;
  }

  const success = map['SUCCESS'] ?? 0;
  const failed  = map['FAILED']  ?? 0;
  const pending = map['PENDING'] ?? 0;
  const running = map['RUNNING'] ?? 0;
  const total   = success + failed + pending + running;
  const completed = success + failed;

  // Average duration — only for completed executions that have both timestamps
  const durationResult = await prisma.$queryRaw<[{ avg_ms: bigint | null }]>`
    SELECT AVG(
      EXTRACT(EPOCH FROM ("completedAt" - "startedAt")) * 1000
    )::BIGINT AS avg_ms
    FROM "workflow_executions" we
    JOIN "workflows" w ON w."id" = we."workflowId"
    WHERE w."organizationId" = ${organizationId}::uuid
      AND we."startedAt"     IS NOT NULL
      AND we."completedAt"   IS NOT NULL
      AND w."deletedAt"      IS NULL
  `;

  const avgMs = durationResult[0]?.avg_ms;

  return {
    total,
    pending,
    running,
    success,
    failed,
    successRate: completed > 0 ? Math.round((success / completed) * 100) : 0,
    avgDurationMs: avgMs != null ? Number(avgMs) : null,
  };
}
