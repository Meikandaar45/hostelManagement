import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as feeService from '../services/feeService';
import { getPositiveIntParam } from '../utils/http';

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  student_id: z.coerce.number().positive().optional(),
  fee_type: z.string().optional(),
  status: z.enum(['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE']).optional(),
});

export async function listFees(req: Request, res: Response, next: NextFunction) {
  try {
    const opts = listQuerySchema.parse(req.query);
    const result = await feeService.listFees(opts);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getFee(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    const fee = await feeService.getFeeById(id);
    if (!fee) {
      res.status(404).json({ success: false, message: 'Fee not found' });
      return;
    }
    res.json({ success: true, data: { fee } });
  } catch (err) {
    next(err);
  }
}

const createSchema = z.object({
  student_id: z.number().int().positive(),
  fee_type: z.string().min(1),
  academic_period: z.string().min(1),
  amount: z.number().positive(),
  due_date: z.string(),
});

export async function createFee(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const fee = await feeService.createFee(data, req.user!.id);
    res.status(201).json({ success: true, data: { fee } });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

const paymentSchema = z.object({
  amount: z.number().positive(),
  payment_method: z.enum(['CASH', 'BANK_TRANSFER', 'UPI', 'OTHER']),
  transaction_reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function recordPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const feeId = getPositiveIntParam(req, 'id');
    const data = paymentSchema.parse(req.body);
    const payment = await feeService.recordPayment(feeId, data, req.user!.id);
    res.status(201).json({ success: true, data: { payment } });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getReceipt(req: Request, res: Response, next: NextFunction) {
  try {
    const paymentId = getPositiveIntParam(req, 'id');
    const receipt = await feeService.getReceiptDetails(paymentId);
    if (!receipt) {
      res.status(404).json({ success: false, message: 'Receipt not found' });
      return;
    }

    // IDOR protection: students can only access their own payment receipts
    if (req.user?.role === 'STUDENT' && receipt.student_user_id !== req.user.id) {
      res.status(403).json({ success: false, message: 'Access denied to other student receipts' });
      return;
    }

    delete receipt.student_user_id;
    res.json({ success: true, data: { receipt } });
  } catch (err) {
    next(err);
  }
}
