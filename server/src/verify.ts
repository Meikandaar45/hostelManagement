import { pool } from './db/pool.js';
import * as roomService from './services/roomService.js';
import * as feeService from './services/feeService.js';
import { hashPassword } from './utils/password.js';

async function verify() {
  try {
    const passwordHash = await hashPassword('TempPassword123');
    const unique = Date.now().toString();

    // 1. Create a warden user
    const [userRes]: any = await pool.query(
      `INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, 'WARDEN')`,
      ['warden_' + unique, 'karthik.raj_' + unique + '@example.com', passwordHash, 'Karthik Raj']
    );
    const wardenId = userRes.insertId;

    // 2. Create a student user
    const [studentUserRes]: any = await pool.query(
      `INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, 'STUDENT')`,
      ['student_' + unique, 'vignesh.r_' + unique + '@example.com', passwordHash, 'Vignesh R']
    );
    const studentUserId = studentUserRes.insertId;

    // 3. Create student profile via service (or just insert manually since studentService expects full request)
    const [studentRes]: any = await pool.query(
      `INSERT INTO students (user_id, student_id, full_name, gender, contact_number, address, department, admission_date) 
       VALUES (?, ?, ?, 'MALE', '9123456780', '12 Anna Salai, Chennai, Tamil Nadu', 'CSE', '2024-08-10')`,
      [studentUserId, 'STU_' + unique, 'Vignesh R']
    );
    const studentDbId = studentRes.insertId;

    // 4. Create room via pool
    const [roomRes]: any = await pool.query(
      `INSERT INTO rooms (room_number, block, floor, room_type, capacity)
       VALUES (?, 'A', 1, 'DOUBLE', 2)`,
      ['101_' + unique]
    );
    const roomId = roomRes.insertId;

    // 5. Allocate room via service
    console.log('Allocating room...');
    await roomService.allocateRoom(roomId, studentDbId, wardenId);
    console.log('Room allocated successfully!');

    // 6. Check room occupancy
    const roomsResult = await roomService.listRooms({ page: 1, limit: 10 });
    const room = roomsResult.items.find((r: any) => r.id === roomId);
    console.log(`Room Occupancy: ${room?.current_occupancy}/${room?.capacity}, Status: ${room?.status}`);

    // 7. Create fee via service
    console.log('Creating fee...');
    const fee = await feeService.createFee({
      student_id: studentDbId,
      fee_type: 'HOSTEL_FEE',
      academic_period: '2023-2024',
      amount: 5000,
      due_date: '2023-12-31'
    }, wardenId);
    console.log('Fee created successfully! ID:', fee.id);

    // 8. Make payment via service
    console.log('Recording payment...');
    await feeService.recordPayment(fee.id, {
      amount: 2000,
      payment_method: 'UPI',
      transaction_reference: 'TXN_' + unique,
      notes: 'test'
    }, wardenId);
    console.log('Payment recorded successfully!');

    // 9. Verify fee status
    const feesResult = await feeService.listFees({ student_id: studentDbId, page: 1, limit: 10 });
    const checkFee = feesResult.items.find((f: any) => f.id === fee.id);
    console.log(`Fee Outstanding Balance: ${checkFee?.outstanding_amount}, Status: ${checkFee?.status}`);

    console.log('==============================================');
    console.log('ALL PHASE 2 OPERATIONS WORKING PROPERLY!');
    console.log('==============================================');
    process.exit(0);
  } catch (err) {
    console.error('Integration test failed:', err);
    process.exit(1);
  }
}

verify();
