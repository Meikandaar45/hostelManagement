import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as studentService from '../services/studentService';
import { getPositiveIntParam } from '../utils/http';

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  search: z.string().optional(),
  department: z.string().optional(),
  is_active: z.enum(['true', 'false']).optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
});

export async function listStudents(req: Request, res: Response, next: NextFunction) {
  try {
    const opts = listQuerySchema.parse(req.query);
    const result = await studentService.listStudents(opts);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getStudent(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    const student = await studentService.getStudentById(id);
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }
    res.json({ success: true, data: { student } });
  } catch (err) {
    next(err);
  }
}

const createSchema = z.object({
  student_id: z.string().min(1),
  full_name: z.string().min(2),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  contact_number: z.string().min(5),
  address: z.string().min(5),
  department: z.string().min(2),
  admission_date: z.string(),
  email: z.string().email(),
});

export async function createStudent(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const student = await studentService.createStudent(data, req.user!.id);
    res.status(201).json({ success: true, data: { student } });
  } catch (err: any) {
    if (err.message.includes('already exists')) {
      res.status(409).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
}

const updateSchema = z.object({
  full_name: z.string().min(2).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  contact_number: z.string().min(5).optional(),
  address: z.string().min(5).optional(),
  department: z.string().min(2).optional(),
});

export async function updateStudent(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    const data = updateSchema.parse(req.body);
    const student = await studentService.updateStudent(id, data, req.user!.id);
    res.json({ success: true, data: { student } });
  } catch (err) {
    next(err);
  }
}

const statusSchema = z.object({
  is_active: z.boolean(),
});

export async function setStudentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    const { is_active } = statusSchema.parse(req.body);
    await studentService.setStudentStatus(id, is_active, req.user!.id);
    const student = await studentService.getStudentById(id);
    res.json({ success: true, data: { student } });
  } catch (err) {
    next(err);
  }
}
