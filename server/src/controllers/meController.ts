import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool';
import { RowDataPacket } from 'mysql2/promise';
import * as roomService from '../services/roomService';
import * as feeService from '../services/feeService';

export async function getMyProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM students WHERE user_id = ?', [req.user!.id]);
    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'Student profile not found' });
      return;
    }
    res.json({ success: true, data: { profile: rows[0] } });
  } catch (err) {
    next(err);
  }
}

export async function getMyRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM students WHERE user_id = ?', [req.user!.id]);
    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'Student profile not found' });
      return;
    }
    const studentId = rows[0].id;
    const allocation = await roomService.getActiveAllocationByStudentId(studentId);
    
    res.json({ success: true, data: { allocation } });
  } catch (err) {
    next(err);
  }
}

export async function getMyFees(req: Request, res: Response, next: NextFunction) {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id FROM students WHERE user_id = ?', [req.user!.id]);
    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'Student profile not found' });
      return;
    }
    const studentId = rows[0].id;
    
    // We can just use the feeService.listFees logic for this student
    const result = await feeService.listFees({ student_id: studentId, limit: 100 }); // Show all for student view
    
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
