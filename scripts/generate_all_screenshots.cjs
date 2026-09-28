const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.resolve(__dirname, '../screenshots');

async function run() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  async function login(username, password = 'password123') {
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/username or email/i).fill(username);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  }

  async function logout() {
    try {
      await page.evaluate(async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
      });
    } catch {}
    await context.clearCookies();
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
  }

  console.log('Capturing screenshots...');

  // 1. Login Page
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_login.png') });
  console.log('Saved 01_login.png');

  // 2. Admin Login & Dashboard
  await login('admin_p3');
  await page.goto('http://localhost:5173/app/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_admin_dashboard.png') });
  console.log('Saved 02_admin_dashboard.png');

  // 6. Student Management (Admin/Warden)
  await page.goto('http://localhost:5173/app/students');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_student_management.png') });
  console.log('Saved 06_student_management.png');

  // 7. Room Management
  await page.goto('http://localhost:5173/app/rooms');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_room_management.png') });
  console.log('Saved 07_room_management.png');

  // 8. Room Allocation modal
  try {
    const allocateBtn = page.getByRole('button', { name: /allocate room/i }).first();
    if (await allocateBtn.isVisible()) {
      await allocateBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_room_allocation.png') });
      console.log('Saved 08_room_allocation.png');
      const closeBtn = page.locator('button:has-text("Cancel"), button[aria-label="Close"]').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    } else {
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_room_allocation.png') });
    }
  } catch (e) {
    console.log('Allocation modal notice:', e.message);
  }

  // 9. Fees
  await page.goto('http://localhost:5173/app/fees');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_fees.png') });
  console.log('Saved 09_fees.png');

  // 10. Complaints
  await page.goto('http://localhost:5173/app/complaints');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_complaints.png') });
  console.log('Saved 10_complaints.png');

  // 11. Complaint Assignment
  try {
    const assignBtn = page.locator('button:has-text("Assign")').first();
    if (await assignBtn.isVisible()) {
      await assignBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_complaint_assignment.png') });
      console.log('Saved 11_complaint_assignment.png');
      const closeBtn = page.locator('button:has-text("Cancel"), button[aria-label="Close"]').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    } else {
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_complaint_assignment.png') });
    }
  } catch (e) {
    console.log('Assign modal notice:', e.message);
  }

  // 12. Visitor Management
  await page.goto('http://localhost:5173/app/visitors');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_visitor_management.png') });
  console.log('Saved 12_visitor_management.png');

  // 17. Reports
  await page.goto('http://localhost:5173/app/reports');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '17_reports.png') });
  console.log('Saved 17_reports.png');

  // 3. Warden Login & Dashboard
  await logout();
  await login('warden_p3');
  await page.goto('http://localhost:5173/app/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_warden_dashboard.png') });
  console.log('Saved 03_warden_dashboard.png');

  // 14. Leave Approval (Warden)
  await page.goto('http://localhost:5173/app/leave/requests');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14_leave_approval.png') });
  console.log('Saved 14_leave_approval.png');

  // 4. Student Login & Dashboard
  await logout();
  await login('student_p3');
  await page.goto('http://localhost:5173/app/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_student_dashboard.png') });
  console.log('Saved 04_student_dashboard.png');

  // 13. Student Leave Request
  await page.goto('http://localhost:5173/app/leave');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13_leave_request.png') });
  console.log('Saved 13_leave_request.png');

  // 15. Gate Pass
  try {
    const viewPassBtn = page.locator('button:has-text("View Gate Pass"), button:has-text("View Pass")').first();
    if (await viewPassBtn.isVisible()) {
      await viewPassBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15_gate_pass.png') });
      console.log('Saved 15_gate_pass.png');
      const closeBtn = page.locator('button[aria-label="Close"], button:has-text("Close")').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    } else {
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15_gate_pass.png') });
    }
  } catch (e) {
    console.log('Gate pass notice:', e.message);
  }

  // 16. Notifications
  await page.goto('http://localhost:5173/app/notifications');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '16_notifications.png') });
  console.log('Saved 16_notifications.png');

  // 5. Maintenance Login & Dashboard / Tasks
  await logout();
  await login('maint_p3');
  await page.goto('http://localhost:5173/app/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_maintenance_dashboard.png') });
  console.log('Saved 05_maintenance_dashboard.png');

  await browser.close();
  console.log('All 17 screenshots captured successfully!');
}

run().catch(err => {
  console.error('Screenshot generation failed:', err);
  process.exit(1);
});
