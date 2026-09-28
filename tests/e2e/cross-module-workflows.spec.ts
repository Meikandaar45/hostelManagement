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

test.describe('Cross-Module Workflow A: Room Lifecycle & Allocation', () => {
  test('creates room, allocates student, updates occupancy status', async ({ page }) => {
    await setupApiMocks(page, 'ADMIN');

    let currentOccupancy = 0;
    let roomStatus = 'AVAILABLE';

    await page.route('**/api/rooms/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            totalRooms: 10,
            totalBeds: 20,
            occupiedBeds: currentOccupancy,
            availableBeds: 20 - currentOccupancy,
            occupancyRate: (currentOccupancy / 20) * 100,
          },
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
              {
                id: 105,
                room_number: 'C-302',
                block: 'C',
                floor: 3,
                room_type: 'SINGLE',
                capacity: 1,
                current_occupancy: currentOccupancy,
                status: roomStatus,
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          },
        }),
      });
    });

    await page.route('**/api/rooms/105/allocate', async (route) => {
      currentOccupancy = 1;
      roomStatus = 'FULL';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Student allocated successfully',
          data: { room_id: 105, student_id: 101 },
        }),
      });
    });

    await page.goto('/app/rooms');
    await expect(page.getByRole('heading', { name: 'Rooms' })).toBeVisible();
    await expect(page.getByText('C-302')).toBeVisible();

    // Click Allocate
    await page.getByRole('button', { name: 'Allocate' }).click();
    await expect(page.getByRole('heading', { name: 'Allocate Room C-302' })).toBeVisible();

    await page.getByLabel('Student System ID').fill('101');
    await page.getByRole('button', { name: 'Allocate' }).last().click();

    await expect(page.getByText(/Student allocated successfully/i)).toBeVisible();
  });
});

test.describe('Cross-Module Workflow B: Complaint Lifecycle across Roles', () => {
  test('warden assigns complaint to maintenance staff', async ({ page }) => {
    await setupApiMocks(page, 'WARDEN');

    let complaintStatus = 'SUBMITTED';
    let assignedName: string | null = null;

    await page.route('**/api/complaints?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 701,
                ticket_id: 'TCK-701',
                student_id: 101,
                student_name: 'Rahul Sharma',
                room_number: 'A-101',
                category: 'PLUMBING',
                priority: 'HIGH',
                status: complaintStatus,
                assigned_name: assignedName,
                created_at: '2026-09-28T10:00:00Z',
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          },
        }),
      });
    });

    await page.route('**/api/users?*role=MAINTENANCE*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              { id: 301, username: 'suresh_maint', full_name: 'Suresh Kumar', role: 'MAINTENANCE', status: 'ACTIVE' },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          },
        }),
      });
    });

    await page.route('**/api/complaints/701/assign', async (route) => {
      complaintStatus = 'ASSIGNED';
      assignedName = 'Suresh Kumar';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Complaint assigned successfully',
        }),
      });
    });

    await page.goto('/app/complaints');
    await expect(page.getByRole('heading', { name: 'Complaint Management' })).toBeVisible();
    await expect(page.getByText('TCK-701')).toBeVisible();

    // Click Assign
    await page.getByRole('button', { name: 'Assign' }).click();
    await expect(page.getByRole('heading', { name: /Assign Ticket/i })).toBeVisible();

    await page.getByLabel('Select Maintenance Staff').selectOption('301');
    await page.getByRole('button', { name: 'Assign Ticket' }).click();

    await expect(page.getByText(/Complaint assigned successfully/i)).toBeVisible();
  });
});

test.describe('Cross-Module Workflow C: Leave Application & Gate Pass Generation', () => {
  test('student views approved leave and inspects gate pass with QR details', async ({ page }) => {
    await setupApiMocks(page, 'STUDENT');

    await page.route('**/api/leave?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 405,
                student_id: 101,
                from_datetime: '2026-10-02T08:00:00Z',
                to_datetime: '2026-10-06T18:00:00Z',
                reason: 'Diwali Festival holidays at hometown',
                status: 'APPROVED',
                gate_pass_number: 'GP-2026-8899',
                created_at: '2026-09-28T09:00:00Z',
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          },
        }),
      });
    });

    await page.route('**/api/leave/405/gate-pass', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            gatePass: {
              gate_pass_number: 'GP-2026-8899',
              leave_id: 405,
              hostel_name: 'Antigravity Royal Hostel',
              student_name: 'Rahul Sharma',
              student_number: 'ENR-2026-001',
              room_number: 'A-101',
              from_datetime: '2026-10-02T08:00:00Z',
              to_datetime: '2026-10-06T18:00:00Z',
              purpose: 'Diwali Festival holidays at hometown',
              issued_at: '2026-09-28T10:00:00Z',
              issued_by: 'Warden One',
              status: 'VALID',
            },
          },
        }),
      });
    });

    await page.goto('/app/leave');
    await expect(page.getByRole('heading', { name: 'Leave Requests & Gate Pass' })).toBeVisible();
    await expect(page.getByText('GP-2026-8899')).toBeVisible();

    // View Gate Pass
    await page.getByRole('button', { name: 'View Pass' }).click();
    await expect(page).toHaveURL(/\/app\/leave\/gate-pass\/405$/);
    await expect(page.getByRole('heading', { name: 'DIGITAL GATE PASS' })).toBeVisible();
    await expect(page.getByText('GP-2026-8899')).toBeVisible();
    await expect(page.getByText('Hostel Administration & Security')).toBeVisible();
  });
});

test.describe('Cross-Module Workflow D: Fee Invoice & Payment Recording', () => {
  test('admin records fee payment and verifies receipt generation', async ({ page }) => {
    await setupApiMocks(page, 'ADMIN');

    let outstandingAmount = '15000.00';
    let feeStatus = 'PENDING';

    await page.route('**/api/fees?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 888,
                student_id: 101,
                fee_type: 'HOSTEL_RENT',
                academic_period: '2026-SEM-1',
                amount: '15000.00',
                outstanding_amount: outstandingAmount,
                due_date: '2026-10-31',
                status: feeStatus,
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          },
        }),
      });
    });

    await page.route('**/api/fees/*/payments', async (route) => {
      outstandingAmount = '0.00';
      feeStatus = 'PAID';
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Payment recorded successfully',
          data: {
            payment: {
              id: 999,
              fee_id: 888,
              receipt_number: 'RCP-2026-999',
              amount: '15000.00',
              payment_method: 'UPI',
              transaction_reference: 'UPI/123456/789',
              paid_at: '2026-09-28T14:00:00Z',
            },
          },
        }),
      });
    });

    await page.goto('/app/fees');
    await expect(page.getByRole('heading', { name: 'Fees & Payments' })).toBeVisible();
    await expect(page.getByText('HOSTEL_RENT')).toBeVisible();

    // Click Pay
    await page.getByRole('button', { name: 'Pay' }).click();
    await expect(page.getByRole('heading', { name: 'Record Payment' })).toBeVisible();

    await page.getByLabel(/Payment Amount/i).fill('15000');
    await page.locator('form select').selectOption('UPI');
    await page.getByLabel(/Transaction Reference/i).fill('UPI/123456/789');
    await page.getByRole('button', { name: 'Record Payment' }).click();

    await expect(page.getByText(/Payment recorded successfully/i)).toBeVisible();
  });
});

test.describe('Cross-Module Workflow E: Visitor Entry and Check Out', () => {
  test('warden registers visitor entry and subsequently records departure checkout', async ({ page }) => {
    await setupApiMocks(page, 'WARDEN');

    let exitTimestamp: string | null = null;
    let visitorStatus = 'INSIDE';

    await page.route('**/api/visitors?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 205,
                visitor_name: 'Kavita Sharma',
                phone: '9876543210',
                student_id: 101,
                student_name: 'Rahul Sharma',
                purpose: 'Delivering winter clothing and books',
                entry_at: '2026-09-28T11:00:00Z',
                exit_at: exitTimestamp,
                status: visitorStatus,
              },
            ],
            total: 1,
            page: 1,
            totalPages: 1,
          },
        }),
      });
    });

    await page.route('**/api/visitors/205/exit', async (route) => {
      exitTimestamp = '2026-09-28T13:30:00Z';
      visitorStatus = 'EXITED';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Visitor exit recorded successfully',
          data: { id: 205, exit_at: exitTimestamp },
        }),
      });
    });

    await page.goto('/app/visitors');
    await expect(page.getByRole('heading', { name: 'Visitor Management' })).toBeVisible();
    await expect(page.getByText('Kavita Sharma')).toBeVisible();

    // Click Record Exit
    await page.getByRole('button', { name: 'Record Exit' }).click();
    await expect(page.getByText('Confirm Visitor Departure')).toBeVisible();

    await page.getByRole('button', { name: 'Record Exit' }).last().click();

    await expect(page.getByText(/Visitor exit recorded successfully/i)).toBeVisible();
  });
});
