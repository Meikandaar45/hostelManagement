// Global test setup — runs before all test files
// Set test environment variables before any imports resolve env.ts
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long-ok';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.PORT = '5001';
// Database env (tests mock the pool, so real DB not required)
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = '';
process.env.DB_NAME = 'hostel_management_test';
