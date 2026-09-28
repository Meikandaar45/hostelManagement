-- =============================================================
-- Hostel Management System
-- Phase 3 Database
-- Complaints / Maintenance / Visitors / Leave / Notifications
-- MySQL 8+
-- Execute manually
-- DO NOT run automatically
-- =============================================================

USE `hostel_management`;
SET NAMES utf8mb4;

-- =============================================================
-- 1. COMPLAINTS
-- Operational complaints raised by students for their assigned rooms
-- =============================================================
CREATE TABLE IF NOT EXISTS `complaints` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `ticket_id` VARCHAR(50) NOT NULL,
    `student_id` BIGINT UNSIGNED NOT NULL,
    `room_id` BIGINT UNSIGNED NOT NULL,
    `category` ENUM(
        'ELECTRICAL',
        'PLUMBING',
        'CARPENTRY',
        'CLEANING',
        'FURNITURE',
        'WATER',
        'INTERNET',
        'ROOM',
        'OTHER'
    ) NOT NULL,
    `description` TEXT NOT NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'SUBMITTED',
    `assigned_to` BIGINT UNSIGNED NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `resolved_at` DATETIME NULL,
    `closed_at` DATETIME NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_complaints_ticket_id` (`ticket_id`),
    KEY `idx_complaints_student_id` (`student_id`),
    KEY `idx_complaints_room_id` (`room_id`),
    KEY `idx_complaints_status` (`status`),
    KEY `idx_complaints_priority` (`priority`),
    KEY `idx_complaints_assigned_to` (`assigned_to`),
    KEY `idx_complaints_created_at` (`created_at`),

    CONSTRAINT `fk_complaints_student`
        FOREIGN KEY (`student_id`)
        REFERENCES `students` (`id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_complaints_room`
        FOREIGN KEY (`room_id`)
        REFERENCES `rooms` (`id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_complaints_assigned_to`
        FOREIGN KEY (`assigned_to`)
        REFERENCES `users` (`id`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Operational complaints and issues';

-- =============================================================
-- 2. COMPLAINT HISTORY
-- Immutable audit trail of status transitions and work notes
-- =============================================================
CREATE TABLE IF NOT EXISTS `complaint_history` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `complaint_id` BIGINT UNSIGNED NOT NULL,
    `changed_by` BIGINT UNSIGNED NOT NULL,
    `from_status` ENUM('SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NULL,
    `to_status` ENUM('SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL,
    `work_notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_ch_complaint_id` (`complaint_id`),
    KEY `idx_ch_changed_by` (`changed_by`),
    KEY `idx_ch_created_at` (`created_at`),

    CONSTRAINT `fk_ch_complaint`
        FOREIGN KEY (`complaint_id`)
        REFERENCES `complaints` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT `fk_ch_changed_by`
        FOREIGN KEY (`changed_by`)
        REFERENCES `users` (`id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Complaint status transitions and work resolution log';

-- =============================================================
-- 3. VISITOR LOGS
-- Hostel visitor entry and exit tracking
-- =============================================================
CREATE TABLE IF NOT EXISTS `visitor_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `visitor_name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `student_id` BIGINT UNSIGNED NOT NULL,
    `purpose` VARCHAR(255) NOT NULL,
    `entry_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `exit_at` DATETIME NULL,
    `recorded_by` BIGINT UNSIGNED NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_vl_student_id` (`student_id`),
    KEY `idx_vl_entry_at` (`entry_at`),
    KEY `idx_vl_exit_at` (`exit_at`),
    KEY `idx_vl_recorded_by` (`recorded_by`),

    CONSTRAINT `fk_vl_student`
        FOREIGN KEY (`student_id`)
        REFERENCES `students` (`id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_vl_recorded_by`
        FOREIGN KEY (`recorded_by`)
        REFERENCES `users` (`id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Visitor entry and exit records';

-- =============================================================
-- 4. LEAVE REQUESTS
-- Student leave applications, approvals, and digital gate passes
-- =============================================================
CREATE TABLE IF NOT EXISTS `leave_requests` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `student_id` BIGINT UNSIGNED NOT NULL,
    `from_datetime` DATETIME NOT NULL,
    `to_datetime` DATETIME NOT NULL,
    `reason` TEXT NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `review_notes` TEXT NULL,
    `reviewed_by` BIGINT UNSIGNED NULL,
    `reviewed_at` DATETIME NULL,
    `gate_pass_number` VARCHAR(50) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_lr_gate_pass_number` (`gate_pass_number`),
    KEY `idx_lr_student_id` (`student_id`),
    KEY `idx_lr_status` (`status`),
    KEY `idx_lr_dates` (`from_datetime`, `to_datetime`),
    KEY `idx_lr_reviewed_by` (`reviewed_by`),

    CONSTRAINT `fk_lr_student`
        FOREIGN KEY (`student_id`)
        REFERENCES `students` (`id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_lr_reviewed_by`
        FOREIGN KEY (`reviewed_by`)
        REFERENCES `users` (`id`)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Student leave requests and digital gate pass allocations';

-- =============================================================
-- 5. NOTIFICATIONS
-- In-app user notifications for complaints, leave, visitors, and alerts
-- =============================================================
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `reference_type` VARCHAR(50) NULL,
    `reference_id` BIGINT UNSIGNED NULL,
    `is_read` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_notif_user_id` (`user_id`),
    KEY `idx_notif_is_read` (`is_read`),
    KEY `idx_notif_created_at` (`created_at`),

    CONSTRAINT `fk_notif_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='In-app notifications for users';
