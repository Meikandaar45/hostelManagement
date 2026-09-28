-- =============================================================
-- Hostel Management System
-- Phase 4 Database — Final Hardening & Performance Indexes
-- MySQL 8+
-- Execute manually against the hostel_management database.
-- DO NOT run automatically from the application.
--
-- Steps:
--   1. USE hostel_management;
--   2. SOURCE sql/04_final_hardening.sql;
-- =============================================================

USE `hostel_management`;
SET NAMES utf8mb4;

-- =============================================================
-- IDEMPOTENT INDEX HELPER PROCEDURE
-- Safely creates an index only if it does not already exist.
-- =============================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS `AddIndexIfNotExists`$$
CREATE PROCEDURE `AddIndexIfNotExists`(
    IN target_table VARCHAR(64),
    IN target_index VARCHAR(64),
    IN index_definition VARCHAR(255)
)
BEGIN
    DECLARE index_count INT DEFAULT 0;

    SELECT COUNT(*) INTO index_count
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = target_table
      AND index_name = target_index;

    IF index_count = 0 THEN
        SET @sql_stmt = CONCAT('CREATE INDEX `', target_index, '` ON `', target_table, '` ', index_definition);
        PREPARE stmt FROM @sql_stmt;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('Created index ', target_index, ' on ', target_table) AS status;
    ELSE
        SELECT CONCAT('Index ', target_index, ' already exists on ', target_table) AS status;
    END IF;
END$$

DELIMITER ;

-- =============================================================
-- 1. ROOM ALLOCATIONS INDEXES
-- Accelerates active allocation lookup and student history queries
-- =============================================================
CALL AddIndexIfNotExists('room_allocations', 'idx_allocations_student_vacated', '(`student_id`, `vacated_at`)');
CALL AddIndexIfNotExists('room_allocations', 'idx_allocations_room_vacated', '(`room_id`, `vacated_at`)');

-- =============================================================
-- 2. FEES & PAYMENTS INDEXES
-- Accelerates pending fee balance and due date queries, payment history
-- =============================================================
CALL AddIndexIfNotExists('fees', 'idx_fees_student_due_date', '(`student_id`, `due_date`)');
CALL AddIndexIfNotExists('payments', 'idx_payments_fee_paid_at', '(`fee_id`, `paid_at`)');

-- =============================================================
-- 3. COMPLAINTS INDEXES
-- Accelerates student complaint listing and maintenance staff filtering
-- =============================================================
CALL AddIndexIfNotExists('complaints', 'idx_complaints_student_status', '(`student_id`, `status`)');
CALL AddIndexIfNotExists('complaints', 'idx_complaints_assigned_status', '(`assigned_to`, `status`)');

-- =============================================================
-- 4. VISITOR LOGS INDEXES
-- Accelerates active visitor queries and student visitor tracking
-- =============================================================
CALL AddIndexIfNotExists('visitor_logs', 'idx_vl_student_entry', '(`student_id`, `entry_at`)');

-- =============================================================
-- 5. LEAVE REQUESTS INDEXES
-- Accelerates student leave status filtering and warden review lists
-- =============================================================
CALL AddIndexIfNotExists('leave_requests', 'idx_lr_student_status', '(`student_id`, `status`)');

-- =============================================================
-- 6. NOTIFICATIONS INDEXES
-- Optimizes unread notification badge count and user notification feed
-- =============================================================
CALL AddIndexIfNotExists('notifications', 'idx_notif_user_read_created', '(`user_id`, `is_read`, `created_at`)');

-- =============================================================
-- 7. AUDIT LOGS INDEXES
-- Optimizes audit log filtering by actor and date range
-- =============================================================
CALL AddIndexIfNotExists('audit_logs', 'idx_al_actor_created', '(`actor_user_id`, `created_at`)');

-- Clean up helper procedure
DROP PROCEDURE IF EXISTS `AddIndexIfNotExists`;

-- =============================================================
-- VERIFY INDEXES
-- =============================================================
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name IN (
    'room_allocations',
    'fees',
    'payments',
    'complaints',
    'visitor_logs',
    'leave_requests',
    'notifications',
    'audit_logs'
  )
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
