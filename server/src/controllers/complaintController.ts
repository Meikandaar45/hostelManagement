import type { Request, Response, NextFunction } from 'express';
import {
  createComplaintSchema,
  assignComplaintSchema,
  updateComplaintStatusSchema,
  listComplaintsQuerySchema,
} from '../validators/complaint.validator.js';
import * as complaintService from '../services/complaintService.js';
import { getPositiveIntParam } from '../utils/http.js';

function getIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

export async function listComplaints(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listComplaintsQuerySchema.parse(req.query);
    const result = await complaintService.listComplaints(query, req.user!);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function createComplaint(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createComplaintSchema.parse(req.body);
    const complaint = await complaintService.createComplaint(data, req.user!.id, getIp(req));
    res.status(201).json({ success: true, data: { complaint } });
  } catch (err) {
    next(err);
  }
}

export async function getComplaint(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    const result = await complaintService.getComplaintById(id, req.user!);
    if (!result) {
      res.status(404).json({ success: false, message: 'Complaint not found' });
      return;
    }
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function assignComplaint(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    const data = assignComplaintSchema.parse(req.body);
    await complaintService.assignComplaint(id, data.assigned_to, req.user!.id, getIp(req));
    res.json({ success: true, message: 'Complaint assigned successfully' });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    const data = updateComplaintStatusSchema.parse(req.body);
    await complaintService.updateComplaintStatus(
      id,
      data.status,
      data.work_notes,
      req.user!,
      getIp(req)
    );
    res.json({ success: true, message: `Status updated to ${data.status}` });
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getPositiveIntParam(req, 'id');
    const result = await complaintService.getComplaintById(id, req.user!);
    if (!result) {
      res.status(404).json({ success: false, message: 'Complaint not found' });
      return;
    }
    res.json({ success: true, data: { history: result.history } });
  } catch (err) {
    next(err);
  }
}

export async function getMyTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listComplaintsQuerySchema.parse(req.query);
    const result = await complaintService.listComplaints(
      { ...query, assigned_to: req.user!.id },
      req.user!
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
