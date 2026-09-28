-- =============================================================
-- Hostel Management System
-- Phase 2 Database
-- Students / Rooms / Allocations / Fees / Payments
-- MySQL 8+
-- Execute manually
-- DO NOT run automatically
-- =============================================================

USE `hostel_management`;
SET NAMES utf8mb4;

-- =============================================================
-- 1. STUDENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS `students` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `student_id` VARCHAR(50) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
    `contact_number` VARCHAR(20) NOT NULL,
    `address` TEXT NOT NULL,
    `department` VARCHAR(100) NOT NULL,
    `admission_date` DATE NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_students_student_id` (`student_id`),
    UNIQUE KEY `uq_students_user_id` (`user_id`),
    KEY `idx_students_department` (`department`),
    KEY `idx_students_is_active` (`is_active`),

    CONSTRAINT `fk_students_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Student profiles linked to user accounts';

-- =============================================================
-- 2. ROOMS
-- =============================================================
CREATE TABLE IF NOT EXISTS `rooms` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `room_number` VARCHAR(20) NOT NULL,
    `block` VARCHAR(50) NOT NULL,
    `floor` INT NOT NULL,
    `room_type` ENUM('SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY') NOT NULL,
    `capacity` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_rooms_room_number` (`room_number`),
    KEY `idx_rooms_block_floor` (`block`, `floor`),
    KEY `idx_rooms_type` (`room_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Hostel rooms and capacities';

-- =============================================================
-- 3. ROOM ALLOCATIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS `room_allocations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `student_id` BIGINT UNSIGNED NOT NULL,
    `room_id` BIGINT UNSIGNED NOT NULL,
    `allocated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `vacated_at` DATETIME NULL DEFAULT NULL,
    `allocated_by` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_allocations_student` (`student_id`),
    KEY `idx_allocations_room` (`room_id`),
    KEY `idx_allocations_vacated` (`vacated_at`),

    CONSTRAINT `fk_allocations_student`
        FOREIGN KEY (`student_id`)
        REFERENCES `students` (`id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_allocations_room`
        FOREIGN KEY (`room_id`)
        REFERENCES `rooms` (`id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
        
    CONSTRAINT `fk_allocations_allocated_by`
        FOREIGN KEY (`allocated_by`)
        REFERENCES `users` (`id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Records of room assignments. Active if vacated_at is NULL.';

-- =============================================================
-- 4. FEES
-- =============================================================
CREATE TABLE IF NOT EXISTS `fees` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `student_id` BIGINT UNSIGNED NOT NULL,
    `fee_type` VARCHAR(100) NOT NULL,
    `academic_period` VARCHAR(50) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `due_date` DATE NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_fees_student_type_period` (`student_id`, `fee_type`, `academic_period`),
    KEY `idx_fees_due_date` (`due_date`),

    CONSTRAINT `fk_fees_student`
        FOREIGN KEY (`student_id`)
        REFERENCES `students` (`id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Assigned fees for students';

-- =============================================================
-- 5. PAYMENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS `payments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `fee_id` BIGINT UNSIGNED NOT NULL,
    `receipt_number` VARCHAR(50) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'OTHER') NOT NULL,
    `transaction_reference` VARCHAR(255) NULL DEFAULT NULL,
    `paid_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `recorded_by` BIGINT UNSIGNED NOT NULL,
    `notes` TEXT NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_payments_receipt_number` (`receipt_number`),
    KEY `idx_payments_fee` (`fee_id`),
    KEY `idx_payments_method` (`payment_method`),

    CONSTRAINT `fk_payments_fee`
        FOREIGN KEY (`fee_id`)
        REFERENCES `fees` (`id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
        
    CONSTRAINT `fk_payments_recorded_by`
        FOREIGN KEY (`recorded_by`)
        REFERENCES `users` (`id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Recorded payments linked to specific fees';

-- =============================================================
-- VERIFY TABLES
-- =============================================================
SHOW TABLES;
