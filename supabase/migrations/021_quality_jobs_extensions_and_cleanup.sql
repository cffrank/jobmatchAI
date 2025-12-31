-- =============================================================================
-- Migration: Quality Job Listings - Extensions and Cleanup Functions
-- File: 021_quality_jobs_extensions_and_cleanup.sql
-- Created: 2025-12-30
-- =============================================================================
--
-- This migration adds:
-- 1. pg_trgm extension for fuzzy text matching (used in deduplication)
-- 2. Cleanup functions for expired/stale data
-- 3. Scheduled maintenance helpers
--
-- =============================================================================

-- =============================================================================
-- PART 1: ENABLE REQUIRED EXTENSIONS
-- =============================================================================

-- Enable pg_trgm for fuzzy text matching (SIMILARITY function)
-- This is used by find_job_duplicates() function
CREATE EXTENSION IF NOT EXISTS pg_trgm;

COMMENT ON EXTENSION pg_trgm IS 'pg_trgm extension for fuzzy text matching in job deduplication';


-- =============================================================================
-- PART 2: TRIGRAM INDEXES FOR FUZZY MATCHING
-- =============================================================================

-- Create trigram indexes for efficient fuzzy matching on job fields
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON jobs USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_company_trgm ON jobs USING GIN (company gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_location_trgm ON jobs USING GIN (location gin_trgm_ops)
  WHERE location IS NOT NULL;


-- =============================================================================
-- PART 3: CLEANUP FUNCTIONS
-- =============================================================================

-- Function to mark expired jobs as closed
CREATE OR REPLACE FUNCTION cleanup_expired_jobs()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE jobs
  SET
    is_closed = TRUE,
    spam_status = 'expired',
    updated_at = NOW()
  WHERE
    is_closed = FALSE
    AND (
      -- Explicit expiration date passed
      (expires_at IS NOT NULL AND expires_at < NOW())
      OR
      -- Job not seen for 30+ days
      (last_seen_at IS NOT NULL AND last_seen_at < NOW() - INTERVAL '30 days')
      OR
      -- Job posted 60+ days ago without any updates
      (posted_at IS NOT NULL AND posted_at < NOW() - INTERVAL '60 days' AND last_seen_at IS NULL)
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION cleanup_expired_jobs IS 'Marks expired jobs as closed. Call periodically via scheduler.';


-- Function to cleanup old feedback used for training
CREATE OR REPLACE FUNCTION cleanup_old_training_feedback(p_days_old INTEGER DEFAULT 180)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete feedback that was used for training and is older than specified days
  DELETE FROM job_feedback
  WHERE
    used_for_training = TRUE
    AND training_batch_id IS NOT NULL
    AND created_at < NOW() - (p_days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION cleanup_old_training_feedback IS 'Deletes old feedback that has been used for ML training. Default: 180 days.';


-- Function to archive spam jobs (mark as archived, not delete)
CREATE OR REPLACE FUNCTION archive_spam_jobs()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  UPDATE jobs
  SET
    archived = TRUE,
    updated_at = NOW()
  WHERE
    archived = FALSE
    AND spam_status IN ('spam', 'scam')
    AND spam_score >= 80;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION archive_spam_jobs IS 'Archives jobs confirmed as spam. Call after spam detection runs.';


-- Function to recalculate match quality metrics for a user
CREATE OR REPLACE FUNCTION recalculate_match_metrics(
  p_user_id UUID,
  p_algorithm_version TEXT,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
)
RETURNS UUID AS $$
DECLARE
  metric_id UUID;
  v_total_shown INTEGER;
  v_clicked INTEGER;
  v_saved INTEGER;
  v_applied INTEGER;
  v_hidden INTEGER;
  v_thumbs_up INTEGER;
  v_thumbs_down INTEGER;
  v_avg_clicked NUMERIC;
  v_avg_applied NUMERIC;
  v_avg_hidden NUMERIC;
BEGIN
  -- Get counts from job_feedback
  SELECT
    COUNT(*) FILTER (WHERE feedback_type = 'thumbs_up'),
    COUNT(*) FILTER (WHERE feedback_type = 'thumbs_down'),
    COUNT(*) FILTER (WHERE feedback_type = 'saved'),
    COUNT(*) FILTER (WHERE feedback_type = 'applied'),
    COUNT(*) FILTER (WHERE feedback_type = 'hidden')
  INTO v_thumbs_up, v_thumbs_down, v_saved, v_applied, v_hidden
  FROM job_feedback
  WHERE
    user_id = p_user_id
    AND created_at >= p_period_start
    AND created_at < p_period_end;

  -- Get total jobs shown (from jobs table where match was computed)
  SELECT COUNT(*)
  INTO v_total_shown
  FROM jobs
  WHERE
    user_id = p_user_id
    AND match_algorithm_version = p_algorithm_version
    AND match_computed_at >= p_period_start
    AND match_computed_at < p_period_end;

  -- Assume clicked = any interaction (simplified)
  v_clicked := v_saved + v_applied + v_thumbs_up + v_thumbs_down + v_hidden;

  -- Get average match scores by interaction type
  SELECT
    AVG(j.match_score) FILTER (WHERE f.feedback_type IN ('thumbs_up', 'saved')),
    AVG(j.match_score) FILTER (WHERE f.feedback_type = 'applied'),
    AVG(j.match_score) FILTER (WHERE f.feedback_type IN ('hidden', 'not_interested'))
  INTO v_avg_clicked, v_avg_applied, v_avg_hidden
  FROM job_feedback f
  JOIN jobs j ON f.job_id = j.id
  WHERE
    f.user_id = p_user_id
    AND f.created_at >= p_period_start
    AND f.created_at < p_period_end;

  -- Upsert the metrics
  INSERT INTO match_quality_metrics (
    user_id,
    algorithm_version,
    period_start,
    period_end,
    total_jobs_shown,
    jobs_clicked,
    jobs_saved,
    jobs_applied,
    jobs_hidden,
    thumbs_up_count,
    thumbs_down_count,
    click_through_rate,
    save_rate,
    apply_rate,
    positive_feedback_rate,
    avg_match_score_clicked,
    avg_match_score_applied,
    avg_match_score_hidden
  ) VALUES (
    p_user_id,
    p_algorithm_version,
    p_period_start,
    p_period_end,
    COALESCE(v_total_shown, 0),
    COALESCE(v_clicked, 0),
    COALESCE(v_saved, 0),
    COALESCE(v_applied, 0),
    COALESCE(v_hidden, 0),
    COALESCE(v_thumbs_up, 0),
    COALESCE(v_thumbs_down, 0),
    CASE WHEN COALESCE(v_total_shown, 0) > 0 THEN v_clicked::NUMERIC / v_total_shown ELSE NULL END,
    CASE WHEN COALESCE(v_total_shown, 0) > 0 THEN v_saved::NUMERIC / v_total_shown ELSE NULL END,
    CASE WHEN COALESCE(v_total_shown, 0) > 0 THEN v_applied::NUMERIC / v_total_shown ELSE NULL END,
    CASE WHEN (COALESCE(v_thumbs_up, 0) + COALESCE(v_thumbs_down, 0)) > 0
      THEN v_thumbs_up::NUMERIC / (v_thumbs_up + v_thumbs_down)
      ELSE NULL
    END,
    v_avg_clicked,
    v_avg_applied,
    v_avg_hidden
  )
  ON CONFLICT (user_id, algorithm_version, period_start, period_end)
  DO UPDATE SET
    total_jobs_shown = EXCLUDED.total_jobs_shown,
    jobs_clicked = EXCLUDED.jobs_clicked,
    jobs_saved = EXCLUDED.jobs_saved,
    jobs_applied = EXCLUDED.jobs_applied,
    jobs_hidden = EXCLUDED.jobs_hidden,
    thumbs_up_count = EXCLUDED.thumbs_up_count,
    thumbs_down_count = EXCLUDED.thumbs_down_count,
    click_through_rate = EXCLUDED.click_through_rate,
    save_rate = EXCLUDED.save_rate,
    apply_rate = EXCLUDED.apply_rate,
    positive_feedback_rate = EXCLUDED.positive_feedback_rate,
    avg_match_score_clicked = EXCLUDED.avg_match_score_clicked,
    avg_match_score_applied = EXCLUDED.avg_match_score_applied,
    avg_match_score_hidden = EXCLUDED.avg_match_score_hidden,
    updated_at = NOW()
  RETURNING id INTO metric_id;

  RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION recalculate_match_metrics IS 'Recalculates match quality metrics for a user/algorithm/period combination';


-- Function to process all pending deduplication
CREATE OR REPLACE FUNCTION process_pending_deduplication()
RETURNS INTEGER AS $$
DECLARE
  processed_count INTEGER := 0;
  job_record RECORD;
  dup_record RECORD;
BEGIN
  -- Process jobs with pending deduplication status
  FOR job_record IN
    SELECT id, canonical_hash, user_id
    FROM jobs
    WHERE dedup_status = 'pending'
    ORDER BY created_at
    LIMIT 100  -- Process in batches
  LOOP
    -- Check if this hash already exists for this user
    SELECT id INTO dup_record
    FROM jobs
    WHERE
      id != job_record.id
      AND user_id = job_record.user_id
      AND canonical_hash = job_record.canonical_hash
      AND dedup_status IN ('canonical', 'unique')
    ORDER BY created_at
    LIMIT 1;

    IF dup_record.id IS NOT NULL THEN
      -- This is a duplicate - mark it and link to canonical
      UPDATE jobs
      SET
        dedup_status = 'duplicate',
        canonical_job_id = dup_record.id,
        dedup_confidence = 100.0,
        updated_at = NOW()
      WHERE id = job_record.id;

      -- Record the duplicate relationship
      INSERT INTO job_duplicates (canonical_job_id, duplicate_job_id, confidence_score, detection_method, matched_fields)
      VALUES (dup_record.id, job_record.id, 100.0, 'hash_match', ARRAY['title', 'company', 'location', 'salary_range'])
      ON CONFLICT (canonical_job_id, duplicate_job_id) DO NOTHING;
    ELSE
      -- No duplicate found - mark as unique
      UPDATE jobs
      SET
        dedup_status = 'unique',
        updated_at = NOW()
      WHERE id = job_record.id;
    END IF;

    processed_count := processed_count + 1;
  END LOOP;

  RETURN processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

COMMENT ON FUNCTION process_pending_deduplication IS 'Processes pending job deduplication. Call via scheduler.';


-- =============================================================================
-- PART 4: VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for clean, active jobs (excluding spam and duplicates)
CREATE OR REPLACE VIEW active_quality_jobs AS
SELECT j.*
FROM jobs j
WHERE
  j.archived = FALSE
  AND j.is_closed = FALSE
  AND j.spam_status = 'clean'
  AND j.dedup_status IN ('canonical', 'unique')
  AND (j.expires_at IS NULL OR j.expires_at > NOW());

COMMENT ON VIEW active_quality_jobs IS 'Jobs that are clean (not spam), not duplicates, not closed, and not expired';


-- View for jobs needing spam review
CREATE OR REPLACE VIEW jobs_pending_spam_review AS
SELECT
  j.*,
  (SELECT COUNT(*) FROM spam_reports sr WHERE sr.job_id = j.id AND sr.review_status = 'pending') AS pending_reports
FROM jobs j
WHERE
  j.spam_status IN ('suspicious', 'pending_review')
  OR EXISTS (
    SELECT 1 FROM spam_reports sr
    WHERE sr.job_id = j.id AND sr.review_status = 'pending'
  );

COMMENT ON VIEW jobs_pending_spam_review IS 'Jobs that need spam review (suspicious status or pending reports)';


-- View for algorithm performance comparison
CREATE OR REPLACE VIEW algorithm_performance_summary AS
SELECT
  algorithm_version,
  COUNT(DISTINCT user_id) AS users,
  SUM(total_jobs_shown) AS total_shown,
  SUM(jobs_applied) AS total_applied,
  AVG(apply_rate) AS avg_apply_rate,
  AVG(positive_feedback_rate) AS avg_positive_rate,
  AVG(avg_match_score_applied) AS avg_score_for_applied
FROM match_quality_metrics
WHERE period_end > NOW() - INTERVAL '30 days'
GROUP BY algorithm_version
ORDER BY avg_apply_rate DESC NULLS LAST;

COMMENT ON VIEW algorithm_performance_summary IS 'Comparison of match algorithm performance for A/B testing';


-- =============================================================================
-- PART 5: GRANT PERMISSIONS FOR NEW OBJECTS
-- =============================================================================

-- Grant execute on cleanup functions (service role only)
GRANT EXECUTE ON FUNCTION cleanup_expired_jobs TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_training_feedback TO service_role;
GRANT EXECUTE ON FUNCTION archive_spam_jobs TO service_role;
GRANT EXECUTE ON FUNCTION process_pending_deduplication TO service_role;

-- Grant execute on metric recalculation (service role only)
GRANT EXECUTE ON FUNCTION recalculate_match_metrics TO service_role;

-- Grant select on views to authenticated users
GRANT SELECT ON active_quality_jobs TO authenticated;


-- =============================================================================
-- PART 6: SCHEDULED JOB SUGGESTIONS (Comments only)
-- =============================================================================

-- These functions should be called on a schedule via pg_cron or external scheduler:
--
-- Every hour:
--   SELECT cleanup_expired_jobs();
--   SELECT archive_spam_jobs();
--
-- Every 15 minutes:
--   SELECT process_pending_deduplication();
--
-- Daily at midnight:
--   SELECT cleanup_old_training_feedback(180);
--
-- Weekly (for each active user and algorithm):
--   SELECT recalculate_match_metrics(user_id, 'v2.0', NOW() - INTERVAL '7 days', NOW());
--


-- =============================================================================
-- MIGRATION SUMMARY
-- =============================================================================
--
-- Extensions enabled: 1
--   - pg_trgm (for fuzzy text matching in deduplication)
--
-- Indexes created: 3
--   - Trigram indexes on jobs.title, jobs.company, jobs.location
--
-- Functions created: 5
--   - cleanup_expired_jobs()
--   - cleanup_old_training_feedback(days)
--   - archive_spam_jobs()
--   - recalculate_match_metrics(user, algo, start, end)
--   - process_pending_deduplication()
--
-- Views created: 3
--   - active_quality_jobs (clean, active, non-duplicate jobs)
--   - jobs_pending_spam_review (jobs needing review)
--   - algorithm_performance_summary (A/B test comparison)
--
-- =============================================================================
