import type { Request, Response } from 'express';
import { getRequestUser } from '../../common/utils/request-user.js';
import { successResponse } from '../../common/utils/api-response.js';
import { getAuditLogs } from './audit-log.service.js';

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const { organizationId } = getRequestUser(req);
  const page     = Math.max(1, parseInt(String(req.query['page']     ?? '1'),  10));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query['pageSize'] ?? '50'), 10)));
  const result = await getAuditLogs(organizationId, page, pageSize);
  res.status(200).json(successResponse('Audit logs fetched', result));
}
