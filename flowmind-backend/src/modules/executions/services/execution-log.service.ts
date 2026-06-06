/**
 * src/modules/executions/services/execution-log.service.ts
 *
 * Append-only structured logging for workflow executions.
 *
 * KEY DESIGN: logging failures NEVER throw. Every public method swallows
 * errors and logs to the system logger instead. A logging failure must
 * never fail the workflow execution itself.
 */

import { prisma } from '../../../prisma/prisma.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { emitToExecution } from '../../../sockets/index.js';
import { createLogger } from '../../../common/logger.js';

const log = createLogger('execution-log-service');

// ─── Types ────────────────────────────────────────────────────────────────────

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogEntryInput {
  executionId: string;
  organizationId: string;   // needed for socket room emit
  nodeId?: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionLogView {
  id: string;
  executionId: string;
  nodeId: string | null;
  level: string;
  message: string;
  metadata: unknown;
  createdAt: Date;
}

// ─── Internal write ───────────────────────────────────────────────────────────

async function writeLog(input: LogEntryInput): Promise<void> {
  try {
    const entry = await prisma.executionLog.create({
      data: {
        executionId: input.executionId,
        nodeId: input.nodeId ?? null,
        level: input.level,
        message: input.message,
        // Prisma v7 requires JsonNull sentinel for nullable JSON fields
        metadata: input.metadata !== undefined
          ? (input.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    // Emit log update over socket so active dashboard can stream it
    emitToExecution(
      input.executionId,
      input.organizationId,
      'execution.log' as any,
      {
        id: entry.id,
        executionId: entry.executionId,
        nodeId: entry.nodeId,
        level: entry.level,
        message: entry.message,
        metadata: entry.metadata,
        createdAt: entry.createdAt.toISOString(),
      },
    );
  } catch (err) {
    // Swallow — a logging failure must never propagate to the caller
    log.error({ err, executionId: input.executionId }, 'Failed to write execution log');
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function logInfo(
  executionId: string,
  organizationId: string,
  message: string,
  metadata?: Record<string, unknown>,
  nodeId?: string,
): Promise<void> {
  return writeLog({ executionId, organizationId, nodeId, level: 'INFO', message, metadata });
}

export async function logWarn(
  executionId: string,
  organizationId: string,
  message: string,
  metadata?: Record<string, unknown>,
  nodeId?: string,
): Promise<void> {
  return writeLog({ executionId, organizationId, nodeId, level: 'WARN', message, metadata });
}

export async function logError(
  executionId: string,
  organizationId: string,
  message: string,
  metadata?: Record<string, unknown>,
  nodeId?: string,
): Promise<void> {
  return writeLog({ executionId, organizationId, nodeId, level: 'ERROR', message, metadata });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getExecutionLogs(
  executionId: string,
  page = 1,
  pageSize = 50,
): Promise<{ logs: ExecutionLogView[]; total: number; page: number; pageSize: number }> {
  const skip = (page - 1) * pageSize;

  const [logs, total] = await Promise.all([
    prisma.executionLog.findMany({
      where: { executionId },
      orderBy: { createdAt: 'asc' },
      skip,
      take: pageSize,
    }),
    prisma.executionLog.count({ where: { executionId } }),
  ]);

  return {
    logs: logs.map((l) => ({
      id: l.id,
      executionId: l.executionId,
      nodeId: l.nodeId,
      level: l.level,
      message: l.message,
      metadata: l.metadata,
      createdAt: l.createdAt,
    })),
    total,
    page,
    pageSize,
  };
}
