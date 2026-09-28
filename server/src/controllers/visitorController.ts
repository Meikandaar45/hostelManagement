import type { Request, Response, NextFunction } from 'express';
import {
  createVisitorSchema,
  listVisitorsQuerySchema,
} from '../validators/visitor.validator.js';
import * as visitorService from '../services/visitorService.js';
import { getPositiveIntParam } from '../utils/http.js';

function getIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

export async function listVisitors(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listVisitorsQuerySchema.parse(req.query);
    const result = await visitorService.listVisitors(query, req.user!);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function recordVisitor(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createVisitorSchema.parse(req.body);
    const visitor = await visitorService.recordVisitorEntry(data, req.user!.id, getIp(req));
    res.status(201).json({ success: true, data: { visitor } });
  } catch (err) {
    next(err);
  }
}

export async function exitVisitor(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    await visitorService.recordVisitorExit(id, req.user!.id, getIp(req));
    res.json({ success: true, message: 'Visitor exit recorded successfully' });
  } catch (err) {
    next(err);
  }
}
