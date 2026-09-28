# Authoritative API Reference Manual

**Hostel Management System**  
**Base URL:** `/api`  
**Protocol:** HTTP/1.1 or HTTP/2 over TLS (HTTPS)  
**Authentication Scheme:** Signed JSON Web Token (JWT) transmitted via secure `HttpOnly` cookie named `auth_token`.  
**Standard Response Envelope:**
- **Success:** `{ "success": true, "data": <payload> }`
- **Error:** `{ "success": false, "message": "<description>", "errors"?: <zod_field_errors> }`

---

## 1. System Health

### `GET /api/health`
- **Description:** Verifies service availability and tests active MySQL connection pool connectivity.
- **Authentication:** None (Public)
- **Role:** Any
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "application": "ok",
      "database": "ok"
    }
  }
  ```
- **Possible Errors:**
  - `503 Service Unavailable`: Backend server running, but MySQL connection pool ping failed (`database: "unavailable"`).

---

## 2. Authentication & Identity

### `GET /api/auth/setup-status`
- **Description:** Checks if an initial system administrator account exists in the database.
- **Authentication:** None
- **Role:** Public
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "isSetupRequired": false
    }
  }
  ```

### `POST /api/auth/setup`
- **Description:** Bootstraps the first administrator account if no users exist.
- **Authentication:** None (Rate-limited: 20 req/15min)
- **Request Body:**
  ```json
  {
    "username": "admin",
    "email": "admin@example.com",
    "password": "Password123!",
    "fullName": "System Administrator"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com",
        "role": "ADMIN",
        "fullName": "System Administrator"
      }
    }
  }
  ```
- **Possible Errors:**
  - `400 Bad Request`: Validation failure on input fields or system already initialized.
  - `429 Too Many Requests`: IP rate limit exceeded.

### `POST /api/auth/login`
- **Description:** Authenticates user credentials, generates JWT token, and sets `auth_token` HttpOnly cookie.
- **Authentication:** None (Rate-limited)
- **Request Body:**
  ```json
  {
    "identifier": "admin@example.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com",
        "role": "ADMIN",
        "fullName": "System Administrator"
      }
    }
  }
  ```
- **Possible Errors:**
  - `401 Unauthorized`: Invalid identifier, incorrect password, or inactive account.
  - `429 Too Many Requests`: Rate limit exceeded.

### `POST /api/auth/logout`
- **Description:** Clears the `auth_token` cookie and terminates the session.
- **Authentication:** Required
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "message": "Successfully logged out"
    }
  }
  ```

### `GET /api/auth/me`
- **Description:** Returns the authenticated user's current identity.
- **Authentication:** Required
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com",
        "role": "ADMIN",
        "fullName": "System Administrator"
      }
    }
  }
  ```
- **Possible Errors:**
  - `401 Unauthorized`: Session missing or expired.

---

## 3. Student Management

### `GET /api/students`
- **Description:** Retrieves paginated student profiles with optional search and department filters.
- **Authentication:** Required
- **Role:** `ADMIN`, `WARDEN`
- **Query Parameters:** `page`, `limit`, `search`, `department`, `isActive`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "students": [
        {
          "id": 1,
          "userId": 104,
          "studentId": "STU-2026-001",
          "fullName": "Alex Mercer",
          "gender": "MALE",
          "contactNumber": "+1234567890",
          "department": "Computer Science",
          "admissionDate": "2026-08-01",
          "isActive": 1,
          "roomNumber": "101",
          "block": "Block A"
        }
      ],
      "total": 1,
      "page": 1,
      "limit": 20
    }
  }
  ```

### `POST /api/students`
- **Description:** Registers a new student and automatically creates an associated `STUDENT` user account.
- **Authentication:** Required
- **Role:** `ADMIN`, `WARDEN`
- **Request Body:**
  ```json
  {
    "studentId": "STU-2026-002",
    "fullName": "Jane Doe",
    "gender": "FEMALE",
    "contactNumber": "+1987654321",
    "address": "456 Campus Ave",
    "department": "Mechanical Engineering",
    "admissionDate": "2026-08-15",
    "email": "jane.doe@example.com",
    "username": "janedoe",
    "password": "Password123!"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { "id": 2, "studentId": "STU-2026-002", "fullName": "Jane Doe" }
  }
  ```
- **Possible Errors:**
  - `400 Bad Request`: Validation failure.
  - `409 Conflict`: `studentId`, `email`, or `username` already exists.

---

## 4. Room & Bed Allocation

### `GET /api/rooms`
- **Description:** Lists all rooms with dynamic occupancy, capacity, and bed availability.
- **Authentication:** Required
- **Role:** `ADMIN`, `WARDEN`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "roomNumber": "101",
        "block": "Block A",
        "floor": 1,
        "roomType": "DOUBLE",
        "capacity": 2,
        "occupiedCount": 1,
        "availableBeds": 1
      }
    ]
  }
  ```

### `POST /api/rooms/:id/allocate`
- **Description:** Allocates a bed in the specified room to a student.
- **Authentication:** Required
- **Role:** `ADMIN`, `WARDEN`
- **Request Body:**
  ```json
  {
    "studentId": 1
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "allocationId": 12, "allocatedAt": "2026-09-28T16:00:00.000Z" }
  }
  ```
- **Possible Errors:**
  - `400 Bad Request`: Student already holds an active allocation, or room has reached full capacity.
  - `404 Not Found`: Room or student not found.

### `POST /api/rooms/:id/vacate`
- **Description:** Vacates a student's active room assignment.
- **Authentication:** Required
- **Role:** `ADMIN`, `WARDEN`
- **Request Body:**
  ```json
  {
    "studentId": 1
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "message": "Room vacated successfully" }
  }
  ```

---

## 5. Fees & Payments

### `GET /api/fees`
- **Description:** Retrieves student fees with dynamic balance calculation and payment history.
- **Authentication:** Required
- **Role:** `ADMIN`, `WARDEN`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "studentId": 1,
        "studentName": "Alex Mercer",
        "feeType": "Hostel Semester Fee",
        "academicPeriod": "Fall 2026",
        "amount": "1500.00",
        "dueDate": "2026-10-15",
        "paidAmount": "500.00",
        "balance": "1000.00",
        "status": "PARTIAL"
      }
    ]
  }
  ```

### `POST /api/fees/:id/payments`
- **Description:** Records a payment against an assessed fee and issues a unique receipt number.
- **Authentication:** Required
- **Role:** `ADMIN`, `WARDEN`
- **Request Body:**
  ```json
  {
    "amount": 500.00,
    "paymentMethod": "UPI",
    "transactionReference": "UPI-TXN-987654",
    "notes": "Paid via Google Pay"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "paymentId": 45,
      "receiptNumber": "RCPT-20260928-AB12",
      "amount": "500.00",
      "paidAt": "2026-09-28T16:20:00.000Z"
    }
  }
  ```
- **Possible Errors:**
  - `400 Bad Request`: Payment amount exceeds outstanding fee balance.
  - `404 Not Found`: Fee record does not exist.

### `GET /api/fees/receipts/:id`
- **Description:** Fetches complete printable receipt details for a payment.
- **Authentication:** Required
- **Role:** `ADMIN`, `WARDEN`, or `STUDENT` (must own the receipt)

---

## 6. Complaints & Maintenance Workflow

### `POST /api/complaints`
- **Description:** Submits a maintenance complaint for the student's allocated room.
- **Authentication:** Required
- **Role:** `STUDENT`
- **Request Body:**
  ```json
  {
    "category": "PLUMBING",
    "description": "Sink tap leaking in room bathroom",
    "priority": "HIGH"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { "id": 10, "ticketId": "CMP-20260928-PLM12", "status": "SUBMITTED" }
  }
  ```

### `PATCH /api/complaints/:id/assign`
- **Description:** Assigns a ticket to a maintenance technician.
- **Authentication:** Required
- **Role:** `ADMIN`, `WARDEN`
- **Request Body:**
  ```json
  {
    "assignedTo": 103
  }
  ```

### `PATCH /api/complaints/:id/status`
- **Description:** Transitions a ticket through its lifecycle (`IN_PROGRESS`, `RESOLVED`, `CLOSED`). Resolving strictly requires `workNotes`.
- **Authentication:** Required
- **Role:** `ADMIN`, `WARDEN`, `MAINTENANCE`
- **Request Body:**
  ```json
  {
    "status": "RESOLVED",
    "workNotes": "Replaced worn rubber washer and tightened valve stem."
  }
  ```
- **Possible Errors:**
  - `400 Bad Request`: Invalid transition or missing work notes on `RESOLVED`.

### `GET /api/my-tasks`
- **Description:** Lists maintenance tickets assigned strictly to the authenticated technician.
- **Authentication:** Required
- **Role:** `MAINTENANCE`

---

## 7. Visitor Management

### `POST /api/visitors`
- **Description:** Logs a visitor entry on campus.
- **Authentication:** Required
- **Role:** `ADMIN`, `WARDEN`
- **Request Body:**
  ```json
  {
    "visitorName": "Michael Mercer",
    "phone": "+1234567890",
    "studentId": 1,
    "purpose": "Parent visit"
  }
  ```

### `PATCH /api/visitors/:id/exit`
- **Description:** Logs departure of an active visitor.
- **Authentication:** Required
- **Role:** `ADMIN`, `WARDEN`

---

## 8. Leave Requests & Digital Gate Pass

### `POST /api/leave`
- **Description:** Submits a leave application for an off-campus absence.
- **Authentication:** Required
- **Role:** `STUDENT`
- **Request Body:**
  ```json
  {
    "fromDatetime": "2026-10-01T09:00:00.000Z",
    "toDatetime": "2026-10-03T18:00:00.000Z",
    "reason": "Family function"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": { "id": 14, "status": "PENDING" }
  }
  ```
- **Possible Errors:**
  - `400 Bad Request`: Return datetime precedes departure datetime.

### `PATCH /api/leave/:id/approve`
- **Description:** Approves a pending leave request, generates a unique gate pass number, commits an audit log, and notifies the student.
- **Authentication:** Required
- **Role:** `ADMIN`, `WARDEN`
- **Request Body:**
  ```json
  {
    "reviewNotes": "Approved by Warden"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": 14,
      "status": "APPROVED",
      "gatePassNumber": "GP-2026-DIJG13",
      "reviewedAt": "2026-09-28T16:20:00.000Z"
    }
  }
  ```

### `PATCH /api/leave/:id/reject`
- **Description:** Rejects a pending leave request. Strictly requires `reviewNotes`.
- **Authentication:** Required
- **Role:** `ADMIN`, `WARDEN`
- **Request Body:**
  ```json
  {
    "reviewNotes": "Clashes with mandatory mid-term exams."
  }
  ```

### `GET /api/leave/:id/gate-pass`
- **Description:** Retrieves official digital gate pass details with verification QR parameters.
- **Authentication:** Required
- **Role:** `ADMIN`, `WARDEN`, or `STUDENT` (must own the gate pass)

---

## 9. In-App Notifications

### `GET /api/notifications`
- **Description:** Fetches notifications for authenticated user.
- **Authentication:** Required
- **Role:** Any

### `GET /api/notifications/unread-count`
- **Description:** Returns the unread notification count for the badge counter.
- **Authentication:** Required
- **Role:** Any
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "unreadCount": 3 }
  }
  ```

### `PATCH /api/notifications/:id/read`
- **Description:** Marks a single notification as read.
- **Authentication:** Required
- **Role:** Any

### `PATCH /api/notifications/read-all`
- **Description:** Marks all notifications for the user as read.
- **Authentication:** Required
- **Role:** Any

---

## 10. Operational Reports

All reporting endpoints enforce `requireRole('ADMIN', 'WARDEN')` and return structured arrays formatted for table rendering and RFC 4180 CSV export:

| Endpoint | Domain | Parameters |
| :--- | :--- | :--- |
| `GET /api/reports/students` | Students & Rooms | `department`, `isActive`, `search` |
| `GET /api/reports/rooms` | Capacity & Occupancy | `block`, `floor`, `roomType` |
| `GET /api/reports/fees` | Fee Invoices & Balances | `status`, `academicPeriod`, `startDate`, `endDate` |
| `GET /api/reports/payments` | Payment Audit Log | `paymentMethod`, `startDate`, `endDate` |
| `GET /api/reports/complaints` | SLA & Maintenance Tickets | `status`, `category`, `priority`, `startDate`, `endDate` |
| `GET /api/reports/leave` | Leave & Gate Pass Ledger | `status`, `startDate`, `endDate` |
| `GET /api/reports/visitors` | Visitor Security Log | `startDate`, `endDate`, `activeOnly` |

---

## 11. Immutable Audit Trail

### `GET /api/audit-logs`
- **Description:** Queries system audit records with actor and date filters.
- **Authentication:** Required
- **Role:** `ADMIN`
- **Query Parameters:** `page`, `limit`, `action`, `actorUserId`, `startDate`, `endDate`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "logs": [
        {
          "id": 108,
          "actorUserId": 102,
          "actorName": "Warden Robert",
          "action": "LEAVE_APPROVED",
          "entityType": "leave_request",
          "entityId": 14,
          "details": { "gatePassNumber": "GP-2026-DIJG13" },
          "createdAt": "2026-09-28T16:20:00.000Z"
        }
      ],
      "total": 1
    }
  }
  ```
