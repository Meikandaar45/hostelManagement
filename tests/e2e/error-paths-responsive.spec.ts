import { test, expect, Page } from '@playwright/test';

async function setupApiMocks(page: Page, role: 'ADMIN' | 'WARDEN' | 'STUDENT' | 'MAINTENANCE') {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: role === 'STUDENT' ? 101 : role === 'MAINTENANCE' ? 301 : role === 'WARDEN' ? 201 : 1,
            username: `${role.toLowerCase()}_user`,
            email: `${role.toLowerCase()}@hostel.com`,
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

  await page.route('**/api/notifications*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { notifications: [], total: 0, unreadCount: 0 },
      }),
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
            total_students: 150,
            active_students: 148,
            total_rooms: 60,
            total_capacity: 120,
            occupied_beds: 100,
            occupied_rooms: 50,
            pending_fees: 4,
            pending_fee_balance: 12000,
            overdue_fees: 1,
            open_complaints: 4,
            pending_complaints: 2,
            pending_leaves: 2,
            active_leaves: 1,
            today_visitors: 3,
            current_visitors: 2,
            assigned_tasks: 2,
            in_progress_tasks: 1,
            completed_today: 3,
          },
          recent: {
            complaints: [],
            leaves: [],
            payments: [],
            visitors: [],
            tasks: [],
          },
        },
      }),
    });
  });
}

test.describe('Error-Path & Resilience Testing', () => {
  test('handles duplicate student conflict gracefully without crashing', async ({ page }) => {
    await setupApiMocks(page, 'ADMIN');

    await page.route('**/api/students?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [], total: 0, page: 1, totalPages: 1 },
        }),
      });
    });

    await page.route('**/api/students', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Student with this ID or Email already exists in the system.',
          }),
        });
      }
    });

    await page.goto('/app/students');
    await expect(page.getByRole('heading', { name: 'Students' })).toBeVisible();

    await page.getByRole('button', { name: 'Add Student' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Student' })).toBeVisible();

    await page.getByLabel('Student ID').fill('STU-DUP-01');
    await page.getByLabel('Email').fill('dup@hostel.com');
    await page.getByLabel('Full Name').fill('Duplicate Student');
    await page.locator('form select').selectOption('MALE');
    await page.getByLabel('Contact Number').fill('9876543210');
    await page.getByLabel('Department').fill('CS');
    await page.getByLabel('Admission Date').fill('2026-08-01');
    await page.getByLabel('Address').fill('123 Main St, Springfield');

    await page.getByRole('button', { name: 'Add Student' }).last().click();

    // Verify error toast appears and modal does not crash
    await expect(page.getByText(/Student with this ID or Email already exists/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add New Student' })).toBeVisible();
  });

  test('validates leave application date logic when return precedes departure', async ({ page }) => {
    await setupApiMocks(page, 'STUDENT');

    await page.route('**/api/leave?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [], total: 0, page: 1, totalPages: 1 },
        }),
      });
    });

    await page.goto('/app/leave');
    await expect(page.getByRole('heading', { name: 'Leave Requests & Gate Pass' })).toBeVisible();

    await page.getByRole('button', { name: 'Apply for Leave' }).click();
    await expect(page.getByRole('heading', { name: 'Apply for Hostel Leave' })).toBeVisible();

    // Fill departure later than return date
    await page.getByLabel(/Departure Date & Time/i).fill('2026-10-10T12:00');
    await page.getByLabel(/Expected Return Date & Time/i).fill('2026-10-05T12:00');
    await page.locator('form textarea').fill('Visiting family for festival');

    await page.getByRole('button', { name: 'Submit Request' }).click();

    // Zod inline validation catches the inverted date range
    await expect(page.getByText(/Return date\/time must be strictly after departure/i)).toBeVisible();
  });

  test('gracefully handles 500 server error when loading dashboard without white-screen crash', async ({ page }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { id: 1, username: 'arun.kumar', full_name: 'Arun Kumar', role: 'ADMIN', is_active: 1 },
          },
        }),
      });
    });

    await page.route('**/api/notifications/unread-count', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { unreadCount: 0 } }) });
    });

    await page.route('**/api/dashboard/summary', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Database connection failed' }),
      });
    });

    await page.goto('/app/dashboard');

    // Page still renders layout and dashboard fallback safely without unhandled JavaScript exceptions
    await expect(page.getByText('Arun Kumar', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out of account' })).toBeVisible();
  });
});

test.describe('Responsive Layout E2E Verification', () => {
  test('renders flawlessly on Desktop viewport (1280x800)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupApiMocks(page, 'ADMIN');

    await page.goto('/app/dashboard');
    await expect(page.getByRole('heading', { name: 'Executive Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'User Management' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Rooms' })).toBeVisible();
  });

  test('adapts layout cleanly on Tablet viewport (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await setupApiMocks(page, 'ADMIN');

    await page.goto('/app/dashboard');
    await expect(page.getByRole('heading', { name: 'Executive Dashboard' })).toBeVisible();

    // Verify page content does not cause horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('adapts layout and navigation on Mobile viewport (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await setupApiMocks(page, 'ADMIN');

    await page.goto('/app/dashboard');
    await expect(page.getByRole('heading', { name: 'Executive Dashboard' })).toBeVisible();

    // Verify responsive mobile container doesn't overflow horizontally
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
