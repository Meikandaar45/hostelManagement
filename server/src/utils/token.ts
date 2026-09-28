import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { JwtPayload } from '../types/index.js';
import type { Role } from '../config/permissions.js';

/** Generate a cryptographically secure random token string. */
export function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Hash a raw token for safe database storage. */
export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/** Sign a JWT containing only user id and role. */
export function signJwt(userId: number, role: Role): string {
  const payload: JwtPayload = { sub: userId, role };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
}

/** Verify and decode a JWT. Returns null on failure. */
export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as unknown as JwtPayload;
  } catch {
    return null;
  }
}
