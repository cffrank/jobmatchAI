-- =============================================================================
-- JobMatch AI: Performance Enhancement
-- Migration: 20251220222624_optimize_rls_policies_auth_uid.sql
--
-- This migration optimizes RLS (Row Level Security) policies by wrapping
-- auth.uid() calls in SELECT statements. This prevents auth.uid() from being
-- re-evaluated for each row, significantly improving query performance.
--
-- Performance Impact:
-- - Before: auth.uid() called once per row (N evaluations for N rows)
-- - After: auth.uid() called once per query (1 evaluation total)
-- - Expected improvement: 10-100x faster for queries returning many rows
--
-- Tables optimized: applications, education, email_history, jobs, resumes,
--                   security_events, sessions, skills, tracked_applications,
--                   users, work_experience
--
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- =============================================================================

-- =============================================================================
-- APPLICATIONS TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can delete own applications" ON public.applications;

CREATE POLICY "Users can view own applications" ON public.applications
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own applications" ON public.applications
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own applications" ON public.applications
  FOR UPDATE USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own applications" ON public.applications
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- EDUCATION TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own education" ON public.education;
DROP POLICY IF EXISTS "Users can insert own education" ON public.education;
DROP POLICY IF EXISTS "Users can update own education" ON public.education;
DROP POLICY IF EXISTS "Users can delete own education" ON public.education;

CREATE POLICY "Users can view own education" ON public.education
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own education" ON public.education
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own education" ON public.education
  FOR UPDATE USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own education" ON public.education
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- EMAIL_HISTORY TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own email history" ON public.email_history;
DROP POLICY IF EXISTS "Users can insert own email history" ON public.email_history;
DROP POLICY IF EXISTS "Users can update own email history" ON public.email_history;
DROP POLICY IF EXISTS "Users can delete own email history" ON public.email_history;

CREATE POLICY "Users can view own email history" ON public.email_history
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own email history" ON public.email_history
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own email history" ON public.email_history
  FOR UPDATE USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own email history" ON public.email_history
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- JOBS TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can insert own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete own jobs" ON public.jobs;

CREATE POLICY "Users can view own jobs" ON public.jobs
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own jobs" ON public.jobs
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own jobs" ON public.jobs
  FOR UPDATE USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own jobs" ON public.jobs
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- RESUMES TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can view their own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can insert their own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can update their own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can delete their own resumes" ON public.resumes;

CREATE POLICY "Users can view their own resumes" ON public.resumes
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own resumes" ON public.resumes
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own resumes" ON public.resumes
  FOR UPDATE USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own resumes" ON public.resumes
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- SECURITY_EVENTS TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own security events" ON public.security_events;
DROP POLICY IF EXISTS "Users can insert own security events" ON public.security_events;

CREATE POLICY "Users can view own security events" ON public.security_events
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own security events" ON public.security_events
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- SESSIONS TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;

CREATE POLICY "Users can view own sessions" ON public.sessions
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own sessions" ON public.sessions
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own sessions" ON public.sessions
  FOR UPDATE USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own sessions" ON public.sessions
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- SKILLS TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own skills" ON public.skills;
DROP POLICY IF EXISTS "Users can insert own skills" ON public.skills;
DROP POLICY IF EXISTS "Users can update own skills" ON public.skills;
DROP POLICY IF EXISTS "Users can delete own skills" ON public.skills;

CREATE POLICY "Users can view own skills" ON public.skills
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own skills" ON public.skills
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own skills" ON public.skills
  FOR UPDATE USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own skills" ON public.skills
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- TRACKED_APPLICATIONS TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can view their own tracked applications" ON public.tracked_applications;
DROP POLICY IF EXISTS "Users can insert their own tracked applications" ON public.tracked_applications;
DROP POLICY IF EXISTS "Users can update their own tracked applications" ON public.tracked_applications;
DROP POLICY IF EXISTS "Users can delete their own tracked applications" ON public.tracked_applications;

CREATE POLICY "Users can view their own tracked applications" ON public.tracked_applications
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own tracked applications" ON public.tracked_applications
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own tracked applications" ON public.tracked_applications
  FOR UPDATE USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own tracked applications" ON public.tracked_applications
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- USERS TABLE
-- Note: Uses 'id' instead of 'user_id' as it's the primary key
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can delete own profile" ON public.users
  FOR DELETE USING ((SELECT auth.uid()) = id);

-- =============================================================================
-- WORK_EXPERIENCE TABLE
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own work experience" ON public.work_experience;
DROP POLICY IF EXISTS "Users can insert own work experience" ON public.work_experience;
DROP POLICY IF EXISTS "Users can update own work experience" ON public.work_experience;
DROP POLICY IF EXISTS "Users can delete own work experience" ON public.work_experience;

CREATE POLICY "Users can view own work experience" ON public.work_experience
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own work experience" ON public.work_experience
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own work experience" ON public.work_experience
  FOR UPDATE USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own work experience" ON public.work_experience
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- =============================================================================
-- VERIFICATION
-- =============================================================================
-- After running this migration, verify optimization with:
-- SELECT tablename, policyname, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND (qual LIKE '%(SELECT auth.uid())%' OR with_check LIKE '%(SELECT auth.uid())%');
-- All policies should now use (SELECT auth.uid()) instead of auth.uid()
-- =============================================================================
