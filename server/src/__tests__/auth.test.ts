import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// ── Mock DB pool before importing server ──────────────────────────────────────
vi.mock('../db/pool.js', () => {
  const mockExecute = vi.fn();
  const mockGetConnection = vi.fn();
  return {
    pool: { execute: mockExecute, getConnection: mockGetConnection },
    testConnection: vi.fn().mockResolvedValue(true),
  };
});

// ── Mock audit service ────────────────────────────────────────────────────────
vi.mock('../services/auditService.js', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  listAuditLogs: vi.fn(),
  getDistinctActions: vi.fn(),
}));

// ── Mock notification service ────────────────────────────────────────────────
vi.mock('../services/notificationService.js', () => ({
  sendPasswordResetNotification: vi.fn().mockResolvedValue(undefined),
}));

import { pool } from '../db/pool.js';
import app from '../server.js';
import { signJwt } from '../utils/token.js';

const mockExecute = vi.mocked(pool.execute);

describe('POST /api/auth/setup', () => {
  beforeEach(() => mockExecute.mockReset());

  const validPayload = {
    full_name: 'Arun Kumar',
    username: 'admin',
    email: 'admin@hostel.com',
    password: 'Secret123',
    confirm_password: 'Secret123',
  };

  it('creates first admin when no users exist', async () => {
    // hasAnyUser → count = 0
    mockExecute
      .mockResolvedValueOnce([[{ cnt: 0 }], []])           // hasAnyUser
      .mockResolvedValueOnce([{ insertId: 1 }, []])         // INSERT user
      .mockResolvedValueOnce([[{                            // findUserById
        id: 1, username: 'admin', email: 'admin@hostel.com',
        full_name: 'Arun Kumar', role: 'ADMIN', is_active: 1,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        last_login_at: null,
      }], []]);

    const res = await request(app).post('/api/auth/setup').send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('ADMIN');
  });

  it('blocks setup when users already exist', async () => {
    mockExecute.mockResolvedValueOnce([[{ cnt: 1 }], []]);

    const res = await request(app).post('/api/auth/setup').send(validPayload);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('validates required fields', async () => {
    const res = await request(app).post('/api/auth/setup').send({ username: 'a' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects mismatched passwords', async () => {
    const res = await request(app).post('/api/auth/setup').send({
      ...validPayload,
      confirm_password: 'Different123',
    });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('rejects weak passwords', async () => {
    const res = await request(app).post('/api/auth/setup').send({
      ...validPayload,
      password: 'weak',
      confirm_password: 'weak',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects login with wrong credentials', async () => {
    // authenticateUser — user not found
    mockExecute.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'noone', password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects login for inactive user', async () => {
    const { hashPassword } = await import('../utils/password.js');
    const hash = await hashPassword('Secret123');
    mockExecute.mockResolvedValueOnce([[{
      id: 2, username: 'warden', email: 'w@hostel.com',
      password: hash, full_name: 'Warden', role: 'WARDEN', is_active: 0,
    }], []]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'warden', password: 'Secret123' });
    expect(res.status).toBe(401);
  });

  it('rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => vi.clearAllMocks());

  it('always returns the same message regardless of user existence', async () => {
    // User not found
    mockExecute.mockResolvedValueOnce([[], []]);
    const res1 = await request(app)
      .post('/api/auth/forgot-password')
      .send({ identifier: 'nonexistent@example.com' });
    expect(res1.status).toBe(200);
    expect(res1.body.data.message).toContain('If the account exists');

    // User found
    mockExecute
      .mockResolvedValueOnce([[{ id: 1, email: 'a@b.com', full_name: 'Test' }], []])
      .mockResolvedValueOnce([[], []])   // invalidate old tokens
      .mockResolvedValueOnce([[], []])   // insert new token
      .mockResolvedValueOnce([[], []]);  // audit log
    const res2 = await request(app)
      .post('/api/auth/forgot-password')
      .send({ identifier: 'a@b.com' });
    expect(res2.status).toBe(200);
    expect(res2.body.data.message).toContain('If the account exists');
  });
});

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.application).toBe('ok');
  });
});

describe('RBAC enforcement', () => {
  beforeEach(() => mockExecute.mockReset());

  it('returns 401 for unauthenticated /api/users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('returns 401 for unauthenticated /api/audit-logs', async () => {
    const res = await request(app).get('/api/audit-logs');
    expect(res.status).toBe(401);
  });

  it('blocks maintenance users from leave management data', async () => {
    mockExecute.mockResolvedValueOnce([[{
      id: 9,
      username: 'tech',
      email: 'tech@hostel.com',
      full_name: 'Tech User',
      role: 'MAINTENANCE',
      is_active: 1,
    }], []]);

    const res = await request(app)
      .get('/api/leave')
      .set('Cookie', [`auth_token=${signJwt(9, 'MAINTENANCE')}`]);

    expect(res.status).toBe(403);
  });

  it('blocks maintenance users from visitor logs', async () => {
    mockExecute.mockResolvedValueOnce([[{
      id: 9,
      username: 'tech',
      email: 'tech@hostel.com',
      full_name: 'Tech User',
      role: 'MAINTENANCE',
      is_active: 1,
    }], []]);

    const res = await request(app)
      .get('/api/visitors')
      .set('Cookie', [`auth_token=${signJwt(9, 'MAINTENANCE')}`]);

    expect(res.status).toBe(403);
  });
});
