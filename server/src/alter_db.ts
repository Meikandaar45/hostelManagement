import { pool } from './db/pool.js';


async function alterDb() {
  try {
    await pool.query(`ALTER TABLE users CHANGE COLUMN password_hash password VARCHAR(255) NOT NULL`);
    console.log('Altered table users');
    process.exit(0);
  } catch (err: any) {
    if (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
       console.log('Column might already be renamed or missing.');
    } else {
       console.error(err);
    }
    process.exit(1);
  }
}
alterDb();
