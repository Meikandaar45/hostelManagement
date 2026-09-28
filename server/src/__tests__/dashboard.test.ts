import { describe, it, expect, vi } from 'vitest';
import { getDashboardSummary } from '../services/dashboardService.js';
import { pool } from '../db/pool.js';
import type { AuthUser } from '../types/index.js';

describe('Dashboard Service - Role-Based Scoping & Security', () => {
  it('ADMIN dashboard returns full organizational metrics and recent activity', async () => {
    const adminUser: AuthUser = {
      id: 1,
      username: 'admin',
      email: 'admin@hostel.com',
      full_name: 'System Admin',
      role: 'ADMIN',
      is_active: true,
    };

    // Mock query calls for admin dashboard
    vi.spyOn(pool, 'query').mockImplementation(async (sql: any) => {
      const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
      if (sqlStr.includes('FROM students')) {
        return [[{ total_students: 50, active_students: 48 }]] as any;
      }
      if (sqlStr.includes('FROM rooms')) {
        return [[{
          total_rooms: 25,
          total_capacity: 60,
          occupied_beds: 45,
          occupied_rooms: 20,
          available_rooms: 5,
          full_rooms: 15,
        }]] as any;
      }
      if (sqlStr.includes('FROM fees')) {
        return [[{
          total_fees_count: 50,
          total_fee_amount: 250000,
          total_paid_amount: 200000,
          pending_fee_count: 10,
          overdue_fee_count: 2,
          pending_fee_balance: 50000,
        }]] as any;
      }
      if (sqlStr.includes('FROM payments')) {
        return [[{ total_payments_count: 45, total_payments_sum: 200000 }]] as any;
      }
      if (sqlStr.includes('FROM complaints')) {
        return [[{
          total_complaints: 12,
          pending_complaints: 3,
          open_complaints: 5,
          active_maintenance_tasks: 2,
        }]] as any;
      }
      if (sqlStr.includes('FROM visitor_logs')) {
        return [[{ total_visitors: 30, current_visitors: 4 }]] as any;
      }
      if (sqlStr.includes('FROM leave_requests')) {
        return [[{ total_leave_requests: 18, pending_leave_requests: 3, approved_leave_requests: 12 }]] as any;
      }
      // Recent activity mocks
      return [[]] as any;
    });

    const summary = await getDashboardSummary(adminUser);

    expect(summary.role).toBe('ADMIN');
    expect(summary.metrics.total_students).toBe(50);
    expect(summary.metrics.active_students).toBe(48);
    expect(summary.metrics.total_rooms).toBe(25);
    expect(summary.metrics.occupied_beds).toBe(45);
    expect(summary.metrics.pending_fees).toBe(10);
    expect(summary.metrics.overdue_fees).toBe(2);
    expect(summary.metrics.open_complaints).toBe(5);
    expect(summary.metrics.current_visitors).toBe(4);
    expect(summary.recent).toBeDefined();

    vi.restoreAllMocks();
  });

  it('STUDENT dashboard isolates data strictly to authenticated student', async () => {
    const studentUser: AuthUser = {
      id: 10,
      username: 'stu_10',
      email: 'stu10@test.com',
      full_name: 'Student Ten',
      role: 'STUDENT',
      is_active: true,
    };

    let queriedUserId: any = null;

    vi.spyOn(pool, 'query').mockImplementation(async (sql: any, params: any) => {
      const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
      if (sqlStr.includes('FROM students') && sqlStr.includes('WHERE user_id = ?')) {
        queriedUserId = params?.[0];
        return [[{
          id: 5,
          student_id: 'STU005',
          full_name: 'Student Ten',
          gender: 'MALE',
          contact_number: '9876543210',
          department: 'Computer Science',
          admission_date: '2023-08-01',
          is_active: 1,
        }]] as any;
      }
      if (sqlStr.includes('FROM room_allocations')) {
        return [[{
          room_id: 12,
          room_number: '204',
          block: 'A',
          floor: 2,
          room_type: 'DOUBLE',
          capacity: 2,
          allocated_at: '2023-08-01',
        }]] as any;
      }
      if (sqlStr.includes('FROM fees')) {
        return [[
          { id: 1, fee_type: 'HOSTEL_FEE', academic_period: '2023-24', amount: 5000, due_date: '2026-10-01', paid_amount: 3000, balance: 2000 },
        ]] as any;
      }
      if (sqlStr.includes('FROM payments')) {
        return [[{ id: 1, receipt_number: 'REC-101', amount: 3000, payment_method: 'UPI', paid_at: '2026-09-01' }]] as any;
      }
      if (sqlStr.includes('FROM complaints')) {
        return [[{ id: 1, ticket_id: 'CMP-20260901-ABCDE', category: 'ELECTRICAL', priority: 'HIGH', status: 'IN_PROGRESS', description: 'Fan issue' }]] as any;
      }
      if (sqlStr.includes('FROM leave_requests')) {
        return [[{ id: 1, from_datetime: '2026-10-01', to_datetime: '2026-10-05', status: 'APPROVED', gate_pass_number: 'GP-2026-X1Y2Z3' }]] as any;
      }
      if (sqlStr.includes('FROM notifications')) {
        return [[{ id: 1, title: 'Welcome', message: 'Hello', is_read: 0 }]] as any;
      }
      return [[]] as any;
    });

    const summary = await getDashboardSummary(studentUser);

    expect(queriedUserId).toBe(studentUser.id);
    expect(summary.role).toBe('STUDENT');
    expect(summary.profile.student_id).toBe('STU005');
    expect(summary.room.room_number).toBe('204');
    expect(summary.financial.outstanding_balance).toBe(2000);
    expect(summary.complaints.open_count).toBe(1);
    expect(summary.leave.requests[0].gate_pass_number).toBe('GP-2026-X1Y2Z3');

    vi.restoreAllMocks();
  });

  it('MAINTENANCE dashboard filters tasks strictly by assigned_to user ID', async () => {
    const maintUser: AuthUser = {
      id: 8,
      username: 'tech1',
      email: 'tech1@hostel.com',
      full_name: 'Technician One',
      role: 'MAINTENANCE',
      is_active: true,
    };

    let assignedToFilter: any = null;

    vi.spyOn(pool, 'query').mockImplementation(async (sql: any, params: any) => {
      const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
      if (sqlStr.includes('WHERE assigned_to = ?') || sqlStr.includes('WHERE c.assigned_to = ?')) {
        assignedToFilter = params?.[0];
      }
      if (sqlStr.includes('COUNT(*) AS total_assigned_all_time')) {
        return [[{
          total_assigned_all_time: 15,
          pending_tasks: 3,
          in_progress_tasks: 2,
          resolved_tasks: 10,
          urgent_tasks: 1,
        }]] as any;
      }
      return [[{
        id: 101,
        ticket_id: 'CMP-20260901-XYZ12',
        category: 'PLUMBING',
        priority: 'URGENT',
        status: 'IN_PROGRESS',
        description: 'Leaking tap',
        room_number: '101',
        block: 'B',
        floor: 1,
        student_name: 'Alice',
        student_contact: '1234567890',
      }]] as any;
    });

    const summary = await getDashboardSummary(maintUser);

    expect(assignedToFilter).toBe(maintUser.id);
    expect(summary.role).toBe('MAINTENANCE');
    expect(summary.metrics.pending_tasks).toBe(3);
    expect(summary.metrics.in_progress_tasks).toBe(2);
    expect(summary.metrics.urgent_tasks).toBe(1);
    expect(summary.tasks.length).toBe(1);
    expect(summary.tasks[0].priority).toBe('URGENT');

    vi.restoreAllMocks();
  });
});
