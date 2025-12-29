-- Migration: Add job expiration and save tracking
-- Description: Add saved_at and expires_at columns to jobs table for automatic cleanup
-- Date: 2025-12-28
--
-- Requirements:
-- 1. Jobs expire after 48 hours unless saved
-- 2. saved_at tracks when a job was saved by the user
-- 3. expires_at is set to 48 hours from created_at for unsaved jobs
-- 4. Saved jobs have NULL expires_at (never expire)
-- =============================================================================

-- Add new columns to jobs table
ALTER TABLE jobs
ADD COLUMN saved_at TIMESTAMPTZ,
ADD COLUMN expires_at TIMESTAMPTZ;

-- Set default expires_at for existing unsaved jobs (48 hours from created_at)
UPDATE jobs
SET expires_at = created_at + INTERVAL '48 hours'
WHERE saved = FALSE AND expires_at IS NULL;

-- Update saved jobs to have saved_at if not already set
UPDATE jobs
SET saved_at = updated_at
WHERE saved = TRUE AND saved_at IS NULL;

-- Create indexes for efficient cleanup queries
CREATE INDEX idx_jobs_expires_at ON jobs(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_jobs_saved_at ON jobs(saved_at) WHERE saved_at IS NOT NULL;
CREATE INDEX idx_jobs_unsaved_expired ON jobs(user_id, expires_at) WHERE saved = FALSE AND expires_at < NOW();

-- =============================================================================
-- Trigger: Set expires_at on job creation
-- When a new job is inserted, automatically set expires_at to 48 hours from now
-- =============================================================================
CREATE OR REPLACE FUNCTION set_job_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set expiration for unsaved jobs
  IF NEW.saved = FALSE OR NEW.saved IS NULL THEN
    NEW.expires_at := NOW() + INTERVAL '48 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_job_expiration
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_job_expiration();

-- =============================================================================
-- Trigger: Update expires_at and saved_at when job is saved/unsaved
-- When saved changes from FALSE to TRUE, set saved_at and clear expires_at
-- When saved changes from TRUE to FALSE, set expires_at and clear saved_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_job_save_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If saved changed from FALSE/NULL to TRUE
  IF (OLD.saved IS DISTINCT FROM NEW.saved) AND NEW.saved = TRUE THEN
    NEW.saved_at := NOW();
    NEW.expires_at := NULL;  -- Saved jobs never expire
  END IF;

  -- If saved changed from TRUE to FALSE
  IF (OLD.saved IS DISTINCT FROM NEW.saved) AND NEW.saved = FALSE THEN
    NEW.saved_at := NULL;
    NEW.expires_at := NOW() + INTERVAL '48 hours';  -- Reset expiration
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_job_save_status
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_job_save_status();

-- =============================================================================
-- Function: Cleanup expired unsaved jobs
-- Deletes jobs that have expired and are not saved
-- Returns the number of jobs deleted
-- =============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_jobs()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
  count INTEGER;
BEGIN
  -- Delete expired unsaved jobs
  WITH deleted AS (
    DELETE FROM jobs
    WHERE saved = FALSE
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO count FROM deleted;

  -- Log the cleanup
  RAISE NOTICE 'Cleaned up % expired jobs', count;

  RETURN QUERY SELECT count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_jobs IS 'Deletes jobs that have expired (48 hours after creation) and are not saved. Called periodically by cron job.';

-- =============================================================================
-- Function: Get job expiration info for user
-- Returns summary of job expiration status
-- =============================================================================
CREATE OR REPLACE FUNCTION get_job_expiration_summary(p_user_id UUID)
RETURNS TABLE(
  total_jobs BIGINT,
  saved_jobs BIGINT,
  unsaved_jobs BIGINT,
  expiring_soon BIGINT,  -- Expires in next 6 hours
  expired_jobs BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE TRUE)::BIGINT AS total_jobs,
    COUNT(*) FILTER (WHERE saved = TRUE)::BIGINT AS saved_jobs,
    COUNT(*) FILTER (WHERE saved = FALSE)::BIGINT AS unsaved_jobs,
    COUNT(*) FILTER (WHERE saved = FALSE AND expires_at IS NOT NULL AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '6 hours')::BIGINT AS expiring_soon,
    COUNT(*) FILTER (WHERE saved = FALSE AND expires_at IS NOT NULL AND expires_at < NOW())::BIGINT AS expired_jobs
  FROM jobs
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_job_expiration_summary IS 'Returns summary statistics about job expiration for a user';

-- =============================================================================
-- Grants
-- =============================================================================
GRANT EXECUTE ON FUNCTION cleanup_expired_jobs TO service_role;
GRANT EXECUTE ON FUNCTION get_job_expiration_summary TO authenticated;

-- Add helpful comments
COMMENT ON COLUMN jobs.saved_at IS 'Timestamp when the job was saved by the user. NULL if never saved.';
COMMENT ON COLUMN jobs.expires_at IS 'Timestamp when the unsaved job will expire (48 hours after creation). NULL for saved jobs.';
