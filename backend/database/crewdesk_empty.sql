-- CrewDesk Crew Management System – MySQL / MariaDB schema
-- Generated 2026-11-11T05:57:48.842Z (empty – admin account only)
-- Import into an existing, empty database (e.g. `crewdesk`) via phpMyAdmin → Import.

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `crew`;
CREATE TABLE IF NOT EXISTS `crew` (
  `id` VARCHAR(32) NOT NULL,
  `employee_id` VARCHAR(255) NULL,
  `first_name` VARCHAR(255) NULL,
  `last_name` VARCHAR(255) NULL,
  `dob` DATE NULL,
  `gender` VARCHAR(255) NULL,
  `nationality` VARCHAR(255) NULL,
  `phone` VARCHAR(255) NULL,
  `email` VARCHAR(255) NULL,
  `address` TEXT NULL,
  `passport_no` VARCHAR(255) NULL,
  `passport_expiry` DATE NULL,
  `cdc_no` VARCHAR(255) NULL,
  `cdc_expiry` DATE NULL,
  `indos_no` VARCHAR(255) NULL,
  `emergency_name` VARCHAR(255) NULL,
  `emergency_relation` VARCHAR(255) NULL,
  `emergency_phone` VARCHAR(255) NULL,
  `department` VARCHAR(255) NULL,
  `rank` VARCHAR(255) NULL,
  `total_experience_months` INT NULL,
  `rank_experience_months` INT NULL,
  `previous_employer` VARCHAR(255) NULL,
  `vessel_type_experience` VARCHAR(255) NULL,
  `last_sign_on` DATE NULL,
  `last_sign_off` DATE NULL,
  `available_from` DATE NULL,
  `expected_salary` DECIMAL(12,2) NULL,
  `preferred_vessel_type` VARCHAR(255) NULL,
  `preferred_trading_area` VARCHAR(255) NULL,
  `status` VARCHAR(255) NULL,
  `photo` TEXT NULL,
  `cv_file` VARCHAR(255) NULL,
  `registered_on` DATE NULL,
  `password_hash` VARCHAR(255) NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_crew_email` (`email`),
  KEY `idx_crew_passport_no` (`passport_no`),
  KEY `idx_crew_status` (`status`),
  KEY `idx_crew_rank` (`rank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `sea_service`;
CREATE TABLE IF NOT EXISTS `sea_service` (
  `id` VARCHAR(32) NOT NULL,
  `crew_id` VARCHAR(255) NULL,
  `vessel_name` VARCHAR(255) NULL,
  `vessel_type` VARCHAR(255) NULL,
  `rank` VARCHAR(255) NULL,
  `company` VARCHAR(255) NULL,
  `sign_on` DATE NULL,
  `sign_off` DATE NULL,
  `grt` INT NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sea_service_crew_id` (`crew_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `crew_comments`;
CREATE TABLE IF NOT EXISTS `crew_comments` (
  `id` VARCHAR(32) NOT NULL,
  `crew_id` VARCHAR(255) NULL,
  `author` VARCHAR(255) NULL,
  `date` DATETIME NULL,
  `text` TEXT NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_crew_comments_crew_id` (`crew_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `clients`;
CREATE TABLE IF NOT EXISTS `clients` (
  `id` VARCHAR(32) NOT NULL,
  `name` VARCHAR(255) NULL,
  `country` VARCHAR(255) NULL,
  `contact` VARCHAR(255) NULL,
  `email` VARCHAR(255) NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `vessels`;
CREATE TABLE IF NOT EXISTS `vessels` (
  `id` VARCHAR(32) NOT NULL,
  `name` VARCHAR(255) NULL,
  `imo` VARCHAR(255) NULL,
  `type` VARCHAR(255) NULL,
  `flag` VARCHAR(255) NULL,
  `owner` VARCHAR(255) NULL,
  `manager` VARCHAR(255) NULL,
  `client_id` VARCHAR(255) NULL,
  `grt` INT NULL,
  `dwt` INT NULL,
  `built` VARCHAR(255) NULL,
  `trading_area` VARCHAR(255) NULL,
  `status` VARCHAR(255) NULL,
  `manning` LONGTEXT NULL,
  `documents` LONGTEXT NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vessels_imo` (`imo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `crew_documents`;
CREATE TABLE IF NOT EXISTS `crew_documents` (
  `id` VARCHAR(32) NOT NULL,
  `crew_id` VARCHAR(255) NULL,
  `type` VARCHAR(255) NULL,
  `number` VARCHAR(255) NULL,
  `issue_date` DATE NULL,
  `expiry_date` DATE NULL,
  `issuing_authority` VARCHAR(255) NULL,
  `status` VARCHAR(255) NULL,
  `remarks` TEXT NULL,
  `version` INT NULL,
  `file_name` VARCHAR(255) NULL,
  `file_url` TEXT NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_crew_documents_crew_id` (`crew_id`),
  KEY `idx_crew_documents_expiry_date` (`expiry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `vacancies`;
CREATE TABLE IF NOT EXISTS `vacancies` (
  `id` VARCHAR(32) NOT NULL,
  `title` VARCHAR(255) NULL,
  `client_id` VARCHAR(255) NULL,
  `vessel_id` VARCHAR(255) NULL,
  `rank` VARCHAR(255) NULL,
  `department` VARCHAR(255) NULL,
  `number_required` INT NULL,
  `min_experience_months` INT NULL,
  `mandatory_certificates` TEXT NULL,
  `salary` DECIMAL(12,2) NULL,
  `currency` VARCHAR(255) NULL,
  `contract_months` INT NULL,
  `joining_date` DATE NULL,
  `joining_port` VARCHAR(255) NULL,
  `deadline` DATE NULL,
  `status` VARCHAR(255) NULL,
  `description` TEXT NULL,
  `posted_on` DATE NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `applications`;
CREATE TABLE IF NOT EXISTS `applications` (
  `id` VARCHAR(32) NOT NULL,
  `vacancy_id` VARCHAR(255) NULL,
  `crew_id` VARCHAR(255) NULL,
  `applied_on` DATE NULL,
  `stage` VARCHAR(255) NULL,
  `source` VARCHAR(255) NULL,
  `screening_result` VARCHAR(255) NULL,
  `interview_date` DATETIME NULL,
  `interviewer` VARCHAR(255) NULL,
  `assessment_score` INT NULL,
  `internal_approval` VARCHAR(255) NULL,
  `client_approval` VARCHAR(255) NULL,
  `offer_sent` TINYINT(1) NULL,
  `status` VARCHAR(255) NULL,
  `remarks` TEXT NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_applications_crew_id` (`crew_id`),
  KEY `idx_applications_vacancy_id` (`vacancy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `assignments`;
CREATE TABLE IF NOT EXISTS `assignments` (
  `id` VARCHAR(32) NOT NULL,
  `crew_id` VARCHAR(255) NULL,
  `vessel_id` VARCHAR(255) NULL,
  `rank` VARCHAR(255) NULL,
  `sign_on_date` DATE NULL,
  `planned_sign_off` DATE NULL,
  `actual_sign_off` DATE NULL,
  `joining_port` VARCHAR(255) NULL,
  `relieving_id` VARCHAR(255) NULL,
  `status` VARCHAR(255) NULL,
  `approval` VARCHAR(255) NULL,
  `remarks` TEXT NULL,
  `from_application` VARCHAR(255) NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_assignments_crew_id` (`crew_id`),
  KEY `idx_assignments_vessel_id` (`vessel_id`),
  KEY `idx_assignments_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `contracts`;
CREATE TABLE IF NOT EXISTS `contracts` (
  `id` VARCHAR(32) NOT NULL,
  `crew_id` VARCHAR(255) NULL,
  `vessel_id` VARCHAR(255) NULL,
  `rank` VARCHAR(255) NULL,
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `duration_months` INT NULL,
  `basic_wage` DECIMAL(12,2) NULL,
  `fixed_ot` DECIMAL(12,2) NULL,
  `leave_pay` DECIMAL(12,2) NULL,
  `other_allowance` DECIMAL(12,2) NULL,
  `currency` VARCHAR(255) NULL,
  `cba` VARCHAR(255) NULL,
  `terms` TEXT NULL,
  `status` VARCHAR(255) NULL,
  `approval` VARCHAR(255) NULL,
  `signed` TINYINT(1) NULL,
  `signed_at` DATETIME NULL,
  `version` INT NULL,
  `history` LONGTEXT NULL,
  `renewed_from` VARCHAR(255) NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_contracts_crew_id` (`crew_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `medicals`;
CREATE TABLE IF NOT EXISTS `medicals` (
  `id` VARCHAR(32) NOT NULL,
  `crew_id` VARCHAR(255) NULL,
  `exam_date` DATE NULL,
  `expiry_date` DATE NULL,
  `centre` VARCHAR(255) NULL,
  `doctor` VARCHAR(255) NULL,
  `status` VARCHAR(255) NULL,
  `restrictions` TEXT NULL,
  `remarks` TEXT NULL,
  `file_name` VARCHAR(255) NULL,
  `file_url` TEXT NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_medicals_crew_id` (`crew_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `travel`;
CREATE TABLE IF NOT EXISTS `travel` (
  `id` VARCHAR(32) NOT NULL,
  `crew_id` VARCHAR(255) NULL,
  `vessel_id` VARCHAR(255) NULL,
  `purpose` VARCHAR(255) NULL,
  `from_city` VARCHAR(255) NULL,
  `to_city` VARCHAR(255) NULL,
  `departure` DATETIME NULL,
  `arrival` DATETIME NULL,
  `airline` VARCHAR(255) NULL,
  `flight_no` VARCHAR(255) NULL,
  `pnr` VARCHAR(255) NULL,
  `visa_status` VARCHAR(255) NULL,
  `hotel` VARCHAR(255) NULL,
  `pickup` VARCHAR(255) NULL,
  `agent` VARCHAR(255) NULL,
  `expenses` DECIMAL(12,2) NULL,
  `currency` VARCHAR(255) NULL,
  `status` VARCHAR(255) NULL,
  `joining_confirmed` TINYINT(1) NULL,
  `instructions` TEXT NULL,
  `ticket_file` VARCHAR(255) NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_travel_crew_id` (`crew_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `sign_ons`;
CREATE TABLE IF NOT EXISTS `sign_ons` (
  `id` VARCHAR(32) NOT NULL,
  `crew_id` VARCHAR(255) NULL,
  `vessel_id` VARCHAR(255) NULL,
  `rank` VARCHAR(255) NULL,
  `joining_date` DATE NULL,
  `port` VARCHAR(255) NULL,
  `joining_confirmed` TINYINT(1) NULL,
  `master_confirmed` TINYINT(1) NULL,
  `contract_commenced` TINYINT(1) NULL,
  `documents_received` TINYINT(1) NULL,
  `file_name` VARCHAR(255) NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sign_ons_crew_id` (`crew_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `sign_offs`;
CREATE TABLE IF NOT EXISTS `sign_offs` (
  `id` VARCHAR(32) NOT NULL,
  `crew_id` VARCHAR(255) NULL,
  `vessel_id` VARCHAR(255) NULL,
  `rank` VARCHAR(255) NULL,
  `sign_off_date` DATE NULL,
  `port` VARCHAR(255) NULL,
  `reason` VARCHAR(255) NULL,
  `master_appraisal` VARCHAR(255) NULL,
  `settlement_status` VARCHAR(255) NULL,
  `next_eligibility` VARCHAR(255) NULL,
  `remarks` TEXT NULL,
  `settled_on` DATE NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sign_offs_crew_id` (`crew_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `appraisals`;
CREATE TABLE IF NOT EXISTS `appraisals` (
  `id` VARCHAR(32) NOT NULL,
  `crew_id` VARCHAR(255) NULL,
  `vessel_id` VARCHAR(255) NULL,
  `rank` VARCHAR(255) NULL,
  `period_from` DATE NULL,
  `period_to` DATE NULL,
  `evaluator` VARCHAR(255) NULL,
  `technical` INT NULL,
  `safety` INT NULL,
  `behaviour` INT NULL,
  `teamwork` INT NULL,
  `overall` DECIMAL(12,2) NULL,
  `rehire` VARCHAR(255) NULL,
  `training_recommendation` TEXT NULL,
  `comments` TEXT NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_appraisals_crew_id` (`crew_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `payroll`;
CREATE TABLE IF NOT EXISTS `payroll` (
  `id` VARCHAR(32) NOT NULL,
  `crew_id` VARCHAR(255) NULL,
  `vessel_id` VARCHAR(255) NULL,
  `period` VARCHAR(255) NULL,
  `basic` DECIMAL(12,2) NULL,
  `fixed_ot` DECIMAL(12,2) NULL,
  `extra_ot` DECIMAL(12,2) NULL,
  `leave_wages` DECIMAL(12,2) NULL,
  `allowances` DECIMAL(12,2) NULL,
  `advance` DECIMAL(12,2) NULL,
  `deductions` DECIMAL(12,2) NULL,
  `gross` DECIMAL(12,2) NULL,
  `net` DECIMAL(12,2) NULL,
  `allotment` DECIMAL(12,2) NULL,
  `currency` VARCHAR(255) NULL,
  `status` VARCHAR(255) NULL,
  `bank` VARCHAR(255) NULL,
  `paid_on` DATE NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payroll_crew_id` (`crew_id`),
  KEY `idx_payroll_period` (`period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `salary_structures`;
CREATE TABLE IF NOT EXISTS `salary_structures` (
  `id` VARCHAR(32) NOT NULL,
  `rank` VARCHAR(255) NULL,
  `basic` DECIMAL(12,2) NULL,
  `fixed_ot` DECIMAL(12,2) NULL,
  `leave_pay` DECIMAL(12,2) NULL,
  `other_allowance` DECIMAL(12,2) NULL,
  `ot_rate` DECIMAL(12,2) NULL,
  `currency` VARCHAR(255) NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `courses`;
CREATE TABLE IF NOT EXISTS `courses` (
  `id` VARCHAR(32) NOT NULL,
  `code` VARCHAR(255) NULL,
  `name` VARCHAR(255) NULL,
  `mandatory_for` VARCHAR(255) NULL,
  `validity_months` INT NULL,
  `duration_days` INT NULL,
  `institute` VARCHAR(255) NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `training_records`;
CREATE TABLE IF NOT EXISTS `training_records` (
  `id` VARCHAR(32) NOT NULL,
  `crew_id` VARCHAR(255) NULL,
  `course_id` VARCHAR(255) NULL,
  `institute` VARCHAR(255) NULL,
  `completed_on` DATE NULL,
  `expiry_date` DATE NULL,
  `certificate_no` VARCHAR(255) NULL,
  `status` VARCHAR(255) NULL,
  `file_name` VARCHAR(255) NULL,
  `file_url` TEXT NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_training_records_crew_id` (`crew_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(32) NOT NULL,
  `type` VARCHAR(255) NULL,
  `title` VARCHAR(255) NULL,
  `body` TEXT NULL,
  `channel` VARCHAR(255) NULL,
  `audience` VARCHAR(255) NULL,
  `crew_id` VARCHAR(255) NULL,
  `date` DATE NULL,
  `read` TINYINT(1) NULL,
  `status` VARCHAR(255) NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_crew_id` (`crew_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `crew_requests`;
CREATE TABLE IF NOT EXISTS `crew_requests` (
  `id` VARCHAR(32) NOT NULL,
  `crew_id` VARCHAR(255) NULL,
  `subject` VARCHAR(255) NULL,
  `message` TEXT NULL,
  `date` DATE NULL,
  `status` VARCHAR(255) NULL,
  `response` TEXT NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_crew_requests_crew_id` (`crew_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(32) NOT NULL,
  `name` VARCHAR(255) NULL,
  `email` VARCHAR(255) NULL,
  `role` VARCHAR(255) NULL,
  `status` VARCHAR(255) NULL,
  `mfa` TINYINT(1) NULL,
  `scope` VARCHAR(255) NULL,
  `last_login` DATE NULL,
  `password_hash` VARCHAR(255) NULL,
  `mfa_secret` VARCHAR(255) NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `audit_log`;
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` VARCHAR(32) NOT NULL,
  `at` DATETIME NULL,
  `user` VARCHAR(255) NULL,
  `action` VARCHAR(255) NULL,
  `resource` VARCHAR(255) NULL,
  `record_id` VARCHAR(255) NULL,
  `detail` TEXT NULL,
  `extra` LONGTEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_log_at` (`at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `app_config`;
CREATE TABLE IF NOT EXISTS `app_config` (
  `config_key` VARCHAR(64) NOT NULL,
  `value` LONGTEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `app_config` (`config_key`, `value`) VALUES ('permissions', '{\"Super Admin\":{\"dashboard\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"crew\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"recruitment\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"vessels\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"planning\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"documents\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"contracts\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"medical\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"travel\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"signonoff\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"appraisals\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"payroll\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"training\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"notifications\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"reports\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"users\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"audit\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"settings\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"]},\"HR Manager\":{\"dashboard\":[\"view\"],\"crew\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"recruitment\":[\"view\",\"create\",\"edit\",\"export\"],\"vessels\":[\"view\"],\"planning\":[\"view\"],\"documents\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"contracts\":[\"view\",\"create\",\"edit\",\"export\"],\"medical\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"travel\":[\"view\"],\"signonoff\":[\"view\"],\"appraisals\":[\"view\",\"create\",\"edit\",\"export\"],\"payroll\":[\"view\"],\"training\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"notifications\":[\"view\",\"create\",\"edit\"],\"reports\":[\"view\",\"export\"],\"users\":[],\"audit\":[\"view\"],\"settings\":[]},\"Crewing Manager\":{\"dashboard\":[\"view\"],\"crew\":[\"view\",\"create\",\"edit\",\"export\"],\"recruitment\":[\"view\",\"create\",\"edit\",\"export\"],\"vessels\":[\"view\",\"create\",\"edit\",\"export\"],\"planning\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"documents\":[\"view\",\"create\",\"edit\"],\"contracts\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"medical\":[\"view\"],\"travel\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"signonoff\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"appraisals\":[\"view\"],\"payroll\":[\"view\"],\"training\":[\"view\"],\"notifications\":[\"view\",\"create\",\"edit\"],\"reports\":[\"view\",\"export\"],\"users\":[],\"audit\":[],\"settings\":[]},\"Recruitment Manager\":{\"dashboard\":[\"view\"],\"crew\":[\"view\",\"create\",\"edit\",\"export\"],\"recruitment\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"vessels\":[\"view\"],\"planning\":[],\"documents\":[\"view\"],\"contracts\":[\"view\"],\"medical\":[],\"travel\":[],\"signonoff\":[],\"appraisals\":[],\"payroll\":[],\"training\":[],\"notifications\":[\"view\",\"create\",\"edit\"],\"reports\":[\"view\",\"export\"],\"users\":[],\"audit\":[],\"settings\":[]},\"Recruitment Executive\":{\"dashboard\":[\"view\"],\"crew\":[\"view\",\"create\",\"edit\"],\"recruitment\":[\"view\",\"create\",\"edit\"],\"vessels\":[\"view\"],\"planning\":[],\"documents\":[\"view\"],\"contracts\":[],\"medical\":[],\"travel\":[],\"signonoff\":[],\"appraisals\":[],\"payroll\":[],\"training\":[],\"notifications\":[\"view\"],\"reports\":[],\"users\":[],\"audit\":[],\"settings\":[]},\"Documentation Executive\":{\"dashboard\":[\"view\"],\"crew\":[\"view\"],\"recruitment\":[],\"vessels\":[],\"planning\":[],\"documents\":[\"view\",\"create\",\"edit\",\"approve\",\"export\"],\"contracts\":[],\"medical\":[\"view\",\"create\",\"edit\"],\"travel\":[],\"signonoff\":[],\"appraisals\":[],\"payroll\":[],\"training\":[\"view\",\"create\",\"edit\"],\"notifications\":[\"view\"],\"reports\":[\"view\",\"export\"],\"users\":[],\"audit\":[],\"settings\":[]},\"Operations Manager\":{\"dashboard\":[\"view\"],\"crew\":[\"view\"],\"recruitment\":[],\"vessels\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"planning\":[\"view\",\"edit\",\"approve\"],\"documents\":[\"view\"],\"contracts\":[],\"medical\":[],\"travel\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"signonoff\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"appraisals\":[],\"payroll\":[],\"training\":[],\"notifications\":[\"view\",\"create\",\"edit\"],\"reports\":[\"view\",\"export\"],\"users\":[],\"audit\":[],\"settings\":[]},\"Accounts Manager\":{\"dashboard\":[\"view\"],\"crew\":[\"view\"],\"recruitment\":[],\"vessels\":[],\"planning\":[],\"documents\":[],\"contracts\":[\"view\"],\"medical\":[],\"travel\":[\"view\"],\"signonoff\":[\"view\"],\"appraisals\":[],\"payroll\":[\"view\",\"create\",\"edit\",\"delete\",\"approve\",\"export\"],\"training\":[],\"notifications\":[],\"reports\":[\"view\",\"export\"],\"users\":[],\"audit\":[],\"settings\":[]},\"Vessel Master\":{\"dashboard\":[\"view\"],\"crew\":[\"view\"],\"recruitment\":[],\"vessels\":[\"view\"],\"planning\":[],\"documents\":[\"view\"],\"contracts\":[],\"medical\":[],\"travel\":[],\"signonoff\":[\"view\",\"edit\",\"approve\"],\"appraisals\":[\"view\",\"create\",\"edit\"],\"payroll\":[],\"training\":[\"view\"],\"notifications\":[],\"reports\":[],\"users\":[],\"audit\":[],\"settings\":[]},\"Client Representative\":{\"dashboard\":[\"view\"],\"crew\":[\"view\"],\"recruitment\":[\"view\",\"approve\"],\"vessels\":[\"view\"],\"planning\":[],\"documents\":[],\"contracts\":[],\"medical\":[],\"travel\":[],\"signonoff\":[],\"appraisals\":[],\"payroll\":[],\"training\":[],\"notifications\":[],\"reports\":[],\"users\":[],\"audit\":[],\"settings\":[]},\"Crew Member\":{\"dashboard\":[],\"crew\":[],\"recruitment\":[],\"vessels\":[],\"planning\":[],\"documents\":[],\"contracts\":[],\"medical\":[],\"travel\":[],\"signonoff\":[],\"appraisals\":[],\"payroll\":[],\"training\":[],\"notifications\":[],\"reports\":[],\"users\":[],\"audit\":[],\"settings\":[]}}'), ('settings', '{\"companyName\":\"CrewDesk Ship Management\",\"sessionTimeoutMinutes\":30,\"enforceMfa\":false,\"passwordMinLength\":10,\"passwordRequireSymbols\":true,\"passwordExpiryDays\":90,\"expiryAlertDays\":[90,60,30],\"documentRetentionYears\":7,\"defaultCurrency\":\"USD\",\"emailEnabled\":true,\"smsEnabled\":true,\"whatsappEnabled\":false}');

INSERT INTO `users` (`id`, `name`, `email`, `role`, `status`, `mfa`, `scope`, `password_hash`, `extra`, `created_at`) VALUES
('USR-0001', 'Admin User', 'admin@crewdesk.com', 'Super Admin', 'Active', 0, 'All records', '$2b$10$Le5YsP9TRBcdJii5bD1ug.nlTXhOIYUm20AA1Tcr0I93BgFYCu0Mm', NULL, '2024-01-01 00:00:00');

SET FOREIGN_KEY_CHECKS = 1;
