import { pool } from '../db/pool.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type {
  Complaint,
  ComplaintHistory,
  ComplaintStatus,
  PaginatedResult,
  AuthUser,
} from '../types/index.js';
import type {
  CreateComplaintInput,
  ListComplaintsQuery,
} from '../validators/complaint.validator.js';
import { createNotification, notifyUsersByRoles } from './notificationService.js';
import { createAuditLog } from './auditService.js';

/**
 * Generate a unique collision-safe ticket ID.
 * Format: CMP-YYYYMMDD-XXXXX
 */
export function generateTicketId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `CMP-${dateStr}-${rand}`;
}

/**
 * Valid state transitions for complaints.
 */
export const VALID_STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS', 'ASSIGNED'], // Allow reassignment
  IN_PROGRESS: ['RESOLVED', 'ASSIGNED'],  // Allow reassignment if needed
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],    // Can be closed, or reopened if incomplete
  CLOSED: [],                              // Final state
};

export function isValidTransition(from: ComplaintStatus, to: ComplaintStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Student raises a complaint for their assigned room.
 */
export async function createComplaint(
  data: CreateComplaintInput,
  studentUserId: number,
  ipAddress?: string
): Promise<Complaint> {
  // 1. Get student record
  const [students] = await pool.query<RowDataPacket[]>(
    'SELECT id, is_active FROM students WHERE user_id = ? LIMIT 1',
    [studentUserId]
  );
  if (students.length === 0) {
    throw Object.assign(new Error('Student profile not found'), { statusCode: 404 });
  }
  const student = students[0];
  if (!student.is_active) {
    throw Object.assign(new Error('Inactive student accounts cannot submit complaints'), {
      statusCode: 403,
    });
  }

  // 2. Resolve room allocation
  const [allocations] = await pool.query<RowDataPacket[]>(
    'SELECT room_id FROM room_allocations WHERE student_id = ? AND vacated_at IS NULL LIMIT 1',
    [student.id]
  );
  if (allocations.length === 0) {
    throw Object.assign(
      new Error('No active room allocation found. You must be allocated to a room to submit complaints.'),
      { statusCode: 400 }
    );
  }
  const activeRoomId = allocations[0].room_id;

  // If room_id was passed, it must match the active allocation
  if (data.room_id && data.room_id !== activeRoomId) {
    throw Object.assign(new Error('Complaint room must match your currently allocated room'), {
      statusCode: 400,
    });
  }

  const roomId = activeRoomId;
  const ticketId = generateTicketId();

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO complaints
         (ticket_id, student_id, room_id, category, description, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, 'SUBMITTED')`,
      [ticketId, student.id, roomId, data.category, data.description, data.priority || 'MEDIUM']
    );

    const complaintId = result.insertId;

    // Record initial history
    await connection.query(
      `INSERT INTO complaint_history (complaint_id, changed_by, from_status, to_status, work_notes)
       VALUES (?, ?, NULL, 'SUBMITTED', 'Complaint raised by student')`,
      [complaintId, studentUserId]
    );

    // In-app notification for the student
    await createNotification({
      userId: studentUserId,
      type: 'COMPLAINT',
      title: 'Complaint Submitted',
      message: `Your complaint #${ticketId} (${data.category}) has been submitted successfully.`,
      referenceType: 'complaint',
      referenceId: complaintId,
      connection,
    });

    // Notify wardens if urgent
    if (data.priority === 'URGENT' || data.priority === 'HIGH') {
      await notifyUsersByRoles(
        ['ADMIN', 'WARDEN'],
        {
          type: 'COMPLAINT',
          title: `Urgent Complaint #${ticketId}`,
          message: `An urgent ${data.category} complaint was raised by a student.`,
          referenceType: 'complaint',
          referenceId: complaintId,
        },
        connection
      );
    }

    // Audit log
    await createAuditLog({
      actorUserId: studentUserId,
      action: 'COMPLAINT_CREATED',
      entityType: 'complaint',
      entityId: complaintId,
      details: { ticketId, category: data.category, priority: data.priority },
      ipAddress,
    });

    await connection.commit();

    const created = await getComplaintById(complaintId, { id: studentUserId, role: 'STUDENT' } as AuthUser);
    return created!.complaint;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * List complaints with role-based scoping and pagination.
 */
export async function listComplaints(
  query: ListComplaintsQuery,
  user: AuthUser
): Promise<PaginatedResult<Complaint>> {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  // Scoping
  if (user.role === 'STUDENT') {
    // Lookup student id for this user
    const [students] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM students WHERE user_id = ? LIMIT 1',
      [user.id]
    );
    if (students.length === 0) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }
    conditions.push('c.student_id = ?');
    params.push(students[0].id);
  } else if (user.role === 'MAINTENANCE') {
    conditions.push('c.assigned_to = ?');
    params.push(user.id);
  } else {
    // Admin / Warden filters
    if (query.student_id) {
      conditions.push('c.student_id = ?');
      params.push(query.student_id);
    }
    if (query.assigned_to) {
      conditions.push('c.assigned_to = ?');
      params.push(query.assigned_to);
    }
  }

  if (query.status) {
    conditions.push('c.status = ?');
    params.push(query.status);
  }
  if (query.category) {
    conditions.push('c.category = ?');
    params.push(query.category);
  }
  if (query.priority) {
    conditions.push('c.priority = ?');
    params.push(query.priority);
  }
  if (query.search) {
    conditions.push('(c.ticket_id LIKE ? OR c.description LIKE ? OR s.full_name LIKE ?)');
    params.push(`%${query.search}%`, `%${query.search}%`, `%${query.search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total
     FROM complaints c
     LEFT JOIN students s ON c.student_id = s.id
     ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.*,
            s.full_name as student_name,
            s.student_id as student_number,
            r.room_number,
            u.full_name as assigned_name
     FROM complaints c
     LEFT JOIN students s ON c.student_id = s.id
     LEFT JOIN rooms r ON c.room_id = r.id
     LEFT JOIN users u ON c.assigned_to = u.id
     ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows as Complaint[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Get complaint details with access control and full status history.
 */
export async function getComplaintById(
  id: number,
  user: AuthUser
): Promise<{ complaint: Complaint; history: ComplaintHistory[] } | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.*,
            s.full_name as student_name,
            s.student_id as student_number,
            s.user_id as student_user_id,
            r.room_number,
            u.full_name as assigned_name
     FROM complaints c
     LEFT JOIN students s ON c.student_id = s.id
     LEFT JOIN rooms r ON c.room_id = r.id
     LEFT JOIN users u ON c.assigned_to = u.id
     WHERE c.id = ?
     LIMIT 1`,
    [id]
  );

  if (rows.length === 0) return null;

  const complaint = rows[0] as Complaint & { student_user_id?: number };

  // IDOR & Privacy check
  if (user.role === 'STUDENT' && complaint.student_user_id !== user.id) {
    throw Object.assign(new Error('Access denied to other student complaints'), { statusCode: 403 });
  }

  if (user.role === 'MAINTENANCE' && complaint.assigned_to !== user.id) {
    throw Object.assign(new Error('Access denied to unassigned tasks'), { statusCode: 403 });
  }

  // Fetch status history
  const [historyRows] = await pool.query<RowDataPacket[]>(
    `SELECT ch.*, u.full_name as changer_name, u.role as changer_role
     FROM complaint_history ch
     LEFT JOIN users u ON ch.changed_by = u.id
     WHERE ch.complaint_id = ?
     ORDER BY ch.created_at ASC`,
    [id]
  );

  delete complaint.student_user_id;

  return {
    complaint,
    history: historyRows as ComplaintHistory[],
  };
}

/**
 * Assign a complaint to a maintenance staff user (Admin / Warden only).
 */
export async function assignComplaint(
  complaintId: number,
  maintenanceUserId: number,
  actorUserId: number,
  ipAddress?: string
): Promise<void> {
  // 1. Verify target user is active MAINTENANCE staff
  const [mUsers] = await pool.query<RowDataPacket[]>(
    `SELECT id, full_name, role, is_active FROM users WHERE id = ? LIMIT 1`,
    [maintenanceUserId]
  );
  if (mUsers.length === 0 || mUsers[0].role !== 'MAINTENANCE' || !mUsers[0].is_active) {
    throw Object.assign(new Error('Assigned user must be an active MAINTENANCE staff member'), {
      statusCode: 400,
    });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [cRows] = await connection.query<RowDataPacket[]>(
      `SELECT c.*, s.user_id as student_user_id FROM complaints c
       LEFT JOIN students s ON c.student_id = s.id
       WHERE c.id = ? FOR UPDATE`,
      [complaintId]
    );

    if (cRows.length === 0) {
      throw Object.assign(new Error('Complaint not found'), { statusCode: 404 });
    }

    const complaint = cRows[0];
    if (complaint.status === 'CLOSED') {
      throw Object.assign(new Error('Cannot assign a closed complaint'), { statusCode: 400 });
    }

    const fromStatus = complaint.status;
    const toStatus: ComplaintStatus = 'ASSIGNED';

    await connection.query(
      `UPDATE complaints SET assigned_to = ?, status = 'ASSIGNED', updated_at = NOW() WHERE id = ?`,
      [maintenanceUserId, complaintId]
    );

    await connection.query(
      `INSERT INTO complaint_history (complaint_id, changed_by, from_status, to_status, work_notes)
       VALUES (?, ?, ?, ?, ?)`,
      [complaintId, actorUserId, fromStatus, toStatus, `Assigned to ${mUsers[0].full_name}`]
    );

    // Notify maintenance staff
    await createNotification({
      userId: maintenanceUserId,
      type: 'COMPLAINT',
      title: 'New Task Assigned',
      message: `You have been assigned complaint #${complaint.ticket_id} (${complaint.category}).`,
      referenceType: 'complaint',
      referenceId: complaintId,
      connection,
    });

    // Notify student
    if (complaint.student_user_id) {
      await createNotification({
        userId: complaint.student_user_id,
        type: 'COMPLAINT',
        title: 'Complaint Assigned',
        message: `Your complaint #${complaint.ticket_id} has been assigned to maintenance.`,
        referenceType: 'complaint',
        referenceId: complaintId,
        connection,
      });
    }

    await createAuditLog({
      actorUserId,
      action: 'COMPLAINT_ASSIGNED',
      entityType: 'complaint',
      entityId: complaintId,
      details: {
        ticketId: complaint.ticket_id,
        assignedTo: maintenanceUserId,
        staffName: mUsers[0].full_name,
      },
      ipAddress,
    });

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Update complaint status with strict state machine and work notes verification.
 */
export async function updateComplaintStatus(
  complaintId: number,
  newStatus: ComplaintStatus,
  workNotes: string | undefined,
  actor: AuthUser,
  ipAddress?: string
): Promise<void> {
  // Students cannot directly change status
  if (actor.role === 'STUDENT') {
    throw Object.assign(new Error('Students are not permitted to change complaint status'), {
      statusCode: 403,
    });
  }

  // Work notes are strictly required when marking as RESOLVED
  if (newStatus === 'RESOLVED' && (!workNotes || workNotes.trim().length === 0)) {
    throw Object.assign(new Error('Work and resolution notes are required when marking a complaint as resolved'), {
      statusCode: 400,
    });
  }

  // Only Admin or Warden can CLOSE a complaint
  if (newStatus === 'CLOSED' && actor.role !== 'ADMIN' && actor.role !== 'WARDEN') {
    throw Object.assign(new Error('Only administrators and wardens can close complaints'), {
      statusCode: 403,
    });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [cRows] = await connection.query<RowDataPacket[]>(
      `SELECT c.*, s.user_id as student_user_id FROM complaints c
       LEFT JOIN students s ON c.student_id = s.id
       WHERE c.id = ? FOR UPDATE`,
      [complaintId]
    );

    if (cRows.length === 0) {
      throw Object.assign(new Error('Complaint not found'), { statusCode: 404 });
    }

    const complaint = cRows[0];
    const currentStatus: ComplaintStatus = complaint.status;

    // Maintenance can only update tasks assigned to them
    if (actor.role === 'MAINTENANCE' && complaint.assigned_to !== actor.id) {
      throw Object.assign(new Error('You can only update tasks assigned to yourself'), {
        statusCode: 403,
      });
    }

    // Validate state transition
    if (currentStatus !== newStatus && !isValidTransition(currentStatus, newStatus)) {
      throw Object.assign(
        new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'`),
        { statusCode: 400 }
      );
    }

    let resolvedAtUpdate = '';
    let closedAtUpdate = '';
    const updateParams: any[] = [newStatus];

    if (newStatus === 'RESOLVED') {
      resolvedAtUpdate = ', resolved_at = NOW()';
    } else if (newStatus === 'CLOSED') {
      closedAtUpdate = ', closed_at = NOW()';
    }

    updateParams.push(complaintId);

    await connection.query(
      `UPDATE complaints SET status = ? ${resolvedAtUpdate} ${closedAtUpdate}, updated_at = NOW() WHERE id = ?`,
      updateParams
    );

    // Add immutable history record
    await connection.query(
      `INSERT INTO complaint_history (complaint_id, changed_by, from_status, to_status, work_notes)
       VALUES (?, ?, ?, ?, ?)`,
      [complaintId, actor.id, currentStatus, newStatus, workNotes?.trim() || null]
    );

    // In-app notifications
    if (complaint.student_user_id) {
      await createNotification({
        userId: complaint.student_user_id,
        type: 'COMPLAINT',
        title: `Complaint Status: ${newStatus}`,
        message: `Your complaint #${complaint.ticket_id} status is now ${newStatus}.${
          workNotes ? ` Notes: ${workNotes}` : ''
        }`,
        referenceType: 'complaint',
        referenceId: complaintId,
        connection,
      });
    }

    if (newStatus === 'RESOLVED') {
      // Notify wardens that work is completed
      await notifyUsersByRoles(
        ['ADMIN', 'WARDEN'],
        {
          type: 'COMPLAINT',
          title: `Complaint #${complaint.ticket_id} Resolved`,
          message: `Staff marked complaint as resolved: "${workNotes}"`,
          referenceType: 'complaint',
          referenceId: complaintId,
        },
        connection
      );
    }

    // Audit log
    await createAuditLog({
      actorUserId: actor.id,
      action: newStatus === 'RESOLVED' ? 'COMPLAINT_RESOLVED' : newStatus === 'CLOSED' ? 'COMPLAINT_CLOSED' : 'COMPLAINT_STATUS_CHANGED',
      entityType: 'complaint',
      entityId: complaintId,
      details: {
        ticketId: complaint.ticket_id,
        fromStatus: currentStatus,
        toStatus: newStatus,
        workNotes,
      },
      ipAddress,
    });

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
