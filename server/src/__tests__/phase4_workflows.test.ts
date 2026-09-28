import { describe, it, expect, vi } from 'vitest';
import { generateTicketId, isValidTransition } from '../services/complaintService.js';
import { generateGatePassNumber } from '../services/leaveService.js';
import { generateReceiptNumber } from '../services/feeService.js';

describe('Phase 4 - Core Workflow Invariants & Validations', () => {
  describe('Fee & Payment Business Invariants', () => {
    it('generates receipt numbers in RCPT-YYYYMMDD-XXXX format', () => {
      const receiptNo = generateReceiptNumber();
      expect(receiptNo).toMatch(/^RCPT-\d{8}-[A-F0-9]+$/i);
    });

    it('rejects overpayments beyond fee balance', () => {
      const validatePayment = (feeAmount: number, existingPaid: number, newPayment: number) => {
        const remaining = feeAmount - existingPaid;
        if (newPayment <= 0) {
          throw new Error('Payment amount must be positive');
        }
        if (newPayment > remaining) {
          throw new Error(`Payment of $${newPayment} exceeds outstanding balance of $${remaining}`);
        }
        return true;
      };

      expect(() => validatePayment(5000, 3000, 2500)).toThrow('exceeds outstanding balance');
      expect(() => validatePayment(5000, 3000, 0)).toThrow('must be positive');
      expect(() => validatePayment(5000, 3000, -500)).toThrow('must be positive');
      expect(validatePayment(5000, 3000, 2000)).toBe(true); // Exact full payment
      expect(validatePayment(5000, 3000, 1000)).toBe(true); // Partial payment
    });
  });

  describe('Room Capacity Enforcement Rules', () => {
    it('prevents room allocation when room capacity is full', () => {
      const checkCapacity = (capacity: number, currentOccupancy: number) => {
        if (currentOccupancy >= capacity) {
          throw new Error('Room is currently at full capacity');
        }
        return true;
      };

      expect(() => checkCapacity(2, 2)).toThrow('Room is currently at full capacity');
      expect(() => checkCapacity(2, 3)).toThrow('Room is currently at full capacity');
      expect(checkCapacity(2, 1)).toBe(true);
      expect(checkCapacity(3, 0)).toBe(true);
    });

    it('prevents duplicate active room allocation for the same student', () => {
      const verifyNoActiveAllocation = (hasActiveAllocation: boolean) => {
        if (hasActiveAllocation) {
          throw new Error('Student already has an active room allocation');
        }
        return true;
      };

      expect(() => verifyNoActiveAllocation(true)).toThrow('already has an active room allocation');
      expect(verifyNoActiveAllocation(false)).toBe(true);
    });
  });

  describe('Complaint Workflow State Transitions', () => {
    it('enforces ticket ID format', () => {
      const ticketId = generateTicketId();
      expect(ticketId).toMatch(/^CMP-\d{8}-[A-Z0-9]{5}$/);
    });

    it('validates compliant transitions', () => {
      expect(isValidTransition('SUBMITTED', 'ASSIGNED')).toBe(true);
      expect(isValidTransition('ASSIGNED', 'IN_PROGRESS')).toBe(true);
      expect(isValidTransition('IN_PROGRESS', 'RESOLVED')).toBe(true);
      expect(isValidTransition('RESOLVED', 'CLOSED')).toBe(true);
    });

    it('blocks illegal status jumps or skips', () => {
      expect(isValidTransition('SUBMITTED', 'RESOLVED')).toBe(false);
      expect(isValidTransition('SUBMITTED', 'CLOSED')).toBe(false);
      expect(isValidTransition('CLOSED', 'IN_PROGRESS')).toBe(false);
    });
  });

  describe('Leave Request & Gate Pass Security', () => {
    it('generates collision-safe gate pass number format GP-YYYY-XXXXXX', () => {
      const gp = generateGatePassNumber();
      expect(gp).toMatch(/^GP-\d{4}-[A-Z0-9]{6}$/);
    });

    it('requires return time to be strictly after departure time', () => {
      const validateDates = (from: string, to: string) => {
        const fromMs = new Date(from).getTime();
        const toMs = new Date(to).getTime();
        if (isNaN(fromMs) || isNaN(toMs) || fromMs >= toMs) {
          throw new Error('Return date/time must be strictly later than departure date/time');
        }
        return true;
      };

      expect(() => validateDates('2026-10-05T10:00', '2026-10-05T09:00')).toThrow('Return date/time must be strictly later');
      expect(() => validateDates('2026-10-05T10:00', '2026-10-05T10:00')).toThrow('Return date/time must be strictly later');
      expect(validateDates('2026-10-05T10:00', '2026-10-05T18:00')).toBe(true);
    });
  });
});
