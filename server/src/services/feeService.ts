import { pool } from '../db/pool';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { Fee, Payment, PaginatedResult } from '../types';

export interface ListFeesOptions {
  page?: number;
  limit?: number;
  student_id?: number;
  fee_type?: string;
  status?: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
}

export async function listFees(opts: ListFeesOptions): Promise<PaginatedResult<Fee>> {
  const page = opts.page || 1;
  const limit = opts.limit || 10;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (opts.student_id) {
    conditions.push('f.student_id = ?');
    params.push(opts.student_id);
  }
  if (opts.fee_type) {
    conditions.push('f.fee_type = ?');
    params.push(opts.fee_type);
  }

  // Base query with calculated paid amount
  const baseQuery = `
    SELECT f.*,
           COALESCE((SELECT SUM(amount) FROM payments p WHERE p.fee_id = f.id), 0) as paid_amount,
           (f.amount - COALESCE((SELECT SUM(amount) FROM payments p WHERE p.fee_id = f.id), 0)) as outstanding_amount
    FROM fees f
  `;

  let havingClause = '';
  if (opts.status === 'PAID') {
    havingClause = 'HAVING outstanding_amount <= 0';
  } else if (opts.status === 'PENDING') {
    havingClause = 'HAVING paid_amount = 0 AND due_date >= CURRENT_DATE';
  } else if (opts.status === 'PARTIALLY_PAID') {
    havingClause = 'HAVING paid_amount > 0 AND outstanding_amount > 0 AND due_date >= CURRENT_DATE';
  } else if (opts.status === 'OVERDUE') {
    havingClause = 'HAVING outstanding_amount > 0 AND due_date < CURRENT_DATE';
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const fullSql = `SELECT * FROM (${baseQuery} ${whereClause}) as fee_stats ${havingClause}`;

  const countSql = `SELECT COUNT(*) as total FROM (${fullSql}) as final_count`;
  const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
  const total = countRows[0].total as number;

  const dataSql = `
    ${fullSql}
    ORDER BY due_date ASC
    LIMIT ? OFFSET ?
  `;
  const [rows] = await pool.query<RowDataPacket[]>(dataSql, [...params, limit, offset]);

  const items = rows.map((row: any) => {
    let status = 'PENDING';
    const isOverdue = new Date(row.due_date) < new Date(new Date().toDateString());
    if (row.outstanding_amount <= 0) status = 'PAID';
    else if (isOverdue) status = 'OVERDUE';
    else if (row.paid_amount > 0) status = 'PARTIALLY_PAID';
    
    return { ...row, status } as Fee;
  });

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getFeeById(id: number): Promise<Fee | null> {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT f.*,
           COALESCE((SELECT SUM(amount) FROM payments p WHERE p.fee_id = f.id), 0) as paid_amount,
           (f.amount - COALESCE((SELECT SUM(amount) FROM payments p WHERE p.fee_id = f.id), 0)) as outstanding_amount
    FROM fees f WHERE f.id = ?
  `, [id]);

  if (rows.length === 0) return null;
  const row = rows[0] as any;
  
  let status = 'PENDING';
  const isOverdue = new Date(row.due_date) < new Date(new Date().toDateString());
  if (row.outstanding_amount <= 0) status = 'PAID';
  else if (isOverdue) status = 'OVERDUE';
  else if (row.paid_amount > 0) status = 'PARTIALLY_PAID';

  return { ...row, status } as Fee;
}

export interface CreateFeeData {
  student_id: number;
  fee_type: string;
  academic_period: string;
  amount: number;
  due_date: string;
}

export async function createFee(data: CreateFeeData, actorId: number): Promise<Fee> {
  const [existing] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM fees WHERE student_id = ? AND fee_type = ? AND academic_period = ?',
    [data.student_id, data.fee_type, data.academic_period]
  );
  if (existing.length > 0) {
    throw new Error('A fee of this type and period already exists for this student');
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const [res] = await connection.execute<ResultSetHeader>(
      `INSERT INTO fees (student_id, fee_type, academic_period, amount, due_date) VALUES (?, ?, ?, ?, ?)`,
      [data.student_id, data.fee_type, data.academic_period, data.amount, data.due_date]
    );
    const feeId = res.insertId;

    await connection.execute(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [actorId, 'FEE_CREATED', 'FEE', feeId, JSON.stringify(data)]
    );

    await connection.commit();
    return (await getFeeById(feeId))!;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export interface RecordPaymentData {
  amount: number;
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'OTHER';
  transaction_reference?: string;
  notes?: string;
}

export function generateReceiptNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randHex = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `RCPT-${dateStr}-${randHex}`;
}

export async function recordPayment(feeId: number, data: RecordPaymentData, actorId: number): Promise<Payment> {
  if (data.amount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Lock the fee to prevent race conditions during payment
    const [fees] = await connection.query<RowDataPacket[]>('SELECT amount FROM fees WHERE id = ? FOR UPDATE', [feeId]);
    if (fees.length === 0) throw new Error('Fee not found');
    const totalFee = parseFloat(fees[0].amount);

    // 2. Get current paid amount
    const [payments] = await connection.query<RowDataPacket[]>('SELECT SUM(amount) as paid FROM payments WHERE fee_id = ? FOR UPDATE', [feeId]);
    const currentPaid = parseFloat(payments[0].paid || '0');
    const outstanding = totalFee - currentPaid;

    if (outstanding <= 0) {
      throw new Error('This fee is already fully paid');
    }

    if (data.amount > outstanding) {
      throw new Error(`Payment amount (${data.amount}) cannot exceed outstanding balance (${outstanding})`);
    }

    // 3. Generate unique receipt number (e.g., RCPT-YYYYMMDD-HEX)
    const receiptNum = generateReceiptNumber();

    // 4. Record the payment
    const [res] = await connection.execute<ResultSetHeader>(
      `INSERT INTO payments (fee_id, receipt_number, amount, payment_method, transaction_reference, recorded_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [feeId, receiptNum, data.amount, data.payment_method, data.transaction_reference || null, actorId, data.notes || null]
    );

    const paymentId = res.insertId;

    // 5. Audit Log
    await connection.execute(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [actorId, 'PAYMENT_RECORDED', 'PAYMENT', paymentId, JSON.stringify({ fee_id: feeId, receipt_number: receiptNum, amount: data.amount })]
    );

    await connection.commit();

    const [newPayment] = await pool.query<RowDataPacket[]>('SELECT * FROM payments WHERE id = ?', [paymentId]);
    return newPayment[0] as Payment;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function getReceiptDetails(paymentId: number): Promise<any> {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT p.*, 
           f.fee_type, f.academic_period, f.amount as total_fee,
           s.full_name as student_name, s.student_id as student_number, s.user_id as student_user_id,
           u.full_name as recorded_by_name
    FROM payments p
    JOIN fees f ON p.fee_id = f.id
    JOIN students s ON f.student_id = s.id
    JOIN users u ON p.recorded_by = u.id
    WHERE p.id = ?
  `, [paymentId]);

  if (rows.length === 0) return null;
  return rows[0];
}
