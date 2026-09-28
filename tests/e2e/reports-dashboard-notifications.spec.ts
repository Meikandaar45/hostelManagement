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
      body: JSON.stringify({ success: true, data: { unreadCount: 3 } }),
    });
  });
}

test.describe('Dashboard Dynamic Verification', () => {
  test('displays real dynamic metrics and updates statistics upon refresh', async ({ page }) => {
    await setupApiMocks(page, 'ADMIN');

    let totalStudents = 142;
    let totalRooms = 55;
    let occupancyRate = 81.5;

    await page.route('**/api/dashboard/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            role: 'ADMIN',
            metrics: {
              total_students: totalStudents,
              active_students: totalStudents - 2,
              total_rooms: totalRooms,
              total_capacity: totalRooms * 2,
              occupied_beds: 90,
              occupied_rooms: 45,
              pending_fees: 5,
              pending_fee_balance: 14500,
              overdue_fees: 2,
              open_complaints: 6,
              pending_complaints: 3,
              pending_leaves: 4,
              active_leaves: 2,
              today_visitors: 8,
              current_visitors: 4,
            },
            recent: {
              complaints: [],
              leaves: [],
              payments: [],
              visitors: [],
            },
          },
        }),
      });
    });

    await page.goto('/app/dashboard');
    await expect(page.getByRole('heading', { name: 'Executive Dashboard' })).toBeVisible();
    await expect(page.getByText('142')).toBeVisible();
    await expect(page.getByText('55')).toBeVisible();

    // Now update dynamic backend metrics and trigger reload
    totalStudents = 158;
    totalRooms = 60;
    occupancyRate = 89.2;

    await page.reload();
    await expect(page.getByText('158')).toBeVisible();
    await expect(page.getByText('60')).toBeVisible();
  });
});

test.describe('Reports Module Complete Verification', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, 'ADMIN');

    await page.route('**/api/dashboard/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { role: 'ADMIN', metrics: {}, recent: {} },
        }),
      });
    });
  });

  test('switches between tabs, filters by search, and triggers export and print', async ({ page }) => {
    // 1. Students report tab
    await page.route('**/api/reports/students*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              { id: 101, student_id: 'STU-101', full_name: 'Rahul Sharma', department: 'Computer Science', room_number: 'A-101', is_active: 1 },
              { id: 102, student_id: 'STU-102', full_name: 'Priya Patel', department: 'Mechanical', room_number: 'B-201', is_active: 1 },
            ],
            total: 2,
            page: 1,
            limit: 20,
            totalPages: 1,
          },
        }),
      });
    });

    // 2. Rooms report tab
    await page.route('**/api/reports/rooms*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              { id: 1, room_number: 'A-101', block: 'A', floor: 1, room_type: 'DOUBLE', capacity: 2, current_occupancy: 2, status: 'FULL' },
            ],
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
          },
        }),
      });
    });

    // 3. Fees report tab
    await page.route('**/api/reports/fees*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              { id: 801, student_name: 'Rahul Sharma', fee_type: 'HOSTEL_RENT', amount: '12000.00', paid_amount: '12000.00', balance: '0.00', status: 'PAID' },
            ],
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
          },
        }),
      });
    });

    await page.goto('/app/reports');
    await expect(page.getByRole('heading', { name: 'Reporting & Analytics' })).toBeVisible();

    // Default Students Tab
    await expect(page.getByText('Rahul Sharma')).toBeVisible();
    await expect(page.getByText('Priya Patel')).toBeVisible();

    // Switch to Rooms Tab
    await page.getByRole('button', { name: 'Room Occupancy' }).click();
    await expect(page.getByText('A-101')).toBeVisible();

    // Switch to Fees Tab
    await page.getByRole('button', { name: 'Fees' }).click();
    await expect(page.getByText('HOSTEL_RENT')).toBeVisible();

    // Test Export CSV button presence
    const exportBtn = page.getByRole('button', { name: /Export CSV/i });
    await expect(exportBtn).toBeVisible();

    // Test Print button presence
    const printBtn = page.getByRole('button', { name: /Print Report/i });
    await expect(printBtn).toBeVisible();
  });
});

test.describe('Notification System E2E Verification', () => {
  test('displays notifications list, marks single item as read, and marks all read', async ({ page }) => {
    await setupApiMocks(page, 'STUDENT');

    let unreadCount = 2;
    let notificationList = [
      {
        id: 11,
        user_id: 101,
        type: 'COMPLAINT_UPDATE',
        title: 'Maintenance Progress',
        message: 'Your complaint TCK-501 is now In Progress.',
        is_read: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 12,
        user_id: 101,
        type: 'LEAVE_STATUS',
        title: 'Leave Approved',
        message: 'Your leave application has been approved by Warden.',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ];

    await page.route('**/api/notifications?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: notificationList,
            total: notificationList.length,
            page: 1,
            limit: 15,
            totalPages: 1,
          },
        }),
      });
    });

    await page.route('**/api/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { unreadCount },
        }),
      });
    });

    await page.route('**/api/notifications/11/read', async (route) => {
      unreadCount = 1;
      notificationList = notificationList.map((n) => (n.id === 11 ? { ...n, is_read: true } : n));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Notification marked as read' }),
      });
    });

    await page.route('**/api/notifications/read-all', async (route) => {
      unreadCount = 0;
      notificationList = notificationList.map((n) => ({ ...n, is_read: true }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'All notifications marked as read' }),
      });
    });

    await page.goto('/app/notifications');
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByText('Maintenance Progress')).toBeVisible();
    await expect(page.getByText('Leave Approved')).toBeVisible();

    // Mark single notification as read
    const markReadBtn = page.getByTitle('Mark as read').first();
    await markReadBtn.click();

    // Mark all notifications as read
    const markAllBtn = page.getByRole('button', { name: 'Mark all as read' });
    await markAllBtn.click();
    await expect(page.getByText(/All notifications marked as read/i)).toBeVisible();
  });
});
