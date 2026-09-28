import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../db/pool.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateRawToken, hashToken } from '../utils/token.js';
import { createAuditLog } from './auditService.js';
import type { AuthUser } from '../types/index.js';
import type { SetupInput, LoginInput } from '../validators/auth.validator.js';

/** Returns true if at least one user exists in the database. */
export async function hasAnyUser(): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS cnt FROM users LIMIT 1'
  );
  return (rows[0] as { cnt: number }).cnt > 0;
}

/** Create the first administrator during /setup. */
export async function createFirstAdmin(
  data: SetupInput,
  ipAddress?: string
): Promise<AuthUser> {
  if (await hasAnyUser()) {
    throw Object.assign(new Error('Setup already completed'), { statusCode: 409 });
  }

  const password = await hashPassword(data.password);

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO users (username, email, password, full_name, role, is_active)
     VALUES (?, ?, ?, ?, 'ADMIN', 1)`,
    [data.username, data.email, password, data.full_name]
  );

  const userId = result.insertId;

  await createAuditLog({
    actorUserId: null,
    action: 'SYSTEM_SETUP',
    entityType: 'user',
    entityId: userId,
    details: { username: data.username, email: data.email, role: 'ADMIN' },
    ipAddress,
  });

  return findUserById(userId) as Promise<AuthUser>;
}

/** Authenticate a user by username-or-email + password. */
export async function authenticateUser(
  data: LoginInput,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthUser> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, username, email, password, full_name, role, is_active
     FROM users
     WHERE (username = ? OR email = ?)
     LIMIT 1`,
    [data.identifier, data.identifier]
  );

  const row = rows[0] as (AuthUser & { password: string }) | undefined;

  // Always run verifyPassword to prevent timing attacks
  const dummyHash = '$2a$12$Izmrq7y0CFu5r5a.wQmoq.fY2p9zGaL.xwhvu9Rsa8N4M7qCUFtLm';
  const valid = row
    ? await verifyPassword(data.password, row.password)
    : await verifyPassword(data.password, dummyHash).then(() => false);

  if (!row || !valid) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  if (!row.is_active) {
    throw Object.assign(new Error('Account is inactive'), { statusCode: 401 });
  }

  // Update last login
  await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [row.id]);

  await createAuditLog({
    actorUserId: row.id,
    action: 'LOGIN',
    entityType: 'user',
    entityId: row.id,
    ipAddress,
    userAgent,
  });

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    is_active: row.is_active,
  } as AuthUser;
}

export async function findUserById(id: number): Promise<AuthUser | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, username, email, full_name, role, is_active, created_at, updated_at, last_login_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return (rows[0] as AuthUser) ?? null;
}

/** Initiate forgot-password flow. Returns raw token (for dev notification only). */
export async function createPasswordResetToken(
  identifier: string,
  ipAddress?: string
): Promise<{ rawToken: string; userId: number } | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id, email, full_name FROM users WHERE (username = ? OR email = ?) AND is_active = 1 LIMIT 1',
    [identifier, identifier]
  );

  if (!rows[0]) return null; // silently return null — do not expose user existence

  const user = rows[0] as { id: number; email: string; full_name: string };
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Invalidate previous tokens
  await pool.execute(
    'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
    [user.id]
  );

  await pool.execute(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [user.id, tokenHash, expiresAt]
  );

  await createAuditLog({
    actorUserId: user.id,
    action: 'PASSWORD_RESET_REQUESTED',
    entityType: 'user',
    entityId: user.id,
    ipAddress,
  });

  return { rawToken, userId: user.id };
}

/** Complete a password reset using a raw token. */
export async function resetPassword(
  rawToken: string,
  newPassword: string,
  ipAddress?: string
): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
     LIMIT 1`,
    [tokenHash, now]
  );

  if (!rows[0]) {
    throw Object.assign(new Error('Invalid or expired reset token'), { statusCode: 400 });
  }

  const { id: tokenId, user_id } = rows[0] as { id: number; user_id: number };
  const password = await hashPassword(newPassword);

  await pool.execute('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [
    password,
    user_id,
  ]);

  // Mark this token used
  await pool.execute('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [tokenId]);

  // Invalidate any remaining tokens for this user
  await pool.execute(
    'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
    [user_id]
  );

  await createAuditLog({
    actorUserId: user_id,
    action: 'PASSWORD_RESET_COMPLETED',
    entityType: 'user',
    entityId: user_id,
    ipAddress,
  });
}

/** Change password (authenticated user). */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
  ipAddress?: string
): Promise<void> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT password FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  const row = rows[0] as { password: string } | undefined;
  if (!row || !(await verifyPassword(currentPassword, row.password))) {
    throw Object.assign(new Error('Current password is incorrect'), { statusCode: 400 });
  }

  const password = await hashPassword(newPassword);
  await pool.execute('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [
    password,
    userId,
  ]);

  await createAuditLog({
    actorUserId: userId,
    action: 'PASSWORD_CHANGED',
    entityType: 'user',
    entityId: userId,
    ipAddress,
  });
}
