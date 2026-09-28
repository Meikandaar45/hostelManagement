const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hostel_management',
    multipleStatements: true,
  });

  console.log('Connected to MySQL hostel_management');

  // 1. Run 03_complaints_visitors_leave.sql
  const sqlFile = path.resolve(__dirname, '../../sql/03_complaints_visitors_leave.sql');
  const sqlContent = fs.readFileSync(sqlFile, 'utf8');
  await conn.query(sqlContent);
  console.log('Phase 3 tables created / verified successfully.');

  // 2. Ensure test users with password "password123"
  const passwordHash = await bcrypt.hash('password123', 12);

  // Admin
  await conn.query(`
    INSERT INTO users (id, username, email, password, full_name, role, is_active)
    VALUES (101, 'admin_p3', 'admin_p3@test.com', ?, 'Head Administrator', 'ADMIN', 1)
    ON DUPLICATE KEY UPDATE password = VALUES(password), is_active = 1
  `, [passwordHash]);

  // Warden
  await conn.query(`
    INSERT INTO users (id, username, email, password, full_name, role, is_active)
    VALUES (102, 'warden_p3', 'warden_p3@test.com', ?, 'Warden Robert', 'WARDEN', 1)
    ON DUPLICATE KEY UPDATE password = VALUES(password), is_active = 1
  `, [passwordHash]);

  // Maintenance
  await conn.query(`
    INSERT INTO users (id, username, email, password, full_name, role, is_active)
    VALUES (103, 'maint_p3', 'maint_p3@test.com', ?, 'Bob Maintenance', 'MAINTENANCE', 1)
    ON DUPLICATE KEY UPDATE password = VALUES(password), is_active = 1
  `, [passwordHash]);

  // Student User
  await conn.query(`
    INSERT INTO users (id, username, email, password, full_name, role, is_active)
    VALUES (104, 'student_p3', 'student_p3@test.com', ?, 'Alex Student', 'STUDENT', 1)
    ON DUPLICATE KEY UPDATE password = VALUES(password), is_active = 1
  `, [passwordHash]);

  // Room
  await conn.query(`
    INSERT INTO rooms (id, room_number, block, floor, room_type, capacity)
    VALUES (101, '301-A', 'A', 3, 'DOUBLE', 2)
    ON DUPLICATE KEY UPDATE capacity = 2
  `);

  // Student profile
  await conn.query(`
    INSERT INTO students (id, user_id, student_id, full_name, gender, contact_number, address, department, admission_date, is_active)
    VALUES (101, 104, 'STU-2026-001', 'Alex Student', 'MALE', '9123456780', '12 Campus Road', 'Computer Science', '2026-01-10', 1)
    ON DUPLICATE KEY UPDATE user_id = 104, student_id = 'STU-2026-001'
  `);

  // Room allocation
  await conn.query(`
    INSERT INTO room_allocations (id, student_id, room_id, allocated_at, allocated_by)
    VALUES (101, 101, 101, NOW(), 101)
    ON DUPLICATE KEY UPDATE room_id = 101
  `);

  // 3. Seed Complaints
  // Complaint 1: SUBMITTED
  await conn.query(`
    INSERT INTO complaints (id, ticket_id, student_id, room_id, category, description, priority, status, assigned_to, created_at)
    VALUES (101, 'CMP-20260923-PLM01', 101, 101, 'PLUMBING', 'Water tap is dripping continuously in washroom.', 'HIGH', 'SUBMITTED', NULL, NOW())
    ON DUPLICATE KEY UPDATE status = 'SUBMITTED'
  `);
  await conn.query(`
    INSERT INTO complaint_history (complaint_id, changed_by, from_status, to_status, work_notes, created_at)
    VALUES (101, 104, NULL, 'SUBMITTED', 'Complaint raised by student', NOW())
    ON DUPLICATE KEY UPDATE to_status = 'SUBMITTED'
  `);

  // Complaint 2: ASSIGNED to Bob Maintenance
  await conn.query(`
    INSERT INTO complaints (id, ticket_id, student_id, room_id, category, description, priority, status, assigned_to, created_at)
    VALUES (102, 'CMP-20260923-ELE02', 101, 101, 'ELECTRICAL', 'Study desk power socket is sparking.', 'URGENT', 'ASSIGNED', 103, NOW())
    ON DUPLICATE KEY UPDATE status = 'ASSIGNED', assigned_to = 103
  `);
  await conn.query(`
    INSERT INTO complaint_history (complaint_id, changed_by, from_status, to_status, work_notes, created_at)
    VALUES (102, 102, 'SUBMITTED', 'ASSIGNED', 'Assigned to Bob Maintenance for urgent inspection', NOW())
    ON DUPLICATE KEY UPDATE to_status = 'ASSIGNED'
  `);

  // 4. Seed Visitor Logs
  // Visitor 1: INSIDE
  await conn.query(`
    INSERT INTO visitor_logs (id, visitor_name, phone, student_id, purpose, entry_at, exit_at, recorded_by, notes)
    VALUES (101, 'Sarah Patel', '+91 9876543210', 101, 'Parent Weekend Visit', NOW(), NULL, 102, 'ID verified at main gate')
    ON DUPLICATE KEY UPDATE visitor_name = 'Sarah Patel'
  `);

  // Visitor 2: EXITED
  await conn.query(`
    INSERT INTO visitor_logs (id, visitor_name, phone, student_id, purpose, entry_at, exit_at, recorded_by, notes)
    VALUES (102, 'David Kumar', '+91 9876501234', 101, 'Book Delivery', DATE_SUB(NOW(), INTERVAL 3 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), 102, 'Delivery completed')
    ON DUPLICATE KEY UPDATE visitor_name = 'David Kumar'
  `);

  // 5. Seed Leave Requests
  // Leave 1: PENDING
  await conn.query(`
    INSERT INTO leave_requests (id, student_id, from_datetime, to_datetime, reason, status, created_at)
    VALUES (101, 101, DATE_ADD(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 5 DAY), 'Attending family wedding ceremony in hometown', 'PENDING', NOW())
    ON DUPLICATE KEY UPDATE status = 'PENDING'
  `);

  // Leave 2: APPROVED with Gate Pass
  await conn.query(`
    INSERT INTO leave_requests (id, student_id, from_datetime, to_datetime, reason, status, review_notes, reviewed_by, reviewed_at, gate_pass_number, created_at)
    VALUES (102, 101, DATE_ADD(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 9 DAY), 'Weekend home visit with parent permission', 'APPROVED', 'Parent consent confirmed via phone call', 102, NOW(), 'GP-2026-982104', NOW())
    ON DUPLICATE KEY UPDATE status = 'APPROVED', gate_pass_number = 'GP-2026-982104'
  `);

  // 6. Seed In-app Notifications
  await conn.query(`
    INSERT INTO notifications (id, user_id, type, title, message, reference_type, reference_id, is_read, created_at)
    VALUES (101, 104, 'GATE_PASS_ISSUED', 'Gate Pass Issued', 'Your leave request has been approved. Gate pass GP-2026-982104 is now ready.', 'LEAVE', 102, 0, NOW())
    ON DUPLICATE KEY UPDATE is_read = 0
  `);

  await conn.query(`
    INSERT INTO notifications (id, user_id, type, title, message, reference_type, reference_id, is_read, created_at)
    VALUES (102, 104, 'COMPLAINT_ASSIGNED', 'Ticket Assigned', 'Your complaint CMP-20260923-ELE02 has been assigned to Bob Maintenance.', 'COMPLAINT', 102, 0, NOW())
    ON DUPLICATE KEY UPDATE is_read = 0
  `);

  console.log('Seed completed successfully!');
  console.log('Test Accounts (Password for all: password123):');
  console.log('- ADMIN:       admin_p3 / password123');
  console.log('- WARDEN:      warden_p3 / password123');
  console.log('- MAINTENANCE: maint_p3 / password123');
  console.log('- STUDENT:     student_p3 / password123');

  await conn.end();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
