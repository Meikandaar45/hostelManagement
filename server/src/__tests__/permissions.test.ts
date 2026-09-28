import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hasPermission, rolePermissions, Role, Permission } from '../config/permissions.js';

describe('RBAC permissions', () => {
  it('ADMIN has manage_users permission', () => {
    expect(hasPermission('ADMIN', Permission.MANAGE_USERS)).toBe(true);
  });

  it('ADMIN has view_audit_logs permission', () => {
    expect(hasPermission('ADMIN', Permission.VIEW_AUDIT_LOGS)).toBe(true);
  });

  it('WARDEN does not have manage_users in Phase 1', () => {
    expect(hasPermission('WARDEN', Permission.MANAGE_USERS)).toBe(false);
  });

  it('STUDENT does not have manage_users', () => {
    expect(hasPermission('STUDENT', Permission.MANAGE_USERS)).toBe(false);
  });

  it('MAINTENANCE does not have access_admin', () => {
    expect(hasPermission('MAINTENANCE', Permission.ACCESS_ADMIN)).toBe(false);
  });

  it('all roles are defined in rolePermissions', () => {
    const roles: Role[] = ['ADMIN', 'WARDEN', 'STUDENT', 'MAINTENANCE'];
    for (const role of roles) {
      expect(rolePermissions[role]).toBeDefined();
    }
  });
});
