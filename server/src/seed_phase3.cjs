const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'hostel_management',
    multipleStatements: true,
  });

  console.log('Connected to MySQL hostel_management');

  // 1. Run 03_complaints_visitors_leave.sql to ensure tables exist
  const sqlFile = path.resolve(__dirname, '../../sql/03_complaints_visitors_leave.sql');
  if (fs.existsSync(sqlFile)) {
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    await conn.query(sqlContent);
  }
  console.log('Tables verified successfully.');

  const passwordHash = await bcrypt.hash('password123', 12);

  // 2. Insert / Update Staff & Admin (Realistic Tamil / Indian names)
  // 1. Arun Kumar (Admin)
  await conn.query(`
    INSERT INTO users (id, username, email, password, full_name, role, is_active)
    VALUES (101, 'arun.kumar', 'arun.kumar@example.com', ?, 'Arun Kumar', 'ADMIN', 1)
    ON DUPLICATE KEY UPDATE username = 'arun.kumar', email = 'arun.kumar@example.com', full_name = 'Arun Kumar', password = VALUES(password), is_active = 1
  `, [passwordHash]);

  // 2. Karthik Raj (Warden)
  await conn.query(`
    INSERT INTO users (id, username, email, password, full_name, role, is_active)
    VALUES (102, 'karthik.raj', 'karthik.raj@example.com', ?, 'Karthik Raj', 'WARDEN', 1)
    ON DUPLICATE KEY UPDATE username = 'karthik.raj', email = 'karthik.raj@example.com', full_name = 'Karthik Raj', password = VALUES(password), is_active = 1
  `, [passwordHash]);

  // 3. Priya S (Maintenance Supervisor / Staff)
  await conn.query(`
    INSERT INTO users (id, username, email, password, full_name, role, is_active)
    VALUES (103, 'priya.s', 'priya.s@example.com', ?, 'Priya S', 'MAINTENANCE', 1)
    ON DUPLICATE KEY UPDATE username = 'priya.s', email = 'priya.s@example.com', full_name = 'Priya S', password = VALUES(password), is_active = 1
  `, [passwordHash]);

  // Backward compatibility user aliases so automated scripts can use either handle
  await conn.query(`
    INSERT INTO users (id, username, email, password, full_name, role, is_active)
    VALUES (111, 'admin_p3', 'admin_p3@test.com', ?, 'Arun Kumar', 'ADMIN', 1)
    ON DUPLICATE KEY UPDATE full_name = 'Arun Kumar', password = VALUES(password), is_active = 1
  `, [passwordHash]);

  await conn.query(`
    INSERT INTO users (id, username, email, password, full_name, role, is_active)
    VALUES (112, 'warden_p3', 'warden_p3@test.com', ?, 'Karthik Raj', 'WARDEN', 1)
    ON DUPLICATE KEY UPDATE full_name = 'Karthik Raj', password = VALUES(password), is_active = 1
  `, [passwordHash]);

  await conn.query(`
    INSERT INTO users (id, username, email, password, full_name, role, is_active)
    VALUES (113, 'maint_p3', 'maint_p3@test.com', ?, 'Priya S', 'MAINTENANCE', 1)
    ON DUPLICATE KEY UPDATE full_name = 'Priya S', password = VALUES(password), is_active = 1
  `, [passwordHash]);

  await conn.query(`
    INSERT INTO users (id, username, email, password, full_name, role, is_active)
    VALUES (114, 'student_p3', 'student_p3@test.com', ?, 'Vignesh R', 'STUDENT', 1)
    ON DUPLICATE KEY UPDATE full_name = 'Vignesh R', password = VALUES(password), is_active = 1
  `, [passwordHash]);

  // 3. Insert / Update 7 Students (Realistic Tamil / Indian names)
  const studentsData = [
    {
      userId: 104,
      studentDbId: 101,
      username: 'vignesh.r',
      email: 'vignesh.r@example.com',
      fullName: 'Vignesh R',
      studentId: 'STU-2026-001',
      gender: 'MALE',
      contact: '9123456780',
      address: '12 Anna Salai, Chennai, Tamil Nadu - 600002',
      dept: 'CSE',
      admissionDate: '2024-08-10',
      roomId: 101,
    },
    {
      userId: 105,
      studentDbId: 102,
      username: 'sanjay.kumar',
      email: 'sanjay.kumar@example.com',
      fullName: 'Sanjay Kumar',
      studentId: 'STU-2026-002',
      gender: 'MALE',
      contact: '9841234567',
      address: '45 Gandhi Road, Madurai, Tamil Nadu - 625001',
      dept: 'ECE',
      admissionDate: '2024-08-10',
      roomId: 101,
    },
    {
      userId: 106,
      studentDbId: 103,
      username: 'praveen.kumar',
      email: 'praveen.kumar@example.com',
      fullName: 'Praveen Kumar',
      studentId: 'STU-2026-003',
      gender: 'MALE',
      contact: '9790123456',
      address: '78 Cross Cut Road, Coimbatore, Tamil Nadu - 641012',
      dept: 'MECH',
      admissionDate: '2024-08-12',
      roomId: 102,
    },
    {
      userId: 107,
      studentDbId: 104,
      username: 'harish.s',
      email: 'harish.s@example.com',
      fullName: 'Harish S',
      studentId: 'STU-2026-004',
      gender: 'MALE',
      contact: '9445198765',
      address: '23 West Car Street, Tiruchirappalli, Tamil Nadu - 620002',
      dept: 'EEE',
      admissionDate: '2024-08-15',
      roomId: 102,
    },
    {
      userId: 108,
      studentDbId: 105,
      username: 'keerthana.m',
      email: 'keerthana.m@example.com',
      fullName: 'Keerthana M',
      studentId: 'STU-2026-005',
      gender: 'FEMALE',
      contact: '9940211223',
      address: '15 Thillai Nagar, Tiruchirappalli, Tamil Nadu - 620018',
      dept: 'IT',
      admissionDate: '2024-08-18',
      roomId: 103,
    },
    {
      userId: 109,
      studentDbId: 106,
      username: 'divya.r',
      email: 'divya.r@example.com',
      fullName: 'Divya R',
      studentId: 'STU-2026-006',
      gender: 'FEMALE',
      contact: '9840344556',
      address: '88 College Road, Salem, Tamil Nadu - 636007',
      dept: 'CSE',
      admissionDate: '2024-08-18',
      roomId: 103,
    },
    {
      userId: 110,
      studentDbId: 107,
      username: 'nandhini.k',
      email: 'nandhini.k@example.com',
      fullName: 'Nandhini K',
      studentId: 'STU-2026-007',
      gender: 'FEMALE',
      contact: '9444577889',
      address: '34 North Mada Street, Tirunelveli, Tamil Nadu - 627006',
      dept: 'ECE',
      admissionDate: '2024-08-20',
      roomId: 104,
    },
  ];

  // 4. Seed Rooms (Realistic Blocks and Rooms)
  const roomsData = [
    { id: 101, room_number: '301-A', block: 'A', floor: 3, room_type: 'DOUBLE', capacity: 2 },
    { id: 102, room_number: '204-B', block: 'B', floor: 2, room_type: 'DOUBLE', capacity: 2 },
    { id: 103, room_number: '102-C', block: 'C', floor: 1, room_type: 'DOUBLE', capacity: 2 },
    { id: 104, room_number: '103-C', block: 'C', floor: 1, room_type: 'SINGLE', capacity: 1 },
  ];

  for (const r of roomsData) {
    await conn.query(`
      INSERT INTO rooms (id, room_number, block, floor, room_type, capacity)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE block = VALUES(block), floor = VALUES(floor), room_type = VALUES(room_type), capacity = VALUES(capacity)
    `, [r.id, r.room_number, r.block, r.floor, r.room_type, r.capacity]);
  }

  // Seed Students & Allocations
  for (const s of studentsData) {
    // User
    await conn.query(`
      INSERT INTO users (id, username, email, password, full_name, role, is_active)
      VALUES (?, ?, ?, ?, ?, 'STUDENT', 1)
      ON DUPLICATE KEY UPDATE username = VALUES(username), email = VALUES(email), full_name = VALUES(full_name), password = VALUES(password), is_active = 1
    `, [s.userId, s.username, s.email, passwordHash, s.fullName]);

    // Student Profile
    await conn.query(`
      INSERT INTO students (id, user_id, student_id, full_name, gender, contact_number, address, department, admission_date, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), student_id = VALUES(student_id), full_name = VALUES(full_name), gender = VALUES(gender), contact_number = VALUES(contact_number), address = VALUES(address), department = VALUES(department), is_active = 1
    `, [s.studentDbId, s.userId, s.studentId, s.fullName, s.gender, s.contact, s.address, s.dept, s.admissionDate]);

    // Room Allocation
    await conn.query(`
      INSERT INTO room_allocations (id, student_id, room_id, allocated_at, allocated_by)
      VALUES (?, ?, ?, NOW(), 102)
      ON DUPLICATE KEY UPDATE room_id = VALUES(room_id), student_id = VALUES(student_id)
    `, [s.studentDbId, s.studentDbId, s.roomId]);
  }

  // 5. Clean up old dummy 'Test Student' profiles from students table
  await conn.query(`
    UPDATE students 
    SET full_name = 'Vignesh R', department = 'CSE', contact_number = '9123456780' 
    WHERE full_name = 'Test Student' OR full_name = 'Alex Student';
  `);

  await conn.query(`
    UPDATE users 
    SET full_name = 'Karthik Raj' 
    WHERE full_name = 'Warden Test' OR full_name = 'Warden Robert';
  `);

  await conn.query(`
    UPDATE users 
    SET full_name = 'Vignesh R' 
    WHERE full_name = 'Student Test' OR full_name = 'Alex Student';
  `);

  await conn.query(`
    UPDATE users 
    SET full_name = 'Arun Kumar' 
    WHERE full_name = 'System Admin' OR full_name = 'Head Administrator' OR full_name = 'Admin User';
  `);

  await conn.query(`
    UPDATE users 
    SET full_name = 'Priya S' 
    WHERE full_name = 'Bob Maintenance';
  `);

  // 6. Seed Realistic Complaints
  // Complaint 1: RESOLVED (Plumbing)
  await conn.query(`
    INSERT INTO complaints (id, ticket_id, student_id, room_id, category, description, priority, status, assigned_to, created_at, resolved_at)
    VALUES (101, 'CMP-20260923-PLM01', 101, 101, 'PLUMBING', 'Washbasin water tap leaking in Block A 3rd floor washroom.', 'HIGH', 'RESOLVED', 103, NOW(), NOW())
    ON DUPLICATE KEY UPDATE description = VALUES(description), status = 'RESOLVED', assigned_to = 103
  `);
  await conn.query(`
    INSERT INTO complaint_history (complaint_id, changed_by, from_status, to_status, work_notes, created_at)
    VALUES (101, 103, 'IN_PROGRESS', 'RESOLVED', 'Replaced washer valve and stopped water leak. Verified flow.', NOW())
    ON DUPLICATE KEY UPDATE work_notes = VALUES(work_notes)
  `);

  // Complaint 2: ASSIGNED to Priya S (Electrical)
  await conn.query(`
    INSERT INTO complaints (id, ticket_id, student_id, room_id, category, description, priority, status, assigned_to, created_at)
    VALUES (102, 'CMP-20260923-ELE02', 101, 101, 'ELECTRICAL', 'Study desk power socket sparking when laptop charger plugged in Room 301-A.', 'URGENT', 'ASSIGNED', 103, NOW())
    ON DUPLICATE KEY UPDATE description = VALUES(description), status = 'ASSIGNED', assigned_to = 103
  `);
  await conn.query(`
    INSERT INTO complaint_history (complaint_id, changed_by, from_status, to_status, work_notes, created_at)
    VALUES (102, 102, 'SUBMITTED', 'ASSIGNED', 'Assigned to Priya S for urgent inspection and repair', NOW())
    ON DUPLICATE KEY UPDATE work_notes = VALUES(work_notes)
  `);

  // Complaint 3: SUBMITTED (Internet / Wi-Fi)
  await conn.query(`
    INSERT INTO complaints (id, ticket_id, student_id, room_id, category, description, priority, status, assigned_to, created_at)
    VALUES (103, 'CMP-20260925-NET03', 105, 103, 'INTERNET', 'Wi-Fi router in Block C 1st floor corridor frequently dropping signal.', 'MEDIUM', 'SUBMITTED', NULL, NOW())
    ON DUPLICATE KEY UPDATE description = VALUES(description), status = 'SUBMITTED'
  `);

  // Complaint 4: SUBMITTED (Carpentry)
  await conn.query(`
    INSERT INTO complaints (id, ticket_id, student_id, room_id, category, description, priority, status, assigned_to, created_at)
    VALUES (104, 'CMP-20260926-CAR04', 103, 102, 'CARPENTRY', 'Wardrobe door hinges loose and not latching properly in Room 204-B.', 'LOW', 'SUBMITTED', NULL, NOW())
    ON DUPLICATE KEY UPDATE description = VALUES(description), status = 'SUBMITTED'
  `);

  // 7. Seed Realistic Tamil Nadu Visitors
  await conn.query(`
    INSERT INTO visitor_logs (id, visitor_name, phone, student_id, purpose, entry_at, exit_at, recorded_by, notes)
    VALUES (101, 'Ramanathan S', '+91 98401 98765', 101, 'Parent Weekend Visit', NOW(), NULL, 102, 'Parent ID verified at main gate')
    ON DUPLICATE KEY UPDATE visitor_name = 'Ramanathan S', phone = '+91 98401 98765', purpose = 'Parent Weekend Visit'
  `);

  await conn.query(`
    INSERT INTO visitor_logs (id, visitor_name, phone, student_id, purpose, entry_at, exit_at, recorded_by, notes)
    VALUES (102, 'Meenakshi Sundaram', '+91 94432 12345', 105, 'Book Delivery & Study Materials', DATE_SUB(NOW(), INTERVAL 3 HOUR), DATE_SUB(NOW(), INTERVAL 2 HOUR), 102, 'Delivery completed at reception')
    ON DUPLICATE KEY UPDATE visitor_name = 'Meenakshi Sundaram', phone = '+91 94432 12345', purpose = 'Book Delivery & Study Materials'
  `);

  await conn.query(`
    INSERT INTO visitor_logs (id, visitor_name, phone, student_id, purpose, entry_at, exit_at, recorded_by, notes)
    VALUES (103, 'Swaminathan K', '+91 97890 23456', 107, 'Family Meeting Before Semester Exams', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 22 HOUR), 102, 'Guest register signed')
    ON DUPLICATE KEY UPDATE visitor_name = 'Swaminathan K', phone = '+91 97890 23456', purpose = 'Family Meeting Before Semester Exams'
  `);

  // 8. Seed Realistic Tamil Nadu Leave Requests & Gate Passes
  await conn.query(`
    INSERT INTO leave_requests (id, student_id, from_datetime, to_datetime, reason, status, created_at)
    VALUES (101, 101, DATE_ADD(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 5 DAY), 'Attending cousin sister wedding ceremony in Madurai', 'PENDING', NOW())
    ON DUPLICATE KEY UPDATE reason = 'Attending cousin sister wedding ceremony in Madurai'
  `);

  await conn.query(`
    INSERT INTO leave_requests (id, student_id, from_datetime, to_datetime, reason, status, review_notes, reviewed_by, reviewed_at, gate_pass_number, created_at)
    VALUES (102, 101, DATE_ADD(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 10 DAY), 'Pongal festival weekend celebration with family in native village', 'APPROVED', 'Parent consent confirmed via phone call with father Ramanathan S', 102, NOW(), 'GP-2026-982104', NOW())
    ON DUPLICATE KEY UPDATE reason = 'Pongal festival weekend celebration with family in native village', review_notes = 'Parent consent confirmed via phone call with father Ramanathan S', status = 'APPROVED', gate_pass_number = 'GP-2026-982104'
  `);

  await conn.query(`
    INSERT INTO leave_requests (id, student_id, from_datetime, to_datetime, reason, status, review_notes, reviewed_by, reviewed_at, gate_pass_number, created_at)
    VALUES (103, 105, DATE_ADD(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 5 DAY), 'Medical consultation at Apollo Hospital, Greams Road, Chennai', 'APPROVED', 'Medical appointment slip submitted and verified by Warden', 102, NOW(), 'GP-2026-481920', NOW())
    ON DUPLICATE KEY UPDATE reason = 'Medical consultation at Apollo Hospital, Greams Road, Chennai', review_notes = 'Medical appointment slip submitted and verified by Warden', status = 'APPROVED', gate_pass_number = 'GP-2026-481920'
  `);

  // 9. Update Notifications
  await conn.query(`
    UPDATE notifications 
    SET message = REPLACE(message, 'Bob Maintenance', 'Priya S');
  `);
  await conn.query(`
    UPDATE notifications 
    SET message = REPLACE(message, 'Alex Student', 'Vignesh R');
  `);

  await conn.query(`
    INSERT INTO notifications (id, user_id, type, title, message, reference_type, reference_id, is_read, created_at)
    VALUES (101, 104, 'GATE_PASS_ISSUED', 'Gate Pass Issued', 'Your leave request has been approved. Gate pass GP-2026-982104 is now ready.', 'LEAVE', 102, 0, NOW())
    ON DUPLICATE KEY UPDATE is_read = 0
  `);

  await conn.query(`
    INSERT INTO notifications (id, user_id, type, title, message, reference_type, reference_id, is_read, created_at)
    VALUES (102, 104, 'COMPLAINT_ASSIGNED', 'Ticket Assigned', 'Your complaint CMP-20260923-ELE02 has been assigned to Priya S.', 'COMPLAINT', 102, 0, NOW())
    ON DUPLICATE KEY UPDATE message = 'Your complaint CMP-20260923-ELE02 has been assigned to Priya S.', is_read = 0
  `);

  console.log('----------------------------------------------------');
  console.log('Seed completed successfully with realistic Tamil/Indian data!');
  console.log('----------------------------------------------------');
  console.log('STAFF / ADMIN ACCOUNTS (Password: password123):');
  console.log('1. Arun Kumar    (Admin):       arun.kumar / arun.kumar@example.com');
  console.log('2. Karthik Raj   (Warden):      karthik.raj / karthik.raj@example.com');
  console.log('3. Priya S       (Maintenance): priya.s / priya.s@example.com');
  console.log('STUDENT ACCOUNTS (Password: password123):');
  console.log('4. Vignesh R     (Student, CSE): vignesh.r / vignesh.r@example.com');
  console.log('5. Sanjay Kumar  (Student, ECE): sanjay.kumar / sanjay.kumar@example.com');
  console.log('6. Praveen Kumar (Student, MECH): praveen.kumar / praveen.kumar@example.com');
  console.log('7. Harish S      (Student, EEE): harish.s / harish.s@example.com');
  console.log('8. Keerthana M   (Student, IT):  keerthana.m / keerthana.m@example.com');
  console.log('9. Divya R       (Student, CSE): divya.r / divya.r@example.com');
  console.log('10. Nandhini K   (Student, ECE): nandhini.k / nandhini.k@example.com');
  console.log('----------------------------------------------------');

  await conn.end();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
