import { expect, test, type Page } from '@playwright/test';

// Helper to mock authenticated state for any role
async function mockSession(page: Page, role: 'ADMIN' | 'WARDEN' | 'STUDENT' | 'MAINTENANCE', isActive = 1) {
  await page.route('**/api/auth/me', async (route) => {
    if (!isActive) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Account is inactive' }),
      });
      return;
    }
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
            is_active: isActive,
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
            total_students: 25,
            active_students: 24,
            total_rooms: 10,
            total_capacity: 20,
            occupied_beds: 15,
            occupied_rooms: 8,
            pending_fees: 3,
            pending_fee_balance: 1500,
            overdue_fees: 1,
            open_complaints: 2,
            pending_complaints: 1,
            available_rooms: 2,
            full_rooms: 6,
            total_payments_amount: 15000,
            total_payments_count: 12,
            active_maintenance_tasks: 2,
            current_visitors: 1,
            pending_leave_requests: 1,
            pending_tasks: 1,
            in_progress_tasks: 1,
            urgent_tasks: 0,
            resolved_tasks: 4,
            occupancy_rate: 75,
            approved_leaves: 3,
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

test.describe('Role-Based Access Control & Authentication Flow', () => {
  test('login page handles empty inputs with form validation', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

    const submitBtn = page.getByRole('button', { name: 'Sign In' });
    await submitBtn.click();

    // Client-side HTML5 or Zod validation stops submission
    await expect(page.getByLabel('Username or Email')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login page displays error message on invalid credentials', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Invalid credentials' }),
      });
    });

    await page.goto('/login');
    await page.getByLabel('Username or Email').fill('wronguser');
    await page.getByLabel('Password').fill('WrongPassword123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid credentials or inactive account')).toBeVisible();
  });

  test('login page displays error for inactive user account', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Account is inactive' }),
      });
    });

    await page.goto('/login');
    await page.getByLabel('Username or Email').fill('inactive_user');
    await page.getByLabel('Password').fill('Secret123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid credentials or inactive account')).toBeVisible();
  });

  test('forgot password flow submits identifier and shows confirmation', async ({ page }) => {
    await page.route('**/api/auth/forgot-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { message: 'If the account exists, password reset instructions have been issued.' },
        }),
      });
    });

    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();

    await page.getByLabel('Username or Email').fill('student@hostel.com');
    await page.getByRole('button', { name: 'Send Reset Instructions' }).click();

    await expect(page.getByText('If the account exists, password reset instructions have been issued.')).toBeVisible();
  });

  test('student shell cannot view admin modules in sidebar navigation', async ({ page }) => {
    await mockSession(page, 'STUDENT');
    await page.goto('/app/dashboard');

    await expect(page.getByText('STUDENT User')).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Room' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Fees' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Profile' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Leave & Gate Pass' })).toBeVisible();

    // Verify forbidden admin/management items are absent
    await expect(page.getByRole('link', { name: 'User Management' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Audit Logs' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Reports' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'My Tasks' })).toHaveCount(0);
  });

  test('student navigating directly to admin URL is denied and shows Access Denied', async ({ page }) => {
    await mockSession(page, 'STUDENT');

    // Attempting direct URL to /app/users
    await page.goto('/app/users');

    // ProtectedRoute blocks unauthorized access and renders Access Denied
    await expect(page.getByText('Access Denied')).toBeVisible();
    await expect(page.getByText('You do not have permission to view this page.')).toBeVisible();
  });

  test('warden shell contains operations navigation but no admin user/audit management', async ({ page }) => {
    await mockSession(page, 'WARDEN');
    await page.goto('/app/dashboard');

    await expect(page.getByText('WARDEN User')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Rooms' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Students' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Fees' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Complaints' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Visitors' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Leave Approvals' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reports' })).toBeVisible();

    // Warden cannot access User Management or Audit Logs
    await expect(page.getByRole('link', { name: 'User Management' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Audit Logs' })).toHaveCount(0);
  });

  test('warden navigating directly to /app/users is denied and shows Access Denied', async ({ page }) => {
    await mockSession(page, 'WARDEN');
    await page.goto('/app/users');

    await expect(page.getByText('Access Denied')).toBeVisible();
    await expect(page.getByText('You do not have permission to view this page.')).toBeVisible();
  });

  test('maintenance shell is restricted solely to assigned tasks and personal profile', async ({ page }) => {
    await mockSession(page, 'MAINTENANCE');
    await page.goto('/app/dashboard');

    await expect(page.getByText('MAINTENANCE User')).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Tasks' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();

    // Maintenance blocked from administrative and student modules
    await expect(page.getByRole('link', { name: 'User Management' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Students' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Rooms' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Fees' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Visitors' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Reports' })).toHaveCount(0);
  });

  test('sign out button terminates session and returns to login', async ({ page }) => {
    await mockSession(page, 'ADMIN');

    await page.route('**/api/auth/logout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Logged out successfully' }),
      });
    });

    await page.goto('/app/dashboard');
    await expect(page.getByText('ADMIN User')).toBeVisible();

    const signOutBtn = page.getByRole('button', { name: 'Sign out of account' });
    await signOutBtn.click();

    await expect(page).toHaveURL(/\/login$/);
  });
});
