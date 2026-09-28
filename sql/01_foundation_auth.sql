-- =============================================================
-- Hostel Management System
-- Phase 1 Database — Authentication / Users / Audit
-- MySQL 8+
-- Execute manually against the hostel_management database.
-- DO NOT run automatically from the application.
--
-- Steps:
--   1. CREATE DATABASE hostel_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--   2. USE hostel_management;
--   3. SOURCE sql/01_foundation_auth.sql;
-- =============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================
-- TABLE: users
-- Core user accounts for all roles in the system.
-- =============================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`              BIGINT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `username`        VARCHAR(50)         NOT NULL,
  `email`           VARCHAR(255)        NOT NULL,
  `password`        VARCHAR(255)        NOT NULL,
  `full_name`       VARCHAR(150)        NOT NULL,
  `role`            ENUM('ADMIN','WARDEN','STUDENT','MAINTENANCE') NOT NULL,
  `is_active`       TINYINT(1)          NOT NULL DEFAULT 1,
  `created_at`      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login_at`   DATETIME                     DEFAULT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email`    (`email`),
  KEY `idx_users_role`           (`role`),
  KEY `idx_users_is_active`      (`is_active`),
  KEY `idx_users_created_at`     (`created_at`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='System user accounts — passwords are always bcrypt-hashed';

-- =============================================================
-- TABLE: password_reset_tokens
-- Single-use, time-limited password reset tokens.
-- Only the SHA-256 hash of the raw token is stored.
-- =============================================================
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NOT NULL,
  `token_hash`  VARCHAR(255)    NOT NULL,    -- SHA-256(raw_token) stored here
  `expires_at`  DATETIME        NOT NULL,
  `used_at`     DATETIME                 DEFAULT NULL,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY  `uq_prt_token_hash` (`token_hash`),
  KEY `idx_prt_user_id`    (`user_id`),
  KEY `idx_prt_expires_at` (`expires_at`),

  CONSTRAINT `fk_prt_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Password reset tokens — raw token never stored, only SHA-256 hash';

-- =============================================================
-- TABLE: audit_logs
-- Immutable record of important system events.
-- actor_user_id can be NULL for system-level actions (e.g. first setup).
-- =============================================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_user_id` BIGINT UNSIGNED          DEFAULT NULL,   -- NULL = system action
  `action`        VARCHAR(100)    NOT NULL,                -- e.g. USER_CREATED, LOGIN
  `entity_type`   VARCHAR(100)             DEFAULT NULL,   -- e.g. user, password_reset
  `entity_id`     BIGINT UNSIGNED          DEFAULT NULL,   -- ID of affected record
  `details`       JSON                     DEFAULT NULL,   -- safe contextual info
  `ip_address`    VARCHAR(45)              DEFAULT NULL,   -- IPv4 or IPv6
  `user_agent`    VARCHAR(512)             DEFAULT NULL,
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_al_actor`       (`actor_user_id`),
  KEY `idx_al_action`      (`action`),
  KEY `idx_al_entity`      (`entity_type`, `entity_id`),
  KEY `idx_al_created_at`  (`created_at`),

  -- Intentionally NO foreign key on actor_user_id so audit records survive user deletion
  CONSTRAINT `fk_al_actor`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable audit trail — never delete rows from this table';

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
-- End of Phase 1 schema
-- Phase 2 will add: students, rooms, allocations, fees, payments
-- Phase 3 will add: complaints, visitors, leave_requests, gate_passes
-- Phase 4 will add: reports, backup metadata
-- =============================================================
