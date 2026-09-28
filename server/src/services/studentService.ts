import { pool } from '../db/pool.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { Student, PaginatedResult } from '../types/index.js';
import { hashPassword } from '../utils/password.js';

export interface ListStudentsOptions {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  is_active?: boolean;
}

export async function listStudents(opts: ListStudentsOptions): Promise<PaginatedResult<Student>> {
  const page = opts.page || 1;
  const limit = opts.limit || 10;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (opts.search) {
    conditions.push('(student_id LIKE ? OR full_name LIKE ?)');
    params.push(`%${opts.search}%`, `%${opts.search}%`);
  }
  if (opts.department) {
    conditions.push('department = ?');
    params.push(opts.department);
  }
  if (opts.is_active !== undefined) {
    conditions.push('is_active = ?');
    params.push(opts.is_active);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) as total FROM students ${whereClause}`;
  const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
  const total = countRows[0].total as number;

  const sql = `
    SELECT * FROM students
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;
  const [rows] = await pool.query<RowDataPacket[]>(sql, [...params, limit, offset]);

  return {
    items: rows as Student[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getStudentById(id: number): Promise<Student | null> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM students WHERE id = ?', [id]);
  if (rows.length === 0) return null;
  return rows[0] as Student;
}

export interface CreateStudentData {
  student_id: string;
  full_name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  contact_number: string;
  address: string;
  department: string;
  admission_date: string;
  email: string; // Used to create the associated user account
}

export async function createStudent(data: CreateStudentData, actorId: number): Promise<Student> {
  // First, verify if student_id is already in use
  const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM students WHERE student_id = ?', [data.student_id]);
  if (existing.length > 0) {
    throw new Error('Student ID already exists');
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Create User account for the student
    const [existingUser] = await connection.query<RowDataPacket[]>('SELECT id FROM users WHERE email = ? OR username = ?', [data.email, data.student_id]);
    if (existingUser.length > 0) {
      throw new Error('User with this email or username already exists');
    }

    // Hash a default password or let them reset it. Using student_id as default password.
    const passwordHash = await hashPassword(data.student_id);

    const [userRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO users (username, email, password, full_name, role, is_active) VALUES (?, ?, ?, ?, 'STUDENT', 1)`,
      [data.student_id, data.email, passwordHash, data.full_name]
    );
    const userId = userRes.insertId;

    // 2. Create Student profile
    const [studentRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO students (user_id, student_id, full_name, gender, contact_number, address, department, admission_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, data.student_id, data.full_name, data.gender, data.contact_number, data.address, data.department, data.admission_date]
    );
    const studentId = studentRes.insertId;

    // 3. Audit Log
    await connection.execute(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [actorId, 'STUDENT_CREATED', 'STUDENT', studentId, JSON.stringify({ student_id: data.student_id })]
    );

    await connection.commit();
    return (await getStudentById(studentId))!;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export interface UpdateStudentData {
  full_name?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  contact_number?: string;
  address?: string;
  department?: string;
}

export async function updateStudent(id: number, data: UpdateStudentData, actorId: number): Promise<Student> {
  const fields: string[] = [];
  const values: any[] = [];

  if (data.full_name !== undefined) { fields.push('full_name = ?'); values.push(data.full_name); }
  if (data.gender !== undefined) { fields.push('gender = ?'); values.push(data.gender); }
  if (data.contact_number !== undefined) { fields.push('contact_number = ?'); values.push(data.contact_number); }
  if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address); }
  if (data.department !== undefined) { fields.push('department = ?'); values.push(data.department); }

  if (fields.length === 0) {
    return (await getStudentById(id))!;
  }

  values.push(id);

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    await connection.query(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, values);
    
    // Sync full_name to user account if it changed
    if (data.full_name) {
      const student = await getStudentById(id);
      if (student) {
        await connection.query('UPDATE users SET full_name = ? WHERE id = ?', [data.full_name, student.user_id]);
      }
    }

    await connection.execute(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [actorId, 'STUDENT_UPDATED', 'STUDENT', id, JSON.stringify(data)]
    );

    await connection.commit();
    return (await getStudentById(id))!;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function setStudentStatus(id: number, is_active: boolean, actorId: number): Promise<void> {
  const student = await getStudentById(id);
  if (!student) throw new Error('Student not found');

  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    await connection.execute('UPDATE students SET is_active = ? WHERE id = ?', [is_active, id]);
    await connection.execute('UPDATE users SET is_active = ? WHERE id = ?', [is_active, student.user_id]);
    
    await connection.execute(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [actorId, 'STUDENT_STATUS_CHANGED', 'STUDENT', id, JSON.stringify({ is_active })]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
