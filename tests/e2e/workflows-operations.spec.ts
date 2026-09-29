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
      body: JSON.stringify({ success: true, data: { unreadCount: 1 } }),
    });
  });

  await page.route('**/api/notifications*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          notifications: [
            { id: 1, title: 'Welcome Notice', message: 'System active.', is_read: false, created_at: new Date().toISOString() },
          ],
          total: 1,
          unreadCount: 1,
        },
      }),
    });
  });

  await page.route('**/api/dashboard/summary', async (route) => {
    if (role === 'STUDENT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            role: 'STUDENT',
            profile: {
              id: 101,
              student_id: 'ENR-001',
              full_name: 'STUDENT User',
              department: 'Computer Science',
            },
            room: {
              room_id: 10,
              room_number: 'A-101',
              block: 'A',
              floor: 1,
              room_type: 'DOUBLE',
              capacity: 2,
            },
            financial: {
              outstanding_balance: 0,
              total_due: 15000,
              total_paid: 15000,
              upcoming_fees: [],
              recent_payments: [],
            },
            complaints: {
              open_count: 1,
              total_count: 1,
              latest: {
                ticket_id: 'TCK-501',
                status: 'IN_PROGRESS',
                description: 'Study lamp switch broken in desk area',
              },
            },
            leave: {
              requests: [],
            },
          },
        }),
      });
      return;
    }

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

test.describe('Admin Complete Operational Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, 'ADMIN');
  });

  test('admin navigates across core modules and triggers modal creation forms', async ({ page }) => {
    // 1. Dashboard
    await page.goto('/app/dashboard');
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
    await expect(page.getByText('ADMIN User', { exact: true })).toBeVisible();

    // 2. User Management
    await page.route('**/api/users*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              { id: 1, username: 'arun.kumar', email: 'arun.kumar@example.com', full_name: 'Arun Kumar', role: 'ADMIN', status: 'ACTIVE', created_at: '2026-01-01' },
              { id: 2, username: 'karthik.raj', email: 'karthik.raj@example.com', full_name: 'Karthik Raj', role: 'WARDEN', status: 'ACTIVE', created_at: '2026-01-02' },
            ],
            total: 2,
            page: 1,
            totalPages: 1,
          },
        }),
      });
    });

    await page.getByRole('link', { name: 'User Management' }).click();
    await expect(page).toHaveURL(/\/app\/users$/);
    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
    await expect(page.getByRole('table').getByText('@arun.kumar')).toBeVisible();
    await expect(page.getByRole('table').getByText('@karthik.raj')).toBeVisible();

    // 3. Room Management
    await page.route('**/api/rooms/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { totalRooms: 60, totalBeds: 120, occupiedBeds: 100, availableBeds: 20, occupancyRate: 83.3 },
        }),
      });
    });

    await page.route('**/api/rooms?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              { id: 10, room_number: 'A-101', block: 'A', floor: 1, room_type: 'DOUBLE', capacity: 2, occupied_beds: 1, status: 'AVAILABLE' },
              { id: 11, room_number: 'B-201', block: 'B', floor: 2, room_type: 'SINGLE', capacity: 1, occupied_beds: 1, status: 'FULL' },
            ],
            total: 2,
            page: 1,
            totalPages: 1,
          },
        }),
      });
    });

    await page.getByRole('link', { name: 'Rooms' }).click();
    await expect(page).toHaveURL(/\/app\/rooms$/);
    await expect(page.getByRole('heading', { name: 'Rooms' })).toBeVisible();
    await expect(page.getByText('A-101')).toBeVisible();
    await expect(page.getByText('B-201')).toBeVisible();

    // Open Create Room Modal
    await page.getByRole('button', { name: 'Add Room' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Room' })).toBeVisible();
    await expect(page.getByLabel('Room Number')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    // 4. Student Management
    await page.route('**/api/students*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 101,
                student_id: 'ENR-2026-001',
                full_name: 'Rahul Sharma',
                room_number: 'A-101',
                department: 'CS',
                contact_number: '9876543210',
                is_active: true,
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          },
        }),
      });
    });

    await page.getByRole('link', { name: 'Students' }).click();
    await expect(page).toHaveURL(/\/app\/students$/);
    await expect(page.getByRole('heading', { name: 'Students' })).toBeVisible();
    await expect(page.getByText('Rahul Sharma')).toBeVisible();

    // 5. Audit Logs
    await page.route('**/api/audit-logs/actions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: ['USER_LOGIN', 'ROOM_ALLOCATE'],
        }),
      });
    });

    await page.route('**/api/audit-logs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              { id: 1, action: 'USER_LOGIN', user_id: 1, username: 'arun.kumar', ip_address: '127.0.0.1', created_at: '2026-09-28T12:00:00Z' },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          },
        }),
      });
    });

    await page.getByRole('link', { name: 'Audit Logs' }).click();
    await expect(page).toHaveURL(/\/app\/audit$/);
    await expect(page.getByRole('heading', { name: 'System Audit Trail' })).toBeVisible();
    await expect(page.getByRole('table').getByText('USER_LOGIN')).toBeVisible();
  });
});

test.describe('Student Complete Operational Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, 'STUDENT');
  });

  test('student views dashboard, room, fee balance, and files a complaint', async ({ page }) => {
    await page.goto('/app/dashboard');
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'STUDENT User' })).toBeVisible();

    // 1. My Room
    await page.route('**/api/me/room', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            allocation: {
              room_number: 'A-101',
              block: 'A',
              floor: 1,
              room_type: 'DOUBLE',
              capacity: 2,
              current_occupancy: 1,
              allocated_at: '2026-01-15T00:00:00Z',
            },
          },
        }),
      });
    });

    await page.getByRole('link', { name: 'My Room' }).click();
    await expect(page).toHaveURL(/\/app\/my-room$/);
    await expect(page.getByRole('heading', { name: 'My Room' })).toBeVisible();
    await expect(page.getByText('Room A-101')).toBeVisible();

    // 2. My Fees
    await page.route('**/api/me/fees', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 801,
                fee_type: 'HOSTEL_RENT',
                academic_period: '2025-2026 SEM-1',
                amount: '12000.00',
                outstanding_amount: '0.00',
                due_date: '2026-01-31',
                status: 'PAID',
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          },
        }),
      });
    });

    await page.getByRole('link', { name: 'My Fees' }).click();
    await expect(page).toHaveURL(/\/app\/my-fees$/);
    await expect(page.getByRole('heading', { name: 'My Fees' })).toBeVisible();
    await expect(page.getByText('HOSTEL_RENT')).toBeVisible();

    // 3. Complaints & Submitting a New Complaint
    await page.route('**/api/complaints*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              complaint: {
                id: 502,
                category: 'PLUMBING',
                description: 'Bathroom tap leaking continuously',
                priority: 'MEDIUM',
                status: 'SUBMITTED',
              },
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [
                {
                  id: 501,
                  ticket_id: 'TCK-501',
                  category: 'ELECTRICAL',
                  description: 'Study lamp switch broken in desk area',
                  priority: 'HIGH',
                  status: 'IN_PROGRESS',
                  created_at: '2026-09-28',
                },
              ],
              total: 1,
              page: 1,
              totalPages: 1,
            },
          }),
        });
      }
    });

    await page.getByRole('link', { name: 'Complaints' }).click();
    await expect(page).toHaveURL(/\/app\/complaints$/);
    await expect(page.getByRole('heading', { name: 'Complaint Management' })).toBeVisible();
    await expect(page.getByText('TCK-501')).toBeVisible();

    // Open Register Complaint Modal
    await page.getByRole('button', { name: 'Raise Complaint' }).click();
    await expect(page.getByRole('heading', { name: 'Raise Maintenance Complaint' })).toBeVisible();

    await page.getByLabel('Category').selectOption('PLUMBING');
    await page.locator('textarea').fill('Bathroom tap leaking continuously');
    await page.getByRole('button', { name: 'Submit Complaint' }).click();

    await expect(page.getByText(/Complaint submitted successfully/i)).toBeVisible();
  });
});

test.describe('Warden Complete Operational Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, 'WARDEN');
  });

  test('warden inspects leave approvals and approves pending student request', async ({ page }) => {
    await page.route('**/api/leave?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 401,
                student_id: 101,
                student_name: 'Rahul Sharma',
                student_number: 'ENR-001',
                room_number: 'A-101',
                from_datetime: '2026-10-01T10:00:00Z',
                to_datetime: '2026-10-05T18:00:00Z',
                reason: 'Sister marriage ceremony',
                status: 'PENDING',
                review_notes: null,
                reviewed_by: null,
                reviewed_at: null,
                gate_pass_number: null,
                created_at: '2026-09-28T09:00:00Z',
                updated_at: '2026-09-28T09:00:00Z',
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          },
        }),
      });
    });

    await page.route('**/api/leave/401/approve', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Leave approved successfully',
          data: {
            leave: {
              id: 401,
              status: 'APPROVED',
              review_notes: 'Approved for family function',
              gate_pass_number: 'GP-2026-001',
            },
          },
        }),
      });
    });

    await page.goto('/app/leave/requests');
    await expect(page.getByRole('heading', { name: 'Leave Approvals' })).toBeVisible();
    await expect(page.getByText('Rahul Sharma')).toBeVisible();
    await expect(page.getByText('Sister marriage ceremony')).toBeVisible();

    // Trigger Approve Action
    await page.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByRole('heading', { name: /Approve Leave/i })).toBeVisible();

    await page.getByPlaceholder(/Approved/i).fill('Approved for family function');
    await page.getByRole('button', { name: 'Confirm Approval' }).click();

    await expect(page.getByText(/Leave approved & Gate Pass generated/i)).toBeVisible();
  });
});

test.describe('Maintenance Staff Operational Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, 'MAINTENANCE');
  });

  test('maintenance staff views tasks, begins progress, and resolves task with notes', async ({ page }) => {
    let taskStatus = 'ASSIGNED';

    await page.route('**/api/my-tasks*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 601,
                ticket_id: 'TCK-601',
                student_id: 101,
                room_id: 10,
                category: 'ELECTRICAL',
                description: 'Room ceiling fan running at very low speed capacitor fault',
                priority: 'HIGH',
                status: taskStatus,
                room_number: 'B-204',
                student_name: 'Pooja Verma',
                created_at: '2026-09-28',
                updated_at: '2026-09-28',
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          },
        }),
      });
    });

    await page.route('**/api/complaints/601/status', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      taskStatus = body.status || 'IN_PROGRESS';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Status updated',
          data: { id: 601, status: taskStatus, work_notes: body.work_notes || null },
        }),
      });
    });

    await page.goto('/app/my-tasks');
    await expect(page.getByRole('heading', { name: 'My Maintenance Tasks' })).toBeVisible();
    await expect(page.getByText('Room ceiling fan running at very low speed')).toBeVisible();

    // Start progress
    await page.getByRole('button', { name: 'Start Work' }).click();
    await expect(page.getByText(/Task marked In Progress/i)).toBeVisible();

    // Resolve task with notes
    await page.getByRole('button', { name: 'Mark Resolved' }).click();
    await expect(page.getByRole('heading', { name: /Resolve Ticket/i })).toBeVisible();

    await page.getByRole('textbox').fill('Replaced 2.5uF capacitor, speed tested ok.');
    await page.getByRole('button', { name: 'Confirm Resolution' }).click();

    await expect(page.getByText(/Task marked as Resolved/i)).toBeVisible();
  });
});
