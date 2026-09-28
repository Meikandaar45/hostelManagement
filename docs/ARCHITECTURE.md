# System Architecture Document

This document outlines the architectural patterns, multi-tier layers, security protocols, and operational workflows of the **Hostel Management System**.

---

## 1. High-Level Architecture

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

## 2. Layer Responsibilities

### 2.1 Presentation Tier (Client)
- **Framework**: React with Vite and TypeScript.
- **Styling**: Tailwind CSS with custom dark mode theme and responsive utilities.
- **Navigation**: Client-side routing with `react-router-dom` incorporating `ProtectedRoute` wrappers for RBAC enforcement.
- **State & Data Fetching**: Centralized Axios instance (`client/src/lib/axios.ts`) configured with `withCredentials: true` and 401 redirection interceptors.
- **Export Engines**: Native browser CSV exporter adhering to RFC 4180 (`client/src/utils/exportCsv.ts`) and CSS `@media print` rules for paper and PDF outputs.

### 2.2 Application Tier (Server)
- **Framework**: Express with TypeScript running on Node.js.
- **HTTP Security**:
  - `helmet`: Sets standard security headers (Content-Security-Policy, HSTS, X-Content-Type-Options).
  - `cors`: Strictly whitelists the configured `CLIENT_URL` with credential support.
  - `express-rate-limit`: Protects sensitive authentication endpoints (`/setup`, `/login`, `/forgot-password`, `/reset-password`).
- **Authentication**: JWT token signed with HMAC SHA-256 (`JWT_SECRET`) stored in an `HttpOnly`, `SameSite=Lax` cookie (`auth_token`).
- **Validation**: Schema-first input validation via `zod` for request bodies, query strings, and path parameters.
- **Centralized Error Handling**: Masks raw database or runtime exceptions, returning normalized JSON errors to clients while logging safe diagnostic metadata.

### 2.3 Persistence Tier (Database)
- **Engine**: MySQL 8+ with `InnoDB`.
- **Pool Management**: `mysql2/promise` connection pool with automatic connection recycling, keepalive ping, and UTF-8 encoding (`utf8mb4`).
- **Integrity**: Parameterized SQL queries prevent SQL injection. Multi-table mutations utilize database transactions (`beginTransaction`, `commit`, `rollback`) with table locking (`FOR UPDATE`) where concurrency control is vital (e.g. room allocations, fee payments).

---

## 3. Cross-Cutting Concerns

### 3.1 Role-Based Access Control (RBAC)
Role definitions and capabilities are centralized in `server/src/config/permissions.ts`. Four roles exist:
1. `ADMIN`: Full system administration, user management, audit logs, and operational overrides.
2. `WARDEN`: Operational oversight: student allocations, room capacities, fee monitoring, complaints, visitor management, leave review, and reports.
3. `STUDENT`: Self-service portal scoped strictly to own records (`/api/me/*`, complaints for own room, own leave requests, own gate passes, own notifications).
4. `MAINTENANCE`: Task resolution portal scoped strictly to tasks assigned to the authenticated user ID (`/api/my-tasks`).

### 3.2 Audit Logging
All critical domain actions emit structured, immutable records into `audit_logs`:
- User logins & password resets
- User creation & role changes
- Student profile updates
- Room creation & allocations
- Fee assessments & payment receipts
- Complaint assignment, status transitions & resolution notes
- Leave applications, approvals, and digital gate pass generation
- Visitor check-ins and check-outs

### 3.3 Notification System
Real-time, in-app notifications are stored in `notifications` and polled by the client navigation bar:
- Students receive notifications when leave is reviewed or complaints are assigned/resolved.
- Wardens receive alerts when new leave requests or complaints are submitted.
- Technicians receive alerts when work orders are assigned.
