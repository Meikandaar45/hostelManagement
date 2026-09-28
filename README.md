# Hostel Management System

A modern, production-oriented web application engineered to streamline higher education campus residence administration and student housing workflows.

**GitHub Repository:** [https://github.com/Meikandaar45/hostelManagement](https://github.com/Meikandaar45/hostelManagement)

---

## 1. Project Overview
The **Hostel Management System** is a unified full-stack platform built with **React 19**, **Vite**, **TypeScript**, **Node.js**, **Express**, and **MySQL 8+**. It manages the end-to-end operational lifecycle of campus residence halls, including room allocation, capacity tracking, student profiles, fee invoicing, payment receipts, maintenance ticketing, visitor logging, emergency leave approvals with digital gate passes, and audit compliance.

---

## 2. Problem Statement
Traditional hostel administration frequently relies on fragmented manual paperwork, verbal requests, and physical register logs. This legacy approach leads to:
- Over-allocation of room beds beyond physical capacities.
- Unreconciled fee collections, unrecorded cash transactions, and lost paper receipts.
- Delayed maintenance responses due to lack of technician accountability and work order logs.
- Security vulnerabilities from uncontrolled visitor check-ins and unverified student leaves.
- High administrative effort required to compile periodic occupancy, financial, and SLA reports.

---

## 3. Project Objectives
1. **Single Source of Truth**: Centralize student profiles, room allocations, fee records, and maintenance logs into an ACID-compliant MySQL database.
2. **Deterministic Role-Based Security**: Isolate user capabilities strictly among Administrators, Wardens, Maintenance Technicians, and Students.
3. **Automated Maintenance Workflow**: Deliver a state machine work order engine requiring technician work notes for resolution.
4. **Digital Gate Pass Generation**: Replace manual exit slips with tamper-resistant digital gate passes (`GP-YYYY-XXXXXX`) issued upon warden approval.
5. **Immutable Compliance Auditing**: Automatically log every sensitive state change into an unalterable audit ledger.

---

## 4. Main Features
- **Authentication & Security**: Bcrypt password hashing, HttpOnly cookie-based JWT sessions, rate limiting on auth endpoints, and Helmet HTTP protection.
- **Dynamic Capacity Management**: Real-time room occupancy calculation preventing double-booking or over-capacity allocations.
- **Financial Ledger & Receipts**: Dynamic balance calculation, payment validation rejecting overpayments, and printable receipts.
- **Maintenance Ticketing**: Strict lifecycle (`SUBMITTED` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`) with technician assignment and mandatory resolution notes.
- **Visitor Security Logs**: Real-time tracking of active vs checked-out visitors with emergency contact details.
- **Leave Request & Digital Gate Pass**: Student leave applications reviewed by wardens, auto-generating printable gate passes upon approval.
- **Real-Time Notification Hub**: Header badge counter with notification tray updating students and staff on operational changes.
- **Operational Reporting & CSV Export**: Tabular reports across 7 domains with RFC 4180 CSV export and `@media print` layouts.

---

## 5. User Roles

| Role | Target Persona | Primary Responsibilities |
| :--- | :--- | :--- |
| **`ADMIN`** | Chief Systems Administrator / Campus Director | Global control: user account provisioning, system configuration, audit inspection, financial reporting, and operational overrides. |
| **`WARDEN`** | Residence Manager / Floor Warden | Operational oversight: room allocations, student roster, fee monitoring, complaint assignment, visitor tracking, leave approvals, and operational reports. |
| **`STUDENT`** | Enrolled Resident Student | Self-service access: personal room view, fee balances, payment receipts, maintenance requests for assigned room, leave applications, digital gate pass, and notifications. |
| **`MAINTENANCE`** | Facilities Technician (Electrician, Plumber, etc.) | Dedicated technician portal (`/app/my-tasks`): view assigned work orders, update task progress, and submit mandatory resolution work notes. |

---

## 6. Technology Stack

- **Frontend Presentation**: React 19, Vite, TypeScript, Tailwind CSS, Lucide React, React Hook Form, Zod, Axios.
- **Backend Application Layer**: Node.js, Express, TypeScript, Zod, Helmet, CORS, Cookie-Parser, Express-Rate-Limit.
- **Authentication & Cryptography**: JSON Web Tokens (JWT) signed via HMAC SHA-256 in `HttpOnly` cookies; passwords hashed with bcrypt (`10` salt rounds).
- **Database Layer**: MySQL 8.0+ using InnoDB engine, `utf8mb4` character encoding, `utf8mb4_unicode_ci` collation, and `mysql2/promise` connection pooling.
- **Testing & QA**: Vitest (153 unit/integration tests) and Playwright (33 end-to-end browser tests).

---

## 7. System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Client Layer                         │
│   React 19 + Vite + TypeScript + Tailwind CSS          │
│   React Router + React Hook Form + Lucide React        │
└───────────────────────────┬────────────────────────────┘
                            │ Axios (JSON / HttpOnly Cookie)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   API Gateway Layer                    │
│   Node.js + Express + Helmet + CORS + Rate Limiter     │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌─────────────────────────┐   ┌──────────────────────────┐
│   Middleware Pipeline   │   │     Security & Audit     │
│  - Cookie Parser        │   │  - Auth Rate Limiter     │
│  - requireAuth (JWT)    │   │  - Centralized RBAC      │
│  - requireRole (RBAC)   │   │  - Immutable Audit Logs  │
│  - Zod Input Validation │   │  - Error Masking Handler │
└───────────┬─────────────┘   └──────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────┐
│                  Controllers Layer                     │
│  Validates input shapes, sets HTTP response headers,   │
│  and delegates business operations to services.        │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌─────────────────────────┐   ┌──────────────────────────┐
│     Business Services   │   │   Operational Engines    │
│  - authService          │   │  - dashboardService      │
│  - studentService       │   │  - reportService         │
│  - roomService          │   │  - notificationService   │
│  - feeService           │   │  - auditService          │
│  - complaintService     │   │                          │
│  - leaveService         │   │                          │
│  - visitorService       │   │                          │
└───────────┬─────────────┘   └──────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────┐
│               Data Access Layer (MySQL 8+)             │
│   mysql2/promise connection pool (Parameterized SQL)   │
│   13 InnoDB Tables + Idempotent Composite Indexes     │
└────────────────────────────────────────────────────────┘
```

---

## 8. Main Application Modules

1. **Authentication & Identity**: Login, logout, initial system setup (`/setup`), forgot password, and reset password.
2. **Dashboard**: Role-tailored executive summaries with real-time operational statistics.
3. **Student Directory**: Institutional profiles, department filtering, contact information, and active room links.
4. **Room Inventory & Capacity**: Real-time bed occupancy calculations, floor plans, room types, and allocation modals.
5. **Bed Allocation & Vacating**: Transactional allocation with capacity checks; release of beds with audit timestamps.
6. **Fee Ledger & Payments**: Academic period fee generation, balance tracking, payment collection, and printable receipts.
7. **Complaint Management**: Issue submission, technician assignment, priority tracking, and mandatory work notes.
8. **Maintenance Staff Portal**: Dedicated technician work queue (`/app/my-tasks`) scoped to assigned tickets.
9. **Visitor Management**: Residence check-in and check-out logs with duration calculations.
10. **Leave Approval & Gate Pass**: Student leave applications reviewed by wardens, issuing official digital gate passes with QR representations.
11. **Notifications Center**: In-app user notifications for ticket updates, approvals, and reminders.
12. **Operational Reporting**: Tabular reports across all 7 operational domains with RFC 4180 CSV export.
13. **Audit Trail**: Searchable, immutable history of all system events.

---

## 9. Database Architecture

- **Authoritative Database Name**: `hostel_management`
- **Engine**: MySQL 8.0+ (InnoDB)
- **Character Set**: `utf8mb4`
- **13 Relational Tables**:
  - `users`: Core account credentials, roles, and active flags.
  - `password_reset_tokens`: Single-use SHA-256 hashed password tokens.
  - `audit_logs`: Immutable compliance audit trail.
  - `students`: Student demographic and academic profiles.
  - `rooms`: Room inventory, room types, and capacities.
  - `room_allocations`: Bed allocation history and active occupancies.
  - `fees`: Assessed semester fee items.
  - `payments`: Fee payments and receipt numbers.
  - `complaints`: Maintenance tickets and status tracking.
  - `complaint_history`: Immutable transition log with resolution notes.
  - `visitor_logs`: Visitor check-in/out records.
  - `leave_requests`: Student leave applications and gate pass numbers.
  - `notifications`: User alert notifications.

---

## 10. Project Structure

```
hostel-management/
├── client/                     # React + Vite frontend application
│   ├── src/
│   │   ├── components/         # Reusable UI components (Table, Modal, Badge, FilterBar, etc.)
│   │   ├── config/             # Navigation config and role mappings
│   │   ├── hooks/              # Custom hooks (useAuth, useToast, useDebounce)
│   │   ├── layouts/            # AppLayout and AuthLayout
│   │   ├── pages/              # Views (Dashboard, Reports, Complaints, Visitors, Leave, etc.)
│   │   ├── routes/             # AppRoutes with ProtectedRoute role guards
│   │   ├── services/           # Axios API services
│   │   ├── utils/              # Utilities (exportCsv, helpers)
│   │   └── __tests__/          # Frontend Vitest suites
├── server/                     # Express + TypeScript backend API
│   ├── src/
│   │   ├── config/             # Environment, permissions, and RBAC matrix
│   │   ├── controllers/        # Route controllers
│   │   ├── db/                 # MySQL connection pool and testConnection
│   │   ├── middleware/         # Auth, permission, rate limiting, and error handling
│   │   ├── routes/             # API route definitions
│   │   ├── services/           # Transactional business logic
│   │   ├── validators/         # Zod input validation schemas
│   │   └── __tests__/          # Backend Vitest suites (unit + integration)
├── docs/                       # Comprehensive project documentation
│   ├── SRS.md                  # Software Requirements Specification (with 6 UML diagrams)
│   ├── API.md                  # Complete API reference manual
│   ├── DATABASE.md             # Authoritative schema reference & ER diagram
│   ├── ARCHITECTURE.md         # Multi-tier architecture and security model
│   ├── ROLE_MATRIX.md          # Authoritative permissions matrix & IDOR checks
│   ├── BACKUP_RECOVERY.md      # Disaster recovery and mysqldump backup procedures
│   └── DEPLOYMENT.md           # Production deployment & reverse proxy configuration
├── screenshots/                # 17 captured production application screenshots
├── scripts/                    # Backup and verification helper scripts
│   ├── backup.ps1              # Windows PowerShell database backup script
│   ├── backup.sh               # Linux/macOS bash database backup script
│   └── generate_all_screenshots.cjs # Automated Playwright screenshot generator
├── sql/                        # Schema files (Execute in numerical order)
│   ├── 01_foundation_auth.sql
│   ├── 02_students_rooms_fees.sql
│   ├── 03_complaints_visitors_leave.sql
│   └── 04_final_hardening.sql
├── tests/                      # End-to-end automated Playwright test suite
├── .gitignore                  # Hardened git ignore rules
├── .env.example                # Root environment template
└── README.md
```

---

## 11. Step-by-Step Setup Guide

Follow these exact steps using the actual `package.json` scripts:

### Step 1: Clone the Repository
```bash
git clone https://github.com/Meikandaar45/hostelManagement.git
cd hostelManagement
```

### Step 2: Install All Dependencies
Install root, backend, and frontend dependencies in one command:
```bash
npm run install:all
```
*(Alternatively: `npm install`, `npm --prefix server install`, and `npm --prefix client install`).*

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` in the root and in the `server` directory:
```bash
cp .env.example .env
cp server/.env.example server/.env
```
Fill in your database credentials:
```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# Database Connection
DATABASE_URL=mysql://root:your_password@localhost:3306/hostel_management
# Or individual variables:
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=hostel_management

# Authentication
JWT_SECRET=replace_with_a_secure_random_string_minimum_64_characters
JWT_EXPIRES_IN=7d
COOKIE_SECURE=false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=20
```

### Step 4: Create MySQL Database
Log in to MySQL 8+ and create the database:
```sql
CREATE DATABASE IF NOT EXISTS `hostel_management`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

### Step 5: Execute SQL Schema Files in Sequence
Execute the 4 schema scripts manually in numerical order:
```bash
mysql -u root -p hostel_management < sql/01_foundation_auth.sql
mysql -u root -p hostel_management < sql/02_students_rooms_fees.sql
mysql -u root -p hostel_management < sql/03_complaints_visitors_leave.sql
mysql -u root -p hostel_management < sql/04_final_hardening.sql
```

### Step 6: Start Backend Server
```bash
npm run server
```
*(Runs `tsx watch src/server.ts` on port 5000).*

### Step 7: Start Frontend Application
```bash
npm run client
```
*(Runs Vite on port 5173).*

> **Tip:** You can start both frontend and backend concurrently with:
> ```bash
> npm run dev
> ```

### Step 8: First-Time Setup
1. Open `http://localhost:5173/setup` in your browser.
2. Complete the initial Administrator account registration.
3. Log in at `http://localhost:5173/login`.

---

## 12. Testing Commands

Execute the test suites using the actual `package.json` scripts:

```bash
# Run unit & integration tests (both server and client Vitest suites - 153 tests)
npm test

# Run Playwright E2E browser automation suite (33 tests)
npm run test:e2e

# Run TypeScript typechecks across client and server
npm run typecheck

# Run ESLint across client and server
npm run lint
```

---

## 13. Production Build & Deployment

To build production bundles for deployment:
```bash
npm run build
```
This produces:
- `server/dist/`: Compiled Node.js ESM server code.
- `client/dist/`: Bundled static production assets.

To start the production server:
```bash
npm --prefix server run start
```

For complete production server deployment, systemd, PM2 cluster, and Nginx reverse proxy configurations, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## 14. Screenshots

The application features 17 core screens captured directly from the live system in `screenshots/`:

| # | Screen | Description | File |
|---|---|---|---|
| 01 | **Login** | Secure authentication portal with rate limiting | [`screenshots/01_login.png`](screenshots/01_login.png) |
| 02 | **Admin Dashboard** | Executive dashboard with platform metrics | [`screenshots/02_admin_dashboard.png`](screenshots/02_admin_dashboard.png) |
| 03 | **Warden Dashboard** | Operations dashboard with occupancy & leave stats | [`screenshots/03_warden_dashboard.png`](screenshots/03_warden_dashboard.png) |
| 04 | **Student Dashboard** | Personal residency, fees, and leave status | [`screenshots/04_student_dashboard.png`](screenshots/04_student_dashboard.png) |
| 05 | **Maintenance Dashboard** | Technician task queue with active tickets | [`screenshots/05_maintenance_dashboard.png`](screenshots/05_maintenance_dashboard.png) |
| 06 | **Student Management** | Student directory with filter and profile actions | [`screenshots/06_student_management.png`](screenshots/06_student_management.png) |
| 07 | **Room Management** | Room inventory, types, and live bed capacities | [`screenshots/07_room_management.png`](screenshots/07_room_management.png) |
| 08 | **Room Allocation** | Bed allocation modal with capacity validation | [`screenshots/08_room_allocation.png`](screenshots/08_room_allocation.png) |
| 09 | **Fee Management** | Fee assessment ledger and balance tracking | [`screenshots/09_fees.png`](screenshots/09_fees.png) |
| 10 | **Complaints** | Work order listing with status badges and filters | [`screenshots/10_complaints.png`](screenshots/10_complaints.png) |
| 11 | **Complaint Assignment**| Ticket detail view and staff assignment modal | [`screenshots/11_complaint_assignment.png`](screenshots/11_complaint_assignment.png) |
| 12 | **Visitor Management** | Residence check-in and check-out tracking | [`screenshots/12_visitor_management.png`](screenshots/12_visitor_management.png) |
| 13 | **Leave Requests** | Student leave application modal and history | [`screenshots/13_leave_request.png`](screenshots/13_leave_request.png) |
| 14 | **Leave Approval** | Warden review table with approve/reject actions | [`screenshots/14_leave_approval.png`](screenshots/14_leave_approval.png) |
| 15 | **Digital Gate Pass** | Official security pass with QR verification | [`screenshots/15_gate_pass.png`](screenshots/15_gate_pass.png) |
| 16 | **Notifications** | In-app notification center with read actions | [`screenshots/16_notifications.png`](screenshots/16_notifications.png) |
| 17 | **Reports & Export** | Multi-domain reporting suite with CSV export | [`screenshots/17_reports.png`](screenshots/17_reports.png) |

---

## 15. Important Notes

- **Authoritative Database**: MySQL 8.0+ is the single authoritative source of truth. Raw DDL is never automatically run by the application; schema scripts must be executed manually.
- **Leave Approval Workflow**: Approving a leave request is fully transactional—it updates the database status to `APPROVED`, generates a unique collision-safe gate pass number (`GP-YYYY-XXXXXX`), records an immutable audit log, and notifies the student.
- **Credential Safety**: Passwords and secrets are never committed. Copy `.env.example` to `.env` and assign strong credentials.

---

## 16. Detailed Documentation Links

- [Software Requirements Specification (SRS)](docs/SRS.md)
- [Production Deployment Guide](docs/DEPLOYMENT.md)
- [Database Backup & Disaster Recovery Guide](docs/BACKUP_RECOVERY.md)
- [API Reference Manual](docs/API.md)
- [Database Schema Reference](docs/DATABASE.md)
- [System Architecture Document](docs/ARCHITECTURE.md)
- [Role-Based Access Control Matrix](docs/ROLE_MATRIX.md)
