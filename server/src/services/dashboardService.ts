import { pool } from '../db/pool.js';
import type { RowDataPacket } from 'mysql2/promise';
import type { AuthUser } from '../types/index.js';

export async function getDashboardSummary(user: AuthUser) {
  switch (user.role) {
    case 'ADMIN':
      return getAdminDashboard();
    case 'WARDEN':
      return getWardenDashboard();
    case 'STUDENT':
      return getStudentDashboard(user.id);
    case 'MAINTENANCE':
      return getMaintenanceDashboard(user.id);
    default:
      throw Object.assign(new Error('Unknown role'), { statusCode: 403 });
  }
}

async function getAdminDashboard() {
  // 1. Student counts
  const [studentRows] = await pool.query<RowDataPacket[]>(`
    SELECT 
      COUNT(*) AS total_students,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_students
    FROM students
  `);

  // 2. Room stats with active allocations
  const [roomRows] = await pool.query<RowDataPacket[]>(`
    SELECT 
      COUNT(r.id) AS total_rooms,
      COALESCE(SUM(r.capacity), 0) AS total_capacity,
      COALESCE(SUM(active_alloc.occupancy), 0) AS occupied_beds,
      SUM(CASE WHEN COALESCE(active_alloc.occupancy, 0) > 0 THEN 1 ELSE 0 END) AS occupied_rooms,
      SUM(CASE WHEN COALESCE(active_alloc.occupancy, 0) < r.capacity THEN 1 ELSE 0 END) AS available_rooms,
      SUM(CASE WHEN COALESCE(active_alloc.occupancy, 0) >= r.capacity THEN 1 ELSE 0 END) AS full_rooms
    FROM rooms r
    LEFT JOIN (
      SELECT room_id, COUNT(*) AS occupancy
      FROM room_allocations
      WHERE vacated_at IS NULL
      GROUP BY room_id
    ) active_alloc ON r.id = active_alloc.room_id
  `);

  // 3. Fee & Payment stats
  const [feeRows] = await pool.query<RowDataPacket[]>(`
    SELECT 
      COUNT(f.id) AS total_fees_count,
      COALESCE(SUM(f.amount), 0) AS total_fee_amount,
      COALESCE(SUM(p.paid_amount), 0) AS total_paid_amount,
      SUM(CASE WHEN COALESCE(p.paid_amount, 0) < f.amount THEN 1 ELSE 0 END) AS pending_fee_count,
      SUM(CASE WHEN COALESCE(p.paid_amount, 0) < f.amount AND f.due_date < CURDATE() THEN 1 ELSE 0 END) AS overdue_fee_count,
      SUM(CASE WHEN COALESCE(p.paid_amount, 0) < f.amount THEN (f.amount - COALESCE(p.paid_amount, 0)) ELSE 0 END) AS pending_fee_balance
    FROM fees f
    LEFT JOIN (
      SELECT fee_id, SUM(amount) AS paid_amount
      FROM payments
      GROUP BY fee_id
    ) p ON f.id = p.fee_id
  `);

  // 4. Total payments count and sum
  const [paymentRows] = await pool.query<RowDataPacket[]>(`
    SELECT 
      COUNT(*) AS total_payments_count,
      COALESCE(SUM(amount), 0) AS total_payments_sum
    FROM payments
  `);

  // 5. Complaints stats
  const [complaintRows] = await pool.query<RowDataPacket[]>(`
    SELECT 
      COUNT(*) AS total_complaints,
      SUM(CASE WHEN status = 'SUBMITTED' THEN 1 ELSE 0 END) AS pending_complaints,
      SUM(CASE WHEN status IN ('SUBMITTED', 'ASSIGNED', 'IN_PROGRESS') THEN 1 ELSE 0 END) AS open_complaints,
      SUM(CASE WHEN status IN ('ASSIGNED', 'IN_PROGRESS') THEN 1 ELSE 0 END) AS active_maintenance_tasks
    FROM complaints
  `);

  // 6. Visitor stats
  const [visitorRows] = await pool.query<RowDataPacket[]>(`
    SELECT 
      COUNT(*) AS total_visitors,
      SUM(CASE WHEN exit_at IS NULL THEN 1 ELSE 0 END) AS current_visitors
    FROM visitor_logs
  `);

  // 7. Leave request stats
  const [leaveRows] = await pool.query<RowDataPacket[]>(`
    SELECT 
      COUNT(*) AS total_leave_requests,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_leave_requests,
      SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_leave_requests
    FROM leave_requests
  `);

  // 8. Recent Activities
  const [recentPayments] = await pool.query<RowDataPacket[]>(`
    SELECT p.id, p.receipt_number, p.amount, p.payment_method, p.paid_at, s.full_name AS student_name, s.student_id
    FROM payments p
    JOIN fees f ON p.fee_id = f.id
    JOIN students s ON f.student_id = s.id
    ORDER BY p.paid_at DESC
    LIMIT 5
  `);

  const [recentComplaints] = await pool.query<RowDataPacket[]>(`
    SELECT c.id, c.ticket_id, c.category, c.priority, c.status, c.created_at, s.full_name AS student_name, r.room_number
    FROM complaints c
    JOIN students s ON c.student_id = s.id
    JOIN rooms r ON c.room_id = r.id
    ORDER BY c.created_at DESC
    LIMIT 5
  `);

  const [recentLeaves] = await pool.query<RowDataPacket[]>(`
    SELECT lr.id, lr.from_datetime, lr.to_datetime, lr.status, lr.created_at, s.full_name AS student_name
    FROM leave_requests lr
    JOIN students s ON lr.student_id = s.id
    ORDER BY lr.created_at DESC
    LIMIT 5
  `);

  const [recentVisitors] = await pool.query<RowDataPacket[]>(`
    SELECT vl.id, vl.visitor_name, vl.phone, vl.purpose, vl.entry_at, vl.exit_at, s.full_name AS student_name
    FROM visitor_logs vl
    JOIN students s ON vl.student_id = s.id
    ORDER BY vl.entry_at DESC
    LIMIT 5
  `);

  const s = studentRows[0] || {};
  const r = roomRows[0] || {};
  const f = feeRows[0] || {};
  const p = paymentRows[0] || {};
  const c = complaintRows[0] || {};
  const v = visitorRows[0] || {};
  const l = leaveRows[0] || {};

  return {
    role: 'ADMIN',
    metrics: {
      total_students: Number(s.total_students || 0),
      active_students: Number(s.active_students || 0),
      total_rooms: Number(r.total_rooms || 0),
      occupied_rooms: Number(r.occupied_rooms || 0),
      available_rooms: Number(r.available_rooms || 0),
      full_rooms: Number(r.full_rooms || 0),
      total_capacity: Number(r.total_capacity || 0),
      occupied_beds: Number(r.occupied_beds || 0),
      pending_fees: Number(f.pending_fee_count || 0),
      pending_fee_balance: Number(f.pending_fee_balance || 0),
      overdue_fees: Number(f.overdue_fee_count || 0),
      total_payments_count: Number(p.total_payments_count || 0),
      total_payments_amount: Number(p.total_payments_sum || 0),
      pending_complaints: Number(c.pending_complaints || 0),
      open_complaints: Number(c.open_complaints || 0),
      active_maintenance_tasks: Number(c.active_maintenance_tasks || 0),
      current_visitors: Number(v.current_visitors || 0),
      pending_leave_requests: Number(l.pending_leave_requests || 0),
    },
    recent: {
      payments: recentPayments,
      complaints: recentComplaints,
      leaves: recentLeaves,
      visitors: recentVisitors,
    },
  };
}

async function getWardenDashboard() {
  // 1. Student count
  const [studentRows] = await pool.query<RowDataPacket[]>(`
    SELECT COUNT(*) AS total_students FROM students WHERE is_active = 1
  `);

  // 2. Room stats
  const [roomRows] = await pool.query<RowDataPacket[]>(`
    SELECT 
      COUNT(r.id) AS total_rooms,
      COALESCE(SUM(r.capacity), 0) AS total_capacity,
      COALESCE(SUM(active_alloc.occupancy), 0) AS occupied_beds,
      SUM(CASE WHEN COALESCE(active_alloc.occupancy, 0) < r.capacity THEN 1 ELSE 0 END) AS available_rooms
    FROM rooms r
    LEFT JOIN (
      SELECT room_id, COUNT(*) AS occupancy
      FROM room_allocations
      WHERE vacated_at IS NULL
      GROUP BY room_id
    ) active_alloc ON r.id = active_alloc.room_id
  `);

  // 3. Operational counts
  const [complaintRows] = await pool.query<RowDataPacket[]>(`
    SELECT 
      SUM(CASE WHEN status = 'SUBMITTED' THEN 1 ELSE 0 END) AS pending_complaints,
      SUM(CASE WHEN status IN ('SUBMITTED', 'ASSIGNED', 'IN_PROGRESS') THEN 1 ELSE 0 END) AS open_complaints,
      SUM(CASE WHEN status IN ('ASSIGNED', 'IN_PROGRESS') THEN 1 ELSE 0 END) AS active_maintenance_tasks
    FROM complaints
  `);

  const [visitorRows] = await pool.query<RowDataPacket[]>(`
    SELECT COUNT(*) AS current_visitors FROM visitor_logs WHERE exit_at IS NULL
  `);

  const [leaveRows] = await pool.query<RowDataPacket[]>(`
    SELECT 
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_leave_requests,
      SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_leaves
    FROM leave_requests
  `);

  // 4. Recent complaints and leaves
  const [recentComplaints] = await pool.query<RowDataPacket[]>(`
    SELECT c.id, c.ticket_id, c.category, c.priority, c.status, c.created_at, s.full_name AS student_name, r.room_number
    FROM complaints c
    JOIN students s ON c.student_id = s.id
    JOIN rooms r ON c.room_id = r.id
    ORDER BY c.created_at DESC
    LIMIT 5
  `);

  const [recentLeaves] = await pool.query<RowDataPacket[]>(`
    SELECT lr.id, lr.from_datetime, lr.to_datetime, lr.status, lr.created_at, s.full_name AS student_name
    FROM leave_requests lr
    JOIN students s ON lr.student_id = s.id
    ORDER BY lr.created_at DESC
    LIMIT 5
  `);

  const s = studentRows[0] || {};
  const r = roomRows[0] || {};
  const c = complaintRows[0] || {};
  const v = visitorRows[0] || {};
  const l = leaveRows[0] || {};

  const totalCapacity = Number(r.total_capacity || 0);
  const occupiedBeds = Number(r.occupied_beds || 0);
  const occupancyRate = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;

  return {
    role: 'WARDEN',
    metrics: {
      total_students: Number(s.total_students || 0),
      total_rooms: Number(r.total_rooms || 0),
      total_capacity: totalCapacity,
      occupied_beds: occupiedBeds,
      occupancy_rate: occupancyRate,
      available_rooms: Number(r.available_rooms || 0),
      pending_complaints: Number(c.pending_complaints || 0),
      open_complaints: Number(c.open_complaints || 0),
      active_maintenance_tasks: Number(c.active_maintenance_tasks || 0),
      current_visitors: Number(v.current_visitors || 0),
      pending_leave_requests: Number(l.pending_leave_requests || 0),
      approved_leaves: Number(l.approved_leaves || 0),
    },
    recent: {
      complaints: recentComplaints,
      leaves: recentLeaves,
    },
  };
}

async function getStudentDashboard(userId: number) {
  // 1. Resolve student profile
  const [studentRows] = await pool.query<RowDataPacket[]>(`
    SELECT id, student_id, full_name, gender, contact_number, department, admission_date, is_active
    FROM students
    WHERE user_id = ?
    LIMIT 1
  `, [userId]);

  if (studentRows.length === 0) {
    throw Object.assign(new Error('Student profile not found'), { statusCode: 404 });
  }

  const student = studentRows[0];

  // 2. Active room allocation
  const [roomRows] = await pool.query<RowDataPacket[]>(`
    SELECT r.id AS room_id, r.room_number, r.block, r.floor, r.room_type, r.capacity, ra.allocated_at
    FROM room_allocations ra
    JOIN rooms r ON ra.room_id = r.id
    WHERE ra.student_id = ? AND ra.vacated_at IS NULL
    LIMIT 1
  `, [student.id]);

  const currentRoom = roomRows[0] || null;

  // 3. Fee balance and upcoming fees
  const [feeRows] = await pool.query<RowDataPacket[]>(`
    SELECT 
      f.id, f.fee_type, f.academic_period, f.amount, f.due_date,
      COALESCE(p.paid, 0) AS paid_amount,
      (f.amount - COALESCE(p.paid, 0)) AS balance
    FROM fees f
    LEFT JOIN (
      SELECT fee_id, SUM(amount) AS paid
      FROM payments
      GROUP BY fee_id
    ) p ON f.id = p.fee_id
    WHERE f.student_id = ?
    ORDER BY f.due_date ASC
  `, [student.id]);

  let totalFeeDue = 0;
  let totalFeePaid = 0;
  const upcomingFees: any[] = [];

  for (const fee of feeRows) {
    const amount = Number(fee.amount);
    const paid = Number(fee.paid_amount);
    const balance = Number(fee.balance);
    totalFeeDue += amount;
    totalFeePaid += paid;
    if (balance > 0) {
      upcomingFees.push({
        id: fee.id,
        fee_type: fee.fee_type,
        academic_period: fee.academic_period,
        amount,
        paid_amount: paid,
        balance,
        due_date: fee.due_date,
      });
    }
  }

  const outstandingBalance = Math.max(0, totalFeeDue - totalFeePaid);

  // 4. Payment history summary (last 5)
  const [paymentRows] = await pool.query<RowDataPacket[]>(`
    SELECT p.id, p.receipt_number, p.amount, p.payment_method, p.transaction_reference, p.paid_at, f.fee_type
    FROM payments p
    JOIN fees f ON p.fee_id = f.id
    WHERE f.student_id = ?
    ORDER BY p.paid_at DESC
    LIMIT 5
  `, [student.id]);

  // 5. Open complaints & latest complaint
  const [complaintRows] = await pool.query<RowDataPacket[]>(`
    SELECT c.id, c.ticket_id, c.category, c.priority, c.status, c.description, c.created_at, c.resolved_at
    FROM complaints c
    WHERE c.student_id = ?
    ORDER BY c.created_at DESC
  `, [student.id]);

  const openComplaintsCount = complaintRows.filter(
    (c) => c.status !== 'CLOSED' && c.status !== 'RESOLVED'
  ).length;
  const latestComplaint = complaintRows[0] || null;

  // 6. Current / recent leave requests
  const [leaveRows] = await pool.query<RowDataPacket[]>(`
    SELECT lr.id, lr.from_datetime, lr.to_datetime, lr.reason, lr.status, lr.gate_pass_number, lr.created_at
    FROM leave_requests lr
    WHERE lr.student_id = ?
    ORDER BY lr.created_at DESC
    LIMIT 5
  `, [student.id]);

  // 7. Latest notifications
  const [notifications] = await pool.query<RowDataPacket[]>(`
    SELECT id, type, title, message, reference_type, reference_id, is_read = 1 AS is_read, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `, [userId]);

  return {
    role: 'STUDENT',
    profile: {
      id: student.id,
      student_id: student.student_id,
      full_name: student.full_name,
      department: student.department,
      gender: student.gender,
      contact_number: student.contact_number,
      admission_date: student.admission_date,
      is_active: student.is_active === 1,
    },
    room: currentRoom,
    financial: {
      total_due: totalFeeDue,
      total_paid: totalFeePaid,
      outstanding_balance: outstandingBalance,
      upcoming_fees: upcomingFees.slice(0, 3),
      recent_payments: paymentRows,
    },
    complaints: {
      open_count: openComplaintsCount,
      total_count: complaintRows.length,
      latest: latestComplaint,
    },
    leave: {
      requests: leaveRows,
    },
    notifications,
  };
}

async function getMaintenanceDashboard(userId: number) {
  // Complaints assigned to this staff member
  const [statRows] = await pool.query<RowDataPacket[]>(`
    SELECT 
      COUNT(*) AS total_assigned_all_time,
      SUM(CASE WHEN status = 'ASSIGNED' THEN 1 ELSE 0 END) AS pending_tasks,
      SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress_tasks,
      SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved_tasks,
      SUM(CASE WHEN priority IN ('HIGH', 'URGENT') AND status IN ('ASSIGNED', 'IN_PROGRESS') THEN 1 ELSE 0 END) AS urgent_tasks
    FROM complaints
    WHERE assigned_to = ?
  `, [userId]);

  // Active tasks list
  const [taskRows] = await pool.query<RowDataPacket[]>(`
    SELECT c.id, c.ticket_id, c.category, c.priority, c.status, c.description, c.created_at,
           r.room_number, r.block, r.floor, s.full_name AS student_name, s.contact_number AS student_contact
    FROM complaints c
    JOIN rooms r ON c.room_id = r.id
    JOIN students s ON c.student_id = s.id
    WHERE c.assigned_to = ? AND c.status IN ('ASSIGNED', 'IN_PROGRESS')
    ORDER BY 
      CASE c.priority 
        WHEN 'URGENT' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        ELSE 4 
      END,
      c.created_at ASC
    LIMIT 10
  `, [userId]);

  const s = statRows[0] || {};

  return {
    role: 'MAINTENANCE',
    metrics: {
      total_assigned: Number(s.total_assigned_all_time || 0),
      pending_tasks: Number(s.pending_tasks || 0),
      in_progress_tasks: Number(s.in_progress_tasks || 0),
      resolved_tasks: Number(s.resolved_tasks || 0),
      urgent_tasks: Number(s.urgent_tasks || 0),
    },
    tasks: taskRows,
  };
}
