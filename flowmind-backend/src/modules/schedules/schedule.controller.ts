import type { Request, Response } from 'express';
import { z } from 'zod';
import { getRequestUser } from '../../common/utils/request-user.js';
import { successResponse } from '../../common/utils/api-response.js';
import { ValidationError } from '../../common/errors/index.js';
import * as scheduleService from './schedule.service.js';

function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) throw new ValidationError('Validation failed',
    r.error.issues.map((i) => ({ field: i.path.map(String).join('.'), message: i.message })));
  return r.data;
}

const createSchema = z.object({
  cronExpression: z.string().min(9, 'Invalid cron expression').max(100),
  timezone: z.string().default('UTC'),
});

// POST /api/v1/workflows/:id/schedules
export async function createSchedule(req: Request, res: Response): Promise<void> {
  const { sub: userId, organizationId } = getRequestUser(req);
  const workflowId = String(req.params['id']);
  const { cronExpression, timezone } = parseBody(createSchema, req.body);
  const schedule = await scheduleService.createWorkflowSchedule(
    workflowId, organizationId, cronExpression, timezone, userId,
  );
  res.status(201).json(successResponse('Schedule created', { schedule }));
}

// GET /api/v1/workflows/:id/schedules
export async function listSchedules(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const workflowId = String(req.params['id']);
  const schedules = await scheduleService.listWorkflowSchedules(workflowId, organizationId);
  res.status(200).json(successResponse('Schedules fetched', { schedules }));
}

// DELETE /api/v1/workflows/:id/schedules/:scheduleId
export async function deleteSchedule(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const workflowId  = String(req.params['id']);
  const scheduleId  = String(req.params['scheduleId']);
  await scheduleService.removeWorkflowSchedule(scheduleId, workflowId, organizationId);
  res.status(200).json(successResponse('Schedule deleted', {}));
}
