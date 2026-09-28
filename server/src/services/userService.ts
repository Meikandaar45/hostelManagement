import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../db/pool.js';
import { hashPassword } from '../utils/password.js';
import { createAuditLog } from './auditService.js';
import type { AuthUser } from '../types/index.js';
import type {
  CreateUserInput,
  UpdateUserInput,
  ListUsersQuery,
} from '../validators/user.validator.js';

export interface UserRow extends AuthUser {
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export async function listUsers(query: ListUsersQuery) {
  const conditions: string[] = [];
  const params: any[] = [];

  if (query.search) {
    conditions.push('(username LIKE ? OR email LIKE ? OR full_name LIKE ?)');
    const like = `%${query.search}%`;
    params.push(like, like, like);
  }
  if (query.role) {
    conditions.push('role = ?');
    params.push(query.role);
  }
  if (query.is_active !== undefined) {
    conditions.push('is_active = ?');
    params.push(query.is_active === 'true' ? 1 : 0);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM users ${where}`,
    params
  );
  const total = (countRows[0] as { total: number }).total;

  const offset = (query.page - 1) * query.limit;

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, username, email, full_name, role, is_active, created_at, updated_at, last_login_at
     FROM users ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, query.limit, offset]
  );

  return {
    items: rows as UserRow[],
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function getUserById(id: number): Promise<UserRow | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, username, email, full_name, role, is_active, created_at, updated_at, last_login_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return (rows[0] as UserRow) ?? null;
}

export async function createUser(
  data: CreateUserInput,
  actorId: number,
  ipAddress?: string
): Promise<UserRow> {
  const password_hash = await hashPassword(data.password);

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO users (username, email, password, full_name, role, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [data.username, data.email, password_hash, data.full_name, data.role]
  );

  const userId = result.insertId;

  await createAuditLog({
    actorUserId: actorId,
    action: 'USER_CREATED',
    entityType: 'user',
    entityId: userId,
    details: { username: data.username, email: data.email, role: data.role },
    ipAddress,
  });

  return getUserById(userId) as Promise<UserRow>;
}

export async function updateUser(
  id: number,
  data: UpdateUserInput,
  actorId: number,
  ipAddress?: string
): Promise<UserRow> {
  // Safety check for last active admin
  if (data.role && data.role !== 'ADMIN') {
    await assertNotLastActiveAdmin(id);
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (data.full_name !== undefined) { fields.push('full_name = ?'); values.push(data.full_name); }
  if (data.username !== undefined)  { fields.push('username = ?');  values.push(data.username); }
  if (data.email !== undefined)     { fields.push('email = ?');     values.push(data.email); }
  if (data.role !== undefined)      { fields.push('role = ?');      values.push(data.role); }

  if (fields.length === 0) throw Object.assign(new Error('No fields to update'), { statusCode: 400 });

  values.push(id);
  await pool.execute(`UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, values);

  await createAuditLog({
    actorUserId: actorId,
    action: 'USER_UPDATED',
    entityType: 'user',
    entityId: id,
    details: data as Record<string, unknown>,
    ipAddress,
  });

  return getUserById(id) as Promise<UserRow>;
}

export async function setUserStatus(
  id: number,
  is_active: boolean,
  actorId: number,
  ipAddress?: string
): Promise<UserRow> {
  if (!is_active) {
    await assertNotLastActiveAdmin(id);
  }

  await pool.execute('UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?', [
    is_active ? 1 : 0,
    id,
  ]);

  await createAuditLog({
    actorUserId: actorId,
    action: is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    entityType: 'user',
    entityId: id,
    ipAddress,
  });

  return getUserById(id) as Promise<UserRow>;
}

async function assertNotLastActiveAdmin(userId: number): Promise<void> {
  // Check if this user is an ADMIN
  const [userRows] = await pool.execute<RowDataPacket[]>(
    'SELECT role, is_active FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  const user = userRows[0] as { role: string; is_active: number } | undefined;
  if (!user || user.role !== 'ADMIN' || !user.is_active) return; // not an active admin, safe

  // Count remaining active admins
  const [countRows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS cnt FROM users WHERE role = ? AND is_active = 1',
    ['ADMIN']
  );
  const count = (countRows[0] as { cnt: number }).cnt;

  if (count <= 1) {
    throw Object.assign(
      new Error('Cannot remove or deactivate the last active administrator'),
      { statusCode: 422 }
    );
  }
}
