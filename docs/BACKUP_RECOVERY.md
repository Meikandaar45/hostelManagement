# Database Backup & Disaster Recovery Guide

This document details the operational backup strategy, automated tooling, restoration procedures, credential handling, and disaster recovery plan for the Hostel Management System database.

---

## 1. Database Specifications & System Requirements

- **Database Name**: `hostel_management`
- **Database Engine**: MySQL 8.0+ (InnoDB)
- **Character Set**: `utf8mb4`
- **Collation**: `utf8mb4_unicode_ci`
- **Timezone**: UTC (`+00:00`)

### Important Tables Inventory

The system schema comprises 13 core relational tables across four phases:

| Phase | Table Name | Purpose | Key Relationships & Constraints |
| :--- | :--- | :--- | :--- |
| **01** | `users` | User credentials, roles, statuses | Unique `email`, `username`; Role enum (`ADMIN`, `WARDEN`, `STUDENT`, `MAINTENANCE`) |
| **01** | `password_reset_tokens` | Single-use SHA-256 hashed tokens | FK to `users.id` (CASCADE) |
| **01** | `audit_logs` | Immutable audit trail | FK to `users.id` (SET NULL) so logs survive user deletion |
| **02** | `students` | Student demographic & academic profiles | Unique `student_id`; 1-to-1 FK to `users.id` |
| **02** | `rooms` | Room numbers, block, floor, capacity | Unique `room_number`; Type enum (`SINGLE`, `DOUBLE`, etc.) |
| **02** | `room_allocations` | Active and historical bed assignments | FK to `students.id`, `rooms.id`, `users.id` (`allocated_by`) |
| **02** | `fees` | Assigned semester/term fees | Unique composite (`student_id`, `fee_type`, `academic_period`) |
| **02** | `payments` | Fee transactions and payment references | Unique `receipt_number`; FK to `fees.id`, `users.id` |
| **03** | `complaints` | Maintenance tickets & status workflows | Unique `ticket_id`; FK to `students.id`, `rooms.id`, `users.id` (`assigned_to`) |
| **03** | `complaint_history` | Immutable transition and resolution log | FK to `complaints.id` (CASCADE), `users.id` (`changed_by`) |
| **03** | `visitor_logs` | Residence visitor check-in/out records | FK to `students.id`, `users.id` (`recorded_by`) |
| **03** | `leave_requests` | Leave permissions & digital gate passes | Unique `gate_pass_number`; FK to `students.id`, `users.id` (`reviewed_by`) |
| **03** | `notifications` | In-app user notifications & alerts | FK to `users.id` (CASCADE) |

---

## 2. Environment Variables Required

Database connectivity and backup automation rely strictly on environment variables (no hardcoded passwords):

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `DB_HOST` | Yes | `localhost` | MySQL host address |
| `DB_PORT` | Yes | `3306` | MySQL port |
| `DB_USER` | Yes | `root` | Database user with backup/restore privileges |
| `DB_PASSWORD` / `MYSQL_PWD` | Yes | *(empty)* | Database user password |
| `DB_NAME` | Yes | `hostel_management` | Authoritative database name |
| `DATABASE_URL` | Optional | *(none)* | Combined connection URI: `mysql://user:pass@host:port/dbname` |

---

## 3. Database Initialization: SQL Execution Sequence

When setting up a clean database or running a migration from scratch, execute the project SQL scripts in the **exact numerical sequence**:

```bash
# Set connection variables
export DB_HOST="localhost"
export DB_PORT="3306"
export DB_USER="root"
export DB_NAME="hostel_management"
export MYSQL_PWD="your_secure_password"

# Step 0: Create database if it does not already exist
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -e "
  CREATE DATABASE IF NOT EXISTS \`$DB_NAME\`
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;
"

# Step 1: Foundation — Users, Password Reset, Audit Logs
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" < sql/01_foundation_auth.sql

# Step 2: Core Domain — Students, Rooms, Allocations, Fees, Payments
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" < sql/02_students_rooms_fees.sql

# Step 3: Workflows — Complaints, History, Visitors, Leave Requests, Notifications
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" < sql/03_complaints_visitors_leave.sql

# Step 4: Hardening — Composite Performance Indexes (Idempotent)
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" < sql/04_final_hardening.sql
```

On Windows PowerShell:
```powershell
$env:DB_HOST="localhost"
$env:DB_PORT="3306"
$env:DB_USER="root"
$env:DB_NAME="hostel_management"
$env:MYSQL_PWD="your_secure_password"

# Execute schema in sequence
Get-Content sql/01_foundation_auth.sql | mysql -h $env:DB_HOST -P $env:DB_PORT -u $env:DB_USER $env:DB_NAME
Get-Content sql/02_students_rooms_fees.sql | mysql -h $env:DB_HOST -P $env:DB_PORT -u $env:DB_USER $env:DB_NAME
Get-Content sql/03_complaints_visitors_leave.sql | mysql -h $env:DB_HOST -P $env:DB_PORT -u $env:DB_USER $env:DB_NAME
Get-Content sql/04_final_hardening.sql | mysql -h $env:DB_HOST -P $env:DB_PORT -u $env:DB_USER $env:DB_NAME
```

---

## 4. Creating a Backup with `mysqldump`

### Core Principles
- **Zero-Downtime Hot Backups**: Uses `--single-transaction` so backups take an ACID-consistent snapshot without locking tables or disrupting active hostel operations.
- **Routines and Triggers**: Captures stored procedures and triggers with `--routines --triggers`.
- **Character Encoding**: Enforces `--default-character-set=utf8mb4`.

### Manual Backup Command

```bash
mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --set-gtid-purged=OFF \
  --default-character-set=utf8mb4 \
  --result-file="./backups/hostel_management_$(date +%Y%m%d_%H%M%S).sql" \
  "$DB_NAME"
```

### Pre-Configured Automation Scripts

The project includes pre-configured helper scripts in `scripts/`:

- **Windows PowerShell**:
  ```powershell
  .\scripts\backup.ps1 -OutputDir "./backups"
  ```
- **Linux/macOS Bash**:
  ```bash
  chmod +x ./scripts/backup.sh
  ./scripts/backup.sh ./backups
  ```

---

## 5. Precautions Before Restoring

> [!CAUTION]
> Restoring a database replaces or modifies existing tables and data. Follow these precautions before executing any restore operation:

1. **Stop Incoming Traffic**: Temporarily stop or suspend backend instances (`systemctl stop hostel-server` or PM2 pause) so no active user transactions (such as fee payments or leave approvals) conflict during data loading.
2. **Take a Pre-Restore Snapshot**: Always run a fresh `mysqldump` of the current state before restoring an older backup. Even if current data is corrupted, preserving the timestamped pre-restore state allows forensic rollback if needed.
3. **Confirm Target Database**: Verify that `$DB_NAME` refers to the intended database and NOT a production database on another server.
4. **Inspect SQL Backup File**:
   - Ensure file size is non-zero (`ls -lh backup.sql`).
   - Check that the file ends with a valid MySQL dump completion marker:
     ```bash
     tail -n 5 backup.sql
     # Must include: -- Dump completed on YYYY-MM-DD HH:MM:SS
     ```
5. **Dry-Run in Staging**: Whenever possible, restore to a staging database first (`hostel_staging`) and verify integrity before applying to production.

---

## 6. Restoration Procedure

### Step 1: Ensure Target Database Exists
```sql
CREATE DATABASE IF NOT EXISTS `hostel_management`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

### Step 2: Execute Restore
Run the restore command with credentials passed via environment:

```bash
# Linux / macOS
mysql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  "$DB_NAME" < ./backups/hostel_management_backup_YYYYMMDD_HHMMSS.sql
```

```powershell
# Windows PowerShell
Get-Content ./backups/hostel_management_backup_YYYYMMDD_HHMMSS.sql | mysql --host=$env:DB_HOST --port=$env:DB_PORT --user=$env:DB_USER $env:DB_NAME
```

---

## 7. Post-Restoration Verification

After restoring, run the following verification queries to confirm database integrity:

```sql
USE `hostel_management`;

-- 1. Check all 13 tables exist
SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'hostel_management'
ORDER BY TABLE_NAME;

-- 2. Verify row counts on critical tables
SELECT 'users' AS entity, COUNT(*) AS count FROM users
UNION ALL
SELECT 'students', COUNT(*) FROM students
UNION ALL
SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL
SELECT 'room_allocations (active)', COUNT(*) FROM room_allocations WHERE vacated_at IS NULL
UNION ALL
SELECT 'fees', COUNT(*) FROM fees
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'complaints', COUNT(*) FROM complaints
UNION ALL
SELECT 'leave_requests', COUNT(*) FROM leave_requests
UNION ALL
SELECT 'visitor_logs', COUNT(*) FROM visitor_logs
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs;

-- 3. Verify foreign key integrity & orphans
SELECT ra.id AS orphan_allocation_id
FROM room_allocations ra
LEFT JOIN students s ON ra.student_id = s.id
WHERE s.id IS NULL;

-- 4. Check backend health endpoint
-- Run HTTP GET /api/health to confirm active pool connectivity
```

---

## 8. Backup Retention Schedule

| Backup Tier | Frequency | Retention Period | Storage Location |
| :--- | :--- | :--- | :--- |
| **Hot Snapshot** | Every 6 hours | 7 Days | Local disk (`/backups`) |
| **Daily Full** | Daily (02:00 UTC) | 30 Days | Encrypted Cloud Bucket (S3/GCS) |
| **Monthly Archive** | 1st of month | 1 Year | Cloud Cold Storage (Glacier / Archive) |
| **Pre-Migration** | Before schema update | Indefinite | Deployment Artifacts |
