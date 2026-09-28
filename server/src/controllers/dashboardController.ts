import type { Request, Response, NextFunction } from 'express';
import { getDashboardSummary } from '../services/dashboardService.js';

export async function summary(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const data = await getDashboardSummary(req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
