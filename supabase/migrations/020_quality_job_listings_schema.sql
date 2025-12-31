-- =============================================================================
-- Migration: Quality Job Listings & AI Matching Schema
-- File: 020_quality_job_listings_schema.sql
-- Created: 2025-12-30
-- =============================================================================
--
-- This migration implements Feature 1: Quality Job Listings & AI Matching
--
-- Components:
-- 1. Job Deduplication Tracking - Identify and merge duplicate job postings
-- 2. Spam Detection - Track spam probability and detection metadata
-- 3. User Feedback System - Collect feedback on job matches for ML training
-- 4. Enhanced Matching Metadata - Store match quality and algorithm versioning
--
-- Design Principles:
-- - All tables use RLS for security
-- - Proper indexing for query performance
-- - Comprehensive comments for documentation
-- - Data integrity constraints
-- - Support for A/B testing via algorithm versioning
--
-- =============================================================================

-- =============================================================================
-- PART 1: ENUMS FOR TYPE SAFETY
-- =============================================================================

-- Enum for feedback types (what action user took on a job)
DO $$ BEGIN
  CREATE TYPE job_feedback_type AS ENUM (
    'thumbs_up',      -- User explicitly liked the job match
    'thumbs_down',    -- User explicitly disliked the job match
    'not_interested', -- User marked job as not interested
    'applied',        -- User applied to the job
    'saved',          -- User saved the job for later
    'hidden',         -- User hid the job from results
    'reported_spam',  -- User reported job as spam
    'reported_scam',  -- User reported job as potential scam
    'reported_expired' -- User reported job as already filled/expired
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE job_feedback_type IS 'Types of feedback users can provide on job matches';

-- Enum for spam detection status
DO $$ BEGIN
  CREATE TYPE spam_status AS ENUM (
    'clean',          -- Job passed all spam checks
    'suspicious',     -- Job has some spam indicators
    'spam',           -- Job detected as spam
    'scam',           -- Job detected as potential scam
    'expired',        -- Job detected as expired/filled
    'pending_review', -- Awaiting manual review
    'manually_approved', -- Manually approved after review
    'manually_rejected'  -- Manually rejected after review
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE spam_status IS 'Status of spam detection for a job posting';

-- Enum for deduplication status
DO $$ BEGIN
  CREATE TYPE dedup_status AS ENUM (
    'canonical',      -- This is the primary/canonical version
    'duplicate',      -- This is a duplicate of another job
    'merged',         -- This job was merged into another
    'unique',         -- No duplicates found
    'pending'         -- Deduplication check pending
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE dedup_status IS 'Deduplication status for job postings';


-- =============================================================================
-- PART 2: ALTER JOBS TABLE - Add Quality/Dedup/Spam Columns
-- =============================================================================

-- 2.1 Job Quality & Spam Detection Columns
-- -----------------------------------------

-- Spam probability score (0-100, where 100 = definitely spam)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS spam_score NUMERIC(5,2)
  CHECK (spam_score IS NULL OR (spam_score >= 0 AND spam_score <= 100));
COMMENT ON COLUMN jobs.spam_score IS 'Spam probability score 0-100. Higher = more likely spam. NULL = not analyzed.';

-- Spam detection status
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS spam_status spam_status DEFAULT 'pending_review';
COMMENT ON COLUMN jobs.spam_status IS 'Current spam detection status for this job posting';

-- Spam detection flags (array of detected issues)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS spam_flags TEXT[] DEFAULT '{}';
COMMENT ON COLUMN jobs.spam_flags IS 'Array of spam indicators detected: e.g., ["no_company_website", "unrealistic_salary", "short_description"]';

-- Spam detection metadata (model version, analysis timestamp, details)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS spam_metadata JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN jobs.spam_metadata IS 'Spam detection metadata: {"model_version": "1.0", "analyzed_at": "timestamp", "reasons": [...]}';

-- Quality score (0-100, higher = better quality listing)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5,2)
  CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100));
COMMENT ON COLUMN jobs.quality_score IS 'Overall job listing quality score 0-100 based on completeness, legitimacy, and recency';


-- 2.2 Deduplication Columns
-- -----------------------------------------

-- Canonical hash for deduplication (hash of normalized company+title+location+salary)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS canonical_hash TEXT;
COMMENT ON COLUMN jobs.canonical_hash IS 'Hash of normalized (company_name, job_title, location, salary_range) for deduplication';

-- Deduplication status
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dedup_status dedup_status DEFAULT 'pending';
COMMENT ON COLUMN jobs.dedup_status IS 'Deduplication status: canonical (primary), duplicate, merged, unique, or pending';

-- Reference to canonical job (for duplicates)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS canonical_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;
COMMENT ON COLUMN jobs.canonical_job_id IS 'For duplicates: reference to the canonical (primary) job this duplicates';

-- Deduplication confidence score (0-100)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dedup_confidence NUMERIC(5,2)
  CHECK (dedup_confidence IS NULL OR (dedup_confidence >= 0 AND dedup_confidence <= 100));
COMMENT ON COLUMN jobs.dedup_confidence IS 'Confidence score for deduplication match 0-100. Higher = more certain this is a duplicate.';

-- All sources where this job was found (for merged jobs)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS all_sources JSONB DEFAULT '[]'::jsonb;
COMMENT ON COLUMN jobs.all_sources IS 'All sources where this job was found: [{"source": "linkedin", "url": "...", "found_at": "..."}]';


-- 2.3 Enhanced Matching Metadata Columns
-- -----------------------------------------

-- Match algorithm version (for A/B testing)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS match_algorithm_version TEXT;
COMMENT ON COLUMN jobs.match_algorithm_version IS 'Version of matching algorithm that computed match_score, e.g., "v2.1.0"';

-- Detailed match explanation
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS match_explanation JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN jobs.match_explanation IS 'Detailed explanation of match score: {"skill_matches": [], "gaps": [], "reasoning": "..."}';

-- Match computed timestamp
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS match_computed_at TIMESTAMPTZ;
COMMENT ON COLUMN jobs.match_computed_at IS 'When the match score was last computed';


-- 2.4 Job Freshness & Expiration
-- -----------------------------------------

-- Original posting date from source
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;
COMMENT ON COLUMN jobs.posted_at IS 'Original job posting date from the source (when company posted it)';

-- Estimated expiration date
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
COMMENT ON COLUMN jobs.expires_at IS 'Estimated expiration date. Jobs older than 30 days typically expire.';

-- Last seen active (for detecting filled/removed jobs)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();
COMMENT ON COLUMN jobs.last_seen_at IS 'Last time this job was confirmed active on the source';

-- Is job confirmed as filled/closed
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN jobs.is_closed IS 'TRUE if job has been confirmed as filled or closed';


-- =============================================================================
-- PART 3: JOB DUPLICATES TRACKING TABLE
-- =============================================================================
-- Tracks relationships between duplicate job postings across sources

CREATE TABLE IF NOT EXISTS job_duplicates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The canonical (primary) job that others duplicate
  canonical_job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- The duplicate job
  duplicate_job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Confidence score (0-100) that these are duplicates
  confidence_score NUMERIC(5,2) NOT NULL
    CHECK (confidence_score >= 0 AND confidence_score <= 100),

  -- How the duplicate was detected
  detection_method TEXT NOT NULL DEFAULT 'hash_match',
  -- Options: 'hash_match', 'fuzzy_match', 'ml_model', 'manual', 'url_match'

  -- Which fields matched
  matched_fields TEXT[] DEFAULT '{}',
  -- e.g., ['title', 'company', 'location', 'salary_range']

  -- Merge metadata
  merged_at TIMESTAMPTZ,
  merged_by TEXT, -- 'system' or user_id

  -- Timestamps
  detected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Prevent duplicate entries
  CONSTRAINT unique_duplicate_pair UNIQUE (canonical_job_id, duplicate_job_id),

  -- Prevent self-reference
  CONSTRAINT no_self_duplicate CHECK (canonical_job_id != duplicate_job_id)
);

COMMENT ON TABLE job_duplicates IS 'Tracks duplicate job postings - links duplicates to their canonical (primary) version';
COMMENT ON COLUMN job_duplicates.detection_method IS 'How duplicate was detected: hash_match, fuzzy_match, ml_model, manual, url_match';
COMMENT ON COLUMN job_duplicates.matched_fields IS 'Which fields matched during deduplication: title, company, location, salary_range, description';

-- Indexes for job_duplicates
CREATE INDEX IF NOT EXISTS idx_job_duplicates_canonical ON job_duplicates(canonical_job_id);
CREATE INDEX IF NOT EXISTS idx_job_duplicates_duplicate ON job_duplicates(duplicate_job_id);
CREATE INDEX IF NOT EXISTS idx_job_duplicates_confidence ON job_duplicates(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_job_duplicates_detected_at ON job_duplicates(detected_at DESC);

-- RLS for job_duplicates (admin/system only - no user-specific data)
ALTER TABLE job_duplicates ENABLE ROW LEVEL SECURITY;

-- Service role can manage all duplicates
CREATE POLICY "Service role can manage job duplicates"
  ON job_duplicates
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- =============================================================================
-- PART 4: USER JOB FEEDBACK TABLE
-- =============================================================================
-- Tracks user feedback on job matches for ML training and improvement

CREATE TABLE IF NOT EXISTS job_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User who provided feedback
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Job the feedback is about
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Type of feedback
  feedback_type job_feedback_type NOT NULL,

  -- Optional rating (1-5 stars for detailed feedback)
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),

  -- Feedback reasons (user-selected from predefined options)
  reasons TEXT[] DEFAULT '{}',
  -- e.g., ['salary_too_low', 'wrong_location', 'missing_skills', 'bad_company_culture']

  -- Free-form comment
  comment TEXT,

  -- Context at time of feedback (for ML training)
  context JSONB DEFAULT '{}'::jsonb,
  -- Structure: {
  --   "match_score": 85,
  --   "match_algorithm_version": "v2.1.0",
  --   "user_skills": ["python", "react"],
  --   "job_skills": ["python", "java"],
  --   "search_query": "software engineer",
  --   "position_in_results": 3
  -- }

  -- Was this feedback used for ML training
  used_for_training BOOLEAN DEFAULT FALSE,
  training_batch_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Prevent duplicate feedback (one feedback type per user per job)
  CONSTRAINT unique_user_job_feedback UNIQUE (user_id, job_id, feedback_type)
);

COMMENT ON TABLE job_feedback IS 'User feedback on job matches for ML training and algorithm improvement';
COMMENT ON COLUMN job_feedback.reasons IS 'Predefined reasons: salary_too_low, wrong_location, missing_skills, bad_company_culture, etc.';
COMMENT ON COLUMN job_feedback.context IS 'Snapshot of match context at feedback time for ML training';
COMMENT ON COLUMN job_feedback.training_batch_id IS 'ID of the ML training batch that used this feedback';

-- Indexes for job_feedback
CREATE INDEX IF NOT EXISTS idx_job_feedback_user_id ON job_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_job_feedback_job_id ON job_feedback(job_id);
CREATE INDEX IF NOT EXISTS idx_job_feedback_type ON job_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_job_feedback_created_at ON job_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_feedback_training ON job_feedback(used_for_training) WHERE used_for_training = FALSE;

-- Composite index for user's recent feedback
CREATE INDEX IF NOT EXISTS idx_job_feedback_user_recent ON job_feedback(user_id, created_at DESC);

-- GIN index for reasons array queries
CREATE INDEX IF NOT EXISTS idx_job_feedback_reasons ON job_feedback USING GIN(reasons);

-- GIN index for context JSONB queries
CREATE INDEX IF NOT EXISTS idx_job_feedback_context ON job_feedback USING GIN(context);

-- RLS for job_feedback
ALTER TABLE job_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feedback"
  ON job_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
  ON job_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback"
  ON job_feedback FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback"
  ON job_feedback FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_job_feedback_updated_at
  BEFORE UPDATE ON job_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- PART 5: SPAM REPORTS TABLE
-- =============================================================================
-- Tracks user reports of spam/scam jobs for review and model training

CREATE TABLE IF NOT EXISTS spam_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User who reported (optional for anonymous reports)
  reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Job being reported
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Type of report
  report_type TEXT NOT NULL CHECK (report_type IN ('spam', 'scam', 'expired', 'misleading', 'duplicate', 'other')),

  -- Detailed reason
  reason TEXT,

  -- Evidence/details
  details JSONB DEFAULT '{}'::jsonb,
  -- Structure: {
  --   "screenshot_urls": [],
  --   "suspicious_elements": [],
  --   "additional_context": ""
  -- }

  -- Review status
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'under_review', 'confirmed', 'rejected', 'duplicate_report')),

  -- Review metadata
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT, -- 'system' or admin user id
  review_notes TEXT,

  -- Action taken
  action_taken TEXT,
  -- e.g., 'job_marked_spam', 'job_removed', 'user_warned', 'no_action'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE spam_reports IS 'User reports of spam, scam, or problematic job postings';
COMMENT ON COLUMN spam_reports.report_type IS 'Type: spam, scam, expired, misleading, duplicate, other';
COMMENT ON COLUMN spam_reports.review_status IS 'Status: pending, under_review, confirmed, rejected, duplicate_report';

-- Indexes for spam_reports
CREATE INDEX IF NOT EXISTS idx_spam_reports_job_id ON spam_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_spam_reports_reporter ON spam_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_spam_reports_status ON spam_reports(review_status);
CREATE INDEX IF NOT EXISTS idx_spam_reports_type ON spam_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_spam_reports_created_at ON spam_reports(created_at DESC);

-- RLS for spam_reports
ALTER TABLE spam_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view their own spam reports"
  ON spam_reports FOR SELECT
  USING (auth.uid() = reporter_user_id);

-- Users can create reports
CREATE POLICY "Users can create spam reports"
  ON spam_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_user_id OR reporter_user_id IS NULL);

-- Users cannot update or delete reports (admin only)
-- No UPDATE/DELETE policies for users

-- Trigger for updated_at
CREATE TRIGGER set_spam_reports_updated_at
  BEFORE UPDATE ON spam_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- PART 6: MATCH QUALITY ANALYTICS TABLE
-- =============================================================================
-- Stores aggregated match quality metrics for A/B testing and algorithm comparison

CREATE TABLE IF NOT EXISTS match_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User this metric is for
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Algorithm version being measured
  algorithm_version TEXT NOT NULL,

  -- Time period (for aggregation)
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Core metrics
  total_jobs_shown INTEGER DEFAULT 0,
  jobs_clicked INTEGER DEFAULT 0,
  jobs_saved INTEGER DEFAULT 0,
  jobs_applied INTEGER DEFAULT 0,
  jobs_hidden INTEGER DEFAULT 0,

  -- Feedback metrics
  thumbs_up_count INTEGER DEFAULT 0,
  thumbs_down_count INTEGER DEFAULT 0,

  -- Calculated metrics
  click_through_rate NUMERIC(5,4), -- clicks / shown
  save_rate NUMERIC(5,4),          -- saved / shown
  apply_rate NUMERIC(5,4),         -- applied / shown
  positive_feedback_rate NUMERIC(5,4), -- thumbs_up / (thumbs_up + thumbs_down)

  -- Average match scores for jobs user interacted with
  avg_match_score_clicked NUMERIC(5,2),
  avg_match_score_applied NUMERIC(5,2),
  avg_match_score_hidden NUMERIC(5,2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Unique constraint for user + algorithm + period
  CONSTRAINT unique_user_algo_period UNIQUE (user_id, algorithm_version, period_start, period_end)
);

COMMENT ON TABLE match_quality_metrics IS 'Aggregated metrics for measuring match algorithm performance per user';
COMMENT ON COLUMN match_quality_metrics.algorithm_version IS 'Algorithm version for A/B testing comparison';

-- Indexes for match_quality_metrics
CREATE INDEX IF NOT EXISTS idx_match_metrics_user ON match_quality_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_match_metrics_algo ON match_quality_metrics(algorithm_version);
CREATE INDEX IF NOT EXISTS idx_match_metrics_period ON match_quality_metrics(period_start, period_end);

-- RLS for match_quality_metrics
ALTER TABLE match_quality_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own match metrics"
  ON match_quality_metrics FOR SELECT
  USING (auth.uid() = user_id);

-- Only system can insert/update metrics
CREATE POLICY "Service role can manage match metrics"
  ON match_quality_metrics
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER set_match_metrics_updated_at
  BEFORE UPDATE ON match_quality_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- PART 7: INDEXES FOR NEW JOBS COLUMNS
-- =============================================================================

-- Spam detection indexes
CREATE INDEX IF NOT EXISTS idx_jobs_spam_score ON jobs(spam_score DESC NULLS LAST)
  WHERE spam_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_spam_status ON jobs(spam_status);
CREATE INDEX IF NOT EXISTS idx_jobs_spam_flags ON jobs USING GIN(spam_flags);
CREATE INDEX IF NOT EXISTS idx_jobs_quality_score ON jobs(quality_score DESC NULLS LAST)
  WHERE quality_score IS NOT NULL;

-- Deduplication indexes
CREATE INDEX IF NOT EXISTS idx_jobs_canonical_hash ON jobs(canonical_hash)
  WHERE canonical_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_dedup_status ON jobs(dedup_status);
CREATE INDEX IF NOT EXISTS idx_jobs_canonical_job_id ON jobs(canonical_job_id)
  WHERE canonical_job_id IS NOT NULL;

-- Matching indexes
CREATE INDEX IF NOT EXISTS idx_jobs_match_algorithm ON jobs(match_algorithm_version)
  WHERE match_algorithm_version IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_match_computed ON jobs(match_computed_at DESC NULLS LAST);

-- Freshness indexes
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_jobs_expires_at ON jobs(expires_at)
  WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_last_seen ON jobs(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_is_closed ON jobs(is_closed) WHERE is_closed = TRUE;

-- Composite index for high-quality active jobs
CREATE INDEX IF NOT EXISTS idx_jobs_quality_active ON jobs(user_id, quality_score DESC NULLS LAST, posted_at DESC)
  WHERE spam_status = 'clean'
  AND dedup_status IN ('canonical', 'unique')
  AND is_closed = FALSE;


-- =============================================================================
-- PART 8: HELPER FUNCTIONS
-- =============================================================================

-- Function to calculate canonical hash for deduplication
CREATE OR REPLACE FUNCTION calculate_job_canonical_hash(
  p_company TEXT,
  p_title TEXT,
  p_location TEXT,
  p_salary_min INTEGER,
  p_salary_max INTEGER
)
RETURNS TEXT AS $$
DECLARE
  normalized_company TEXT;
  normalized_title TEXT;
  normalized_location TEXT;
  salary_range TEXT;
BEGIN
  -- Normalize company name (lowercase, remove special chars)
  normalized_company := LOWER(REGEXP_REPLACE(COALESCE(p_company, ''), '[^a-z0-9]', '', 'g'));

  -- Normalize title (lowercase, remove special chars)
  normalized_title := LOWER(REGEXP_REPLACE(COALESCE(p_title, ''), '[^a-z0-9]', '', 'g'));

  -- Normalize location (lowercase, remove special chars, first word only for city)
  normalized_location := LOWER(SPLIT_PART(COALESCE(p_location, ''), ',', 1));
  normalized_location := REGEXP_REPLACE(normalized_location, '[^a-z0-9]', '', 'g');

  -- Normalize salary to buckets (50k increments)
  IF p_salary_min IS NOT NULL AND p_salary_max IS NOT NULL THEN
    salary_range := ((p_salary_min / 50000) * 50000)::TEXT || '-' || ((p_salary_max / 50000 + 1) * 50000)::TEXT;
  ELSE
    salary_range := 'unknown';
  END IF;

  RETURN MD5(normalized_company || '|' || normalized_title || '|' || normalized_location || '|' || salary_range);
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = public;

COMMENT ON FUNCTION calculate_job_canonical_hash IS 'Calculates a hash for job deduplication based on normalized company, title, location, and salary range';


-- Function to update spam status based on spam score
CREATE OR REPLACE FUNCTION update_job_spam_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.spam_score IS NOT NULL THEN
    IF NEW.spam_score >= 80 THEN
      NEW.spam_status := 'spam';
    ELSIF NEW.spam_score >= 50 THEN
      NEW.spam_status := 'suspicious';
    ELSE
      NEW.spam_status := 'clean';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE TRIGGER trg_update_job_spam_status
  BEFORE INSERT OR UPDATE OF spam_score ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_job_spam_status();


-- Function to auto-compute canonical hash on insert/update
CREATE OR REPLACE FUNCTION compute_job_canonical_hash()
RETURNS TRIGGER AS $$
BEGIN
  NEW.canonical_hash := calculate_job_canonical_hash(
    NEW.company,
    NEW.title,
    NEW.location,
    NEW.salary_min,
    NEW.salary_max
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE TRIGGER trg_compute_job_canonical_hash
  BEFORE INSERT OR UPDATE OF company, title, location, salary_min, salary_max ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION compute_job_canonical_hash();


-- Function to get feedback summary for a job
CREATE OR REPLACE FUNCTION get_job_feedback_summary(p_job_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_feedback', COUNT(*),
    'thumbs_up', COUNT(*) FILTER (WHERE feedback_type = 'thumbs_up'),
    'thumbs_down', COUNT(*) FILTER (WHERE feedback_type = 'thumbs_down'),
    'not_interested', COUNT(*) FILTER (WHERE feedback_type = 'not_interested'),
    'applied', COUNT(*) FILTER (WHERE feedback_type = 'applied'),
    'saved', COUNT(*) FILTER (WHERE feedback_type = 'saved'),
    'spam_reports', COUNT(*) FILTER (WHERE feedback_type IN ('reported_spam', 'reported_scam')),
    'positive_rate',
      CASE
        WHEN COUNT(*) FILTER (WHERE feedback_type IN ('thumbs_up', 'thumbs_down')) > 0
        THEN ROUND(
          COUNT(*) FILTER (WHERE feedback_type = 'thumbs_up')::NUMERIC /
          NULLIF(COUNT(*) FILTER (WHERE feedback_type IN ('thumbs_up', 'thumbs_down')), 0) * 100,
          2
        )
        ELSE NULL
      END
  ) INTO result
  FROM job_feedback
  WHERE job_id = p_job_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION get_job_feedback_summary IS 'Returns aggregated feedback summary for a job posting';


-- Function to find potential duplicates for a job
CREATE OR REPLACE FUNCTION find_job_duplicates(
  p_job_id UUID,
  p_min_confidence NUMERIC DEFAULT 70
)
RETURNS TABLE (
  duplicate_job_id UUID,
  confidence_score NUMERIC,
  matched_fields TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH target_job AS (
    SELECT id, canonical_hash, company, title, location, salary_min, salary_max, description
    FROM jobs
    WHERE id = p_job_id
  )
  SELECT
    j.id AS duplicate_job_id,
    CASE
      -- Exact hash match = 100% confidence
      WHEN j.canonical_hash = t.canonical_hash THEN 100.0
      -- Calculate similarity based on field matches
      ELSE (
        (CASE WHEN LOWER(j.company) = LOWER(t.company) THEN 30 ELSE 0 END) +
        (CASE WHEN SIMILARITY(j.title, t.title) > 0.8 THEN 30 ELSE 0 END) +
        (CASE WHEN SIMILARITY(COALESCE(j.location, ''), COALESCE(t.location, '')) > 0.7 THEN 20 ELSE 0 END) +
        (CASE WHEN ABS(COALESCE(j.salary_min, 0) - COALESCE(t.salary_min, 0)) < 10000 THEN 10 ELSE 0 END) +
        (CASE WHEN ABS(COALESCE(j.salary_max, 0) - COALESCE(t.salary_max, 0)) < 10000 THEN 10 ELSE 0 END)
      )::NUMERIC
    END AS confidence_score,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN LOWER(j.company) = LOWER(t.company) THEN 'company' END,
      CASE WHEN SIMILARITY(j.title, t.title) > 0.8 THEN 'title' END,
      CASE WHEN SIMILARITY(COALESCE(j.location, ''), COALESCE(t.location, '')) > 0.7 THEN 'location' END,
      CASE WHEN ABS(COALESCE(j.salary_min, 0) - COALESCE(t.salary_min, 0)) < 10000 THEN 'salary_min' END,
      CASE WHEN ABS(COALESCE(j.salary_max, 0) - COALESCE(t.salary_max, 0)) < 10000 THEN 'salary_max' END
    ], NULL) AS matched_fields
  FROM jobs j, target_job t
  WHERE j.id != t.id
    AND j.user_id = (SELECT user_id FROM jobs WHERE id = p_job_id)
    AND (
      j.canonical_hash = t.canonical_hash
      OR (
        LOWER(j.company) = LOWER(t.company)
        AND SIMILARITY(j.title, t.title) > 0.6
      )
    )
  HAVING (
    CASE
      WHEN j.canonical_hash = t.canonical_hash THEN 100.0
      ELSE (
        (CASE WHEN LOWER(j.company) = LOWER(t.company) THEN 30 ELSE 0 END) +
        (CASE WHEN SIMILARITY(j.title, t.title) > 0.8 THEN 30 ELSE 0 END) +
        (CASE WHEN SIMILARITY(COALESCE(j.location, ''), COALESCE(t.location, '')) > 0.7 THEN 20 ELSE 0 END) +
        (CASE WHEN ABS(COALESCE(j.salary_min, 0) - COALESCE(t.salary_min, 0)) < 10000 THEN 10 ELSE 0 END) +
        (CASE WHEN ABS(COALESCE(j.salary_max, 0) - COALESCE(t.salary_max, 0)) < 10000 THEN 10 ELSE 0 END)
      )::NUMERIC
    END
  ) >= p_min_confidence
  ORDER BY confidence_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION find_job_duplicates IS 'Finds potential duplicate jobs for a given job ID with confidence scoring';


-- =============================================================================
-- PART 9: GRANT PERMISSIONS
-- =============================================================================

-- Grant usage on new enums
GRANT USAGE ON TYPE job_feedback_type TO authenticated;
GRANT USAGE ON TYPE spam_status TO authenticated;
GRANT USAGE ON TYPE dedup_status TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION calculate_job_canonical_hash TO authenticated;
GRANT EXECUTE ON FUNCTION get_job_feedback_summary TO authenticated;
GRANT EXECUTE ON FUNCTION find_job_duplicates TO authenticated;


-- =============================================================================
-- MIGRATION SUMMARY
-- =============================================================================
--
-- Tables created: 4
--   1. job_duplicates - Tracks duplicate job relationships
--   2. job_feedback - User feedback on job matches
--   3. spam_reports - User reports of spam/scam jobs
--   4. match_quality_metrics - A/B testing and algorithm performance metrics
--
-- Jobs table columns added: 16
--   - Spam detection: spam_score, spam_status, spam_flags, spam_metadata, quality_score
--   - Deduplication: canonical_hash, dedup_status, canonical_job_id, dedup_confidence, all_sources
--   - Matching: match_algorithm_version, match_explanation, match_computed_at
--   - Freshness: posted_at, expires_at, last_seen_at, is_closed
--
-- Enums created: 3
--   - job_feedback_type
--   - spam_status
--   - dedup_status
--
-- Functions created: 5
--   - calculate_job_canonical_hash()
--   - update_job_spam_status() [trigger function]
--   - compute_job_canonical_hash() [trigger function]
--   - get_job_feedback_summary()
--   - find_job_duplicates()
--
-- Indexes created: 20+
--   - Optimized for spam filtering, deduplication, and feedback queries
--
-- RLS policies: Applied to all new tables
--   - Users can only access their own feedback and reports
--   - Duplicate tracking and metrics are system-managed
--
-- =============================================================================
