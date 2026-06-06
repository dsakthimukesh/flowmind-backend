import { prisma } from '../../prisma/prisma.js';
import type { WorkflowScheduleModel } from '../../generated/prisma/models.js';

type Schedule = WorkflowScheduleModel;

export async function findSchedulesByWorkflow(
  workflowId: string,
  organizationId: string,
): Promise<Schedule[]> {
  return prisma.workflowSchedule.findMany({
    where: { workflowId, organizationId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findScheduleByIdAndOrg(
  id: string,
  organizationId: string,
): Promise<Schedule | null> {
  return prisma.workflowSchedule.findFirst({ where: { id, organizationId } });
}

export interface CreateScheduleInput {
  workflowId: string;
  organizationId: string;
  cronExpression: string;
  timezone: string;
  createdBy: string;
}

export async function createSchedule(input: CreateScheduleInput): Promise<Schedule> {
  return prisma.workflowSchedule.create({ data: input });
}

export async function deleteSchedule(
  id: string,
  organizationId: string,
): Promise<boolean> {
  const s = await findScheduleByIdAndOrg(id, organizationId);
  if (!s) return false;
  await prisma.workflowSchedule.delete({ where: { id } });
  return true;
}

export async function updateScheduleEnabled(
  id: string,
  organizationId: string,
  enabled: boolean,
): Promise<Schedule | null> {
  const s = await findScheduleByIdAndOrg(id, organizationId);
  if (!s) return null;
  return prisma.workflowSchedule.update({ where: { id }, data: { enabled } });
}
