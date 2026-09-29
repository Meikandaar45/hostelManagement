import { test, expect, Page } from '@playwright/test';

async function setupApiMocks(page: Page, role: 'ADMIN' | 'WARDEN' | 'STUDENT') {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            id: role === 'STUDENT' ? 104 : role === 'WARDEN' ? 102 : 101,
            username: `${role.toLowerCase()}_user`,
            email: `${role.toLowerCase()}@test.com`,
            full_name: role === 'STUDENT' ? 'Vignesh R' : role === 'WARDEN' ? 'Karthik Raj' : 'Arun Kumar',
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

  await page.route('**/api/dashboard/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          role,
          metrics: {
            pending_leaves: 1,
            active_leaves: 2,
            total_students: 120,
          },
          recent: { leaves: [] },
          profile: { full_name: role === 'STUDENT' ? 'Vignesh R' : 'Karthik Raj' },
        },
      }),
    });
  });
}

test.describe('Leave Approval & Rejection Complete Lifecycle', () => {
  test('Complete Approval Flow: Student applies -> Warden reviews & approves -> Gate pass generated -> Student inspects pass & notification', async ({ page }) => {
    let leaveStatus: 'PENDING' | 'APPROVED' = 'PENDING';
    let gatePassNumber: string | null = null;
    let reviewNotes: string | null = null;

    // Mock API for /api/leave requests list
    await page.route('**/api/leave?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 501,
                student_id: 101,
                student_name: 'Vignesh R',
                student_number: 'STU-2026-001',
                room_number: '301-A',
                from_datetime: '2026-10-05T09:00:00Z',
                to_datetime: '2026-10-08T18:00:00Z',
                reason: 'Attending family wedding ceremony in hometown',
                status: leaveStatus,
                review_notes: reviewNotes,
                reviewed_by: leaveStatus === 'APPROVED' ? 102 : null,
                reviewed_at: leaveStatus === 'APPROVED' ? '2026-09-28T21:30:00Z' : null,
                gate_pass_number: gatePassNumber,
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

    // Mock Approve API
    await page.route('**/api/leave/501/approve', async (route) => {
      const payload = JSON.parse(route.request().postData() || '{}');
      leaveStatus = 'APPROVED';
      gatePassNumber = 'GP-2026-L89012';
      reviewNotes = payload.review_notes || 'Approved. Report back by Oct 8.';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Leave approved and gate pass generated',
          data: {
            leave: {
              id: 501,
              status: 'APPROVED',
              gate_pass_number: gatePassNumber,
              review_notes: reviewNotes,
              reviewed_by: 102,
              reviewed_at: '2026-09-28T21:30:00Z',
            },
          },
        }),
      });
    });

    // Mock Gate Pass API
    await page.route('**/api/leave/501/gate-pass', async (route) => {
      if (leaveStatus !== 'APPROVED') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            message: 'Gate pass is only available for APPROVED leave requests',
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
            gatePass: {
              gate_pass_number: gatePassNumber,
              leave_id: 501,
              hostel_name: 'Campus Hostel Management System',
              student_name: 'Vignesh R',
              student_id: 'STU-2026-001',
              room_number: '301-A',
              from_datetime: '2026-10-05T09:00:00Z',
              to_datetime: '2026-10-08T18:00:00Z',
              reason: 'Attending family wedding ceremony in hometown',
              status: 'APPROVED',
              approved_by: 'Karthik Raj',
              approved_at: '2026-09-28T21:30:00Z',
            },
          },
        }),
      });
    });

    // Mock Notifications API
    await page.route('**/api/notifications*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 901,
                user_id: 104,
                type: 'LEAVE',
                title: 'Leave Approved',
                message: `Your leave request has been approved! Digital Gate Pass #${gatePassNumber || 'GP-2026-L89012'} is generated.`,
                reference_type: 'leave',
                reference_id: 501,
                is_read: false,
                created_at: '2026-09-28T21:30:00Z',
              },
            ],
            total: 1,
            totalPages: 1,
          },
        }),
      });
    });

    // === PHASE A: WARDEN LOGIN & APPROVAL ===
    await setupApiMocks(page, 'WARDEN');
    await page.goto('/app/leave/requests');

    await expect(page.getByRole('heading', { name: 'Leave Approvals' })).toBeVisible();
    await expect(page.getByText('Vignesh R')).toBeVisible();
    await expect(page.getByText('Attending family wedding ceremony in hometown')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible();

    // Click Approve button to open modal
    await page.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText('Approve Leave: Vignesh R')).toBeVisible();

    // Add Warden Approval Note and Submit
    await page.getByPlaceholder(/Must report back to warden office/i).fill('Approved. Report back by Oct 8.');
    await page.getByRole('button', { name: 'Confirm Approval & Issue Pass' }).click();

    // Toast notification confirms approval
    await expect(page.getByText('Leave approved & Gate Pass generated!')).toBeVisible();

    // The list refreshes and shows gate pass number and View Pass button
    await expect(page.getByText('GP-2026-L89012')).toBeVisible();
    await expect(page.getByRole('button', { name: 'View Pass' })).toBeVisible();

    // === PHASE B: STUDENT LOGIN & VERIFICATION ===
    await setupApiMocks(page, 'STUDENT');
    await page.goto('/app/leave');

    await expect(page.getByRole('heading', { name: 'Leave Requests & Gate Pass' })).toBeVisible();
    await expect(page.getByText('Approved', { exact: true })).toBeVisible();
    await expect(page.getByText('GP-2026-L89012')).toBeVisible();

    // Open Digital Gate Pass
    await page.getByRole('button', { name: 'View Pass' }).click();
    await expect(page).toHaveURL(/\/app\/leave\/gate-pass\/501$/);

    // Verify official Gate Pass document elements
    await expect(page.getByRole('heading', { name: 'DIGITAL GATE PASS' })).toBeVisible();
    await expect(page.getByText('Hostel Administration & Security')).toBeVisible();
    await expect(page.getByText('GP-2026-L89012')).toBeVisible();
    await expect(page.getByRole('main').getByText('Vignesh R')).toBeVisible();
    await expect(page.getByText('STU-2026-001')).toBeVisible();
    await expect(page.getByText('Room 301-A')).toBeVisible();
    await expect(page.getByText('Karthik Raj')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Print Gate Pass' })).toBeVisible();

    // Verify student notification
    await page.goto('/app/notifications');
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByText('Leave Approved')).toBeVisible();
    await expect(page.getByText(/Digital Gate Pass #GP-2026-L89012 is generated/)).toBeVisible();
  });

  test('Complete Rejection Flow: Student applies -> Warden rejects with reason -> Status REJECTED -> No gate pass issued', async ({ page }) => {
    let leaveStatus: 'PENDING' | 'REJECTED' = 'PENDING';
    let reviewNotes: string | null = null;

    await page.route('**/api/leave?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 502,
                student_id: 101,
                student_name: 'Vignesh R',
                student_number: 'STU-2026-001',
                room_number: '301-A',
                from_datetime: '2026-10-10T09:00:00Z',
                to_datetime: '2026-10-12T18:00:00Z',
                reason: 'Weekend trip with friends',
                status: leaveStatus,
                review_notes: reviewNotes,
                reviewed_by: leaveStatus === 'REJECTED' ? 102 : null,
                reviewed_at: leaveStatus === 'REJECTED' ? '2026-09-28T21:32:00Z' : null,
                gate_pass_number: null,
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

    await page.route('**/api/leave/502/reject', async (route) => {
      const payload = JSON.parse(route.request().postData() || '{}');
      if (!payload.review_notes || !payload.review_notes.trim()) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'Rejection reason is required' }),
        });
        return;
      }

      leaveStatus = 'REJECTED';
      reviewNotes = payload.review_notes;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Leave request rejected',
          data: {
            leave: {
              id: 502,
              status: 'REJECTED',
              review_notes: reviewNotes,
              reviewed_by: 102,
              reviewed_at: '2026-09-28T21:32:00Z',
              gate_pass_number: null,
            },
          },
        }),
      });
    });

    await page.route('**/api/leave/502/gate-pass', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Gate pass is only available for APPROVED leave requests (Current status: REJECTED)',
        }),
      });
    });

    await page.route('**/api/notifications*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                id: 902,
                user_id: 104,
                type: 'LEAVE',
                title: 'Leave Request Rejected',
                message: 'Your leave request was rejected. Reason: Examination preparation period underway',
                reference_type: 'leave',
                reference_id: 502,
                is_read: false,
                created_at: '2026-09-28T21:32:00Z',
              },
            ],
            total: 1,
            totalPages: 1,
          },
        }),
      });
    });

    // === PHASE A: WARDEN REJECTS REQUEST ===
    await setupApiMocks(page, 'WARDEN');
    await page.goto('/app/leave/requests');

    await expect(page.getByText('Vignesh R')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reject' })).toBeVisible();

    // Click Reject
    await page.getByRole('button', { name: 'Reject' }).click();
    await expect(page.getByText('Reject Leave: Vignesh R')).toBeVisible();

    // Submit with reason
    await page.getByPlaceholder(/Explain why this request was declined/i).fill('Examination preparation period underway');
    await page.getByRole('button', { name: 'Confirm Rejection' }).click();

    await expect(page.getByText('Leave request rejected')).toBeVisible();

    // Row now shows Rejected status and review note
    await expect(page.getByRole('table').getByText('Rejected')).toBeVisible();
    await expect(page.getByText('Note: Examination preparation period underway')).toBeVisible();
    await expect(page.getByText('None')).toBeVisible(); // Gate Pass column shows None

    // === PHASE B: STUDENT CHECKS REJECTED STATUS ===
    await setupApiMocks(page, 'STUDENT');
    await page.goto('/app/leave');

    await expect(page.getByRole('table').getByText('Rejected')).toBeVisible();
    await expect(page.getByText('Note: Examination preparation period underway')).toBeVisible();
    await expect(page.getByText('Not issued')).toBeVisible();
    await expect(page.getByRole('button', { name: 'View Pass' })).not.toBeVisible();

    // Directly navigating to rejected gate pass route displays unavailable message
    await page.goto('/app/leave/gate-pass/502');
    await expect(page.getByRole('heading', { name: 'Gate Pass Not Available' })).toBeVisible();
    await expect(page.getByText(/This leave request either does not exist or has not been approved/i)).toBeVisible();

    // Verify rejection notification
    await page.goto('/app/notifications');
    await expect(page.getByText('Leave Request Rejected')).toBeVisible();
    await expect(page.getByText(/Reason: Examination preparation period underway/)).toBeVisible();
  });
});
