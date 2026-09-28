import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { pool } from './db/pool.js';

async function runSqlFile(filename: string) {
  const filePath = path.resolve(process.cwd(), '../sql', filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  // Split statements by semicolon and execute them one by one.
  // We need a slightly more robust splitting but for our basic SQL it should work.
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    try {
      if (stmt.toLowerCase().startsWith('use ')) {
         console.log(`Skipping USE statement: ${stmt}`);
         continue; // Connection pool already has the database selected or will select it based on config
      }
      if (stmt.includes('CREATE DATABASE')) {
          console.log(`Skipping CREATE DATABASE: ${stmt}`);
          continue;
      }
      await pool.query(stmt);
      console.log(`Executed: ${stmt.substring(0, 50)}...`);
    } catch (err) {
      console.error(`Error executing statement: ${stmt.substring(0, 50)}...`);
      console.error(err);
    }
  }
}

async function main() {
  try {
    // Create database manually just in case
    const initPool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: Number(process.env.DB_PORT) || 3306,
    });
    
    await initPool.query('CREATE DATABASE IF NOT EXISTS `hostel_management` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    await initPool.end();

    console.log('Running 01_foundation_auth.sql...');
    await runSqlFile('01_foundation_auth.sql');
    
    console.log('Running 02_students_rooms_fees.sql...');
    await runSqlFile('02_students_rooms_fees.sql');
    
    console.log('All SQL executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
