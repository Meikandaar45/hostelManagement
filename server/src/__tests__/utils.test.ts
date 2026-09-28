import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateRawToken, hashToken, signJwt, verifyJwt } from '../utils/token.js';

describe('password utilities', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('MyPassword1');
    expect(hash).not.toBe('MyPassword1');
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(await verifyPassword('MyPassword1', hash)).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('MyPassword1');
    expect(await verifyPassword('WrongPassword1', hash)).toBe(false);
  });
});

describe('token utilities', () => {
  it('generates a unique raw token each time', () => {
    const t1 = generateRawToken();
    const t2 = generateRawToken();
    expect(t1).not.toBe(t2);
    expect(t1).toHaveLength(64); // 32 bytes hex
  });

  it('hashes a token deterministically', () => {
    const raw = 'some-raw-token';
    expect(hashToken(raw)).toBe(hashToken(raw));
    expect(hashToken(raw)).not.toBe(raw);
  });

  it('signs and verifies a JWT', () => {
    const token = signJwt(42, 'ADMIN');
    const payload = verifyJwt(token);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe(42);
    expect(payload!.role).toBe('ADMIN');
  });

  it('returns null for an invalid JWT', () => {
    expect(verifyJwt('invalid.token.here')).toBeNull();
  });

  it('returns null for a tampered JWT', () => {
    const token = signJwt(1, 'STUDENT');
    const tampered = token.slice(0, -5) + 'xxxxx';
    expect(verifyJwt(tampered)).toBeNull();
  });
});
