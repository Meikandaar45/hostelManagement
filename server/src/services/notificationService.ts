import { pool } from '../db/pool.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { Notification, PaginatedResult } from '../types/index.js';

export interface ResetNotificationPayload {
  userId: number;
  rawToken: string;
}

/**
 * Notification abstraction for password reset.
 */
export async function sendPasswordResetNotification(
  payload: ResetNotificationPayload
): Promise<void> {
  const resetUrl = `${env.CLIENT_URL}/reset-password/${payload.rawToken}`;

  if (env.NODE_ENV !== 'production') {
    logger.info('🔑 [DEV] Password reset URL (do not expose to users in production)', {
      userId: payload.userId,
      resetUrl,
    });
  } else {
    logger.warn('Email provider not configured — password reset notification not sent', {
      userId: payload.userId,
    });
  }
}

// ==========================================
// In-App Notification Service (Phase 3)
// ==========================================

export interface CreateNotificationParams {
  userId: number;
  type: string;
  title: string;
  message: string;
  referenceType?: string | null;
  referenceId?: number | null;
  connection?: any;
}

/**
 * Create a single in-app notification for a user.
 * Supports optional transaction connection.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const db = params.connection || pool;
  await db.query(
    `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id, is_read)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      params.userId,
      params.type,
      params.title,
      params.message,
      params.referenceType ?? null,
      params.referenceId ?? null,
    ]
  );
}

/**
 * Create multiple notifications (e.g. notify all admins/wardens).
 */
export async function notifyUsersByRoles(
  roles: string[],
  notification: Omit<CreateNotificationParams, 'userId'>,
  connection?: any
): Promise<void> {
  const db = connection || pool;
  const [users]: any = await db.query(
    `SELECT id FROM users WHERE role IN (?) AND is_active = 1`,
    [roles]
  );
  for (const u of users) {
    await createNotification({ ...notification, userId: u.id, connection: db });
  }
}

/**
 * List paginated notifications for a user.
 */
export async function listUserNotifications(
  userId: number,
  opts: { page?: number; limit?: number; unreadOnly?: boolean } = {}
): Promise<PaginatedResult<Notification>> {
  const page = Math.max(1, opts.page || 1);
  const limit = Math.min(100, Math.max(1, opts.limit || 20));
  const offset = (page - 1) * limit;

  const conditions = ['user_id = ?'];
  const params: any[] = [userId];

  if (opts.unreadOnly) {
    conditions.push('is_read = 0');
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, user_id, type, title, message, reference_type, reference_id,
            is_read = 1 as is_read, created_at
     FROM notifications
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows as Notification[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(notificationId: number, userId: number): Promise<void> {
  await pool.query(
    `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllNotificationsRead(userId: number): Promise<void> {
  await pool.query(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [userId]);
}

/**
 * Get count of unread notifications for a user.
 */
export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
  return Number(rows[0]?.unread_count || 0);
}
