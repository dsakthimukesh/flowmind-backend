import { AppError, NotFoundError } from '../../common/errors/index.js';
import { findWorkflowByIdAndOrg } from '../workflows/workflow.repository.js';
import {
  createSchedule,
  findSchedulesByWorkflow,
  findScheduleByIdAndOrg,
  deleteSchedule,
} from './schedule.repository.js';
import { workflowQueue } from '../../queues/index.js';

/** BullMQ job name used for scheduled workflow executions. */
const SCHEDULED_JOB_NAME = 'scheduled-workflow';

function repeatKey(scheduleId: string): string {
  return `schedule:${scheduleId}`;
}

export async function createWorkflowSchedule(
  workflowId: string,
  organizationId: string,
  cronExpression: string,
  timezone: string,
  createdBy: string,
) {
  const workflow = await findWorkflowByIdAndOrg(workflowId, organizationId);
  if (!workflow) throw new NotFoundError('Workflow');
  if (workflow.status !== 'ACTIVE') {
    throw new AppError('Only ACTIVE workflows can be scheduled', 400, 'WORKFLOW_NOT_ACTIVE');
  }

  const schedule = await createSchedule({
    workflowId, organizationId, cronExpression, timezone, createdBy,
  });

  // Register BullMQ repeatable job
  await workflowQueue.add(
    SCHEDULED_JOB_NAME,
    { workflowId, organizationId, triggeredBy: 'scheduler', scheduleId: schedule.id },
    {
      repeat: { pattern: cronExpression, tz: timezone },
      jobId: repeatKey(schedule.id),
    },
  );

  return schedule;
}

export async function listWorkflowSchedules(workflowId: string, organizationId: string) {
  return findSchedulesByWorkflow(workflowId, organizationId);
}

export async function removeWorkflowSchedule(
  scheduleId: string,
  workflowId: string,
  organizationId: string,
): Promise<void> {
  const schedule = await findScheduleByIdAndOrg(scheduleId, organizationId);
  if (!schedule || schedule.workflowId !== workflowId) throw new NotFoundError('Schedule');

  // Remove BullMQ repeatable job
  await workflowQueue.removeRepeatable(SCHEDULED_JOB_NAME, {
    pattern: schedule.cronExpression,
    tz: schedule.timezone,
  });

  await deleteSchedule(scheduleId, organizationId);
}
