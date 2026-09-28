/** Centralized RBAC — single source of truth for all roles and permissions. */

export const Role = {
  ADMIN: 'ADMIN',
  WARDEN: 'WARDEN',
  STUDENT: 'STUDENT',
  MAINTENANCE: 'MAINTENANCE',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ALL_ROLES: Role[] = ['ADMIN', 'WARDEN', 'STUDENT', 'MAINTENANCE'];

/**
 * Permissions are strings used in requirePermission() middleware.
 * Add new permissions here as later phases are implemented.
 */
export const Permission = {
  // Phase 1
  MANAGE_USERS: 'manage_users',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  ACCESS_ADMIN: 'access_admin',

  // Phase 2 placeholders (not enforced yet)
  MANAGE_ROOMS: 'manage_rooms',
  MANAGE_FEES: 'manage_fees',

  // Phase 3
  MANAGE_COMPLAINTS: 'manage_complaints',
  MANAGE_VISITORS: 'manage_visitors',
  MANAGE_LEAVE: 'manage_leave',
  VIEW_ASSIGNED_TASKS: 'view_assigned_tasks',
  UPDATE_TASK_STATUS: 'update_task_status',

  // Phase 4
  VIEW_REPORTS: 'view_reports',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

/** Role → permissions mapping. */
export const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    Permission.MANAGE_USERS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.ACCESS_ADMIN,
    Permission.MANAGE_ROOMS,
    Permission.MANAGE_FEES,
    Permission.MANAGE_COMPLAINTS,
    Permission.MANAGE_VISITORS,
    Permission.MANAGE_LEAVE,
    Permission.VIEW_REPORTS,
  ],
  WARDEN: [
    Permission.MANAGE_ROOMS,
    Permission.MANAGE_FEES,
    Permission.MANAGE_COMPLAINTS,
    Permission.MANAGE_VISITORS,
    Permission.MANAGE_LEAVE,
    Permission.VIEW_REPORTS,
  ],
  STUDENT: [],
  MAINTENANCE: [
    Permission.VIEW_ASSIGNED_TASKS,
    Permission.UPDATE_TASK_STATUS,
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}
