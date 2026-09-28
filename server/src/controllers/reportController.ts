import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as reportService from '../services/reportService.js';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD date').optional();
const paginationQuery = {
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(20),
  search: z.string().trim().max(100).optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional(),
};

const studentQuerySchema = z.object({
  ...paginationQuery,
  sortBy: z.enum(['student_id', 'full_name', 'department', 'admission_date', 'status']).optional(),
  department: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  is_active: z.enum(['true', 'false', '1', '0']).optional(),
  from: isoDate,
  to: isoDate,
});

export async function students(req: Request, res: Response, next: NextFunction) {
  try {
    const query = studentQuerySchema.parse(req.query);
    const data = await reportService.getStudentReport(query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

const roomQuerySchema = z.object({
  ...paginationQuery,
  sortBy: z.enum(['block', 'floor', 'room_number', 'room_type', 'capacity', 'occupied_count', 'status']).optional(),
  block: z.string().optional(),
  floor: z.coerce.number().int().min(0).optional(),
  room_type: z.enum(['SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY']).optional(),
  status: z.enum(['AVAILABLE', 'PARTIALLY_OCCUPIED', 'FULL']).optional(),
});

export async function rooms(req: Request, res: Response, next: NextFunction) {
  try {
    const query = roomQuerySchema.parse(req.query);
    const data = await reportService.getRoomOccupancyReport(query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

const feeQuerySchema = z.object({
  ...paginationQuery,
  sortBy: z.enum(['student_name', 'fee_type', 'amount', 'paid_amount', 'balance', 'due_date', 'status']).optional(),
  academic_period: z.string().optional(),
  fee_type: z.enum(['HOSTEL_FEE', 'MESS_FEE', 'MAINTENANCE_FEE', 'SECURITY_DEPOSIT']).optional(),
  status: z.enum(['PAID', 'PARTIALLY_PAID', 'PENDING', 'OVERDUE']).optional(),
  from: isoDate,
  to: isoDate,
});

export async function fees(req: Request, res: Response, next: NextFunction) {
  try {
    const query = feeQuerySchema.parse(req.query);
    const data = await reportService.getFeeReport(query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

const paymentQuerySchema = z.object({
  ...paginationQuery,
  sortBy: z.enum(['receipt_number', 'student_name', 'amount', 'payment_method', 'paid_at']).optional(),
  payment_method: z.enum(['UPI', 'BANK_TRANSFER', 'CASH', 'OTHER']).optional(),
  fee_type: z.enum(['HOSTEL_FEE', 'MESS_FEE', 'MAINTENANCE_FEE', 'SECURITY_DEPOSIT']).optional(),
  from: isoDate,
  to: isoDate,
});

export async function payments(req: Request, res: Response, next: NextFunction) {
  try {
    const query = paymentQuerySchema.parse(req.query);
    const data = await reportService.getPaymentReport(query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

const complaintQuerySchema = z.object({
  ...paginationQuery,
  sortBy: z.enum(['ticket_id', 'student_name', 'category', 'priority', 'status', 'created_at', 'resolved_at']).optional(),
  status: z.enum(['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  category: z.enum(['ELECTRICAL', 'PLUMBING', 'CARPENTRY', 'CLEANING', 'FURNITURE', 'INTERNET', 'OTHER']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigned_to: z.coerce.number().int().positive().optional(),
  from: isoDate,
  to: isoDate,
});

export async function complaints(req: Request, res: Response, next: NextFunction) {
  try {
    const query = complaintQuerySchema.parse(req.query);
    const data = await reportService.getComplaintReport(query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

const leaveQuerySchema = z.object({
  ...paginationQuery,
  sortBy: z.enum(['student_name', 'from_datetime', 'to_datetime', 'status', 'created_at']).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  from: isoDate,
  to: isoDate,
});

export async function leave(req: Request, res: Response, next: NextFunction) {
  try {
    const query = leaveQuerySchema.parse(req.query);
    const data = await reportService.getLeaveReport(query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

const visitorQuerySchema = z.object({
  ...paginationQuery,
  sortBy: z.enum(['visitor_name', 'student_name', 'entry_at', 'exit_at']).optional(),
  status: z.enum(['INSIDE', 'EXITED']).optional(),
  from: isoDate,
  to: isoDate,
});

export async function visitors(req: Request, res: Response, next: NextFunction) {
  try {
    const query = visitorQuerySchema.parse(req.query);
    const data = await reportService.getVisitorReport(query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
