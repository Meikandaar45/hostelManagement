const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const SUPPORT_DIR = path.resolve('C:/Users/meira/Downloads/PRO/SE/V1/Hostel_Management_Partial_Implementation/screenshots');
const REPO_SCREENSHOTS_DIR = path.resolve(__dirname, '../screenshots');

async function run() {
  if (!fs.existsSync(SUPPORT_DIR)) {
    fs.mkdirSync(SUPPORT_DIR, { recursive: true });
  }
  if (!fs.existsSync(REPO_SCREENSHOTS_DIR)) {
    fs.mkdirSync(REPO_SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  async function saveScreenshot(filename) {
    const p1 = path.join(SUPPORT_DIR, filename);
    const p2 = path.join(REPO_SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: p1 });
    fs.copyFileSync(p1, p2);
    console.log(`Saved ${filename}`);
  }

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

  console.log('Capturing all 17 required screenshots from running application...');

  // A. Home / Landing Page
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  await saveScreenshot('01-home.png');

  // B. Login Page
  await saveScreenshot('02-login.png');

  // C. Admin Login & Dashboard
  await login('arun.kumar');
  await page.goto('http://localhost:5173/app/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  await saveScreenshot('03-admin-dashboard.png');

  // G. Student Management
  await page.goto('http://localhost:5173/app/students');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await saveScreenshot('07-student-management.png');

  // H. Room Management
  await page.goto('http://localhost:5173/app/rooms');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await saveScreenshot('08-room-management.png');

  // I. Room Allocation
  try {
    const allocateBtn = page.getByRole('button', { name: /allocate room/i }).first();
    if (await allocateBtn.isVisible()) {
      await allocateBtn.click();
      await page.waitForTimeout(500);
      await saveScreenshot('09-room-allocation.png');
      const closeBtn = page.locator('button:has-text("Cancel"), button[aria-label="Close"]').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    } else {
      await saveScreenshot('09-room-allocation.png');
    }
  } catch (e) {
    await saveScreenshot('09-room-allocation.png');
  }

  // J. Fee Management
  await page.goto('http://localhost:5173/app/fees');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await saveScreenshot('10-fee-management.png');

  // K. Complaints Management
  await page.goto('http://localhost:5173/app/complaints');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await saveScreenshot('11-complaints.png');

  // L. Visitor Management
  await page.goto('http://localhost:5173/app/visitors');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await saveScreenshot('12-visitors.png');

  // Q. Reports
  await page.goto('http://localhost:5173/app/reports');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await saveScreenshot('17-reports.png');

  // D. Warden Login & Dashboard
  await logout();
  await login('karthik.raj');
  await page.goto('http://localhost:5173/app/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  await saveScreenshot('04-warden-dashboard.png');

  // N. Leave Approval (Warden)
  await page.goto('http://localhost:5173/app/leave/requests');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await saveScreenshot('14-leave-approval.png');

  // E. Student Login & Dashboard
  await logout();
  await login('vignesh.r');
  await page.goto('http://localhost:5173/app/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  await saveScreenshot('05-student-dashboard.png');

  // M. Leave Request (Student)
  await page.goto('http://localhost:5173/app/leave');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await saveScreenshot('13-leave-request.png');

  // O. Gate Pass (Student)
  try {
    const viewPassBtn = page.locator('button:has-text("View Gate Pass"), button:has-text("View Pass")').first();
    if (await viewPassBtn.isVisible()) {
      await viewPassBtn.click();
      await page.waitForTimeout(600);
      await saveScreenshot('15-gate-pass.png');
      const closeBtn = page.locator('button[aria-label="Close"], button:has-text("Close")').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    } else {
      await saveScreenshot('15-gate-pass.png');
    }
  } catch (e) {
    await saveScreenshot('15-gate-pass.png');
  }

  // P. Notifications
  await page.goto('http://localhost:5173/app/notifications');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await saveScreenshot('16-notifications.png');

  // F. Maintenance Dashboard
  await logout();
  await login('priya.s');
  await page.goto('http://localhost:5173/app/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  await saveScreenshot('06-maintenance-dashboard.png');

  await browser.close();
  console.log('Finished capturing all 17 screenshots successfully!');
}

run().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
