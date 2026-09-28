import { pool } from '../db/pool.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { VisitorLog, PaginatedResult, AuthUser } from '../types/index.js';
import type { CreateVisitorInput, ListVisitorsQuery } from '../validators/visitor.validator.js';
import { createNotification } from './notificationService.js';
import { createAuditLog } from './auditService.js';

/**
 * Record a new visitor entry.
 */
export async function recordVisitorEntry(
  data: CreateVisitorInput,
  recordedByUserId: number,
  ipAddress?: string
): Promise<VisitorLog> {
  // 1. Verify student exists and is active
  const [students] = await pool.query<RowDataPacket[]>(
    'SELECT id, full_name, user_id, is_active FROM students WHERE id = ? LIMIT 1',
    [data.student_id]
  );

  if (students.length === 0) {
    throw Object.assign(new Error('Student not found'), { statusCode: 404 });
  }

  const student = students[0];
  if (!student.is_active) {
    throw Object.assign(new Error('Cannot log visitors for inactive students'), { statusCode: 400 });
  }

  // 2. Duplicate active entry check: ensure no unexited visitor with the same phone
  const [activeExisting] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM visitor_logs WHERE phone = ? AND student_id = ? AND exit_at IS NULL LIMIT 1',
    [data.phone, data.student_id]
  );

  if (activeExisting.length > 0) {
    throw Object.assign(
      new Error(`Visitor with phone ${data.phone} is already recorded as inside the hostel`),
      { statusCode: 409 }
    );
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO visitor_logs (visitor_name, phone, student_id, purpose, notes, recorded_by, entry_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      data.visitor_name,
      data.phone,
      data.student_id,
      data.purpose,
      data.notes || null,
      recordedByUserId,
    ]
  );

  const visitorId = result.insertId;

  // In-app notification to the visited student
  if (student.user_id) {
    await createNotification({
      userId: student.user_id,
      type: 'VISITOR',
      title: 'Visitor Arrived',
      message: `Visitor ${data.visitor_name} has arrived to visit you (${data.purpose}).`,
      referenceType: 'visitor',
      referenceId: visitorId,
    });
  }

  // Audit log
  await createAuditLog({
    actorUserId: recordedByUserId,
    action: 'VISITOR_ENTRY',
    entityType: 'visitor',
    entityId: visitorId,
    details: {
      visitorName: data.visitor_name,
      phone: data.phone,
      studentId: data.student_id,
      purpose: data.purpose,
    },
    ipAddress,
  });

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT vl.*,
            s.full_name as student_name,
            s.student_id as student_number,
            u.full_name as recorded_by_name,
            'INSIDE' as status
     FROM visitor_logs vl
     LEFT JOIN students s ON vl.student_id = s.id
     LEFT JOIN users u ON vl.recorded_by = u.id
     WHERE vl.id = ? LIMIT 1`,
    [visitorId]
  );

  return rows[0] as VisitorLog;
}

/**
 * Record visitor exit.
 */
export async function recordVisitorExit(
  visitorId: number,
  recordedByUserId: number,
  ipAddress?: string
): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM visitor_logs WHERE id = ? LIMIT 1',
    [visitorId]
  );

  if (rows.length === 0) {
    throw Object.assign(new Error('Visitor log record not found'), { statusCode: 404 });
  }

  const record = rows[0];
  if (record.exit_at !== null) {
    throw Object.assign(new Error('Visitor has already been marked as exited'), {
      statusCode: 400,
    });
  }

  await pool.query(
    'UPDATE visitor_logs SET exit_at = NOW(), updated_at = NOW() WHERE id = ?',
    [visitorId]
  );

  await createAuditLog({
    actorUserId: recordedByUserId,
    action: 'VISITOR_EXIT',
    entityType: 'visitor',
    entityId: visitorId,
    details: {
      visitorName: record.visitor_name,
      entryAt: record.entry_at,
    },
    ipAddress,
  });
}

/**
 * List visitor logs with filters and pagination.
 */
export async function listVisitors(
  query: ListVisitorsQuery,
  user: AuthUser
): Promise<PaginatedResult<VisitorLog>> {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  // Student privacy: students only see their own visitor records
  if (user.role === 'STUDENT') {
    const [students] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM students WHERE user_id = ? LIMIT 1',
      [user.id]
    );
    if (students.length === 0) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }
    conditions.push('vl.student_id = ?');
    params.push(students[0].id);
  } else if (query.student_id) {
    conditions.push('vl.student_id = ?');
    params.push(query.student_id);
  }

  if (query.status === 'INSIDE') {
    conditions.push('vl.exit_at IS NULL');
  } else if (query.status === 'EXITED') {
    conditions.push('vl.exit_at IS NOT NULL');
  }

  if (query.date) {
    conditions.push('DATE(vl.entry_at) = ?');
    params.push(query.date);
  }

  if (query.search) {
    conditions.push('(vl.visitor_name LIKE ? OR vl.phone LIKE ? OR s.full_name LIKE ?)');
    params.push(`%${query.search}%`, `%${query.search}%`, `%${query.search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total
     FROM visitor_logs vl
     LEFT JOIN students s ON vl.student_id = s.id
     ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT vl.*,
            s.full_name as student_name,
            s.student_id as student_number,
            u.full_name as recorded_by_name,
            CASE WHEN vl.exit_at IS NULL THEN 'INSIDE' ELSE 'EXITED' END as status
     FROM visitor_logs vl
     LEFT JOIN students s ON vl.student_id = s.id
     LEFT JOIN users u ON vl.recorded_by = u.id
     ${whereClause}
     ORDER BY vl.entry_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows as VisitorLog[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
