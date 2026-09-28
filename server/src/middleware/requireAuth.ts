import type { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/token.js';
import { pool } from '../db/pool.js';
import type { RowDataPacket } from 'mysql2';
import type { AuthUser } from '../types/index.js';

/** Middleware: require a valid authenticated session. */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.cookies?.auth_token as string | undefined;

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const payload = verifyJwt(token);
  if (!payload) {
    res.status(401).json({ success: false, message: 'Invalid or expired session' });
    return;
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ? LIMIT 1',
      [payload.sub]
    );

    const user = rows[0] as AuthUser | undefined;

    if (!user || !user.is_active) {
      res.status(401).json({ success: false, message: 'Account not found or inactive' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
}
