import { pool } from '../db/pool';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type { Room, RoomAllocation, PaginatedResult } from '../types';

export interface ListRoomsOptions {
  page?: number;
  limit?: number;
  search?: string;
  block?: string;
  floor?: number;
  room_type?: string;
  status?: 'AVAILABLE' | 'PARTIALLY_OCCUPIED' | 'FULL';
}

export async function listRooms(opts: ListRoomsOptions): Promise<PaginatedResult<Room>> {
  const page = opts.page || 1;
  const limit = opts.limit || 10;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (opts.search) {
    conditions.push('room_number LIKE ?');
    params.push(`%${opts.search}%`);
  }
  if (opts.block) {
    conditions.push('block = ?');
    params.push(opts.block);
  }
  if (opts.floor !== undefined) {
    conditions.push('floor = ?');
    params.push(opts.floor);
  }
  if (opts.room_type) {
    conditions.push('room_type = ?');
    params.push(opts.room_type);
  }

  // To filter by status, we must calculate occupancy in the query.
  // Using a CTE or subquery. Let's use a subquery in the FROM clause for clarity.
  const baseQuery = `
    SELECT r.*, 
           (SELECT COUNT(*) FROM room_allocations ra WHERE ra.room_id = r.id AND ra.vacated_at IS NULL) as current_occupancy
    FROM rooms r
  `;

  let havingClause = '';
  if (opts.status === 'AVAILABLE') {
    havingClause = 'HAVING current_occupancy = 0';
  } else if (opts.status === 'PARTIALLY_OCCUPIED') {
    havingClause = 'HAVING current_occupancy > 0 AND current_occupancy < capacity';
  } else if (opts.status === 'FULL') {
    havingClause = 'HAVING current_occupancy >= capacity';
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // We need to construct the full query for count and data
  const fullSql = `
    SELECT * FROM (${baseQuery} ${whereClause}) as room_stats
    ${havingClause}
  `;

  const countSql = `SELECT COUNT(*) as total FROM (${fullSql}) as final_count`;
  const [countRows] = await pool.query<RowDataPacket[]>(countSql, params);
  const total = countRows[0].total as number;

  const dataSql = `
    ${fullSql}
    ORDER BY block, floor, room_number
    LIMIT ? OFFSET ?
  `;
  const [rows] = await pool.query<RowDataPacket[]>(dataSql, [...params, limit, offset]);

  // Map to add derived status
  const items = rows.map((row: any) => {
    let status = 'AVAILABLE';
    if (row.current_occupancy > 0 && row.current_occupancy < row.capacity) status = 'PARTIALLY_OCCUPIED';
    else if (row.current_occupancy >= row.capacity) status = 'FULL';
    return { ...row, status } as Room;
  });

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getRoomById(id: number): Promise<Room | null> {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT r.*, 
           (SELECT COUNT(*) FROM room_allocations ra WHERE ra.room_id = r.id AND ra.vacated_at IS NULL) as current_occupancy
    FROM rooms r WHERE r.id = ?
  `, [id]);
  
  if (rows.length === 0) return null;
  const row = rows[0] as any;
  
  let status = 'AVAILABLE';
  if (row.current_occupancy > 0 && row.current_occupancy < row.capacity) status = 'PARTIALLY_OCCUPIED';
  else if (row.current_occupancy >= row.capacity) status = 'FULL';
  
  return { ...row, status } as Room;
}

export interface CreateRoomData {
  room_number: string;
  block: string;
  floor: number;
  room_type: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'DORMITORY';
  capacity: number;
}

export async function createRoom(data: CreateRoomData, actorId: number): Promise<Room> {
  const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM rooms WHERE room_number = ?', [data.room_number]);
  if (existing.length > 0) throw new Error('Room number already exists');

  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const [res] = await connection.execute<ResultSetHeader>(
      `INSERT INTO rooms (room_number, block, floor, room_type, capacity) VALUES (?, ?, ?, ?, ?)`,
      [data.room_number, data.block, data.floor, data.room_type, data.capacity]
    );
    const roomId = res.insertId;

    await connection.execute(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [actorId, 'ROOM_CREATED', 'ROOM', roomId, JSON.stringify(data)]
    );

    await connection.commit();
    return (await getRoomById(roomId))!;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function allocateRoom(roomId: number, studentId: number, actorId: number): Promise<void> {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    // 1. Lock the room row to prevent race conditions during capacity check
    const [rooms] = await connection.query<RowDataPacket[]>('SELECT capacity FROM rooms WHERE id = ? FOR UPDATE', [roomId]);
    if (rooms.length === 0) throw new Error('Room not found');
    const capacity = rooms[0].capacity;

    // 2. Check current active allocations for this room
    const [allocations] = await connection.query<RowDataPacket[]>(
      'SELECT COUNT(*) as current_occupancy FROM room_allocations WHERE room_id = ? AND vacated_at IS NULL',
      [roomId]
    );
    const occupancy = allocations[0].current_occupancy;

    if (occupancy >= capacity) {
      throw new Error('Room is already at full capacity');
    }

    // 3. Check if student is active and exists
    const [students] = await connection.query<RowDataPacket[]>('SELECT is_active FROM students WHERE id = ?', [studentId]);
    if (students.length === 0) throw new Error('Student not found');
    if (!students[0].is_active) throw new Error('Cannot allocate room to inactive student');

    // 4. Check if student already has an active allocation
    const [studentAllocs] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM room_allocations WHERE student_id = ? AND vacated_at IS NULL',
      [studentId]
    );
    if (studentAllocs.length > 0) {
      throw new Error('Student already has an active room allocation');
    }

    // 5. Create Allocation
    const [res] = await connection.execute<ResultSetHeader>(
      `INSERT INTO room_allocations (student_id, room_id, allocated_by) VALUES (?, ?, ?)`,
      [studentId, roomId, actorId]
    );

    // 6. Audit Log
    await connection.execute(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [actorId, 'ROOM_ALLOCATED', 'ROOM_ALLOCATION', res.insertId, JSON.stringify({ student_id: studentId, room_id: roomId })]
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function reallocateRoom(studentId: number, newRoomId: number, actorId: number): Promise<void> {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Lock the new room and check capacity
    const [rooms] = await connection.query<RowDataPacket[]>('SELECT capacity FROM rooms WHERE id = ? FOR UPDATE', [newRoomId]);
    if (rooms.length === 0) throw new Error('New room not found');
    const capacity = rooms[0].capacity;

    const [allocations] = await connection.query<RowDataPacket[]>(
      'SELECT COUNT(*) as current_occupancy FROM room_allocations WHERE room_id = ? AND vacated_at IS NULL',
      [newRoomId]
    );
    if (allocations[0].current_occupancy >= capacity) {
      throw new Error('New room is already at full capacity');
    }

    // 2. Find and lock current active allocation
    const [currentAllocs] = await connection.query<RowDataPacket[]>(
      'SELECT id, room_id FROM room_allocations WHERE student_id = ? AND vacated_at IS NULL FOR UPDATE',
      [studentId]
    );
    if (currentAllocs.length === 0) {
      throw new Error('Student does not have an active allocation to reallocate');
    }
    const currentAllocId = currentAllocs[0].id;
    const oldRoomId = currentAllocs[0].room_id;

    if (oldRoomId === newRoomId) {
      throw new Error('Student is already allocated to this room');
    }

    // 3. Vacate old room
    await connection.execute('UPDATE room_allocations SET vacated_at = CURRENT_TIMESTAMP WHERE id = ?', [currentAllocId]);

    // 4. Create new allocation
    const [res] = await connection.execute<ResultSetHeader>(
      `INSERT INTO room_allocations (student_id, room_id, allocated_by) VALUES (?, ?, ?)`,
      [studentId, newRoomId, actorId]
    );

    // 5. Audit Log
    await connection.execute(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [actorId, 'ROOM_REALLOCATED', 'ROOM_ALLOCATION', res.insertId, JSON.stringify({ student_id: studentId, old_room_id: oldRoomId, new_room_id: newRoomId })]
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function getActiveAllocationByStudentId(studentId: number): Promise<RoomAllocation | null> {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT ra.*, r.room_number, r.block, r.floor, r.room_type, r.capacity,
           (SELECT COUNT(*) FROM room_allocations ra2 WHERE ra2.room_id = r.id AND ra2.vacated_at IS NULL) as current_occupancy
    FROM room_allocations ra
    JOIN rooms r ON ra.room_id = r.id
    WHERE ra.student_id = ? AND ra.vacated_at IS NULL
  `, [studentId]);
  
  if (rows.length === 0) return null;
  return rows[0] as any; // any to bypass strict type for joined fields not in standard RoomAllocation
}

export interface UpdateRoomData {
  room_number?: string;
  block?: string;
  floor?: number;
  room_type?: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'DORMITORY';
  capacity?: number;
}

export async function updateRoom(id: number, data: UpdateRoomData, actorId: number): Promise<Room> {
  const room = await getRoomById(id);
  if (!room) {
    throw Object.assign(new Error('Room not found'), { statusCode: 404 });
  }

  if (data.room_number && data.room_number !== room.room_number) {
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM rooms WHERE room_number = ? AND id != ?', [data.room_number, id]);
    if (existing.length > 0) {
      throw Object.assign(new Error('Room number already exists'), { statusCode: 409 });
    }
  }

  if (data.capacity !== undefined) {
    if (data.capacity < (room.current_occupancy ?? 0)) {
      throw Object.assign(
        new Error(`Cannot reduce room capacity to ${data.capacity} below current occupancy (${room.current_occupancy})`),
        { statusCode: 400 }
      );
    }
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (data.room_number !== undefined) { fields.push('room_number = ?'); values.push(data.room_number); }
  if (data.block !== undefined) { fields.push('block = ?'); values.push(data.block); }
  if (data.floor !== undefined) { fields.push('floor = ?'); values.push(data.floor); }
  if (data.room_type !== undefined) { fields.push('room_type = ?'); values.push(data.room_type); }
  if (data.capacity !== undefined) { fields.push('capacity = ?'); values.push(data.capacity); }

  if (fields.length === 0) {
    return room;
  }

  values.push(id);

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    await connection.query(`UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`, values);

    await connection.execute(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [actorId, 'ROOM_UPDATED', 'ROOM', id, JSON.stringify(data)]
    );

    await connection.commit();
    return (await getRoomById(id))!;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function vacateRoom(studentId: number, actorId: number): Promise<void> {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [currentAllocs] = await connection.query<RowDataPacket[]>(
      'SELECT id, room_id FROM room_allocations WHERE student_id = ? AND vacated_at IS NULL FOR UPDATE',
      [studentId]
    );

    if (currentAllocs.length === 0) {
      throw Object.assign(new Error('Student does not have an active room allocation to vacate'), { statusCode: 400 });
    }

    const alloc = currentAllocs[0];
    await connection.execute('UPDATE room_allocations SET vacated_at = CURRENT_TIMESTAMP WHERE id = ?', [alloc.id]);

    await connection.execute(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [actorId, 'ROOM_VACATED', 'ROOM_ALLOCATION', alloc.id, JSON.stringify({ student_id: studentId, room_id: alloc.room_id })]
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

