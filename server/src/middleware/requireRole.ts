import type { Request, Response, NextFunction } from 'express';
import type { Role } from '../config/permissions.js';

/**
 * Middleware factory: require the authenticated user to have one of the allowed roles.
 * Must be used AFTER requireAuth.
 *
 * @example
 * router.get('/users', requireAuth, requireRole('ADMIN'), listUsers)
 * router.get('/warden', requireAuth, requireRole('ADMIN', 'WARDEN'), wardenPage)
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
