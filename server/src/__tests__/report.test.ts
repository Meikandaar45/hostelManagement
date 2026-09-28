import { describe, it, expect, vi } from 'vitest';
import * as reportService from '../services/reportService.js';
import { pool } from '../db/pool.js';
import { hasPermission, Role, Permission } from '../config/permissions.js';

describe('Reporting Service & RBAC', () => {
  it('enforces RBAC: Only ADMIN and WARDEN have VIEW_REPORTS permission', () => {
    expect(hasPermission('ADMIN', Permission.VIEW_REPORTS)).toBe(true);
    expect(hasPermission('WARDEN', Permission.VIEW_REPORTS)).toBe(true);
    expect(hasPermission('STUDENT', Permission.VIEW_REPORTS)).toBe(false);
    expect(hasPermission('MAINTENANCE', Permission.VIEW_REPORTS)).toBe(false);
  });

  it('getStudentReport builds parameterized queries with pagination and filters', async () => {
    let capturedParams: any[] = [];
    vi.spyOn(pool, 'query').mockImplementation(async (sql: any, params: any) => {
      const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
      capturedParams = params || [];
      if (sqlStr.includes('COUNT(*) AS total')) {
        return [[{ total: 2 }]] as any;
      }
      return [[
        { id: 1, student_id: 'STU01', full_name: 'Bob', department: 'CS', gender: 'MALE', is_active: 1 },
        { id: 2, student_id: 'STU02', full_name: 'Carol', department: 'CS', gender: 'FEMALE', is_active: 1 },
      ]] as any;
    });

    const res = await reportService.getStudentReport({
      department: 'CS',
      gender: 'MALE',
      is_active: 'true',
      from: '2023-01-01',
      to: '2023-12-31',
      page: 1,
      limit: 10,
    });

    expect(res.total).toBe(2);
    expect(res.items.length).toBe(2);
    expect(capturedParams).toContain('CS');
    expect(capturedParams).toContain('MALE');
    expect(capturedParams).toContain(1);
    expect(capturedParams).toContain('2023-01-01');
    expect(capturedParams).toContain('2023-12-31');

    vi.restoreAllMocks();
  });

  it('getRoomOccupancyReport dynamically calculates occupancy without redundant storage', async () => {
    let executedSql = '';
    vi.spyOn(pool, 'query').mockImplementation(async (sql: any) => {
      executedSql = typeof sql === 'string' ? sql : sql.sql || '';
      if (executedSql.includes('COUNT(*) AS total')) {
        return [[{ total: 1 }]] as any;
      }
      return [[
        {
          id: 1,
          room_number: '101',
          block: 'A',
          floor: 1,
          room_type: 'DOUBLE',
          capacity: 2,
          occupied_count: 1,
          available_capacity: 1,
          status: 'PARTIALLY_OCCUPIED',
        },
      ]] as any;
    });

    const res = await reportService.getRoomOccupancyReport({ status: 'PARTIALLY_OCCUPIED' });

    expect(executedSql).toContain('room_allocations');
    expect(executedSql).toContain('vacated_at IS NULL');
    expect(res.items[0].status).toBe('PARTIALLY_OCCUPIED');
    expect(res.items[0].available_capacity).toBe(1);

    vi.restoreAllMocks();
  });

  it('getFeeReport categorizes fees by payment status correctly', async () => {
    vi.spyOn(pool, 'query').mockImplementation(async (sql: any) => {
      const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
      if (sqlStr.includes('COUNT(*) AS total')) {
        return [[{ total: 2 }]] as any;
      }
      return [[
        { id: 1, student_id: 'S1', amount: 5000, paid_amount: 5000, balance: 0, status: 'PAID' },
        { id: 2, student_id: 'S2', amount: 5000, paid_amount: 2000, balance: 3000, status: 'PARTIALLY_PAID' },
      ]] as any;
    });

    const res = await reportService.getFeeReport({ page: 1, limit: 10 });
    expect(res.items.length).toBe(2);
    expect(res.items[0].status).toBe('PAID');
    expect(res.items[1].status).toBe('PARTIALLY_PAID');

    vi.restoreAllMocks();
  });

  it('uses an allowlisted ORDER BY expression for report sorting', async () => {
    let dataSql = '';
    vi.spyOn(pool, 'query').mockImplementation(async (sql: any) => {
      const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
      if (sqlStr.includes('COUNT(*) AS total')) {
        return [[{ total: 0 }]] as any;
      }
      dataSql = sqlStr;
      return [[]] as any;
    });

    await reportService.getPaymentReport({
      sortBy: 'amount',
      sortOrder: 'ASC',
      page: 1,
      limit: 20,
    });

    expect(dataSql).toContain('ORDER BY p.amount ASC');

    vi.restoreAllMocks();
  });

  it('falls back to the default ORDER BY for unsupported service sort fields', async () => {
    let dataSql = '';
    vi.spyOn(pool, 'query').mockImplementation(async (sql: any) => {
      const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
      if (sqlStr.includes('COUNT(*) AS total')) {
        return [[{ total: 0 }]] as any;
      }
      dataSql = sqlStr;
      return [[]] as any;
    });

    await reportService.getPaymentReport({
      sortBy: 'p.amount; DROP TABLE users',
      sortOrder: 'ASC',
      page: 1,
      limit: 20,
    });

    expect(dataSql).toContain('ORDER BY p.paid_at DESC');
    expect(dataSql).not.toContain('DROP TABLE');

    vi.restoreAllMocks();
  });
});
