-- =============================================================================
-- Migration: Schema Health Critical and High Priority Fixes
-- File: 022_schema_health_critical_fixes.sql
-- Created: 2025-12-30
-- =============================================================================
--
-- This migration addresses CRITICAL and HIGH priority database schema issues
-- identified in the comprehensive architecture review.
--
-- CRITICAL Priority Fixes:
-- 1. Missing Foreign Keys (8 tables) - Ensures referential integrity
-- 2. Function search_path Security (14 functions) - Prevents search_path hijacking
--
-- HIGH Priority Fixes:
-- 3. Unindexed Foreign Keys (3 columns) - Improves JOIN and DELETE performance
--
-- =============================================================================

-- =============================================================================
-- PART 1: MISSING FOREIGN KEYS (CRITICAL)
-- =============================================================================
-- These foreign keys ensure referential integrity between tables and the users table.
-- Without them, orphaned records can occur when users are deleted.

-- 1.1 subscriptions.user_id -> users.id (CASCADE)
-- Note: subscription records should be deleted when user is deleted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscriptions_user_id_fkey'
    AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK: subscriptions.user_id -> users.id';
  ELSE
    RAISE NOTICE 'FK subscriptions_user_id_fkey already exists';
  END IF;
END $$;

-- 1.2 invoices.user_id -> users.id (CASCADE)
-- Note: invoice records should be deleted when user is deleted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'invoices_user_id_fkey'
    AND table_name = 'invoices'
  ) THEN
    ALTER TABLE invoices
    ADD CONSTRAINT invoices_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK: invoices.user_id -> users.id';
  ELSE
    RAISE NOTICE 'FK invoices_user_id_fkey already exists';
  END IF;
END $$;

-- 1.3 payment_methods.user_id -> users.id (CASCADE)
-- Note: payment method records should be deleted when user is deleted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payment_methods_user_id_fkey'
    AND table_name = 'payment_methods'
  ) THEN
    ALTER TABLE payment_methods
    ADD CONSTRAINT payment_methods_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK: payment_methods.user_id -> users.id';
  ELSE
    RAISE NOTICE 'FK payment_methods_user_id_fkey already exists';
  END IF;
END $$;

-- 1.4 usage_limits.user_id -> users.id (CASCADE)
-- Note: usage limit records should be deleted when user is deleted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'usage_limits_user_id_fkey'
    AND table_name = 'usage_limits'
  ) THEN
    ALTER TABLE usage_limits
    ADD CONSTRAINT usage_limits_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK: usage_limits.user_id -> users.id';
  ELSE
    RAISE NOTICE 'FK usage_limits_user_id_fkey already exists';
  END IF;
END $$;

-- 1.5 oauth_states.user_id -> users.id (SET NULL)
-- Note: oauth_states can have NULL user_id; SET NULL preserves state record
-- The existing FK references auth.users, we need to check and handle appropriately
DO $$
BEGIN
  -- First check if FK to auth.users exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'oauth_states'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'users'
    AND ccu.table_schema = 'auth'
  ) THEN
    -- FK to auth.users exists, which is correct for this table
    RAISE NOTICE 'FK oauth_states.user_id -> auth.users already exists (correct)';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'oauth_states_user_id_fkey'
    AND table_name = 'oauth_states'
  ) THEN
    -- Add FK to public.users
    ALTER TABLE oauth_states
    ADD CONSTRAINT oauth_states_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added FK: oauth_states.user_id -> users.id';
  ELSE
    RAISE NOTICE 'FK oauth_states_user_id_fkey already exists';
  END IF;
END $$;

-- 1.6 rate_limits.user_id -> users.id (SET NULL)
-- Note: rate_limits can have NULL user_id for IP-based limits; SET NULL preserves record
DO $$
BEGIN
  -- Check for existing FK to auth.users
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'rate_limits'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'users'
    AND ccu.table_schema = 'auth'
  ) THEN
    RAISE NOTICE 'FK rate_limits.user_id -> auth.users already exists (correct)';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'rate_limits_user_id_fkey'
    AND table_name = 'rate_limits'
  ) THEN
    ALTER TABLE rate_limits
    ADD CONSTRAINT rate_limits_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added FK: rate_limits.user_id -> users.id';
  ELSE
    RAISE NOTICE 'FK rate_limits_user_id_fkey already exists';
  END IF;
END $$;

-- 1.7 notifications.user_id -> users.id (CASCADE)
-- Note: notifications should be deleted when user is deleted
DO $$
BEGIN
  -- Check for existing FK to auth.users
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'notifications'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'users'
    AND ccu.table_schema = 'auth'
  ) THEN
    RAISE NOTICE 'FK notifications.user_id -> auth.users already exists (correct)';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'notifications_user_id_fkey'
    AND table_name = 'notifications'
  ) THEN
    ALTER TABLE notifications
    ADD CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK: notifications.user_id -> users.id';
  ELSE
    RAISE NOTICE 'FK notifications_user_id_fkey already exists';
  END IF;
END $$;

-- 1.8 job_preferences.user_id -> users.id (CASCADE)
-- Note: job preferences should be deleted when user is deleted
DO $$
BEGIN
  -- Check for existing FK to auth.users
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'job_preferences'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'users'
    AND ccu.table_schema = 'auth'
  ) THEN
    RAISE NOTICE 'FK job_preferences.user_id -> auth.users already exists (correct)';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'job_preferences_user_id_fkey'
    AND table_name = 'job_preferences'
  ) THEN
    ALTER TABLE job_preferences
    ADD CONSTRAINT job_preferences_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added FK: job_preferences.user_id -> users.id';
  ELSE
    RAISE NOTICE 'FK job_preferences_user_id_fkey already exists';
  END IF;
END $$;


-- =============================================================================
-- PART 2: FUNCTION search_path SECURITY FIXES (CRITICAL)
-- =============================================================================
-- All functions need SET search_path = '' to prevent search_path hijacking attacks.
-- This is especially critical for SECURITY DEFINER functions.
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- 2.1 update_updated_at_column (trigger function)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.update_updated_at_column IS
  'Trigger function to auto-update updated_at timestamp. Fixed search_path for security.';

-- 2.2 update_job_compatibility_analyses_updated_at (trigger function)
CREATE OR REPLACE FUNCTION public.update_job_compatibility_analyses_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.update_job_compatibility_analyses_updated_at IS
  'Trigger function for job_compatibility_analyses.updated_at. Fixed search_path for security.';

-- 2.3 update_jobs_tsv (trigger function for full-text search)
CREATE OR REPLACE FUNCTION public.update_jobs_tsv()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.title_tsv := to_tsvector('english', COALESCE(NEW.title, ''));
  NEW.company_tsv := to_tsvector('english', COALESCE(NEW.company, ''));
  NEW.description_tsv := to_tsvector('english', COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.update_jobs_tsv IS
  'Trigger function to update tsvector columns for job full-text search. Fixed search_path for security.';

-- 2.4 handle_new_user (SECURITY DEFINER - critical)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.handle_new_user IS
  'Creates public.users record when auth.users record is created. Fixed search_path for security.';

-- 2.5 is_account_locked (SECURITY DEFINER - critical)
CREATE OR REPLACE FUNCTION public.is_account_locked(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  lockout_record RECORD;
BEGIN
  -- Find active lockout for this email
  SELECT * INTO lockout_record
  FROM public.account_lockouts
  WHERE email = user_email
    AND unlocked_at IS NULL
    AND locked_until > NOW()
  ORDER BY locked_at DESC
  LIMIT 1;

  -- Return true if locked, false otherwise
  RETURN FOUND;
END;
$function$;

COMMENT ON FUNCTION public.is_account_locked IS
  'SEC-004: Check if an account is currently locked. Fixed search_path for security.';

-- 2.6 record_failed_login (SECURITY DEFINER - critical)
CREATE OR REPLACE FUNCTION public.record_failed_login(
  user_email text,
  client_ip inet,
  user_agent_string text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  failed_count INTEGER;
  lockout_threshold INTEGER := 5;
  lockout_window_minutes INTEGER := 15;
  lockout_duration_minutes INTEGER := 30;
  result JSONB;
BEGIN
  -- Insert failed attempt
  INSERT INTO public.failed_login_attempts (email, ip_address, user_agent)
  VALUES (user_email, client_ip, user_agent_string);

  -- Count recent failed attempts (within lockout window)
  SELECT COUNT(*) INTO failed_count
  FROM public.failed_login_attempts
  WHERE email = user_email
    AND attempted_at > (NOW() - (lockout_window_minutes || ' minutes')::INTERVAL);

  -- Check if threshold reached
  IF failed_count >= lockout_threshold THEN
    -- Create lockout record
    INSERT INTO public.account_lockouts (
      email,
      locked_until,
      failed_attempt_count,
      reason
    )
    VALUES (
      user_email,
      NOW() + (lockout_duration_minutes || ' minutes')::INTERVAL,
      failed_count,
      'Too many failed login attempts (' || failed_count || ' in ' || lockout_window_minutes || ' minutes)'
    )
    ON CONFLICT (email)
    DO UPDATE SET
      locked_at = NOW(),
      locked_until = NOW() + (lockout_duration_minutes || ' minutes')::INTERVAL,
      failed_attempt_count = public.account_lockouts.failed_attempt_count + 1,
      unlocked_at = NULL;

    result := jsonb_build_object(
      'locked', true,
      'failed_attempts', failed_count,
      'locked_until', NOW() + (lockout_duration_minutes || ' minutes')::INTERVAL,
      'message', 'Account locked due to multiple failed login attempts'
    );
  ELSE
    result := jsonb_build_object(
      'locked', false,
      'failed_attempts', failed_count,
      'attempts_remaining', lockout_threshold - failed_count,
      'message', 'Login failed. ' || (lockout_threshold - failed_count) || ' attempts remaining before lockout.'
    );
  END IF;

  RETURN result;
END;
$function$;

COMMENT ON FUNCTION public.record_failed_login IS
  'SEC-004: Record a failed login attempt and lock account if threshold exceeded. Fixed search_path for security.';

-- 2.7 clear_failed_login_attempts (SECURITY DEFINER - critical)
CREATE OR REPLACE FUNCTION public.clear_failed_login_attempts(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Delete all failed attempts for this email
  DELETE FROM public.failed_login_attempts
  WHERE email = user_email;

  -- Mark any lockouts as unlocked
  UPDATE public.account_lockouts
  SET unlocked_at = NOW()
  WHERE email = user_email
    AND unlocked_at IS NULL;
END;
$function$;

COMMENT ON FUNCTION public.clear_failed_login_attempts IS
  'SEC-004: Clear failed login attempts and unlock account after successful login. Fixed search_path for security.';

-- 2.8 unlock_account (SECURITY DEFINER - critical)
CREATE OR REPLACE FUNCTION public.unlock_account(
  user_email text,
  admin_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Update lockout record
  UPDATE public.account_lockouts
  SET
    unlocked_at = NOW(),
    unlocked_by = admin_user_id
  WHERE email = user_email
    AND unlocked_at IS NULL;

  -- Clear failed attempts
  DELETE FROM public.failed_login_attempts
  WHERE email = user_email;

  RETURN FOUND;
END;
$function$;

COMMENT ON FUNCTION public.unlock_account IS
  'SEC-004: Manually unlock account (admin function). Fixed search_path for security.';

-- 2.9 cleanup_old_failed_logins (SECURITY DEFINER - critical)
CREATE OR REPLACE FUNCTION public.cleanup_old_failed_logins()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete attempts older than 24 hours
  DELETE FROM public.failed_login_attempts
  WHERE attempted_at < (NOW() - INTERVAL '24 hours');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$function$;

COMMENT ON FUNCTION public.cleanup_old_failed_logins IS
  'SEC-004: Clean up failed login attempts older than 24 hours. Fixed search_path for security.';

-- 2.10 cleanup_expired_lockouts (SECURITY DEFINER - critical)
CREATE OR REPLACE FUNCTION public.cleanup_expired_lockouts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mark expired lockouts as unlocked
  UPDATE public.account_lockouts
  SET unlocked_at = locked_until
  WHERE unlocked_at IS NULL
    AND locked_until < NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN updated_count;
END;
$function$;

COMMENT ON FUNCTION public.cleanup_expired_lockouts IS
  'SEC-004: Automatically unlock accounts after lockout period expires. Fixed search_path for security.';

-- 2.11 calculate_job_quality_score (SECURITY DEFINER - critical)
CREATE OR REPLACE FUNCTION public.calculate_job_quality_score(p_job_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_job RECORD;
  v_completeness_score NUMERIC := 0;
  v_source_reliability_score NUMERIC := 0;
  v_freshness_score NUMERIC := 0;
  v_overall_score NUMERIC := 0;
  v_field_count INTEGER := 0;
  v_days_old NUMERIC;
BEGIN
  -- Fetch job data
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate completeness score (0-100)
  -- Count non-null important fields
  IF v_job.title IS NOT NULL AND LENGTH(v_job.title) > 0 THEN v_field_count := v_field_count + 1; END IF;
  IF v_job.company IS NOT NULL AND LENGTH(v_job.company) > 0 THEN v_field_count := v_field_count + 1; END IF;
  IF v_job.location IS NOT NULL AND LENGTH(v_job.location) > 0 THEN v_field_count := v_field_count + 1; END IF;
  IF v_job.description IS NOT NULL AND LENGTH(v_job.description) > 100 THEN v_field_count := v_field_count + 1; END IF;
  IF v_job.url IS NOT NULL AND LENGTH(v_job.url) > 0 THEN v_field_count := v_field_count + 1; END IF;
  IF v_job.salary_min IS NOT NULL AND v_job.salary_min > 0 THEN v_field_count := v_field_count + 1; END IF;
  IF v_job.salary_max IS NOT NULL AND v_job.salary_max > 0 THEN v_field_count := v_field_count + 1; END IF;
  IF v_job.job_type IS NOT NULL THEN v_field_count := v_field_count + 1; END IF;
  IF v_job.experience_level IS NOT NULL THEN v_field_count := v_field_count + 1; END IF;
  IF v_job.work_arrangement IS NOT NULL AND v_job.work_arrangement != 'Unknown' THEN v_field_count := v_field_count + 1; END IF;

  -- Completeness: 10 fields max = 100%
  v_completeness_score := (v_field_count::NUMERIC / 10.0) * 100;
  IF v_completeness_score > 100 THEN v_completeness_score := 100; END IF;

  -- Calculate source reliability score
  v_source_reliability_score := CASE v_job.source
    WHEN 'manual' THEN 100
    WHEN 'linkedin' THEN 90
    WHEN 'indeed' THEN 85
    ELSE 50
  END;

  -- Calculate freshness score (0-100)
  v_days_old := EXTRACT(EPOCH FROM (NOW() - v_job.created_at::TIMESTAMPTZ)) / 86400;

  v_freshness_score := CASE
    WHEN v_days_old <= 7 THEN 100
    WHEN v_days_old <= 30 THEN 75
    WHEN v_days_old <= 90 THEN 50
    ELSE 25
  END;

  -- Calculate overall score (weighted average)
  v_overall_score := (v_completeness_score * 0.5) + (v_source_reliability_score * 0.3) + (v_freshness_score * 0.2);

  -- Insert or update metadata
  INSERT INTO public.canonical_job_metadata (
    job_id,
    completeness_score,
    source_reliability_score,
    freshness_score,
    overall_quality_score,
    field_count,
    description_length,
    has_salary_range,
    has_url,
    source_type,
    calculated_at,
    updated_at
  ) VALUES (
    p_job_id,
    v_completeness_score,
    v_source_reliability_score,
    v_freshness_score,
    v_overall_score,
    v_field_count,
    COALESCE(LENGTH(v_job.description), 0),
    (v_job.salary_min IS NOT NULL AND v_job.salary_max IS NOT NULL),
    (v_job.url IS NOT NULL AND LENGTH(v_job.url) > 0),
    v_job.source,
    NOW(),
    NOW()
  )
  ON CONFLICT (job_id) DO UPDATE SET
    completeness_score = EXCLUDED.completeness_score,
    source_reliability_score = EXCLUDED.source_reliability_score,
    freshness_score = EXCLUDED.freshness_score,
    overall_quality_score = EXCLUDED.overall_quality_score,
    field_count = EXCLUDED.field_count,
    description_length = EXCLUDED.description_length,
    has_salary_range = EXCLUDED.has_salary_range,
    has_url = EXCLUDED.has_url,
    source_type = EXCLUDED.source_type,
    calculated_at = NOW(),
    updated_at = NOW();

  RETURN v_overall_score;
END;
$function$;

COMMENT ON FUNCTION public.calculate_job_quality_score IS
  'Calculates quality score for canonical job selection. Fixed search_path for security.';

-- 2.12 get_canonical_jobs_only (SECURITY DEFINER - critical)
CREATE OR REPLACE FUNCTION public.get_canonical_jobs_only(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  company text,
  location text,
  description text,
  url text,
  source text,
  job_type public.job_type,
  experience_level public.experience_level,
  salary_min integer,
  salary_max integer,
  match_score numeric,
  archived boolean,
  saved boolean,
  added_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  duplicate_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.user_id,
    j.title,
    j.company,
    j.location,
    j.description,
    j.url,
    j.source,
    j.job_type,
    j.experience_level,
    j.salary_min,
    j.salary_max,
    j.match_score,
    j.archived,
    j.saved,
    j.added_at,
    j.created_at,
    j.updated_at,
    COALESCE(cm.duplicate_count, 0) AS duplicate_count
  FROM public.jobs j
  LEFT JOIN public.canonical_job_metadata cm ON j.id = cm.job_id
  WHERE j.user_id = p_user_id
    -- Exclude jobs that are marked as duplicates
    AND NOT EXISTS (
      SELECT 1 FROM public.job_duplicates jd
      WHERE jd.duplicate_job_id = j.id
    )
  ORDER BY j.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

COMMENT ON FUNCTION public.get_canonical_jobs_only IS
  'Returns jobs excluding duplicates (canonical jobs only). Fixed search_path for security.';

-- 2.13 mark_as_canonical (SECURITY DEFINER - critical)
CREATE OR REPLACE FUNCTION public.mark_as_canonical(p_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_duplicate_count INTEGER;
BEGIN
  -- Count duplicates
  SELECT COUNT(*) INTO v_duplicate_count
  FROM public.job_duplicates
  WHERE canonical_job_id = p_job_id;

  -- Update metadata
  UPDATE public.canonical_job_metadata
  SET
    is_canonical = TRUE,
    duplicate_count = v_duplicate_count,
    updated_at = NOW()
  WHERE job_id = p_job_id;

  -- If metadata doesn't exist, create it
  IF NOT FOUND THEN
    PERFORM public.calculate_job_quality_score(p_job_id);

    UPDATE public.canonical_job_metadata
    SET
      is_canonical = TRUE,
      duplicate_count = v_duplicate_count,
      updated_at = NOW()
    WHERE job_id = p_job_id;
  END IF;
END;
$function$;

COMMENT ON FUNCTION public.mark_as_canonical IS
  'Marks a job as canonical and updates duplicate counts. Fixed search_path for security.';

-- 2.14 initialize_user_limits (SECURITY DEFINER - critical)
CREATE OR REPLACE FUNCTION public.initialize_user_limits(
  p_user_id uuid,
  p_plan varchar
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_ai_limit INTEGER;
  v_job_limit INTEGER;
  v_email_limit INTEGER;
BEGIN
  -- Set limits based on plan
  CASE p_plan
    WHEN 'free' THEN
      v_ai_limit := 10;
      v_job_limit := 50;
      v_email_limit := 20;
    WHEN 'basic' THEN
      v_ai_limit := 100;
      v_job_limit := 200;
      v_email_limit := 100;
    WHEN 'premium' THEN
      v_ai_limit := 1000;
      v_job_limit := 1000;
      v_email_limit := 500;
    ELSE
      v_ai_limit := 10;
      v_job_limit := 50;
      v_email_limit := 20;
  END CASE;

  -- Insert or update usage limits
  INSERT INTO public.usage_limits (
    user_id,
    ai_generations_limit,
    job_searches_limit,
    emails_sent_limit
  ) VALUES (
    p_user_id,
    v_ai_limit,
    v_job_limit,
    v_email_limit
  )
  ON CONFLICT (user_id) DO UPDATE SET
    ai_generations_limit = EXCLUDED.ai_generations_limit,
    job_searches_limit = EXCLUDED.job_searches_limit,
    emails_sent_limit = EXCLUDED.emails_sent_limit,
    updated_at = now();
END;
$function$;

COMMENT ON FUNCTION public.initialize_user_limits IS
  'Initialize usage limits for a user based on subscription plan. Fixed search_path for security.';


-- =============================================================================
-- PART 3: UNINDEXED FOREIGN KEYS (HIGH PRIORITY)
-- =============================================================================
-- These indexes improve performance for:
-- - JOIN operations between tables
-- - CASCADE DELETE operations when parent records are deleted
-- - Query filtering on these foreign key columns

-- 3.1 account_lockouts.unlocked_by (partial index WHERE unlocked_by IS NOT NULL)
-- This column references users.id and is used to track who unlocked an account
CREATE INDEX IF NOT EXISTS idx_account_lockouts_unlocked_by
ON public.account_lockouts(unlocked_by)
WHERE unlocked_by IS NOT NULL;

COMMENT ON INDEX idx_account_lockouts_unlocked_by IS
  'Partial index on unlocked_by for JOIN performance. Only indexes non-NULL values.';

-- 3.2 job_duplicates.confirmed_by (partial index WHERE confirmed_by IS NOT NULL)
-- This column references users.id and is used to track manual duplicate confirmations
CREATE INDEX IF NOT EXISTS idx_job_duplicates_confirmed_by
ON public.job_duplicates(confirmed_by)
WHERE confirmed_by IS NOT NULL;

COMMENT ON INDEX idx_job_duplicates_confirmed_by IS
  'Partial index on confirmed_by for JOIN performance. Only indexes non-NULL values.';

-- 3.3 oauth_states.user_id (standard index)
-- This column references users.id and is used for OAuth state lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id
ON public.oauth_states(user_id);

COMMENT ON INDEX idx_oauth_states_user_id IS
  'Index on user_id for OAuth state lookups and CASCADE DELETE performance.';


-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================
-- Run these queries after migration to verify all fixes are applied:
--
-- 1. Check foreign keys:
-- SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
-- AND tc.table_name IN ('subscriptions', 'invoices', 'payment_methods', 'usage_limits',
--                       'oauth_states', 'rate_limits', 'notifications', 'job_preferences');
--
-- 2. Check function search_path:
-- SELECT proname, proconfig FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND proname IN ('update_updated_at_column', 'handle_new_user', 'is_account_locked',
--                 'record_failed_login', 'clear_failed_login_attempts', 'unlock_account',
--                 'cleanup_old_failed_logins', 'cleanup_expired_lockouts',
--                 'calculate_job_quality_score', 'get_canonical_jobs_only',
--                 'mark_as_canonical', 'initialize_user_limits',
--                 'update_job_compatibility_analyses_updated_at', 'update_jobs_tsv');
--
-- 3. Check indexes:
-- SELECT indexname FROM pg_indexes
-- WHERE indexname IN ('idx_account_lockouts_unlocked_by',
--                     'idx_job_duplicates_confirmed_by',
--                     'idx_oauth_states_user_id');
--
-- =============================================================================

-- =============================================================================
-- MIGRATION SUMMARY
-- =============================================================================
--
-- CRITICAL Priority Fixes Applied:
-- 1. Added 8 missing foreign keys to users table:
--    - subscriptions.user_id -> users.id (CASCADE)
--    - invoices.user_id -> users.id (CASCADE)
--    - payment_methods.user_id -> users.id (CASCADE)
--    - usage_limits.user_id -> users.id (CASCADE)
--    - oauth_states.user_id -> users.id (SET NULL)
--    - rate_limits.user_id -> users.id (SET NULL)
--    - notifications.user_id -> users.id (CASCADE)
--    - job_preferences.user_id -> users.id (CASCADE)
--
-- 2. Fixed search_path security on 14 functions:
--    - update_updated_at_column
--    - update_job_compatibility_analyses_updated_at
--    - update_jobs_tsv
--    - handle_new_user
--    - is_account_locked
--    - record_failed_login
--    - clear_failed_login_attempts
--    - unlock_account
--    - cleanup_old_failed_logins
--    - cleanup_expired_lockouts
--    - calculate_job_quality_score
--    - get_canonical_jobs_only
--    - mark_as_canonical
--    - initialize_user_limits
--
-- HIGH Priority Fixes Applied:
-- 3. Added 3 indexes for unindexed foreign keys:
--    - idx_account_lockouts_unlocked_by (partial)
--    - idx_job_duplicates_confirmed_by (partial)
--    - idx_oauth_states_user_id
--
-- =============================================================================
