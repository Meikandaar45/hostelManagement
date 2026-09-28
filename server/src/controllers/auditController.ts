import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { listAuditLogs, getDistinctActions } from '../services/auditService.js';

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  user_id: z.coerce.number().int().positive().optional(),
  action: z.string().trim().max(80).optional(),
  entity_type: z.string().trim().max(80).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD date').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD date').optional(),
});

// GET /api/audit-logs
export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const query = querySchema.parse(req.query);
    const result = await listAuditLogs({
      page: query.page,
      limit: query.limit,
      search: query.search,
      userId: query.user_id,
      action: query.action,
      entityType: query.entity_type,
      from: query.from,
      to: query.to,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// GET /api/audit-logs/actions
export async function actions(_req: Request, res: Response, next: NextFunction) {
  try {
    const list = await getDistinctActions();
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
}
