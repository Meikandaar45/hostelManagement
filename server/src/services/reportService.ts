import { pool } from '../db/pool.js';
import type { RowDataPacket } from 'mysql2/promise';

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

function resolveOrderBy(
  sortBy: string | undefined,
  sortOrder: 'ASC' | 'DESC' | undefined,
  allowlist: Record<string, string>,
  fallback: string
) {
  if (!sortBy || !allowlist[sortBy]) return fallback;
  const direction = sortOrder === 'ASC' ? 'ASC' : 'DESC';
  return `${allowlist[sortBy]} ${direction}`;
}

export interface StudentReportQuery extends PaginationQuery {
  department?: string;
  gender?: string;
  is_active?: string;
  from?: string;
  to?: string;
}

export async function getStudentReport(query: StudentReportQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(1000, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (query.department) {
    conditions.push('s.department = ?');
    params.push(query.department);
  }
  if (query.gender) {
    conditions.push('s.gender = ?');
    params.push(query.gender);
  }
  if (query.is_active !== undefined && query.is_active !== '') {
    conditions.push('s.is_active = ?');
    params.push(query.is_active === 'true' || query.is_active === '1' ? 1 : 0);
  }
  if (query.from) {
    conditions.push('s.admission_date >= ?');
    params.push(query.from);
  }
  if (query.to) {
    conditions.push('s.admission_date <= ?');
    params.push(query.to);
  }
  if (query.search) {
    conditions.push('(s.student_id LIKE ? OR s.full_name LIKE ? OR s.contact_number LIKE ?)');
    const term = `%${query.search}%`;
    params.push(term, term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = resolveOrderBy(query.sortBy, query.sortOrder, {
    student_id: 's.student_id',
    full_name: 's.full_name',
    department: 's.department',
    admission_date: 's.admission_date',
    status: 's.is_active',
  }, 's.admission_date DESC, s.id DESC');

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM students s ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       s.id, s.student_id, s.full_name, s.gender, s.contact_number, s.department, s.admission_date,
       s.is_active = 1 AS is_active,
       r.room_number, r.block, r.floor
     FROM students s
     LEFT JOIN room_allocations ra ON s.id = ra.student_id AND ra.vacated_at IS NULL
     LEFT JOIN rooms r ON ra.room_id = r.id
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export interface RoomReportQuery extends PaginationQuery {
  block?: string;
  floor?: number;
  room_type?: string;
  status?: string; // AVAILABLE, PARTIALLY_OCCUPIED, FULL
}

export async function getRoomOccupancyReport(query: RoomReportQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(1000, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (query.block) {
    conditions.push('r.block = ?');
    params.push(query.block);
  }
  if (query.floor !== undefined) {
    conditions.push('r.floor = ?');
    params.push(query.floor);
  }
  if (query.room_type) {
    conditions.push('r.room_type = ?');
    params.push(query.room_type);
  }
  if (query.search) {
    conditions.push('(r.room_number LIKE ? OR r.block LIKE ?)');
    const term = `%${query.search}%`;
    params.push(term, term);
  }

  // Base query with dynamically calculated active allocations
  const baseFromClause = `
    FROM rooms r
    LEFT JOIN (
      SELECT room_id, COUNT(*) AS occupied_count
      FROM room_allocations
      WHERE vacated_at IS NULL
      GROUP BY room_id
    ) alloc ON r.id = alloc.room_id
  `;

  let havingClause = '';
  const havingParams: any[] = [];
  if (query.status === 'AVAILABLE') {
    havingClause = 'HAVING occupied_count = 0';
  } else if (query.status === 'PARTIALLY_OCCUPIED') {
    havingClause = 'HAVING occupied_count > 0 AND occupied_count < capacity';
  } else if (query.status === 'FULL') {
    havingClause = 'HAVING occupied_count >= capacity';
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = resolveOrderBy(query.sortBy, query.sortOrder, {
    block: 'r.block',
    floor: 'r.floor',
    room_number: 'r.room_number',
    room_type: 'r.room_type',
    capacity: 'r.capacity',
    occupied_count: 'occupied_count',
    status: 'status',
  }, 'r.block ASC, r.floor ASC, r.room_number ASC');

  // Count query
  const countSql = `
    SELECT COUNT(*) AS total FROM (
      SELECT r.id, r.capacity, COALESCE(alloc.occupied_count, 0) AS occupied_count
      ${baseFromClause}
      ${whereClause}
      ${havingClause}
    ) sub
  `;
  const [countRows] = await pool.query<RowDataPacket[]>(countSql, [...params, ...havingParams]);
  const total = Number(countRows[0]?.total || 0);

  // Data query
  const dataSql = `
    SELECT 
      r.id, r.room_number, r.block, r.floor, r.room_type, r.capacity,
      COALESCE(alloc.occupied_count, 0) AS occupied_count,
      GREATEST(0, r.capacity - COALESCE(alloc.occupied_count, 0)) AS available_capacity,
      CASE 
        WHEN COALESCE(alloc.occupied_count, 0) >= r.capacity THEN 'FULL'
        WHEN COALESCE(alloc.occupied_count, 0) > 0 THEN 'PARTIALLY_OCCUPIED'
        ELSE 'AVAILABLE'
      END AS status
    ${baseFromClause}
    ${whereClause}
    ${havingClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query<RowDataPacket[]>(dataSql, [
    ...params,
    ...havingParams,
    limit,
    offset,
  ]);

  return {
    items: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export interface FeeReportQuery extends PaginationQuery {
  academic_period?: string;
  fee_type?: string;
  status?: string; // PAID, PARTIALLY_PAID, PENDING, OVERDUE
  from?: string;
  to?: string;
}

export async function getFeeReport(query: FeeReportQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(1000, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (query.academic_period) {
    conditions.push('f.academic_period = ?');
    params.push(query.academic_period);
  }
  if (query.fee_type) {
    conditions.push('f.fee_type = ?');
    params.push(query.fee_type);
  }
  if (query.from) {
    conditions.push('f.due_date >= ?');
    params.push(query.from);
  }
  if (query.to) {
    conditions.push('f.due_date <= ?');
    params.push(query.to);
  }
  if (query.search) {
    conditions.push('(s.student_id LIKE ? OR s.full_name LIKE ? OR f.fee_type LIKE ?)');
    const term = `%${query.search}%`;
    params.push(term, term, term);
  }

  const baseFromClause = `
    FROM fees f
    JOIN students s ON f.student_id = s.id
    LEFT JOIN (
      SELECT fee_id, SUM(amount) AS paid_amount
      FROM payments
      GROUP BY fee_id
    ) p ON f.id = p.fee_id
  `;

  let havingClause = '';
  if (query.status === 'PAID') {
    havingClause = 'HAVING balance <= 0';
  } else if (query.status === 'PARTIALLY_PAID') {
    havingClause = 'HAVING paid_amount > 0 AND balance > 0';
  } else if (query.status === 'PENDING') {
    havingClause = 'HAVING paid_amount = 0';
  } else if (query.status === 'OVERDUE') {
    havingClause = 'HAVING balance > 0 AND f.due_date < CURDATE()';
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = resolveOrderBy(query.sortBy, query.sortOrder, {
    student_name: 's.full_name',
    fee_type: 'f.fee_type',
    amount: 'f.amount',
    paid_amount: 'paid_amount',
    balance: 'balance',
    due_date: 'f.due_date',
    status: 'status',
  }, 'f.due_date ASC, f.id DESC');

  const countSql = `
    SELECT COUNT(*) AS total FROM (
      SELECT f.id, f.due_date, COALESCE(p.paid_amount, 0) AS paid_amount, (f.amount - COALESCE(p.paid_amount, 0)) AS balance
      ${baseFromClause}
      ${whereClause}
      ${havingClause}
    ) sub
  `;
  const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
  const total = Number(countRows[0]?.total || 0);

  const dataSql = `
    SELECT 
      f.id, f.student_id AS student_db_id, s.student_id, s.full_name AS student_name,
      f.fee_type, f.academic_period, f.amount,
      COALESCE(p.paid_amount, 0) AS paid_amount,
      (f.amount - COALESCE(p.paid_amount, 0)) AS balance,
      f.due_date,
      CASE 
        WHEN COALESCE(p.paid_amount, 0) >= f.amount THEN 'PAID'
        WHEN COALESCE(p.paid_amount, 0) > 0 THEN 'PARTIALLY_PAID'
        WHEN f.due_date < CURDATE() THEN 'OVERDUE'
        ELSE 'PENDING'
      END AS status
    ${baseFromClause}
    ${whereClause}
    ${havingClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const [rows] = await pool.query<RowDataPacket[]>(dataSql, [...params, limit, offset]);

  return {
    items: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export interface PaymentReportQuery extends PaginationQuery {
  payment_method?: string;
  fee_type?: string;
  from?: string;
  to?: string;
}

export async function getPaymentReport(query: PaymentReportQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(1000, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (query.payment_method) {
    conditions.push('p.payment_method = ?');
    params.push(query.payment_method);
  }
  if (query.fee_type) {
    conditions.push('f.fee_type = ?');
    params.push(query.fee_type);
  }
  if (query.from) {
    conditions.push('p.paid_at >= ?');
    params.push(query.from);
  }
  if (query.to) {
    conditions.push('p.paid_at <= ?');
    params.push(query.to);
  }
  if (query.search) {
    conditions.push('(p.receipt_number LIKE ? OR s.student_id LIKE ? OR s.full_name LIKE ? OR p.transaction_reference LIKE ?)');
    const term = `%${query.search}%`;
    params.push(term, term, term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = resolveOrderBy(query.sortBy, query.sortOrder, {
    receipt_number: 'p.receipt_number',
    student_name: 's.full_name',
    amount: 'p.amount',
    payment_method: 'p.payment_method',
    paid_at: 'p.paid_at',
  }, 'p.paid_at DESC');

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM payments p
     JOIN fees f ON p.fee_id = f.id
     JOIN students s ON f.student_id = s.id
     ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       p.id, p.receipt_number, p.amount, p.payment_method, p.transaction_reference, p.paid_at,
       s.student_id, s.full_name AS student_name,
       f.fee_type, f.academic_period,
       u.full_name AS recorded_by_name
     FROM payments p
     JOIN fees f ON p.fee_id = f.id
     JOIN students s ON f.student_id = s.id
     LEFT JOIN users u ON p.recorded_by = u.id
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export interface ComplaintReportQuery extends PaginationQuery {
  status?: string;
  category?: string;
  priority?: string;
  assigned_to?: number;
  from?: string;
  to?: string;
}

export async function getComplaintReport(query: ComplaintReportQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(1000, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

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
  if (query.assigned_to) {
    conditions.push('c.assigned_to = ?');
    params.push(query.assigned_to);
  }
  if (query.from) {
    conditions.push('c.created_at >= ?');
    params.push(query.from);
  }
  if (query.to) {
    conditions.push('c.created_at <= ?');
    params.push(query.to);
  }
  if (query.search) {
    conditions.push('(c.ticket_id LIKE ? OR s.student_id LIKE ? OR s.full_name LIKE ? OR r.room_number LIKE ?)');
    const term = `%${query.search}%`;
    params.push(term, term, term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = resolveOrderBy(query.sortBy, query.sortOrder, {
    ticket_id: 'c.ticket_id',
    student_name: 's.full_name',
    category: 'c.category',
    priority: 'c.priority',
    status: 'c.status',
    created_at: 'c.created_at',
    resolved_at: 'c.resolved_at',
  }, 'c.created_at DESC');

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM complaints c
     JOIN students s ON c.student_id = s.id
     JOIN rooms r ON c.room_id = r.id
     ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       c.id, c.ticket_id, c.category, c.priority, c.status, c.description, c.created_at, c.resolved_at,
       s.student_id, s.full_name AS student_name,
       r.room_number, r.block,
       u.full_name AS assigned_staff_name
     FROM complaints c
     JOIN students s ON c.student_id = s.id
     JOIN rooms r ON c.room_id = r.id
     LEFT JOIN users u ON c.assigned_to = u.id
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export interface LeaveReportQuery extends PaginationQuery {
  status?: string;
  from?: string;
  to?: string;
}

export async function getLeaveReport(query: LeaveReportQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(1000, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (query.status) {
    conditions.push('lr.status = ?');
    params.push(query.status);
  }
  if (query.from) {
    conditions.push('lr.from_datetime >= ?');
    params.push(query.from);
  }
  if (query.to) {
    conditions.push('lr.to_datetime <= ?');
    params.push(query.to);
  }
  if (query.search) {
    conditions.push('(s.student_id LIKE ? OR s.full_name LIKE ? OR lr.gate_pass_number LIKE ?)');
    const term = `%${query.search}%`;
    params.push(term, term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = resolveOrderBy(query.sortBy, query.sortOrder, {
    student_name: 's.full_name',
    from_datetime: 'lr.from_datetime',
    to_datetime: 'lr.to_datetime',
    status: 'lr.status',
    created_at: 'lr.created_at',
  }, 'lr.created_at DESC');

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM leave_requests lr
     JOIN students s ON lr.student_id = s.id
     ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       lr.id, lr.from_datetime, lr.to_datetime, lr.reason, lr.status, lr.gate_pass_number, lr.created_at,
       s.student_id, s.full_name AS student_name, s.department,
       u.full_name AS reviewed_by_name
     FROM leave_requests lr
     JOIN students s ON lr.student_id = s.id
     LEFT JOIN users u ON lr.reviewed_by = u.id
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export interface VisitorReportQuery extends PaginationQuery {
  status?: string; // INSIDE or EXITED
  from?: string;
  to?: string;
}

export async function getVisitorReport(query: VisitorReportQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(1000, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (query.status === 'INSIDE') {
    conditions.push('vl.exit_at IS NULL');
  } else if (query.status === 'EXITED') {
    conditions.push('vl.exit_at IS NOT NULL');
  }
  if (query.from) {
    conditions.push('vl.entry_at >= ?');
    params.push(query.from);
  }
  if (query.to) {
    conditions.push('vl.entry_at <= ?');
    params.push(query.to);
  }
  if (query.search) {
    conditions.push('(vl.visitor_name LIKE ? OR vl.phone LIKE ? OR s.student_id LIKE ? OR s.full_name LIKE ?)');
    const term = `%${query.search}%`;
    params.push(term, term, term, term);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = resolveOrderBy(query.sortBy, query.sortOrder, {
    visitor_name: 'vl.visitor_name',
    student_name: 's.full_name',
    entry_at: 'vl.entry_at',
    exit_at: 'vl.exit_at',
  }, 'vl.entry_at DESC');

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total
     FROM visitor_logs vl
     JOIN students s ON vl.student_id = s.id
     ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       vl.id, vl.visitor_name, vl.phone, vl.purpose, vl.entry_at, vl.exit_at, vl.notes,
       s.student_id, s.full_name AS student_name,
       u.full_name AS recorded_by_name
     FROM visitor_logs vl
     JOIN students s ON vl.student_id = s.id
     LEFT JOIN users u ON vl.recorded_by = u.id
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
