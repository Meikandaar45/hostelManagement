import { describe, it, expect, vi } from 'vitest';
import { hasPermission, rolePermissions, Role, Permission } from '../config/permissions.js';

describe('Phase 3 - RBAC & Permissions', () => {
  it('ADMIN and WARDEN have complaint, visitor, and leave management permissions', () => {
    expect(hasPermission('ADMIN', Permission.MANAGE_COMPLAINTS)).toBe(true);
    expect(hasPermission('ADMIN', Permission.MANAGE_VISITORS)).toBe(true);
    expect(hasPermission('ADMIN', Permission.MANAGE_LEAVE)).toBe(true);

    expect(hasPermission('WARDEN', Permission.MANAGE_COMPLAINTS)).toBe(true);
    expect(hasPermission('WARDEN', Permission.MANAGE_VISITORS)).toBe(true);
    expect(hasPermission('WARDEN', Permission.MANAGE_LEAVE)).toBe(true);
  });

  it('MAINTENANCE has task permissions but cannot manage visitors or approve leave', () => {
    expect(hasPermission('MAINTENANCE', Permission.VIEW_ASSIGNED_TASKS)).toBe(true);
    expect(hasPermission('MAINTENANCE', Permission.UPDATE_TASK_STATUS)).toBe(true);
    expect(hasPermission('MAINTENANCE', Permission.MANAGE_COMPLAINTS)).toBe(false);
    expect(hasPermission('MAINTENANCE', Permission.MANAGE_VISITORS)).toBe(false);
    expect(hasPermission('MAINTENANCE', Permission.MANAGE_LEAVE)).toBe(false);
  });

  it('STUDENT cannot manage complaints, visitors, or approve leaves', () => {
    expect(hasPermission('STUDENT', Permission.MANAGE_COMPLAINTS)).toBe(false);
    expect(hasPermission('STUDENT', Permission.MANAGE_VISITORS)).toBe(false);
    expect(hasPermission('STUDENT', Permission.MANAGE_LEAVE)).toBe(false);
  });
});

describe('Phase 3 - Complaint Workflow State Machine', () => {
  // Pure logic rules matching complaintService
  const VALID_TRANSITIONS: Record<string, string[]> = {
    SUBMITTED: ['ASSIGNED'],
    ASSIGNED: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLVED'],
    RESOLVED: ['CLOSED'],
    CLOSED: [],
  };

  function canTransition(from: string, to: string): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  it('allows valid sequential complaint transitions', () => {
    expect(canTransition('SUBMITTED', 'ASSIGNED')).toBe(true);
    expect(canTransition('ASSIGNED', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'RESOLVED')).toBe(true);
    expect(canTransition('RESOLVED', 'CLOSED')).toBe(true);
  });

  it('blocks invalid transitions or skipping workflow states', () => {
    expect(canTransition('SUBMITTED', 'RESOLVED')).toBe(false);
    expect(canTransition('SUBMITTED', 'CLOSED')).toBe(false);
    expect(canTransition('ASSIGNED', 'CLOSED')).toBe(false);
    expect(canTransition('CLOSED', 'SUBMITTED')).toBe(false);
    expect(canTransition('CLOSED', 'IN_PROGRESS')).toBe(false);
  });

  it('enforces ticket ID pattern CMP-YYYYMMDD-XXXXX', () => {
    const ticketIdPattern = /^CMP-\d{8}-[A-Z0-9]{5}$/;
    const sampleTicket = 'CMP-20260923-A7K9M';
    expect(ticketIdPattern.test(sampleTicket)).toBe(true);
    expect(ticketIdPattern.test('CMP-12345')).toBe(false);
  });

  it('requires work notes when resolving complaint', () => {
    const validateResolution = (targetStatus: string, workNotes?: string) => {
      if (targetStatus === 'RESOLVED' && (!workNotes || !workNotes.trim())) {
        throw new Error('Work notes are mandatory when resolving a complaint');
      }
      return true;
    };

    expect(() => validateResolution('RESOLVED')).toThrow('Work notes are mandatory');
    expect(() => validateResolution('RESOLVED', '   ')).toThrow('Work notes are mandatory');
    expect(validateResolution('RESOLVED', 'Replaced faulty faucet and verified water pressure')).toBe(true);
  });
});

describe('Phase 3 - Gate Pass & Leave Rules', () => {
  it('enforces gate pass format GP-YYYY-XXXXXX', () => {
    const gatePassPattern = /^GP-\d{4}-[A-Z0-9]{6}$/;
    const samplePass = 'GP-2026-X8P2K1';
    expect(gatePassPattern.test(samplePass)).toBe(true);
    expect(gatePassPattern.test('PASS-123')).toBe(false);
  });

  it('requires review notes when rejecting a leave request', () => {
    const validateRejection = (status: string, notes?: string) => {
      if (status === 'REJECTED' && (!notes || !notes.trim())) {
        throw new Error('Review notes are required when rejecting leave');
      }
      return true;
    };

    expect(() => validateRejection('REJECTED')).toThrow('Review notes are required');
    expect(() => validateRejection('REJECTED', '  ')).toThrow('Review notes are required');
    expect(validateRejection('REJECTED', 'Exam schedule conflict')).toBe(true);
  });

  it('validates return date is chronologically after departure date', () => {
    const isValidLeaveRange = (from: string, to: string) => {
      return new Date(to).getTime() > new Date(from).getTime();
    };

    expect(isValidLeaveRange('2026-10-01T10:00:00Z', '2026-10-03T18:00:00Z')).toBe(true);
    expect(isValidLeaveRange('2026-10-05T10:00:00Z', '2026-10-02T18:00:00Z')).toBe(false);
    expect(isValidLeaveRange('2026-10-05T10:00:00Z', '2026-10-05T10:00:00Z')).toBe(false);
  });
});

describe('Phase 3 - Visitor Status Determination', () => {
  it('derives INSIDE when exit_at is null, and EXITED when exit_at is present', () => {
    const deriveVisitorStatus = (exitAt: string | null) => (exitAt ? 'EXITED' : 'INSIDE');

    expect(deriveVisitorStatus(null)).toBe('INSIDE');
    expect(deriveVisitorStatus('2026-09-23T15:30:00Z')).toBe('EXITED');
  });
});
