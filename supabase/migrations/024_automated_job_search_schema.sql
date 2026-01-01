-- =============================================================================
-- Migration: Automated Job Search System (Phase 1)
-- File: 024_automated_job_search_schema.sql
-- Created: 2025-12-30
-- =============================================================================
--
-- This migration implements the database schema for the Automated Job Search
-- system, enabling users to configure automated job searches with personalized
-- preferences, track search history, save search templates, and manage
-- notification settings.
--
-- Components:
-- 1. job_search_preferences - Extended preferences for automated job searching
-- 2. job_search_history - Track search executions and results
-- 3. job_search_templates - Reusable search configurations
-- 4. notification_preferences - User notification settings
-- 5. users.auto_search_enabled - Global toggle for automated searches
--
-- Design Principles:
-- - All tables use RLS for security (users only access their own data)
-- - Comprehensive indexing for query performance
-- - Detailed comments for documentation
-- - Data integrity constraints with CHECK constraints
-- - Support for multiple job sources and search frequencies
--
-- =============================================================================

-- =============================================================================
-- PART 1: ENUMS FOR TYPE SAFETY
-- =============================================================================

-- Enum for search frequency options
DO $$ BEGIN
  CREATE TYPE search_frequency AS ENUM (
    'realtime',     -- Search as jobs are posted (premium feature)
    'daily',        -- Once per day
    'weekly',       -- Once per week
    'bi_weekly',    -- Every two weeks
    'monthly'       -- Once per month
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE search_frequency IS 'How often automated job searches run for a user';

-- Enum for job search status
DO $$ BEGIN
  CREATE TYPE job_search_status AS ENUM (
    'pending',      -- Search is queued
    'running',      -- Search is in progress
    'completed',    -- Search completed successfully
    'partial',      -- Search completed with some sources failing
    'failed',       -- Search failed entirely
    'cancelled'     -- Search was cancelled
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE job_search_status IS 'Status of a job search execution';

-- Enum for notification frequency
DO $$ BEGIN
  CREATE TYPE notification_frequency AS ENUM (
    'realtime',     -- Immediate notifications
    'daily',        -- Daily digest
    'weekly',       -- Weekly digest
    'never'         -- No notifications
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE notification_frequency IS 'How often users receive job match notifications';


-- =============================================================================
-- PART 2: ENHANCE JOB_SEARCH_PREFERENCES TABLE
-- =============================================================================
-- The existing job_preferences table will be extended with additional columns
-- for the automated search system. We keep the existing table and add new columns.

-- 2.1 Add visa sponsorship preference
ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS visa_sponsorship BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN job_preferences.visa_sponsorship IS 'If TRUE, only show jobs offering visa sponsorship';

-- 2.2 Add search frequency (convert text to enum)
-- First add new column with enum type
ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS search_frequency_enum search_frequency DEFAULT 'daily';
COMMENT ON COLUMN job_preferences.search_frequency_enum IS 'How often automated job searches run: realtime, daily, weekly, bi_weekly, monthly';

-- 2.3 Add max results per search
ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS max_results_per_search INTEGER DEFAULT 50
  CHECK (max_results_per_search IS NULL OR (max_results_per_search >= 1 AND max_results_per_search <= 500));
COMMENT ON COLUMN job_preferences.max_results_per_search IS 'Maximum number of jobs to return per automated search (1-500)';

-- 2.4 Add blacklist companies (companies to exclude)
ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS blacklist_companies TEXT[] DEFAULT '{}';
COMMENT ON COLUMN job_preferences.blacklist_companies IS 'Array of company names to exclude from search results';

-- 2.5 Add blacklist keywords (keywords to exclude from job descriptions)
ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS blacklist_keywords TEXT[] DEFAULT '{}';
COMMENT ON COLUMN job_preferences.blacklist_keywords IS 'Array of keywords that should exclude a job from results';

-- 2.6 Add enabled job sources
ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS enabled_sources TEXT[] DEFAULT '{linkedin,indeed,glassdoor}';
COMMENT ON COLUMN job_preferences.enabled_sources IS 'Array of enabled job sources: linkedin, indeed, glassdoor, ziprecruiter, etc.';

-- 2.7 Add last search timestamp
ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS last_search_at TIMESTAMPTZ;
COMMENT ON COLUMN job_preferences.last_search_at IS 'Timestamp of the last automated search execution';

-- 2.8 Add next scheduled search timestamp
ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS next_search_at TIMESTAMPTZ;
COMMENT ON COLUMN job_preferences.next_search_at IS 'Timestamp of the next scheduled automated search';

-- 2.9 Add remote preference (separate from work_arrangement for more granular control)
ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS remote_only BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN job_preferences.remote_only IS 'If TRUE, only show fully remote positions';

-- 2.10 Add minimum match score threshold
ALTER TABLE job_preferences ADD COLUMN IF NOT EXISTS min_match_score INTEGER DEFAULT 0
  CHECK (min_match_score IS NULL OR (min_match_score >= 0 AND min_match_score <= 100));
COMMENT ON COLUMN job_preferences.min_match_score IS 'Minimum match score (0-100) for jobs to be included in results';

-- Update existing comment for auto_search_enabled
COMMENT ON COLUMN job_preferences.auto_search_enabled IS 'Master toggle for automated job searches. When FALSE, no automated searches run regardless of other settings.';

-- Add index for finding users due for their next search
CREATE INDEX IF NOT EXISTS idx_job_preferences_next_search
  ON job_preferences(next_search_at)
  WHERE auto_search_enabled = TRUE AND next_search_at IS NOT NULL;

-- Add index for enabled sources array queries
CREATE INDEX IF NOT EXISTS idx_job_preferences_sources
  ON job_preferences USING GIN(enabled_sources);

-- Add index for blacklist arrays
CREATE INDEX IF NOT EXISTS idx_job_preferences_blacklist_companies
  ON job_preferences USING GIN(blacklist_companies);
CREATE INDEX IF NOT EXISTS idx_job_preferences_blacklist_keywords
  ON job_preferences USING GIN(blacklist_keywords);


-- =============================================================================
-- PART 3: JOB_SEARCH_HISTORY TABLE
-- =============================================================================
-- Tracks the execution and results of each automated or manual job search

CREATE TABLE IF NOT EXISTS job_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User who performed the search
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Search query parameters (snapshot of preferences at search time)
  search_query JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Structure: {
  --   "titles": ["Software Engineer", "Backend Developer"],
  --   "locations": ["San Francisco, CA", "Remote"],
  --   "work_arrangements": ["remote", "hybrid"],
  --   "salary_min": 100000,
  --   "salary_max": 200000,
  --   "experience_levels": ["mid", "senior"],
  --   "keywords": ["python", "kubernetes"],
  --   "exclude_keywords": ["junior"],
  --   "blacklist_companies": ["Company A"],
  --   "visa_sponsorship": false
  -- }

  -- Sources that were searched
  sources TEXT[] NOT NULL DEFAULT '{}',

  -- Results summary
  jobs_found INTEGER NOT NULL DEFAULT 0
    CHECK (jobs_found >= 0),
  high_matches INTEGER NOT NULL DEFAULT 0
    CHECK (high_matches >= 0),  -- match score >= 80
  medium_matches INTEGER NOT NULL DEFAULT 0
    CHECK (medium_matches >= 0),  -- match score 50-79
  low_matches INTEGER NOT NULL DEFAULT 0
    CHECK (low_matches >= 0),  -- match score < 50
  spam_filtered INTEGER NOT NULL DEFAULT 0
    CHECK (spam_filtered >= 0),
  duplicates_removed INTEGER NOT NULL DEFAULT 0
    CHECK (duplicates_removed >= 0),

  -- Performance metrics
  search_duration_ms INTEGER
    CHECK (search_duration_ms IS NULL OR search_duration_ms >= 0),
  api_calls_made INTEGER DEFAULT 0
    CHECK (api_calls_made >= 0),

  -- Search status
  status job_search_status NOT NULL DEFAULT 'pending',

  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  -- Structure: {
  --   "source_errors": {
  --     "linkedin": "Rate limited",
  --     "indeed": null
  --   },
  --   "stack_trace": "...",
  --   "retry_count": 0
  -- }

  -- Was this a manual or automated search?
  is_automated BOOLEAN NOT NULL DEFAULT FALSE,

  -- Reference to template if search was from a saved template
  template_id UUID,  -- FK added after job_search_templates table creation

  -- Timestamps
  searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE job_search_history IS 'Tracks execution history of job searches including results, performance metrics, and errors';
COMMENT ON COLUMN job_search_history.search_query IS 'JSONB snapshot of search parameters at execution time';
COMMENT ON COLUMN job_search_history.high_matches IS 'Number of jobs with match score >= 80%';
COMMENT ON COLUMN job_search_history.medium_matches IS 'Number of jobs with match score 50-79%';
COMMENT ON COLUMN job_search_history.low_matches IS 'Number of jobs with match score < 50%';
COMMENT ON COLUMN job_search_history.search_duration_ms IS 'Total search execution time in milliseconds';
COMMENT ON COLUMN job_search_history.is_automated IS 'TRUE for scheduled automated searches, FALSE for manual user-initiated searches';

-- Indexes for job_search_history
CREATE INDEX IF NOT EXISTS idx_job_search_history_user_id
  ON job_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_job_search_history_user_recent
  ON job_search_history(user_id, searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_search_history_status
  ON job_search_history(status);
CREATE INDEX IF NOT EXISTS idx_job_search_history_searched_at
  ON job_search_history(searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_search_history_automated
  ON job_search_history(is_automated, searched_at DESC)
  WHERE is_automated = TRUE;

-- GIN index for search query JSONB
CREATE INDEX IF NOT EXISTS idx_job_search_history_query
  ON job_search_history USING GIN(search_query);

-- RLS for job_search_history
ALTER TABLE job_search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own search history"
  ON job_search_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history"
  ON job_search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own search history"
  ON job_search_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search history"
  ON job_search_history FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all records (for automated searches)
CREATE POLICY "Service role can manage all search history"
  ON job_search_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- =============================================================================
-- PART 4: JOB_SEARCH_TEMPLATES TABLE
-- =============================================================================
-- Allows users to save and reuse search configurations

CREATE TABLE IF NOT EXISTS job_search_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner of the template
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Template metadata
  name TEXT NOT NULL
    CHECK (LENGTH(TRIM(name)) > 0 AND LENGTH(name) <= 100),
  description TEXT
    CHECK (description IS NULL OR LENGTH(description) <= 500),

  -- Search criteria (same structure as job_search_history.search_query)
  search_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Structure: {
  --   "titles": ["Software Engineer"],
  --   "locations": ["Remote"],
  --   "work_arrangements": ["remote"],
  --   "salary_min": 100000,
  --   "salary_max": 200000,
  --   "industries": ["Technology"],
  --   "experience_levels": ["mid", "senior"],
  --   "keywords": ["python", "aws"],
  --   "exclude_keywords": [],
  --   "visa_sponsorship": false,
  --   "company_sizes": ["medium", "large"],
  --   "sources": ["linkedin", "indeed"]
  -- }

  -- Usage tracking
  use_count INTEGER NOT NULL DEFAULT 0
    CHECK (use_count >= 0),
  last_used_at TIMESTAMPTZ,

  -- Is this the user's default/primary template?
  is_default BOOLEAN NOT NULL DEFAULT FALSE,

  -- Template visibility (future: share templates)
  is_public BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE job_search_templates IS 'User-saved search configurations for quick reuse';
COMMENT ON COLUMN job_search_templates.name IS 'User-friendly name for the template (max 100 chars)';
COMMENT ON COLUMN job_search_templates.description IS 'Optional description of the search template (max 500 chars)';
COMMENT ON COLUMN job_search_templates.search_criteria IS 'JSONB containing all search parameters';
COMMENT ON COLUMN job_search_templates.use_count IS 'Number of times this template has been used for searches';
COMMENT ON COLUMN job_search_templates.is_default IS 'If TRUE, this template is used for scheduled automated searches';
COMMENT ON COLUMN job_search_templates.is_public IS 'If TRUE, template can be discovered by other users (future feature)';

-- Indexes for job_search_templates
CREATE INDEX IF NOT EXISTS idx_job_search_templates_user_id
  ON job_search_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_job_search_templates_user_default
  ON job_search_templates(user_id)
  WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_job_search_templates_use_count
  ON job_search_templates(use_count DESC);
CREATE INDEX IF NOT EXISTS idx_job_search_templates_last_used
  ON job_search_templates(last_used_at DESC NULLS LAST);

-- GIN index for search criteria JSONB
CREATE INDEX IF NOT EXISTS idx_job_search_templates_criteria
  ON job_search_templates USING GIN(search_criteria);

-- Unique constraint: only one default template per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_search_templates_unique_default
  ON job_search_templates(user_id)
  WHERE is_default = TRUE;

-- RLS for job_search_templates
ALTER TABLE job_search_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates"
  ON job_search_templates FOR SELECT
  USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can insert their own templates"
  ON job_search_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON job_search_templates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON job_search_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_job_search_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS set_job_search_templates_updated_at ON job_search_templates;
CREATE TRIGGER set_job_search_templates_updated_at
  BEFORE UPDATE ON job_search_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_job_search_templates_updated_at();

-- Now add FK from job_search_history to job_search_templates
ALTER TABLE job_search_history
  DROP CONSTRAINT IF EXISTS job_search_history_template_id_fkey;
ALTER TABLE job_search_history
  ADD CONSTRAINT job_search_history_template_id_fkey
  FOREIGN KEY (template_id) REFERENCES job_search_templates(id) ON DELETE SET NULL;


-- =============================================================================
-- PART 5: NOTIFICATION_PREFERENCES TABLE
-- =============================================================================
-- User preferences for how and when to receive job match notifications

CREATE TABLE IF NOT EXISTS notification_preferences (
  -- Use user_id as primary key (one row per user)
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Channel toggles
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,

  -- Email settings
  email_frequency notification_frequency NOT NULL DEFAULT 'daily',
  email_address TEXT,  -- Override email if different from account email
    -- Validate email format if provided
  CONSTRAINT chk_notification_email_format
    CHECK (email_address IS NULL OR email_address ~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),

  -- Push notification settings
  push_frequency notification_frequency NOT NULL DEFAULT 'realtime',

  -- SMS settings
  sms_phone TEXT,  -- Phone number for SMS notifications
  sms_frequency notification_frequency NOT NULL DEFAULT 'daily',

  -- Match score thresholds
  notify_match_score_min INTEGER NOT NULL DEFAULT 70
    CHECK (notify_match_score_min >= 0 AND notify_match_score_min <= 100),

  -- Minimum new jobs threshold (don't notify unless at least N new jobs)
  notify_new_jobs_min INTEGER NOT NULL DEFAULT 1
    CHECK (notify_new_jobs_min >= 1 AND notify_new_jobs_min <= 100),

  -- Digest scheduling (for daily/weekly digests)
  digest_day_of_week INTEGER DEFAULT 1  -- 0=Sunday, 1=Monday, ..., 6=Saturday
    CHECK (digest_day_of_week IS NULL OR (digest_day_of_week >= 0 AND digest_day_of_week <= 6)),
  digest_hour INTEGER DEFAULT 9  -- Hour of day in user's timezone (0-23)
    CHECK (digest_hour IS NULL OR (digest_hour >= 0 AND digest_hour <= 23)),

  -- User timezone for scheduling
  timezone TEXT DEFAULT 'America/Los_Angeles',

  -- Notification categories toggles
  notify_high_matches BOOLEAN NOT NULL DEFAULT TRUE,
  notify_medium_matches BOOLEAN NOT NULL DEFAULT TRUE,
  notify_low_matches BOOLEAN NOT NULL DEFAULT FALSE,
  notify_salary_matches BOOLEAN NOT NULL DEFAULT TRUE,
  notify_new_companies BOOLEAN NOT NULL DEFAULT FALSE,
  notify_search_completed BOOLEAN NOT NULL DEFAULT TRUE,
  notify_search_failed BOOLEAN NOT NULL DEFAULT TRUE,

  -- Quiet hours (don't send push/SMS during these hours)
  quiet_hours_start INTEGER DEFAULT 22  -- 10 PM
    CHECK (quiet_hours_start IS NULL OR (quiet_hours_start >= 0 AND quiet_hours_start <= 23)),
  quiet_hours_end INTEGER DEFAULT 8  -- 8 AM
    CHECK (quiet_hours_end IS NULL OR (quiet_hours_end >= 0 AND quiet_hours_end <= 23)),

  -- Last notification timestamps
  last_email_sent_at TIMESTAMPTZ,
  last_push_sent_at TIMESTAMPTZ,
  last_sms_sent_at TIMESTAMPTZ,

  -- Unsubscribe token for email links
  unsubscribe_token UUID DEFAULT gen_random_uuid(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notification_preferences IS 'User preferences for job match notifications across email, push, and SMS channels';
COMMENT ON COLUMN notification_preferences.email_frequency IS 'How often to send email notifications: realtime, daily, weekly, never';
COMMENT ON COLUMN notification_preferences.notify_match_score_min IS 'Minimum match score (0-100) to trigger a notification';
COMMENT ON COLUMN notification_preferences.notify_new_jobs_min IS 'Minimum number of new jobs required to send a notification';
COMMENT ON COLUMN notification_preferences.digest_day_of_week IS 'For weekly digests: 0=Sunday, 1=Monday, ..., 6=Saturday';
COMMENT ON COLUMN notification_preferences.digest_hour IS 'Hour of day (0-23) to send daily/weekly digests in user timezone';
COMMENT ON COLUMN notification_preferences.quiet_hours_start IS 'Hour (0-23) when quiet hours start (no push/SMS)';
COMMENT ON COLUMN notification_preferences.quiet_hours_end IS 'Hour (0-23) when quiet hours end';
COMMENT ON COLUMN notification_preferences.unsubscribe_token IS 'Unique token for one-click email unsubscribe links';

-- Indexes for notification_preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_email
  ON notification_preferences(email_enabled, email_frequency)
  WHERE email_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_notification_preferences_push
  ON notification_preferences(push_enabled, push_frequency)
  WHERE push_enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_notification_preferences_unsubscribe
  ON notification_preferences(unsubscribe_token);

-- RLS for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences"
  ON notification_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all records
CREATE POLICY "Service role can manage all notification preferences"
  ON notification_preferences FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS set_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();


-- =============================================================================
-- PART 6: ADD auto_search_enabled TO USERS TABLE
-- =============================================================================
-- Global toggle at the user level for automated job searches

ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_search_enabled BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN users.auto_search_enabled IS 'Master toggle for automated job searches. Users must explicitly enable this feature.';

-- Index for finding users with auto-search enabled
CREATE INDEX IF NOT EXISTS idx_users_auto_search
  ON users(auto_search_enabled)
  WHERE auto_search_enabled = TRUE;


-- =============================================================================
-- PART 7: HELPER FUNCTIONS
-- =============================================================================

-- Function to calculate next search time based on frequency
CREATE OR REPLACE FUNCTION calculate_next_search_time(
  p_frequency search_frequency,
  p_last_search TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  CASE p_frequency
    WHEN 'realtime' THEN
      -- For realtime, next search is immediate
      RETURN NOW();
    WHEN 'daily' THEN
      RETURN p_last_search + INTERVAL '1 day';
    WHEN 'weekly' THEN
      RETURN p_last_search + INTERVAL '7 days';
    WHEN 'bi_weekly' THEN
      RETURN p_last_search + INTERVAL '14 days';
    WHEN 'monthly' THEN
      RETURN p_last_search + INTERVAL '30 days';
    ELSE
      RETURN p_last_search + INTERVAL '1 day';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = public;

COMMENT ON FUNCTION calculate_next_search_time IS 'Calculates the next scheduled search time based on frequency and last search time';


-- Function to get users due for automated search
CREATE OR REPLACE FUNCTION get_users_due_for_search(
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  preference_id UUID,
  search_frequency search_frequency,
  last_search_at TIMESTAMPTZ,
  enabled_sources TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email AS user_email,
    jp.id AS preference_id,
    jp.search_frequency_enum AS search_frequency,
    jp.last_search_at,
    jp.enabled_sources
  FROM users u
  INNER JOIN job_preferences jp ON jp.user_id = u.id
  WHERE u.auto_search_enabled = TRUE
    AND jp.auto_search_enabled = TRUE
    AND (
      jp.next_search_at IS NULL
      OR jp.next_search_at <= NOW()
    )
  ORDER BY jp.next_search_at NULLS FIRST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION get_users_due_for_search IS 'Returns users whose automated job search is due to run';


-- Function to record search completion and schedule next
CREATE OR REPLACE FUNCTION complete_job_search(
  p_history_id UUID,
  p_jobs_found INTEGER,
  p_high_matches INTEGER,
  p_medium_matches INTEGER,
  p_low_matches INTEGER,
  p_spam_filtered INTEGER DEFAULT 0,
  p_duplicates_removed INTEGER DEFAULT 0,
  p_duration_ms INTEGER DEFAULT NULL,
  p_status job_search_status DEFAULT 'completed'
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_frequency search_frequency;
BEGIN
  -- Update search history
  UPDATE job_search_history
  SET
    jobs_found = p_jobs_found,
    high_matches = p_high_matches,
    medium_matches = p_medium_matches,
    low_matches = p_low_matches,
    spam_filtered = p_spam_filtered,
    duplicates_removed = p_duplicates_removed,
    search_duration_ms = p_duration_ms,
    status = p_status,
    completed_at = NOW()
  WHERE id = p_history_id
  RETURNING user_id INTO v_user_id;

  -- Get user's search frequency
  SELECT search_frequency_enum INTO v_frequency
  FROM job_preferences
  WHERE user_id = v_user_id;

  -- Update job_preferences with last search time and schedule next
  UPDATE job_preferences
  SET
    last_search_at = NOW(),
    next_search_at = calculate_next_search_time(COALESCE(v_frequency, 'daily'::search_frequency))
  WHERE user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION complete_job_search IS 'Records search completion results and schedules the next automated search';


-- Function to increment template use count
CREATE OR REPLACE FUNCTION increment_template_use_count(p_template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE job_search_templates
  SET
    use_count = use_count + 1,
    last_used_at = NOW()
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION increment_template_use_count IS 'Increments the use count and updates last_used_at for a search template';


-- Function to get search statistics for a user
CREATE OR REPLACE FUNCTION get_user_search_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_searches', COUNT(*),
    'automated_searches', COUNT(*) FILTER (WHERE is_automated = TRUE),
    'manual_searches', COUNT(*) FILTER (WHERE is_automated = FALSE),
    'total_jobs_found', COALESCE(SUM(jobs_found), 0),
    'total_high_matches', COALESCE(SUM(high_matches), 0),
    'total_medium_matches', COALESCE(SUM(medium_matches), 0),
    'total_low_matches', COALESCE(SUM(low_matches), 0),
    'total_spam_filtered', COALESCE(SUM(spam_filtered), 0),
    'total_duplicates_removed', COALESCE(SUM(duplicates_removed), 0),
    'avg_jobs_per_search', ROUND(AVG(jobs_found), 2),
    'avg_search_duration_ms', ROUND(AVG(search_duration_ms), 2),
    'last_search_at', MAX(searched_at),
    'searches_last_7_days', COUNT(*) FILTER (WHERE searched_at >= NOW() - INTERVAL '7 days'),
    'searches_last_30_days', COUNT(*) FILTER (WHERE searched_at >= NOW() - INTERVAL '30 days')
  ) INTO result
  FROM job_search_history
  WHERE user_id = p_user_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION get_user_search_stats IS 'Returns aggregated search statistics for a user';


-- =============================================================================
-- PART 8: TRIGGER FOR JOB_PREFERENCES SCHEDULING
-- =============================================================================

-- Automatically calculate next_search_at when search settings change
CREATE OR REPLACE FUNCTION update_next_search_schedule()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if auto_search is enabled and frequency changed
  IF NEW.auto_search_enabled = TRUE THEN
    NEW.next_search_at := calculate_next_search_time(
      COALESCE(NEW.search_frequency_enum, 'daily'::search_frequency),
      COALESCE(NEW.last_search_at, NOW())
    );
  ELSE
    NEW.next_search_at := NULL;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trg_update_next_search_schedule ON job_preferences;
CREATE TRIGGER trg_update_next_search_schedule
  BEFORE INSERT OR UPDATE OF auto_search_enabled, search_frequency_enum
  ON job_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_next_search_schedule();


-- =============================================================================
-- PART 9: DEFAULT NOTIFICATION PREFERENCES
-- =============================================================================
-- Function to create default notification preferences when user is created

CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_create_notification_preferences'
    AND tgrelid = 'public.users'::regclass
  ) THEN
    CREATE TRIGGER trg_create_notification_preferences
      AFTER INSERT ON users
      FOR EACH ROW
      EXECUTE FUNCTION create_default_notification_preferences();
  END IF;
END $$;


-- =============================================================================
-- PART 10: GRANT PERMISSIONS
-- =============================================================================

-- Grant usage on new enums
GRANT USAGE ON TYPE search_frequency TO authenticated;
GRANT USAGE ON TYPE job_search_status TO authenticated;
GRANT USAGE ON TYPE notification_frequency TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION calculate_next_search_time TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_search_stats TO authenticated;
GRANT EXECUTE ON FUNCTION increment_template_use_count TO authenticated;

-- Service role needs access to scheduling functions
GRANT EXECUTE ON FUNCTION get_users_due_for_search TO service_role;
GRANT EXECUTE ON FUNCTION complete_job_search TO service_role;


-- =============================================================================
-- PART 11: CREATE DEFAULT NOTIFICATION PREFERENCES FOR EXISTING USERS
-- =============================================================================

-- Insert default notification preferences for any existing users who don't have them
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;


-- =============================================================================
-- MIGRATION SUMMARY
-- =============================================================================
--
-- Tables modified: 2
--   1. job_preferences - Added 10 new columns for automated search configuration
--   2. users - Added auto_search_enabled column
--
-- Tables created: 3
--   1. job_search_history - Tracks search executions and results
--   2. job_search_templates - Reusable search configurations
--   3. notification_preferences - User notification settings
--
-- Enums created: 3
--   - search_frequency (realtime, daily, weekly, bi_weekly, monthly)
--   - job_search_status (pending, running, completed, partial, failed, cancelled)
--   - notification_frequency (realtime, daily, weekly, never)
--
-- Functions created: 6
--   - calculate_next_search_time() - Calculate next scheduled search
--   - get_users_due_for_search() - Find users needing automated search
--   - complete_job_search() - Record search results and schedule next
--   - increment_template_use_count() - Track template usage
--   - get_user_search_stats() - Get aggregated search statistics
--   - update_next_search_schedule() - Trigger function for scheduling
--   - create_default_notification_preferences() - Auto-create notification prefs
--
-- Triggers created: 3
--   - trg_update_next_search_schedule on job_preferences
--   - set_job_search_templates_updated_at on job_search_templates
--   - set_notification_preferences_updated_at on notification_preferences
--   - trg_create_notification_preferences on users
--
-- Indexes created: 15+
--   - Optimized for scheduling queries, user lookups, and template searches
--
-- RLS policies: Applied to all new tables
--   - Users can only access their own data
--   - Service role has full access for automated operations
--
-- =============================================================================
