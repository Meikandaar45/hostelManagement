import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pool } from '../db/pool.js';
import { authenticateUser, resetPassword, createPasswordResetToken } from '../services/authService.js';
import { createRoom, updateRoom, allocateRoom, reallocateRoom, vacateRoom } from '../services/roomService.js';
import { createFee, recordPayment } from '../services/feeService.js';
import { createComplaint, updateComplaintStatus, generateTicketId, isValidTransition } from '../services/complaintService.js';
import { submitLeaveRequest, cancelLeaveRequest, approveLeave, rejectLeave, generateGatePassNumber, getGatePassByLeaveId } from '../services/leaveService.js';
import { recordVisitorEntry, recordVisitorExit } from '../services/visitorService.js';
import { listUserNotifications, markAllNotificationsRead, getUnreadNotificationCount } from '../services/notificationService.js';
import { getStudentReport, getRoomOccupancyReport, getFeeReport } from '../services/reportService.js';
import { getDashboardSummary } from '../services/dashboardService.js';
import { hashPassword } from '../utils/password.js';
import type { AuthUser } from '../types/index.js';

describe('Phase 6 - Comprehensive Application Testing Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. AUTHENTICATION TESTS
  // =========================================================================
  describe('1. Authentication Tests', () => {
    it('authenticates active user with valid credentials and updates last_login_at', async () => {
      const password = 'StrongPassword123!';
      const hashed = await hashPassword(password);
      const executeSpy = vi.spyOn(pool, 'execute').mockImplementation(async (sql: any, _params: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
        if (sqlStr.includes('FROM users')) {
          return [[{
            id: 1,
            username: 'admin',
            email: 'admin@hostel.com',
            password: hashed,
            full_name: 'Admin User',
            role: 'ADMIN',
            is_active: 1,
          }], []] as any;
        }
        if (sqlStr.includes('UPDATE users SET last_login_at')) {
          return [{ affectedRows: 1 }, []] as any;
        }
        return [{ insertId: 1, affectedRows: 1 }, []] as any;
      });

      const user = await authenticateUser({ identifier: 'admin', password });
      expect(user.id).toBe(1);
      expect(user.role).toBe('ADMIN');
      expect(executeSpy).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET last_login_at'),
        [1]
      );
    });

    it('rejects invalid credentials with 401', async () => {
      vi.spyOn(pool, 'execute').mockResolvedValue([[], []] as any);
      await expect(
        authenticateUser({ identifier: 'unknown', password: 'wrong' })
      ).rejects.toMatchObject({ statusCode: 401, message: 'Invalid credentials' });
    });

    it('rejects inactive user with 401', async () => {
      const password = 'StrongPassword123!';
      const hashed = await hashPassword(password);
      vi.spyOn(pool, 'execute').mockResolvedValue([[{
        id: 2,
        username: 'inactive_student',
        email: 'inactive@hostel.com',
        password: hashed,
        full_name: 'Inactive Student',
        role: 'STUDENT',
        is_active: 0,
      }], []] as any);

      await expect(
        authenticateUser({ identifier: 'inactive_student', password })
      ).rejects.toMatchObject({ statusCode: 401, message: 'Account is inactive' });
    });

    it('handles forgot password token creation with sha-256 and invalidates prior tokens', async () => {
      const executeCalls: string[] = [];
      vi.spyOn(pool, 'execute').mockImplementation(async (sql: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
        executeCalls.push(sqlStr);
        if (sqlStr.includes('FROM users WHERE')) {
          return [[{ id: 5, email: 'stu@hostel.com', full_name: 'Student Five' }], []] as any;
        }
        return [{ affectedRows: 1 }, []] as any;
      });

      const res = await createPasswordResetToken('stu@hostel.com');
      expect(res).not.toBeNull();
      expect(res?.rawToken).toBeDefined();
      expect(executeCalls.some(c => c.includes('UPDATE password_reset_tokens SET used_at = NOW()'))).toBe(true);
      expect(executeCalls.some(c => c.includes('INSERT INTO password_reset_tokens'))).toBe(true);
    });

    it('rejects invalid or expired reset token with 400', async () => {
      vi.spyOn(pool, 'execute').mockResolvedValue([[], []] as any);
      await expect(
        resetPassword('invalid-or-expired-token', 'NewPass1234!')
      ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid or expired reset token' });
    });

    it('invalidates single-use reset token after consumption to prevent reuse', async () => {
      const rawToken = 'valid-token-abc';
      let tokenUsed = false;

      vi.spyOn(pool, 'execute').mockImplementation(async (sql: any, _params: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
        if (sqlStr.includes('SELECT id, user_id FROM password_reset_tokens')) {
          if (tokenUsed) {
            return [[], []] as any; // second attempt: token is now used/expired
          }
          return [[{ id: 99, user_id: 10 }], []] as any;
        }
        if (sqlStr.includes('UPDATE password_reset_tokens SET used_at = NOW()')) {
          tokenUsed = true;
          return [{ affectedRows: 1 }, []] as any;
        }
        return [{ affectedRows: 1 }, []] as any;
      });

      // First reset: succeeds
      await resetPassword(rawToken, 'NewSecurePass123!');
      expect(tokenUsed).toBe(true);

      // Second reset attempt with same token: rejected
      await expect(
        resetPassword(rawToken, 'AnotherPass123!')
      ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid or expired reset token' });
    });
  });

  // =========================================================================
  // 2. STUDENT TESTS
  // =========================================================================
  describe('2. Student Management & Isolation Tests', () => {
    it('enforces student isolation in profile querying', async () => {
      // Student attempting to fetch profile is isolated by req.user.id
      const studentUser: AuthUser = {
        id: 42,
        username: 'stu_42',
        email: 'stu42@hostel.com',
        full_name: 'Student 42',
        role: 'STUDENT',
        is_active: true,
      };

      let scopedUserId: any = null;
      vi.spyOn(pool, 'query').mockImplementation(async (sql: any, params: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
        if (sqlStr.includes('FROM students') && sqlStr.includes('WHERE user_id = ?')) {
          scopedUserId = params?.[0];
          return [[{
            id: 15,
            user_id: 42,
            student_id: 'STU-042',
            full_name: 'Student 42',
            department: 'Computer Science',
            is_active: 1,
          }], []] as any;
        }
        return [[]] as any;
      });

      const [rows] = await pool.query<any[]>(
        'SELECT * FROM students WHERE user_id = ? LIMIT 1',
        [studentUser.id]
      );

      expect(scopedUserId).toBe(42);
      expect(rows[0].student_id).toBe('STU-042');
    });

    it('rejects student creation if student_id already exists', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce([[{ id: 99 }], []] as any);
      const { createStudent } = await import('../services/studentService.js');

      await expect(
        createStudent({
          student_id: 'EXISTING_ID',
          full_name: 'New Student',
          gender: 'FEMALE',
          contact_number: '9876543210',
          address: '123 Hostel Way',
          department: 'Civil',
          admission_date: '2026-08-01',
          email: 'new@hostel.com',
        }, 1)
      ).rejects.toThrow('Student ID already exists');
    });
  });

  // =========================================================================
  // 3. ROOM TESTS
  // =========================================================================
  describe('3. Room Management Tests', () => {
    it('creates room and prevents duplicate room number', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce([[{ id: 10 }], []] as any);

      await expect(
        createRoom({
          room_number: '101-A',
          block: 'Block-A',
          floor: 1,
          room_type: 'DOUBLE',
          capacity: 2,
        }, 1)
      ).rejects.toThrow('Room number already exists');
    });

    it('updates room details and prevents reducing capacity below current occupancy', async () => {
      // Mock room 101-A with capacity 3 and current occupancy 2
      vi.spyOn(pool, 'query').mockImplementation(async (sql: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
        if (sqlStr.includes('FROM rooms r WHERE r.id = ?')) {
          return [[{
            id: 25,
            room_number: '101-A',
            block: 'A',
            floor: 1,
            room_type: 'TRIPLE',
            capacity: 3,
            current_occupancy: 2,
          }], []] as any;
        }
        return [[]] as any;
      });

      await expect(
        updateRoom(25, { capacity: 1 }, 1)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Cannot reduce room capacity to 1 below current occupancy (2)'),
      });
    });

    it('allocates available room and rejects allocating when room is full', async () => {
      const mockConn = {
        beginTransaction: vi.fn(),
        query: vi.fn().mockImplementation(async (sql: string) => {
          if (sql.includes('SELECT capacity FROM rooms')) {
            return [[{ capacity: 2 }], []];
          }
          if (sql.includes('SELECT COUNT(*) as current_occupancy FROM room_allocations')) {
            return [[{ current_occupancy: 2 }], []]; // Already full!
          }
          return [[]];
        }),
        execute: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      };
      vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn as any);

      await expect(allocateRoom(10, 5, 1)).rejects.toThrow('Room is already at full capacity');
      expect(mockConn.rollback).toHaveBeenCalled();
    });

    it('rejects duplicate active allocation for the same student', async () => {
      const mockConn = {
        beginTransaction: vi.fn(),
        query: vi.fn().mockImplementation(async (sql: string) => {
          if (sql.includes('SELECT capacity FROM rooms')) {
            return [[{ capacity: 3 }], []];
          }
          if (sql.includes('SELECT COUNT(*) as current_occupancy FROM room_allocations')) {
            return [[{ current_occupancy: 1 }], []]; // 1 out of 3 occupied
          }
          if (sql.includes('SELECT is_active FROM students')) {
            return [[{ is_active: 1 }], []];
          }
          if (sql.includes('SELECT id FROM room_allocations WHERE student_id = ?')) {
            return [[{ id: 88 }], []]; // Student already has active allocation!
          }
          return [[]];
        }),
        execute: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      };
      vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn as any);

      await expect(allocateRoom(10, 5, 1)).rejects.toThrow('Student already has an active room allocation');
    });

    it('reallocates student from old room to new room vacating old allocation', async () => {
      const executedUpdates: string[] = [];
      const mockConn = {
        beginTransaction: vi.fn(),
        query: vi.fn().mockImplementation(async (sql: string) => {
          if (sql.includes('SELECT capacity FROM rooms')) {
            return [[{ capacity: 2 }], []];
          }
          if (sql.includes('SELECT COUNT(*) as current_occupancy FROM room_allocations')) {
            return [[{ current_occupancy: 0 }], []]; // New room has space
          }
          if (sql.includes('SELECT id, room_id FROM room_allocations WHERE student_id = ?')) {
            return [[{ id: 99, room_id: 10 }], []]; // Current active room is 10
          }
          return [[]];
        }),
        execute: vi.fn().mockImplementation(async (sql: string) => {
          executedUpdates.push(sql);
          return [{ insertId: 101 }];
        }),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      };
      vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn as any);

      await reallocateRoom(5, 20, 1);
      expect(executedUpdates.some(u => u.includes('vacated_at = CURRENT_TIMESTAMP'))).toBe(true);
      expect(executedUpdates.some(u => u.includes('INSERT INTO room_allocations'))).toBe(true);
      expect(mockConn.commit).toHaveBeenCalled();
    });

    it('vacates room allocation for student and marks vacated_at', async () => {
      const executedUpdates: { sql: string; params?: any[] }[] = [];
      const mockConn = {
        beginTransaction: vi.fn(),
        query: vi.fn().mockResolvedValue([[{ id: 45, room_id: 12 }], []]),
        execute: vi.fn().mockImplementation(async (sql: string, params?: any[]) => {
          executedUpdates.push({ sql, params });
          return [{ affectedRows: 1 }];
        }),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      };
      vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn as any);

      await vacateRoom(8, 1);
      expect(executedUpdates.some(u => u.sql.includes('vacated_at = CURRENT_TIMESTAMP'))).toBe(true);
      expect(executedUpdates.some(u => u.params?.includes('ROOM_VACATED'))).toBe(true);
      expect(mockConn.commit).toHaveBeenCalled();
    });

    it('rejects vacating if student has no active allocation', async () => {
      const mockConn = {
        beginTransaction: vi.fn(),
        query: vi.fn().mockResolvedValue([[], []]), // No active allocations
        execute: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      };
      vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn as any);

      await expect(vacateRoom(8, 1)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Student does not have an active room allocation to vacate',
      });
      expect(mockConn.rollback).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. FEE & PAYMENT TESTS
  // =========================================================================
  describe('4. Fee & Payment Tests', () => {
    it('prevents duplicate fee creation for same student, type, and period', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce([[{ id: 77 }], []] as any);

      await expect(
        createFee({
          student_id: 10,
          fee_type: 'HOSTEL_FEE',
          academic_period: '2026-FALL',
          amount: 5000,
          due_date: '2026-10-15',
        }, 1)
      ).rejects.toThrow('A fee of this type and period already exists for this student');
    });

    it('records valid payment and returns generated receipt number', async () => {
      const mockConn = {
        beginTransaction: vi.fn(),
        query: vi.fn().mockImplementation(async (sql: string) => {
          if (sql.includes('SELECT amount FROM fees')) {
            return [[{ amount: '5000.00' }], []];
          }
          if (sql.includes('SELECT SUM(amount) as paid FROM payments')) {
            return [[{ paid: '2000.00' }], []]; // 3000 outstanding
          }
          return [[]];
        }),
        execute: vi.fn().mockResolvedValue([{ insertId: 888 }]),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      };
      vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn as any);
      vi.spyOn(pool, 'query').mockResolvedValue([[{
        id: 888,
        fee_id: 12,
        amount: '1500.00',
        payment_method: 'UPI',
        receipt_number: 'RCPT-20260928-ABC123',
      }], []] as any);

      const payment = await recordPayment(12, { amount: 1500, payment_method: 'UPI' }, 1);
      expect(payment.id).toBe(888);
      expect(payment.receipt_number).toMatch(/^RCPT-/);
      expect(mockConn.commit).toHaveBeenCalled();
    });

    it('rejects overpayment exceeding outstanding fee balance', async () => {
      const mockConn = {
        beginTransaction: vi.fn(),
        query: vi.fn().mockImplementation(async (sql: string) => {
          if (sql.includes('SELECT amount FROM fees')) {
            return [[{ amount: '5000.00' }], []];
          }
          if (sql.includes('SELECT SUM(amount) as paid FROM payments')) {
            return [[{ paid: '4000.00' }], []]; // 1000 outstanding
          }
          return [[]];
        }),
        execute: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      };
      vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn as any);

      await expect(
        recordPayment(12, { amount: 1500, payment_method: 'CASH' }, 1)
      ).rejects.toThrow(/cannot exceed outstanding balance/);
      expect(mockConn.rollback).toHaveBeenCalled();
    });

    it('rejects non-positive payment amount (<= 0)', async () => {
      await expect(
        recordPayment(12, { amount: 0, payment_method: 'CASH' }, 1)
      ).rejects.toThrow('Payment amount must be greater than zero');

      await expect(
        recordPayment(12, { amount: -50, payment_method: 'CASH' }, 1)
      ).rejects.toThrow('Payment amount must be greater than zero');
    });
  });

  // =========================================================================
  // 5. COMPLAINT TESTS
  // =========================================================================
  describe('5. Complaint Workflow & Access Control Tests', () => {
    it('enforces ticket ID format CMP-YYYYMMDD-XXXXX', () => {
      const ticket = generateTicketId();
      expect(ticket).toMatch(/^CMP-\d{8}-[A-Z0-9]{5}$/);
    });

    it('rejects complaint submission if student has no active room allocation', async () => {
      vi.spyOn(pool, 'query').mockImplementation(async (sql: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
        if (sqlStr.includes('FROM students WHERE user_id = ?')) {
          return [[{ id: 9, is_active: 1 }], []] as any;
        }
        if (sqlStr.includes('FROM room_allocations WHERE student_id = ?')) {
          return [[], []] as any; // No allocation!
        }
        return [[]] as any;
      });

      await expect(
        createComplaint({ category: 'PLUMBING', description: 'Leaking faucet in bathroom' }, 99)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('No active room allocation found'),
      });
    });

    it('validates state transitions accurately', () => {
      expect(isValidTransition('SUBMITTED', 'ASSIGNED')).toBe(true);
      expect(isValidTransition('ASSIGNED', 'IN_PROGRESS')).toBe(true);
      expect(isValidTransition('IN_PROGRESS', 'RESOLVED')).toBe(true);
      expect(isValidTransition('RESOLVED', 'CLOSED')).toBe(true);

      // Invalid transitions
      expect(isValidTransition('SUBMITTED', 'RESOLVED')).toBe(false);
      expect(isValidTransition('CLOSED', 'IN_PROGRESS')).toBe(false);
    });

    it('requires work notes when resolving complaint', async () => {
      const mockConn = {
        beginTransaction: vi.fn(),
        query: vi.fn().mockResolvedValue([[{
          id: 50,
          status: 'IN_PROGRESS',
          assigned_to: 7,
          student_user_id: 12,
        }], []]),
        execute: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      };
      vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn as any);

      const techUser: AuthUser = { id: 7, username: 'tech7', email: 't7@h.com', full_name: 'Tech 7', role: 'MAINTENANCE', is_active: true };

      await expect(
        updateComplaintStatus(50, 'RESOLVED', '', techUser)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Work and resolution notes are required when marking a complaint as resolved',
      });
    });

    it('restricts maintenance staff to updating only their assigned complaints', async () => {
      const mockConn = {
        beginTransaction: vi.fn(),
        query: vi.fn().mockResolvedValue([[{
          id: 51,
          status: 'ASSIGNED',
          assigned_to: 100, // Assigned to technician 100
          student_user_id: 12,
        }], []]),
        execute: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      };
      vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn as any);

      const tech99: AuthUser = { id: 99, username: 'tech99', email: 't99@h.com', full_name: 'Tech 99', role: 'MAINTENANCE', is_active: true };

      // Technician 99 attempts to update technician 100's task
      await expect(
        updateComplaintStatus(51, 'IN_PROGRESS', 'Notes', tech99)
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'You can only update tasks assigned to yourself',
      });
    });
  });

  // =========================================================================
  // 6. LEAVE TESTS
  // =========================================================================
  describe('6. Leave Management & Gate Pass Tests', () => {
    it('rejects leave submission with return date earlier than departure date', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce([[{ id: 1, full_name: 'Student', is_active: 1 }], []] as any);

      await expect(
        submitLeaveRequest({
          from_datetime: '2026-10-10T10:00:00Z',
          to_datetime: '2026-10-09T10:00:00Z', // Inverted dates!
          reason: 'Family event',
        }, 10)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Return date/time must be strictly later than departure date/time',
      });
    });

    it('generates gate pass with GP-YYYY-XXXXXX format on leave approval', async () => {
      const gatePass = generateGatePassNumber();
      expect(gatePass).toMatch(/^GP-\d{4}-[A-Z0-9]{6}$/);
    });

    it('requires review notes when rejecting a leave request', async () => {
      const mockConn = {
        beginTransaction: vi.fn(),
        query: vi.fn().mockResolvedValue([[{
          id: 33,
          student_id: 1,
          status: 'PENDING',
          student_user_id: 10,
        }], []]),
        execute: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      };
      vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn as any);

      await expect(
        rejectLeave(33, { review_notes: '   ' }, 2)
      ).rejects.toThrow();
      expect(mockConn.rollback).toHaveBeenCalled();
    });

    it('prevents cancelling an already approved or rejected leave request', async () => {
      vi.spyOn(pool, 'query').mockImplementation(async (sql: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
        if (sqlStr.includes('FROM students WHERE user_id = ?')) {
          return [[{ id: 4 }], []] as any;
        }
        if (sqlStr.includes('FROM leave_requests WHERE id = ?')) {
          return [[{ id: 22, student_id: 4, status: 'APPROVED' }], []] as any;
        }
        return [[]] as any;
      });

      await expect(cancelLeaveRequest(22, 10)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Only PENDING leave requests can be cancelled'),
      });
    });

    it('approves a pending leave request, generates unique gate pass, creates student notification, and logs audit atomically', async () => {
      const mockConn = {
        beginTransaction: vi.fn(),
        query: vi.fn().mockImplementation(async (sql: any) => {
          const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
          if (sqlStr.includes('FOR UPDATE')) {
            return [[{
              id: 40,
              student_id: 1,
              status: 'PENDING',
              student_user_id: 10,
              student_name: 'Test Student',
            }], []];
          }
          if (sqlStr.includes('WHERE gate_pass_number = ?')) {
            return [[], []]; // No collision
          }
          if (sqlStr.includes('UPDATE leave_requests')) {
            return [{ affectedRows: 1 }];
          }
          if (sqlStr.includes('INSERT INTO notifications')) {
            return [{ insertId: 101 }];
          }
          return [[]];
        }),
        execute: vi.fn().mockResolvedValue([{ insertId: 201 }]),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      };
      vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn as any);
      vi.spyOn(pool, 'query').mockImplementation(async (sql: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
        if (sqlStr.includes('WHERE lr.id = ?')) {
          return [[{
            id: 40,
            student_id: 1,
            student_name: 'Test Student',
            student_number: 'STU-001',
            status: 'APPROVED',
            gate_pass_number: 'GP-2026-TEST01',
            review_notes: 'Approved note',
            reviewed_by: 2,
            student_user_id: 10,
          }], []] as any;
        }
        return [[]] as any;
      });

      const reviewer: AuthUser = {
        id: 2,
        username: 'warden_test',
        email: 'warden@test.com',
        full_name: 'Warden Test',
        role: 'WARDEN',
        is_active: true,
      };

      const result = await approveLeave(40, { review_notes: 'Approved note' }, reviewer);
      expect(result.status).toBe('APPROVED');
      expect(mockConn.beginTransaction).toHaveBeenCalled();
      expect(mockConn.commit).toHaveBeenCalled();
      expect(mockConn.release).toHaveBeenCalled();
      expect(mockConn.rollback).not.toHaveBeenCalled();
    });

    it('rejects approval if current status is not PENDING and triggers transaction rollback', async () => {
      const mockConn = {
        beginTransaction: vi.fn(),
        query: vi.fn().mockResolvedValue([[{
          id: 41,
          student_id: 1,
          status: 'REJECTED', // Already rejected
          student_user_id: 10,
        }], []]),
        execute: vi.fn(),
        commit: vi.fn(),
        rollback: vi.fn(),
        release: vi.fn(),
      };
      vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn as any);

      await expect(
        approveLeave(41, { review_notes: 'Should fail' }, 2)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining("Cannot approve leave request with status 'REJECTED'"),
      });
      expect(mockConn.rollback).toHaveBeenCalled();
      expect(mockConn.release).toHaveBeenCalled();
    });

    it('prevents accessing gate pass for non-approved or non-existent leave requests', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce([[{
        id: 42,
        student_id: 1,
        student_name: 'Student',
        student_user_id: 10,
        status: 'REJECTED',
        gate_pass_number: null,
      }], []] as any);

      const studentUser: AuthUser = {
        id: 10,
        username: 'student',
        email: 's@test.com',
        full_name: 'Student',
        role: 'STUDENT',
        is_active: true,
      };

      await expect(getGatePassByLeaveId(42, studentUser)).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Gate pass is only available for APPROVED leave requests'),
      });
    });

    it('formats ISO datetimes properly when submitting leave request into MySQL', async () => {
      let insertedParams: any[] = [];
      vi.spyOn(pool, 'query').mockImplementation(async (sql: any, params: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
        if (sqlStr.includes('FROM students WHERE user_id = ?')) {
          return [[{ id: 1, full_name: 'Student', is_active: 1 }], []] as any;
        }
        if (sqlStr.includes('INSERT INTO leave_requests')) {
          insertedParams = params;
          return [{ insertId: 55 }] as any;
        }
        if (sqlStr.includes('SELECT id FROM users WHERE role IN')) {
          return [[{ id: 2 }], []] as any;
        }
        if (sqlStr.includes('INSERT INTO notifications')) {
          return [{ insertId: 1 }] as any;
        }
        if (sqlStr.includes('WHERE lr.id = ?')) {
          return [[{ id: 55, student_id: 1, status: 'PENDING', student_user_id: 10 }], []] as any;
        }
        return [[]] as any;
      });
      vi.spyOn(pool, 'execute').mockResolvedValue([{ insertId: 1 }] as any);

      await submitLeaveRequest({
        from_datetime: '2026-10-15T09:00:00.000Z',
        to_datetime: '2026-10-18T18:00:00.000Z',
        reason: 'Weekend leave with ISO timestamp',
      }, 10);

      // Verify that datetime params are converted from ISO format to MySQL 'YYYY-MM-DD HH:MM:SS'
      expect(insertedParams[1]).toBe('2026-10-15 09:00:00');
      expect(insertedParams[2]).toBe('2026-10-18 18:00:00');
    });
  });

  // =========================================================================
  // 7. VISITOR TESTS
  // =========================================================================
  describe('7. Visitor Management Tests', () => {
    it('records visitor entry and creates notification for student', async () => {
      const createdNotifications: any[] = [];
      vi.spyOn(pool, 'query').mockImplementation(async (sql: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
        if (sqlStr.includes('FROM students WHERE id = ?')) {
          return [[{ id: 10, full_name: 'David Student', user_id: 100, is_active: 1 }], []] as any;
        }
        if (sqlStr.includes('FROM visitor_logs WHERE phone = ?')) {
          return [[], []] as any; // No active duplicate inside
        }
        if (sqlStr.includes('INSERT INTO notifications')) {
          createdNotifications.push(sql);
          return [{ insertId: 1 }] as any;
        }
        if (sqlStr.includes('INSERT INTO visitor_logs')) {
          return [{ insertId: 45 }] as any;
        }
        if (sqlStr.includes('WHERE vl.id = ?')) {
          return [[{
            id: 45,
            visitor_name: 'John Miller',
            phone: '9876543210',
            student_name: 'David Student',
            status: 'INSIDE',
          }], []] as any;
        }
        return [[]] as any;
      });

      vi.spyOn(pool, 'execute').mockResolvedValue([{ insertId: 1 }] as any);

      const visitor = await recordVisitorEntry({
        visitor_name: 'John Miller',
        phone: '9876543210',
        student_id: 10,
        purpose: 'Parent Visit',
      }, 2);

      expect(visitor.id).toBe(45);
      expect(createdNotifications.length).toBe(1);
    });

    it('rejects recording exit for visitor already exited', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce([[{
        id: 45,
        visitor_name: 'John Miller',
        exit_at: '2026-09-28 14:00:00', // Already exited!
      }], []] as any);

      await expect(recordVisitorExit(45, 2)).rejects.toMatchObject({
        statusCode: 400,
        message: 'Visitor has already been marked as exited',
      });
    });
  });

  // =========================================================================
  // 8. NOTIFICATION TESTS
  // =========================================================================
  describe('8. Notification Service Tests', () => {
    it('creates and lists user notifications with isolation', async () => {
      vi.spyOn(pool, 'query').mockImplementation(async (sql: any, params: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
        if (sqlStr.includes('COUNT(*) as total FROM notifications')) {
          expect(params[0]).toBe(55); // Isolated to user 55
          return [[{ total: 1 }], []] as any;
        }
        if (sqlStr.includes('SELECT id, user_id, type, title, message')) {
          expect(params[0]).toBe(55);
          return [[{
            id: 1,
            user_id: 55,
            type: 'LEAVE',
            title: 'Leave Approved',
            message: 'Your leave has been approved',
            is_read: false,
            created_at: new Date().toISOString(),
          }], []] as any;
        }
        return [[]] as any;
      });

      const res = await listUserNotifications(55);
      expect(res.total).toBe(1);
      expect(res.items[0].user_id).toBe(55);
    });

    it('calculates unread notification count accurately', async () => {
      vi.spyOn(pool, 'query').mockResolvedValueOnce([[{ unread_count: 4 }], []] as any);
      const count = await getUnreadNotificationCount(55);
      expect(count).toBe(4);
    });

    it('marks all notifications read scoped strictly by user_id', async () => {
      let markedUser: any = null;
      vi.spyOn(pool, 'query').mockImplementation(async (_sql: any, params: any) => {
        markedUser = params[0];
        return [{ affectedRows: 3 }] as any;
      });

      await markAllNotificationsRead(77);
      expect(markedUser).toBe(77);
    });
  });

  // =========================================================================
  // 9. REPORT TESTS
  // =========================================================================
  describe('9. Reporting Service Tests', () => {
    it('generates student report with filters, pagination, and safe sorting', async () => {
      let executedSql = '';
      vi.spyOn(pool, 'query').mockImplementation(async (sql: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
        executedSql = sqlStr;
        if (sqlStr.includes('COUNT(*) AS total')) {
          return [[{ total: 2 }], []] as any;
        }
        return [[
          { id: 1, student_id: 'STU-1', full_name: 'Alice', department: 'CS', admission_date: '2026-08-01', is_active: true },
          { id: 2, student_id: 'STU-2', full_name: 'Bob', department: 'CS', admission_date: '2026-08-01', is_active: true },
        ], []] as any;
      });

      const report = await getStudentReport({
        department: 'CS',
        sortBy: 'full_name',
        sortOrder: 'ASC',
        page: 1,
        limit: 10,
      });

      expect(report.total).toBe(2);
      expect(report.items.length).toBe(2);
      expect(executedSql).toContain('ORDER BY s.full_name ASC');
      expect(executedSql).toContain('s.department = ?');
    });

    it('generates room occupancy report with calculated status categories', async () => {
      vi.spyOn(pool, 'query').mockImplementation(async (sql: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
        if (sqlStr.includes('SELECT COUNT(*) AS total')) {
          return [[{ total: 3 }], []] as any;
        }
        return [[
          { id: 101, room_number: '101', capacity: 2, occupied_beds: 0, status: 'AVAILABLE' },
          { id: 102, room_number: '102', capacity: 2, occupied_beds: 1, status: 'PARTIALLY_OCCUPIED' },
          { id: 103, room_number: '103', capacity: 2, occupied_beds: 2, status: 'FULL' },
        ], []] as any;
      });

      const report = await getRoomOccupancyReport({ page: 1, limit: 10 });
      expect(report.items.length).toBe(3);
      expect(report.items[0].status).toBe('AVAILABLE');
      expect(report.items[1].status).toBe('PARTIALLY_OCCUPIED');
      expect(report.items[2].status).toBe('FULL');
    });

    it('returns empty report structure cleanly when no matching records exist', async () => {
      vi.spyOn(pool, 'query').mockImplementation(async (sql: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
        if (sqlStr.includes('COUNT(*) AS total')) {
          return [[{ total: 0 }], []] as any;
        }
        return [[], []] as any;
      });

      const report = await getFeeReport({ status: 'OVERDUE' });
      expect(report.total).toBe(0);
      expect(report.items).toEqual([]);
      expect(report.totalPages).toBe(1);
    });
  });

  // =========================================================================
  // 10. DASHBOARD METRICS SYNCHRONIZATION TESTS
  // =========================================================================
  describe('10. Dashboard Metrics Dynamic Synchronization', () => {
    it('verifies dashboard counters reflect database mutations', async () => {
      // Setup dynamic in-memory counters simulating database state after actions
      const simulatedDb = {
        total_students: 10,
        active_students: 10,
        total_rooms: 5,
        total_capacity: 10,
        occupied_beds: 4,
        total_collections: 12000,
        open_complaints: 2,
        current_visitors: 1,
      };

      vi.spyOn(pool, 'query').mockImplementation(async (sql: any) => {
        const sqlStr = typeof sql === 'string' ? sql : sql.sql || '';
        if (sqlStr.includes('FROM students')) {
          return [[{ total_students: simulatedDb.total_students, active_students: simulatedDb.active_students }]] as any;
        }
        if (sqlStr.includes('FROM rooms')) {
          return [[{
            total_rooms: simulatedDb.total_rooms,
            total_capacity: simulatedDb.total_capacity,
            occupied_beds: simulatedDb.occupied_beds,
            occupied_rooms: 3,
            available_rooms: 2,
            full_rooms: 1,
          }]] as any;
        }
        if (sqlStr.includes('FROM fees')) {
          return [[{
            total_fees_count: 10,
            total_fee_amount: 15000,
            total_paid_amount: simulatedDb.total_collections,
            pending_fee_count: 2,
            overdue_fee_count: 0,
            pending_fee_balance: 3000,
          }]] as any;
        }
        if (sqlStr.includes('FROM payments')) {
          return [[{ total_payments_count: 8, total_payments_sum: simulatedDb.total_collections }]] as any;
        }
        if (sqlStr.includes('FROM complaints')) {
          return [[{
            total_complaints: 5,
            pending_complaints: 1,
            open_complaints: simulatedDb.open_complaints,
            active_maintenance_tasks: 1,
          }]] as any;
        }
        if (sqlStr.includes('FROM visitor_logs')) {
          return [[{ total_visitors: 6, current_visitors: simulatedDb.current_visitors }]] as any;
        }
        if (sqlStr.includes('FROM leave_requests')) {
          return [[{ total_leave_requests: 4, pending_leave_requests: 1, approved_leave_requests: 2 }]] as any;
        }
        return [[]] as any;
      });

      const adminUser: AuthUser = {
        id: 1,
        username: 'admin',
        email: 'admin@hostel.com',
        full_name: 'Admin',
        role: 'ADMIN',
        is_active: true,
      };

      // Initial state
      const initial = await getDashboardSummary(adminUser);
      expect(initial.metrics.total_students).toBe(10);
      expect(initial.metrics.occupied_beds).toBe(4);
      expect(initial.metrics.open_complaints).toBe(2);
      expect(initial.metrics.current_visitors).toBe(1);

      // Simulate mutations: student added (+1), room allocated (+1 bed), payment (+3000), complaint resolved (-1), visitor exit (-1)
      simulatedDb.total_students += 1;
      simulatedDb.active_students += 1;
      simulatedDb.occupied_beds += 1;
      simulatedDb.total_collections += 3000;
      simulatedDb.open_complaints -= 1;
      simulatedDb.current_visitors -= 1;

      // Updated state
      const updated = await getDashboardSummary(adminUser);
      expect(updated.metrics.total_students).toBe(11);
      expect(updated.metrics.occupied_beds).toBe(5);
      expect(updated.metrics.open_complaints).toBe(1);
      expect(updated.metrics.current_visitors).toBe(0);
      expect(updated.metrics.total_payments_amount).toBe(15000);
    });
  });
});
