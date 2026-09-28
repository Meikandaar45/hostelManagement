import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../db/pool.js';

export interface AuditOptions {
  actorUserId?: number | null;
  action: string;
  entityType?: string;
  entityId?: number | null;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  connection?: any;
}

export async function createAuditLog(opts: AuditOptions): Promise<void> {
  const db = opts.connection || pool;
  await (db as any).execute(
    `INSERT INTO audit_logs
       (actor_user_id, action, entity_type, entity_id, details, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      opts.actorUserId ?? null,
      opts.action,
      opts.entityType ?? null,
      opts.entityId ?? null,
      opts.details ? JSON.stringify(opts.details) : null,
      opts.ipAddress ?? null,
      opts.userAgent ?? null,
    ]
  );
}

export interface AuditLogRow {
  id: number;
  actor_user_id: number | null;
  actor_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ListAuditOptions {
  page: number;
  limit: number;
  search?: string;
  userId?: number | string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
}

export async function listAuditLogs(opts: ListAuditOptions) {
  const conditions: string[] = [];
  const params: any[] = [];

  if (opts.userId) {
    conditions.push('al.actor_user_id = ?');
    params.push(opts.userId);
  }

  if (opts.action) {
    conditions.push('al.action = ?');
    params.push(opts.action);
  }
  if (opts.entityType) {
    conditions.push('al.entity_type = ?');
    params.push(opts.entityType);
  }
  if (opts.from) {
    conditions.push('al.created_at >= ?');
    params.push(opts.from);
  }
  if (opts.to) {
    conditions.push('al.created_at <= ?');
    params.push(opts.to);
  }
  if (opts.search) {
    conditions.push('(al.action LIKE ? OR u.username LIKE ? OR u.full_name LIKE ?)');
    const like = `%${opts.search}%`;
    params.push(like, like, like);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_user_id
     ${where}`,
    params
  );

  const total = (countRows[0] as { total: number }).total;
  const offset = (opts.page - 1) * opts.limit;

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT al.id, al.actor_user_id, u.full_name AS actor_name,
            al.action, al.entity_type, al.entity_id,
            al.details, al.ip_address, al.user_agent, al.created_at
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_user_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, opts.limit, offset]
  );

  return {
    items: rows as AuditLogRow[],
    total,
    page: opts.page,
    limit: opts.limit,
    totalPages: Math.ceil(total / opts.limit),
  };
}

export async function getDistinctActions(): Promise<string[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT DISTINCT action FROM audit_logs ORDER BY action'
  );
  return rows.map((r) => (r as { action: string }).action);
}
