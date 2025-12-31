-- Add spam detection fields to jobs table
-- Migration: 20251230000001_add_spam_detection_fields

-- Add spam detection columns
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS spam_detected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS spam_probability NUMERIC(3,2) CHECK (spam_probability >= 0 AND spam_probability <= 1),
ADD COLUMN IF NOT EXISTS spam_categories TEXT[],
ADD COLUMN IF NOT EXISTS spam_flags JSONB,
ADD COLUMN IF NOT EXISTS spam_analyzed_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN jobs.spam_detected IS 'Whether job was flagged as spam (probability >= 0.7)';
COMMENT ON COLUMN jobs.spam_probability IS 'AI-generated spam probability score (0.0 to 1.0)';
COMMENT ON COLUMN jobs.spam_categories IS 'Array of detected spam categories (mlm-scheme, commission-only, etc.)';
COMMENT ON COLUMN jobs.spam_flags IS 'Detailed spam flags with severity and descriptions';
COMMENT ON COLUMN jobs.spam_analyzed_at IS 'Timestamp when spam analysis was performed';

-- Create index for spam filtering queries
CREATE INDEX IF NOT EXISTS idx_jobs_spam_detected ON jobs(user_id, spam_detected) WHERE spam_detected = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_spam_probability ON jobs(user_id, spam_probability) WHERE spam_probability IS NOT NULL;

-- Create index for recent spam analysis
CREATE INDEX IF NOT EXISTS idx_jobs_spam_analyzed_at ON jobs(spam_analyzed_at DESC) WHERE spam_analyzed_at IS NOT NULL;

-- Grant necessary permissions (if using RLS)
-- Jobs table already has RLS policies that restrict access to user's own jobs
