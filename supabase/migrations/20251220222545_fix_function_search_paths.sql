-- =============================================================================
-- JobMatch AI: Security Enhancement
-- Migration: 20251220222545_fix_function_search_paths.sql
--
-- This migration fixes function search_path security warnings by setting
-- an immutable search_path on all functions. This prevents search_path
-- hijacking attacks where malicious users could manipulate the schema
-- search order to inject malicious code.
--
-- Functions fixed:
-- - update_updated_at_column
-- - cleanup_expired_sessions
-- - get_active_session_count
-- - update_tracked_application_timestamps
--
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- =============================================================================

-- Fix: update_updated_at_column
-- Sets search_path to empty string, requiring explicit schema qualification
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

-- Fix: cleanup_expired_sessions
-- SECURITY DEFINER function requires strict search_path control
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Explicit schema qualification required due to empty search_path
  DELETE FROM public.sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- Fix: get_active_session_count
-- SECURITY DEFINER function requires strict search_path control
CREATE OR REPLACE FUNCTION public.get_active_session_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.sessions
    WHERE user_id = p_user_id
    AND expires_at > NOW()
  );
END;
$function$;

-- Fix: update_tracked_application_timestamps
-- Sets search_path to empty string, requiring explicit schema qualification
CREATE OR REPLACE FUNCTION public.update_tracked_application_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$function$;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- After running this migration, verify with:
-- SELECT proname, prosecdef, proconfig
-- FROM pg_proc
-- WHERE proname IN (
--   'update_updated_at_column',
--   'cleanup_expired_sessions',
--   'get_active_session_count',
--   'update_tracked_application_timestamps'
-- );
-- All functions should show proconfig = {search_path=}
-- =============================================================================
