import type { Request, Response, NextFunction } from 'express';
import {
  setupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.validator.js';
import {
  hasAnyUser,
  createFirstAdmin,
  authenticateUser,
  createPasswordResetToken,
  resetPassword,
  changePassword,
  findUserById,
} from '../services/authService.js';
import { sendPasswordResetNotification } from '../services/notificationService.js';
import { createAuditLog } from '../services/auditService.js';
import { signJwt } from '../utils/token.js';
import { env } from '../config/env.js';

const COOKIE_NAME = 'auth_token';

function setCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  });
}

function clearCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    path: '/',
  });
}

function getIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

// POST /api/auth/setup
export async function setup(req: Request, res: Response, next: NextFunction) {
  try {
    const data = setupSchema.parse(req.body);
    const user = await createFirstAdmin(data, getIp(req));
    const token = signJwt(user.id, user.role);
    setCookie(res, token);
    res.status(201).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/setup-status
export async function setupStatus(_req: Request, res: Response, next: NextFunction) {
  try {
    const completed = await hasAnyUser();
    res.json({ success: true, data: { completed } });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await authenticateUser(data, getIp(req), req.headers['user-agent']);
    const token = signJwt(user.id, user.role);
    setCookie(res, token);
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.user) {
      await createAuditLog({
        actorUserId: req.user.id,
        action: 'LOGOUT',
        entityType: 'user',
        entityId: req.user.id,
        ipAddress: getIp(req),
      });
    }
    clearCookie(res);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await findUserById(req.user!.id);
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/forgot-password
export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { identifier } = forgotPasswordSchema.parse(req.body);
    const result = await createPasswordResetToken(identifier, getIp(req));

    // Always return the same message regardless of whether user was found
    if (result) {
      await sendPasswordResetNotification({ userId: result.userId, rawToken: result.rawToken });
    }

    res.json({
      success: true,
      data: { message: 'If the account exists, password reset instructions have been generated.' },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password
export async function resetPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    await resetPassword(token, password, getIp(req));
    res.json({ success: true, data: { message: 'Password reset successfully.' } });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/change-password (authenticated)
export async function changePasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { current_password, new_password } = changePasswordSchema.parse(req.body);
    await changePassword(req.user!.id, current_password, new_password, getIp(req));
    res.json({ success: true, data: { message: 'Password changed successfully.' } });
  } catch (err) {
    next(err);
  }
}
