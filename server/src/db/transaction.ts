import type { PoolConnection } from 'mysql2/promise';
import { pool } from './pool.js';

/**
 * Run a callback inside a MySQL transaction.
 * Automatically commits on success and rolls back on error.
 *
 * @example
 * const result = await withTransaction(async (conn) => {
 *   await conn.execute('INSERT INTO users ...', [...]);
 *   await conn.execute('INSERT INTO audit_logs ...', [...]);
 *   return someValue;
 * });
 */
export async function withTransaction<T>(
  callback: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
