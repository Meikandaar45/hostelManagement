import { describe, it, expect } from 'vitest';
import { getNavForRole } from '../config/navigation';

describe('Role Navigation Configuration', () => {
  it('ADMIN has access to reports, audit, users, students, rooms, fees, etc.', () => {
    const nav = getNavForRole('ADMIN');
    const paths = nav.map((n) => n.path);
    expect(paths).toContain('/app/reports');
    expect(paths).toContain('/app/dashboard');
    expect(paths).toContain('/app/users');
    expect(paths).toContain('/app/audit');
    expect(paths).toContain('/app/students');
    expect(paths).toContain('/app/rooms');
    expect(paths).toContain('/app/fees');
  });

  it('WARDEN has access to reports, students, rooms, fees, complaints, leave approvals', () => {
    const nav = getNavForRole('WARDEN');
    const paths = nav.map((n) => n.path);
    expect(paths).toContain('/app/reports');
    expect(paths).toContain('/app/students');
    expect(paths).toContain('/app/rooms');
    expect(paths).toContain('/app/fees');
    expect(paths).toContain('/app/leave/requests');
    expect(paths).not.toContain('/app/users');
    expect(paths).not.toContain('/app/audit');
  });

  it('STUDENT does NOT have access to reports or management pages', () => {
    const nav = getNavForRole('STUDENT');
    const paths = nav.map((n) => n.path);
    expect(paths).not.toContain('/app/reports');
    expect(paths).not.toContain('/app/users');
    expect(paths).not.toContain('/app/audit');
    expect(paths).toContain('/app/my-room');
    expect(paths).toContain('/app/my-fees');
    expect(paths).toContain('/app/my-profile');
    expect(paths).toContain('/app/leave');
  });

  it('MAINTENANCE does NOT have access to reports and only has tasks', () => {
    const nav = getNavForRole('MAINTENANCE');
    const paths = nav.map((n) => n.path);
    expect(paths).not.toContain('/app/reports');
    expect(paths).not.toContain('/app/users');
    expect(paths).toContain('/app/my-tasks');
  });
});
