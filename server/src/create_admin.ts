import { pool } from './db/pool.js';
import { hashPassword } from './utils/password.js';

async function main() {
  try {
    const passwordHash = await hashPassword('password123');

    await pool.query(
      `UPDATE users SET password = ? WHERE username = 'admin'`,
      [passwordHash]
    );

    console.log('Admin user created: admin / password123');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
