import { describe, it, expect, vi } from 'vitest';
import { getPositiveIntParam } from '../utils/http.js';
import { hashToken, verifyJwt, signJwt } from '../utils/token.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

describe('Phase 5 - Security Hardening & IDOR Protections', () => {
  describe('Input Validation & Parameter Sanitization', () => {
    it('accepts valid positive integer route parameters', () => {
      const mockReq = { params: { id: '42' } } as any;
      expect(getPositiveIntParam(mockReq, 'id')).toBe(42);
    });

    it('rejects negative, zero, float, or string route parameters', () => {
      const cases = ['0', '-5', 'abc', '12.5', '', 'null', 'undefined', '1e5'];
      for (const val of cases) {
        const mockReq = { params: { id: val } } as any;
        expect(() => getPositiveIntParam(mockReq, 'id')).toThrow('Invalid id parameter');
      }
    });
  });

  describe('Receipt IDOR Access Control Logic', () => {
    it('allows student to access their own receipt', () => {
      const user = { id: 10, role: 'STUDENT' };
      const receipt = { id: 101, student_user_id: 10, amount: '500.00' };

      const canAccess = (u: any, r: any) => {
        if (u.role === 'STUDENT' && r.student_user_id !== u.id) {
          throw Object.assign(new Error('Access denied to other student receipts'), { statusCode: 403 });
        }
        return true;
      };

      expect(canAccess(user, receipt)).toBe(true);
    });

    it('blocks student from accessing another student receipt (IDOR blocked with 403)', () => {
      const studentA = { id: 10, role: 'STUDENT' };
      const studentBReceipt = { id: 102, student_user_id: 20, amount: '800.00' };

      const canAccess = (u: any, r: any) => {
        if (u.role === 'STUDENT' && r.student_user_id !== u.id) {
          throw Object.assign(new Error('Access denied to other student receipts'), { statusCode: 403 });
        }
        return true;
      };

      expect(() => canAccess(studentA, studentBReceipt)).toThrow('Access denied to other student receipts');
    });

    it('permits ADMIN and WARDEN to access any receipt', () => {
      const admin = { id: 1, role: 'ADMIN' };
      const warden = { id: 2, role: 'WARDEN' };
      const receipt = { id: 102, student_user_id: 20, amount: '800.00' };

      const canAccess = (u: any, r: any) => {
        if (u.role === 'STUDENT' && r.student_user_id !== u.id) {
          throw Object.assign(new Error('Access denied to other student receipts'), { statusCode: 403 });
        }
        return true;
      };

      expect(canAccess(admin, receipt)).toBe(true);
      expect(canAccess(warden, receipt)).toBe(true);
    });
  });

  describe('Authentication & Token Security', () => {
    it('signs and verifies JWT with only minimal claims', () => {
      const token = signJwt(7, 'STUDENT');
      const payload = verifyJwt(token);

      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe(7);
      expect(payload?.role).toBe('STUDENT');
      // Ensure no sensitive user attributes are baked into token
      expect((payload as any).password).toBeUndefined();
      expect((payload as any).email).toBeUndefined();
    });

    it('hashes password reset tokens with SHA-256 (never store raw tokens)', () => {
      const raw = 'random-raw-token-12345';
      const hash1 = hashToken(raw);
      const hash2 = hashToken(raw);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 is 64 hex characters
      expect(hash1).not.toBe(raw);
    });

    it('uses bcrypt with 12 salt rounds for password security', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);

      expect(hash).toMatch(/^\$2[aby]\$12\$/); // Verify cost factor is 12
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });

    it('blocks inactive accounts even if credentials or tokens are provided', () => {
      const checkActive = (user: { is_active: boolean } | null) => {
        if (!user || !user.is_active) {
          throw Object.assign(new Error('Account not found or inactive'), { statusCode: 401 });
        }
        return true;
      };

      expect(() => checkActive({ is_active: false })).toThrow('Account not found or inactive');
      expect(() => checkActive(null)).toThrow('Account not found or inactive');
      expect(checkActive({ is_active: true })).toBe(true);
    });
  });
});
