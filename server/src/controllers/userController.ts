import type { Request, Response, NextFunction } from 'express';
import {
  createUserSchema,
  updateUserSchema,
  updateStatusSchema,
  listUsersQuerySchema,
} from '../validators/user.validator.js';
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  setUserStatus,
} from '../services/userService.js';
import { getPositiveIntParam } from '../utils/http.js';

function getIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

// GET /api/users
export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await listUsers(query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// POST /api/users
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createUserSchema.parse(req.body);
    const user = await createUser(data, req.user!.id, getIp(req));
    res.status(201).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id
export async function show(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    const user = await getUserById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id
export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    const existing = await getUserById(id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const data = updateUserSchema.parse(req.body);
    const user = await updateUser(id, data, req.user!.id, getIp(req));
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id/status
export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    const existing = await getUserById(id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const { is_active } = updateStatusSchema.parse(req.body);
    const user = await setUserStatus(id, is_active, req.user!.id, getIp(req));
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}
