import { pool } from '../db/pool.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { LeaveRequest, GatePass, PaginatedResult, AuthUser } from '../types/index.js';
import type {
  CreateLeaveInput,
  ApproveLeaveInput,
  RejectLeaveInput,
  ListLeaveQuery,
} from '../validators/leave.validator.js';
import { createNotification, notifyUsersByRoles } from './notificationService.js';
import { createAuditLog } from './auditService.js';

/**
 * Generate a unique collision-safe gate pass number.
 * Format: GP-YYYY-XXXXXX
 */
export function generateGatePassNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `GP-${year}-${rand}`;
}

/**
 * Submit a student leave request.
 */
export async function submitLeaveRequest(
  data: CreateLeaveInput,
  studentUserId: number,
  ipAddress?: string
): Promise<LeaveRequest> {
  const [students] = await pool.query<RowDataPacket[]>(
    'SELECT id, full_name, is_active FROM students WHERE user_id = ? LIMIT 1',
    [studentUserId]
  );

  if (students.length === 0) {
    throw Object.assign(new Error('Student profile not found'), { statusCode: 404 });
  }

  const student = students[0];
  if (!student.is_active) {
    throw Object.assign(new Error('Inactive student accounts cannot submit leave requests'), {
      statusCode: 403,
    });
  }

  // Ensure from_datetime is before to_datetime
  const fromTime = new Date(data.from_datetime).getTime();
  const toTime = new Date(data.to_datetime).getTime();
  if (isNaN(fromTime) || isNaN(toTime) || fromTime >= toTime) {
    throw Object.assign(
      new Error('Return date/time must be strictly later than departure date/time'),
      { statusCode: 400 }
    );
  }

  const fromDate = new Date(data.from_datetime).toISOString().slice(0, 19).replace('T', ' ');
  const toDate = new Date(data.to_datetime).toISOString().slice(0, 19).replace('T', ' ');

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO leave_requests (student_id, from_datetime, to_datetime, reason, status)
     VALUES (?, ?, ?, ?, 'PENDING')`,
    [student.id, fromDate, toDate, data.reason]
  );

  const leaveId = result.insertId;

  // In-app notification for the student
  await createNotification({
    userId: studentUserId,
    type: 'LEAVE',
    title: 'Leave Request Submitted',
    message: `Your leave request from ${data.from_datetime.slice(0, 10)} has been submitted for review.`,
    referenceType: 'leave',
    referenceId: leaveId,
  });

  // Notify wardens
  await notifyUsersByRoles(['ADMIN', 'WARDEN'], {
    type: 'LEAVE',
    title: 'New Leave Request',
    message: `${student.full_name} submitted a leave request (${data.from_datetime.slice(0, 10)} to ${data.to_datetime.slice(0, 10)}).`,
    referenceType: 'leave',
    referenceId: leaveId,
  });

  // Audit log
  await createAuditLog({
    actorUserId: studentUserId,
    action: 'LEAVE_REQUESTED',
    entityType: 'leave_request',
    entityId: leaveId,
    details: { from: data.from_datetime, to: data.to_datetime, reason: data.reason },
    ipAddress,
  });

  return (await getLeaveById(leaveId, { id: studentUserId, role: 'STUDENT' } as AuthUser))!;
}

/**
 * Cancel a pending leave request (Student only).
 */
export async function cancelLeaveRequest(
  leaveId: number,
  studentUserId: number,
  ipAddress?: string
): Promise<void> {
  const [students] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM students WHERE user_id = ? LIMIT 1',
    [studentUserId]
  );

  if (students.length === 0) {
    throw Object.assign(new Error('Student profile not found'), { statusCode: 404 });
  }

  const studentId = students[0].id;

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM leave_requests WHERE id = ? LIMIT 1',
    [leaveId]
  );

  if (rows.length === 0) {
    throw Object.assign(new Error('Leave request not found'), { statusCode: 404 });
  }

  const leave = rows[0];

  if (leave.student_id !== studentId) {
    throw Object.assign(new Error('You can only cancel your own leave requests'), {
      statusCode: 403,
    });
  }

  if (leave.status !== 'PENDING') {
    throw Object.assign(
      new Error(`Only PENDING leave requests can be cancelled. Current status is ${leave.status}`),
      { statusCode: 400 }
    );
  }

  await pool.query(
    `UPDATE leave_requests SET status = 'CANCELLED', updated_at = NOW() WHERE id = ?`,
    [leaveId]
  );

  await createAuditLog({
    actorUserId: studentUserId,
    action: 'LEAVE_CANCELLED',
    entityType: 'leave_request',
    entityId: leaveId,
    ipAddress,
  });
}

/**
 * Approve a leave request and generate digital gate pass (Admin / Warden).
 */
export async function approveLeave(
  leaveId: number,
  data: ApproveLeaveInput,
  reviewer: AuthUser | number,
  ipAddress?: string
): Promise<LeaveRequest> {
  const reviewerUserId = typeof reviewer === 'number' ? reviewer : reviewer.id;
  const reviewerUser =
    typeof reviewer === 'number'
      ? ({ id: reviewer, role: 'WARDEN' } as AuthUser)
      : reviewer;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT lr.*, s.user_id as student_user_id, s.full_name as student_name
       FROM leave_requests lr
       JOIN students s ON lr.student_id = s.id
       WHERE lr.id = ? FOR UPDATE`,
      [leaveId]
    );

    if (rows.length === 0) {
      throw Object.assign(new Error('Leave request not found'), { statusCode: 404 });
    }

    const leave = rows[0];
    if (leave.status !== 'PENDING') {
      throw Object.assign(
        new Error(`Cannot approve leave request with status '${leave.status}'. Must be PENDING.`),
        { statusCode: 400 }
      );
    }

    let gatePassNumber = generateGatePassNumber();
    let attempts = 0;
    while (attempts < 5) {
      const [existing] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM leave_requests WHERE gate_pass_number = ? LIMIT 1',
        [gatePassNumber]
      );
      if (existing.length === 0) break;
      gatePassNumber = generateGatePassNumber();
      attempts++;
    }

    await connection.query(
      `UPDATE leave_requests
       SET status = 'APPROVED',
           gate_pass_number = ?,
           review_notes = ?,
           reviewed_by = ?,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [gatePassNumber, data.review_notes || null, reviewerUserId, leaveId]
    );

    // Notify student
    if (leave.student_user_id) {
      await createNotification({
        userId: leave.student_user_id,
        type: 'LEAVE',
        title: 'Leave Approved',
        message: `Your leave request has been approved! Digital Gate Pass #${gatePassNumber} is generated.`,
        referenceType: 'leave',
        referenceId: leaveId,
        connection,
      });
    }

    // Audit log
    await createAuditLog({
      actorUserId: reviewerUserId,
      action: 'LEAVE_APPROVED',
      entityType: 'leave_request',
      entityId: leaveId,
      details: {
        gatePassNumber,
        studentId: leave.student_id,
        notes: data.review_notes,
      },
      ipAddress,
      connection,
    });

    await connection.commit();

    return (await getLeaveById(leaveId, reviewerUser))!;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Reject a leave request (Admin / Warden).
 */
export async function rejectLeave(
  leaveId: number,
  data: RejectLeaveInput,
  reviewer: AuthUser | number,
  ipAddress?: string
): Promise<LeaveRequest> {
  const reviewerUserId = typeof reviewer === 'number' ? reviewer : reviewer.id;
  const reviewerUser =
    typeof reviewer === 'number'
      ? ({ id: reviewer, role: 'WARDEN' } as AuthUser)
      : reviewer;

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT lr.*, s.user_id as student_user_id
       FROM leave_requests lr
       JOIN students s ON lr.student_id = s.id
       WHERE lr.id = ? FOR UPDATE`,
      [leaveId]
    );

    if (rows.length === 0) {
      throw Object.assign(new Error('Leave request not found'), { statusCode: 404 });
    }

    const leave = rows[0];
    if (leave.status !== 'PENDING') {
      throw Object.assign(
        new Error(`Cannot reject leave request with status '${leave.status}'. Must be PENDING.`),
        { statusCode: 400 }
      );
    }

    await connection.query(
      `UPDATE leave_requests
       SET status = 'REJECTED',
           review_notes = ?,
           reviewed_by = ?,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [data.review_notes, reviewerUserId, leaveId]
    );

    // Notify student
    if (leave.student_user_id) {
      await createNotification({
        userId: leave.student_user_id,
        type: 'LEAVE',
        title: 'Leave Request Rejected',
        message: `Your leave request was rejected. Reason: ${data.review_notes}`,
        referenceType: 'leave',
        referenceId: leaveId,
        connection,
      });
    }

    // Audit log
    await createAuditLog({
      actorUserId: reviewerUserId,
      action: 'LEAVE_REJECTED',
      entityType: 'leave_request',
      entityId: leaveId,
      details: { reason: data.review_notes },
      ipAddress,
      connection,
    });

    await connection.commit();

    return (await getLeaveById(leaveId, reviewerUser))!;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Get leave request by ID with role check.
 */
export async function getLeaveById(id: number, user: AuthUser): Promise<LeaveRequest | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT lr.*,
            s.full_name as student_name,
            s.student_id as student_number,
            s.user_id as student_user_id,
            r.room_number,
            u.full_name as reviewer_name
     FROM leave_requests lr
     JOIN students s ON lr.student_id = s.id
     LEFT JOIN room_allocations ra ON ra.student_id = s.id AND ra.vacated_at IS NULL
     LEFT JOIN rooms r ON ra.room_id = r.id
     LEFT JOIN users u ON lr.reviewed_by = u.id
     WHERE lr.id = ?
     LIMIT 1`,
    [id]
  );

  if (rows.length === 0) return null;

  const leave = rows[0] as LeaveRequest & { student_user_id?: number };

  if (user.role === 'STUDENT' && leave.student_user_id !== user.id) {
    throw Object.assign(new Error('Access denied to other student leave requests'), {
      statusCode: 403,
    });
  }

  delete leave.student_user_id;
  return leave;
}

/**
 * List leave requests with pagination and filters.
 */
export async function listLeaveRequests(
  query: ListLeaveQuery,
  user: AuthUser
): Promise<PaginatedResult<LeaveRequest>> {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (user.role === 'STUDENT') {
    const [students] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM students WHERE user_id = ? LIMIT 1',
      [user.id]
    );
    if (students.length === 0) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }
    conditions.push('lr.student_id = ?');
    params.push(students[0].id);
  } else if (query.student_id) {
    conditions.push('lr.student_id = ?');
    params.push(query.student_id);
  }

  if (query.status) {
    conditions.push('lr.status = ?');
    params.push(query.status);
  }
  if (query.from_date) {
    conditions.push('DATE(lr.from_datetime) >= ?');
    params.push(query.from_date);
  }
  if (query.to_date) {
    conditions.push('DATE(lr.to_datetime) <= ?');
    params.push(query.to_date);
  }
  if (query.search) {
    conditions.push('(s.full_name LIKE ? OR s.student_id LIKE ? OR lr.reason LIKE ?)');
    params.push(`%${query.search}%`, `%${query.search}%`, `%${query.search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total
     FROM leave_requests lr
     JOIN students s ON lr.student_id = s.id
     ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT lr.*,
            s.full_name as student_name,
            s.student_id as student_number,
            r.room_number,
            u.full_name as reviewer_name
     FROM leave_requests lr
     JOIN students s ON lr.student_id = s.id
     LEFT JOIN room_allocations ra ON ra.student_id = s.id AND ra.vacated_at IS NULL
     LEFT JOIN rooms r ON ra.room_id = r.id
     LEFT JOIN users u ON lr.reviewed_by = u.id
     ${whereClause}
     ORDER BY lr.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows as LeaveRequest[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Get digital gate pass for an approved leave request.
 */
export async function getGatePassByLeaveId(
  leaveId: number,
  user: AuthUser
): Promise<GatePass> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT lr.*,
            s.full_name as student_name,
            s.student_id as student_number,
            s.user_id as student_user_id,
            COALESCE(r.room_number, 'N/A') as room_number,
            COALESCE(u.full_name, 'Warden Office') as approved_by
     FROM leave_requests lr
     JOIN students s ON lr.student_id = s.id
     LEFT JOIN room_allocations ra ON ra.student_id = s.id AND ra.vacated_at IS NULL
     LEFT JOIN rooms r ON ra.room_id = r.id
     LEFT JOIN users u ON lr.reviewed_by = u.id
     WHERE lr.id = ?
     LIMIT 1`,
    [leaveId]
  );

  if (rows.length === 0) {
    throw Object.assign(new Error('Leave request not found'), { statusCode: 404 });
  }

  const leave = rows[0];

  if (user.role === 'STUDENT' && leave.student_user_id !== user.id) {
    throw Object.assign(new Error('Access denied to other student gate passes'), {
      statusCode: 403,
    });
  }

  if (leave.status !== 'APPROVED' || !leave.gate_pass_number) {
    throw Object.assign(
      new Error(`Gate pass is only available for APPROVED leave requests (Current status: ${leave.status})`),
      { statusCode: 400 }
    );
  }

  return {
    gate_pass_number: leave.gate_pass_number,
    leave_id: leave.id,
    hostel_name: 'Campus Hostel Management System',
    student_name: leave.student_name,
    student_id: leave.student_number,
    room_number: leave.room_number,
    from_datetime: leave.from_datetime,
    to_datetime: leave.to_datetime,
    reason: leave.reason,
    status: leave.status,
    approved_by: leave.approved_by,
    approved_at: leave.reviewed_at || leave.updated_at,
  };
}
