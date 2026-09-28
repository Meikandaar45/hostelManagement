import type { Request, Response, NextFunction } from 'express';
import {
  createLeaveSchema,
  approveLeaveSchema,
  rejectLeaveSchema,
  listLeaveQuerySchema,
} from '../validators/leave.validator.js';
import * as leaveService from '../services/leaveService.js';
import { getPositiveIntParam } from '../utils/http.js';

function getIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

export async function listLeave(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listLeaveQuerySchema.parse(req.query);
    const result = await leaveService.listLeaveRequests(query, req.user!);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function submitLeave(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createLeaveSchema.parse(req.body);
    const leave = await leaveService.submitLeaveRequest(data, req.user!.id, getIp(req));
    res.status(201).json({ success: true, data: { leave } });
  } catch (err) {
    next(err);
  }
}

export async function getLeave(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    const leave = await leaveService.getLeaveById(id, req.user!);
    if (!leave) {
      res.status(404).json({ success: false, message: 'Leave request not found' });
      return;
    }
    res.json({ success: true, data: { leave } });
  } catch (err) {
    next(err);
  }
}

export async function cancelLeave(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    await leaveService.cancelLeaveRequest(id, req.user!.id, getIp(req));
    res.json({ success: true, message: 'Leave request cancelled successfully' });
  } catch (err) {
    next(err);
  }
}

export async function approveLeave(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    const data = approveLeaveSchema.parse(req.body);
    const leave = await leaveService.approveLeave(id, data, req.user!, getIp(req));
    res.json({ success: true, message: 'Leave approved and gate pass generated', data: { leave } });
  } catch (err) {
    next(err);
  }
}

export async function rejectLeave(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    const data = rejectLeaveSchema.parse(req.body);
    const leave = await leaveService.rejectLeave(id, data, req.user!, getIp(req));
    res.json({ success: true, message: 'Leave request rejected', data: { leave } });
  } catch (err) {
    next(err);
  }
}

export async function getGatePass(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    const gatePass = await leaveService.getGatePassByLeaveId(id, req.user!);
    res.json({ success: true, data: { gatePass } });
  } catch (err) {
    next(err);
  }
}
