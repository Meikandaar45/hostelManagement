import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as notificationService from '../services/notificationService.js';
import { getPositiveIntParam } from '../utils/http.js';

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  unreadOnly: z.enum(['true', 'false']).optional(),
});

export async function listNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listQuerySchema.parse(req.query);
    const result = await notificationService.listUserNotifications(req.user!.id, {
      page: query.page,
      limit: query.limit,
      unreadOnly: query.unreadOnly === 'true',
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    await notificationService.markNotificationRead(id, req.user!.id);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction) {
  try {
    await notificationService.markAllNotificationsRead(req.user!.id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await notificationService.getUnreadNotificationCount(req.user!.id);
    res.json({ success: true, data: { unreadCount: count } });
  } catch (err) {
    next(err);
  }
}
