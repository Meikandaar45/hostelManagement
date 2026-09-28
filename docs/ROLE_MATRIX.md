# Role-Based Access Control (RBAC) Matrix

This document defines the authoritative permissions, endpoint access, and data isolation boundaries for each role in the Hostel Management System.

---

## 1. System Role Definitions

| Role | Target Persona | Primary Responsibilities |
| :--- | :--- | :--- |
| **`ADMIN`** | Chief Administrator / IT Director | System configuration, user provisioning, global overrides, audit inspection, financial auditing, reporting. |
| **`WARDEN`** | Hostel Warden / Resident Manager | Student management, room allocations, complaint review & assignment, leave request approvals, visitor log monitoring, operational reports. |
| **`STUDENT`** | Enrolled Hostel Resident | Self-service access: viewing room allocation, fee payment history & receipts, raising complaints, applying for leave & printing digital gate passes. |
| **`MAINTENANCE`** | Facilities Staff / Electrician / Plumber | Accessing assigned maintenance tickets, updating repair progress, logging resolution notes upon completion. |

---

## 2. Feature & Module Permission Matrix

| Feature / Module | ADMIN | WARDEN | STUDENT | MAINTENANCE |
| :--- | :---: | :---: | :---: | :---: |
| **Executive Dashboard** | ✅ (Full) | ❌ | ❌ | ❌ |
| **Operations Dashboard** | ❌ | ✅ | ❌ | ❌ |
| **Student Dashboard** | ❌ | ❌ | ✅ (Self only) | ❌ |
| **Maintenance Dashboard** | ❌ | ❌ | ❌ | ✅ (Assigned only) |
| **User Account Management** | ✅ | ❌ | ❌ | ❌ |
| **System Audit Trail** | ✅ | ❌ | ❌ | ❌ |
| **Student Directory & Profiles** | ✅ | ✅ | ❌ | ❌ |
| **Student Self Profile (`/me`)** | ❌ | ❌ | ✅ (Own profile) | ❌ |
| **Room Directory & Capacities** | ✅ | ✅ | ❌ | ❌ |
| **Room Allocation & Vacate** | ✅ | ✅ | ❌ | ❌ |
| **My Room View** | ❌ | ❌ | ✅ (Own room) | ❌ |
| **Fee Assessment Creation** | ✅ | ✅ | ❌ | ❌ |
| **Payment Recording** | ✅ | ✅ | ❌ | ❌ |
| **My Fees & Receipts** | ❌ | ❌ | ✅ (Own fees) | ❌ |
| **Raise Complaint** | ❌ | ❌ | ✅ (Own room) | ❌ |
| **Assign Complaint** | ✅ | ✅ | ❌ | ❌ |
| **Resolve Complaint (Work Notes)**| ✅ | ✅ | ❌ | ✅ (Assigned only) |
| **Close Complaint** | ✅ | ✅ | ❌ | ❌ |
| **My Tasks Work Queue** | ❌ | ❌ | ❌ | ✅ |
| **Submit Leave Request** | ❌ | ❌ | ✅ | ❌ |
| **Cancel Leave Request** | ❌ | ❌ | ✅ (Own pending) | ❌ |
| **Approve / Reject Leave** | ✅ | ✅ | ❌ | ❌ |
| **View Digital Gate Pass** | ✅ | ✅ | ✅ (Own pass) | ❌ |
| **Visitor Entry / Exit Log** | ✅ | ✅ | ✅ (Own visitors)| ❌ |
| **Reports (All 7 Domains)** | ✅ | ✅ | ❌ | ❌ |
| **In-App Notifications** | ✅ (Own) | ✅ (Own) | ✅ (Own) | ✅ (Own) |

---

## 3. IDOR & Data Isolation Protections

The system enforces strict server-side boundary checks to eliminate Insecure Direct Object Reference (IDOR) vulnerabilities:

1. **Student Self-Service Isolation**:
   - Endpoints under `/api/me/*` always resolve the student profile via `WHERE user_id = req.user.id`.
   - Route parameters pointing to another student ID are rejected or ignored.
   - Students cannot view complaints, leaves, fees, or gate passes belonging to other residents.
2. **Maintenance Task Isolation**:
   - The `/api/my-tasks` endpoint enforces `WHERE assigned_to = req.user.id`.
   - Technicians cannot view or modify complaints assigned to another staff member.
3. **Report Module Lockdown**:
   - Routes under `/api/reports/*` enforce `requireRole('ADMIN', 'WARDEN')`.
   - Requests from `STUDENT` or `MAINTENANCE` roles are rejected with HTTP 403 Forbidden.
