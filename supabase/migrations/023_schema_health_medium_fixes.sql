-- =============================================================================
-- Migration: Schema Health MEDIUM Priority Fixes
-- File: 023_schema_health_medium_fixes.sql
-- Created: 2025-12-30
-- =============================================================================
--
-- This migration addresses MEDIUM priority database schema issues
-- identified in the comprehensive architecture review.
--
-- MEDIUM Priority Fixes:
-- 1. Duplicate Unique Constraints (skills table) - Remove redundant index
-- 2. Missing Check Constraints:
--    - users.email - Email format validation
--    - sessions.expires_at - Ensure expires_at > created_at
--    - work_experience.employment_type - Enum validation
-- 3. job_duplicates Column Documentation - detection_date redundancy
--
-- =============================================================================

-- =============================================================================
-- PART 1: REMOVE DUPLICATE UNIQUE CONSTRAINTS (skills table)
-- =============================================================================
-- The skills table has two identical unique constraints:
--   - unique_user_skill (user_id, name) - the constraint
--   - unique_user_skill_name (user_id, name) - redundant index
--
-- We keep unique_user_skill and remove unique_user_skill_name to reduce
-- storage overhead and maintenance cost.

-- 1.1 Drop the redundant unique constraint (unique_user_skill_name)
DO $$
BEGIN
  -- First check if both exist
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'skills'
    AND indexname = 'unique_user_skill_name'
  ) AND EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'skills'
    AND indexname = 'unique_user_skill'
  ) THEN
    -- Drop the constraint (which also drops the index)
    ALTER TABLE public.skills DROP CONSTRAINT IF EXISTS unique_user_skill_name;
    RAISE NOTICE 'Dropped duplicate constraint: unique_user_skill_name';
  ELSE
    RAISE NOTICE 'Constraint unique_user_skill_name does not exist or unique_user_skill is missing';
  END IF;
END $$;

-- Verify the remaining constraint
COMMENT ON INDEX public.unique_user_skill IS
  'Ensures each user can only have one skill with the same name. Primary constraint for skill uniqueness.';


-- =============================================================================
-- PART 2: ADD CHECK CONSTRAINTS
-- =============================================================================

-- 2.1 users.email - Email format validation
-- Using a permissive regex that validates basic email structure:
-- - Contains @ symbol
-- - Has at least one character before @
-- - Has at least one character after @ before the dot
-- - Has a domain extension of at least 2 characters
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_users_email_format'
    AND conrelid = 'public.users'::regclass
  ) THEN
    -- Validate existing data first
    IF EXISTS (
      SELECT 1 FROM public.users
      WHERE email IS NOT NULL
      AND email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'
    ) THEN
      RAISE WARNING 'Some existing email values do not match format validation. Constraint not added.';
    ELSE
      -- All existing data is valid, add the constraint
      ALTER TABLE public.users
      ADD CONSTRAINT chk_users_email_format
      CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$');

      RAISE NOTICE 'Added check constraint: chk_users_email_format';
    END IF;
  ELSE
    RAISE NOTICE 'Check constraint chk_users_email_format already exists';
  END IF;
END $$;

COMMENT ON CONSTRAINT chk_users_email_format ON public.users IS
  'Validates basic email format: user@domain.ext (at least 2 char extension)';


-- 2.2 sessions.expires_at - Ensure expires_at > created_at
-- Sessions must expire after they are created
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_sessions_expiry_after_creation'
    AND conrelid = 'public.sessions'::regclass
  ) THEN
    -- Validate existing data first
    IF EXISTS (
      SELECT 1 FROM public.sessions
      WHERE expires_at IS NOT NULL
      AND expires_at <= created_at
    ) THEN
      RAISE WARNING 'Some existing sessions have expires_at <= created_at. Constraint not added.';
    ELSE
      -- All existing data is valid, add the constraint
      ALTER TABLE public.sessions
      ADD CONSTRAINT chk_sessions_expiry_after_creation
      CHECK (expires_at IS NULL OR expires_at > created_at);

      RAISE NOTICE 'Added check constraint: chk_sessions_expiry_after_creation';
    END IF;
  ELSE
    RAISE NOTICE 'Check constraint chk_sessions_expiry_after_creation already exists';
  END IF;
END $$;

COMMENT ON CONSTRAINT chk_sessions_expiry_after_creation ON public.sessions IS
  'Ensures session expiry time is after creation time (or NULL for non-expiring sessions)';


-- 2.3 work_experience.employment_type - Enum validation
-- Valid values based on the column comment:
-- Full-time, Part-time, Contract, Freelance, Internship
-- Also allowing common variations: full_time, part_time, etc.
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_work_experience_employment_type'
    AND conrelid = 'public.work_experience'::regclass
  ) THEN
    -- Validate existing data first (all current values are NULL which is allowed)
    IF EXISTS (
      SELECT 1 FROM public.work_experience
      WHERE employment_type IS NOT NULL
      AND employment_type NOT IN (
        'Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship',
        'full-time', 'part-time', 'contract', 'freelance', 'internship',
        'Full_time', 'Part_time', 'Full Time', 'Part Time'
      )
    ) THEN
      RAISE WARNING 'Some existing employment_type values do not match allowed values. Constraint not added.';
    ELSE
      -- All existing data is valid, add the constraint
      ALTER TABLE public.work_experience
      ADD CONSTRAINT chk_work_experience_employment_type
      CHECK (
        employment_type IS NULL OR
        employment_type IN (
          'Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship',
          'full-time', 'part-time', 'contract', 'freelance', 'internship',
          'Full_time', 'Part_time', 'Full Time', 'Part Time'
        )
      );

      RAISE NOTICE 'Added check constraint: chk_work_experience_employment_type';
    END IF;
  ELSE
    RAISE NOTICE 'Check constraint chk_work_experience_employment_type already exists';
  END IF;
END $$;

COMMENT ON CONSTRAINT chk_work_experience_employment_type ON public.work_experience IS
  'Validates employment type to common values: Full-time, Part-time, Contract, Freelance, Internship (and variations)';


-- =============================================================================
-- PART 3: job_duplicates COLUMN REDUNDANCY DOCUMENTATION
-- =============================================================================
-- The job_duplicates table has both:
--   - detection_date (timestamptz, NOT NULL, default now())
--   - created_at (timestamptz, NOT NULL, default now())
--
-- These serve the same purpose. However, since:
-- 1. The table has no data currently
-- 2. Application code may reference detection_date
-- 3. Both columns serve similar semantic purposes (when the duplicate was detected)
--
-- DECISION: Keep detection_date as the primary timestamp for duplicate detection
-- and use created_at for general record tracking. This follows the pattern of
-- having domain-specific timestamps (detection_date, confirmed_at) alongside
-- standard audit timestamps (created_at, updated_at).
--
-- NOTE: The original issue mentioned "detected_at" but the column is actually
-- named "detection_date". There is no "detected_at" column.

-- Add clarifying comments to document the column purposes
COMMENT ON COLUMN public.job_duplicates.detection_date IS
  'Timestamp when the duplicate relationship was detected (domain-specific). Primary timestamp for duplicate detection logic.';

COMMENT ON COLUMN public.job_duplicates.created_at IS
  'Standard audit timestamp for record creation. Same as detection_date for new records but preserved for consistency with other tables.';

-- Also document the confidence_level vs confidence_score situation
-- The table uses confidence_level (text: high/medium/low) not confidence_score (numeric)
-- This is the correct design for categorical confidence ratings
COMMENT ON COLUMN public.job_duplicates.confidence_level IS
  'Categorical confidence level for duplicate detection: high (>85% similarity), medium (70-85%), low (<70%). Text-based for clarity vs numeric scores on individual dimensions.';


-- =============================================================================
-- PART 4: SKIPPED ITEMS (WITH RATIONALE)
-- =============================================================================
-- The following items were intentionally skipped:
--
-- 4.1 jobs.url URL format validation:
--     REASON: URLs can have many valid formats and edge cases. Application-level
--     validation is more appropriate for complex URL validation. A check constraint
--     would be too restrictive or too permissive.
--
-- 4.2 Jobs table over-indexing (#7 from review):
--     REASON: Requires query monitoring data to determine which indexes to remove.
--     Should be addressed after analyzing actual query patterns with pg_stat_statements.
--
-- 4.3 JSONB normalization (#8 from review):
--     REASON: This is a design decision that requires careful analysis of query
--     patterns and data access requirements. Not a quick fix.
--
-- =============================================================================


-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these queries after migration to verify all fixes are applied:
--
-- 1. Verify duplicate constraint removed from skills:
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'skills' AND schemaname = 'public'
-- ORDER BY indexname;
-- Expected: Should NOT see unique_user_skill_name, only unique_user_skill
--
-- 2. Verify check constraints added:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid IN ('public.users'::regclass, 'public.sessions'::regclass, 'public.work_experience'::regclass)
-- AND contype = 'c'
-- ORDER BY conrelid::text, conname;
-- Expected: Should see chk_users_email_format, chk_sessions_expiry_after_creation, chk_work_experience_employment_type
--
-- 3. Verify column comments on job_duplicates:
-- SELECT column_name, col_description('public.job_duplicates'::regclass, ordinal_position)
-- FROM information_schema.columns
-- WHERE table_name = 'job_duplicates' AND table_schema = 'public'
-- AND column_name IN ('detection_date', 'created_at', 'confidence_level');
--
-- =============================================================================

-- =============================================================================
-- MIGRATION SUMMARY
-- =============================================================================
--
-- MEDIUM Priority Fixes Applied:
--
-- 1. Removed duplicate unique constraint:
--    - Dropped unique_user_skill_name from skills table
--    - Kept unique_user_skill as the primary constraint
--
-- 2. Added check constraints:
--    - chk_users_email_format: Validates email format on users.email
--    - chk_sessions_expiry_after_creation: Ensures expires_at > created_at
--    - chk_work_experience_employment_type: Validates employment type values
--
-- 3. Documented column purposes:
--    - Clarified detection_date vs created_at in job_duplicates
--    - Documented confidence_level categorical approach
--
-- SKIPPED (with rationale documented):
-- - jobs.url format validation (too complex for check constraint)
-- - Jobs table over-indexing (requires monitoring data)
-- - JSONB normalization (design decision, not quick fix)
--
-- =============================================================================
