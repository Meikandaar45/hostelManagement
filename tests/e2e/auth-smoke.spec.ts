import { expect, test, type Page } from '@playwright/test';

async function mockUnauthenticated(page: Page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'Authentication required' }),
    });
  });
}

async function mockAuthenticated(page: Page, role: 'ADMIN' | 'WARDEN' | 'STUDENT' | 'MAINTENANCE') {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: 1,
            username: role.toLowerCase(),
            email: `${role.toLowerCase()}@example.test`,
            full_name: `${role} User`,
            role,
            is_active: 1,
          },
        },
      }),
    });
  });

  await page.route('**/api/notifications/unread-count', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { unreadCount: 0 } }),
    });
  });

  await page.route('**/api/dashboard/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          role,
          metrics: {
            total_students: 10,
            active_students: 10,
            total_rooms: 5,
            total_capacity: 10,
            occupied_beds: 4,
            occupied_rooms: 2,
            pending_fees: 1,
            pending_fee_balance: 500,
            overdue_fees: 0,
            open_complaints: 0,
            pending_complaints: 0,
            available_rooms: 3,
            full_rooms: 0,
            total_payments_amount: 5000,
            total_payments_count: 5,
            active_maintenance_tasks: 0,
            current_visitors: 0,
            pending_leave_requests: 0,
            pending_tasks: 0,
            in_progress_tasks: 0,
            urgent_tasks: 0,
            resolved_tasks: 0,
            occupancy_rate: 40,
            approved_leaves: 0,
          },
          recent: { payments: [], complaints: [], leaves: [], visitors: [] },
          tasks: [],
          profile: { full_name: `${role} User`, student_id: 'STU01', department: 'CS' },
          financial: { outstanding_balance: 0, total_due: 0, total_paid: 0, upcoming_fees: [] },
          complaints: { open_count: 0, latest: null },
          leave: { requests: [] },
        },
      }),
    });
  });
}

test('redirects protected app routes to login when unauthenticated', async ({ page }) => {
  await mockUnauthenticated(page);

  await page.goto('/app/dashboard');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  await expect(page.getByLabel('Username or Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
});

test('admin shell exposes administrative navigation', async ({ page }) => {
  await mockAuthenticated(page, 'ADMIN');

  await page.goto('/app/dashboard');

  await expect(page.getByText('ADMIN User')).toBeVisible();
  await expect(page.getByText('User Management')).toBeVisible();
  await expect(page.getByText('Audit Logs')).toBeVisible();
  await expect(page.getByText('Reports')).toBeVisible();
});

test('maintenance shell is scoped to assigned task navigation', async ({ page }) => {
  await mockAuthenticated(page, 'MAINTENANCE');

  await page.goto('/app/dashboard');

  await expect(page.getByText('MAINTENANCE User', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'My Tasks' })).toBeVisible();
  await expect(page.getByText('Visitors')).toHaveCount(0);
  await expect(page.getByText('Reports')).toHaveCount(0);
});

