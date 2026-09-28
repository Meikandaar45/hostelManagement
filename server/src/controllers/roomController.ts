import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as roomService from '../services/roomService';
import { getPositiveIntParam } from '../utils/http';

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  search: z.string().optional(),
  block: z.string().optional(),
  floor: z.coerce.number().optional(),
  room_type: z.enum(['SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY']).optional(),
  status: z.enum(['AVAILABLE', 'PARTIALLY_OCCUPIED', 'FULL']).optional(),
});

export async function listRooms(req: Request, res: Response, next: NextFunction) {
  try {
    const opts = listQuerySchema.parse(req.query);
    const result = await roomService.listRooms(opts);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    const room = await roomService.getRoomById(id);
    if (!room) {
      res.status(404).json({ success: false, message: 'Room not found' });
      return;
    }
    res.json({ success: true, data: { room } });
  } catch (err) {
    next(err);
  }
}

const createSchema = z.object({
  room_number: z.string().min(1),
  block: z.string().min(1),
  floor: z.number().int(),
  room_type: z.enum(['SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY']),
  capacity: z.number().int().min(1),
});

export async function createRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const room = await roomService.createRoom(data, req.user!.id);
    res.status(201).json({ success: true, data: { room } });
  } catch (err: any) {
    if (err.message.includes('already exists')) {
      res.status(409).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
}

const allocateSchema = z.object({
  student_id: z.number().int().positive(),
});

export async function allocateRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const roomId = getPositiveIntParam(req, 'id');
    const { student_id } = allocateSchema.parse(req.body);
    await roomService.allocateRoom(roomId, student_id, req.user!.id);
    res.json({ success: true, message: 'Room allocated successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

const reallocateSchema = z.object({
  student_id: z.number().int().positive(),
  new_room_id: z.number().int().positive(),
});

export async function reallocateRoom(req: Request, res: Response, _next: NextFunction) {
  try {
    const { student_id, new_room_id } = reallocateSchema.parse(req.body);
    await roomService.reallocateRoom(student_id, new_room_id, req.user!.id);
    res.json({ success: true, message: 'Room reallocated successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

const updateSchema = z.object({
  room_number: z.string().min(1).optional(),
  block: z.string().min(1).optional(),
  floor: z.number().int().optional(),
  room_type: z.enum(['SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY']).optional(),
  capacity: z.number().int().min(1).optional(),
});

export async function updateRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    const data = updateSchema.parse(req.body);
    const room = await roomService.updateRoom(id, data, req.user!.id);
    res.json({ success: true, data: { room } });
  } catch (err: any) {
    if (err.statusCode) {
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
}

const vacateSchema = z.object({
  student_id: z.number().int().positive(),
});

export async function vacateRoom(req: Request, res: Response, _next: NextFunction) {
  try {
    const { student_id } = vacateSchema.parse(req.body);
    await roomService.vacateRoom(student_id, req.user!.id);
    res.json({ success: true, message: 'Room vacated successfully' });
  } catch (err: any) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
}

