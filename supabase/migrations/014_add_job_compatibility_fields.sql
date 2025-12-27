-- ============================================================================
-- Add Missing Job Compatibility Fields and Job Searches Table
-- ============================================================================
-- Adds columns for compatibility analysis, required skills, and other missing
-- fields that the job scraper and matching algorithm need
--
-- Issue: Job scraper was trying to save required_skills and other fields
-- but they didn't exist in the database schema, causing compatibility
-- analysis to show static/zero scores instead of calculated values.
--
-- This migration adds:
-- 1. All the missing fields that the backend expects for job compatibility
-- 2. The job_searches table to track search history

-- ============================================================================
-- Part 1: Create job_searches table
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keywords TEXT,
  location TEXT,
  work_arrangement TEXT,
  job_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_job_searches_user_id ON job_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_job_searches_created_at ON job_searches(created_at DESC);

-- Enable RLS
ALTER TABLE job_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own searches
CREATE POLICY "Users can view their own job searches"
  ON job_searches
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own job searches"
  ON job_searches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE job_searches IS 'Tracks job search history for each user';
COMMENT ON COLUMN job_searches.job_count IS 'Number of jobs found in this search';

-- ============================================================================
-- Part 2: Add missing columns to jobs table
-- ============================================================================

-- Add required_skills array for skill matching
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}';
COMMENT ON COLUMN jobs.required_skills IS 'Array of required skills extracted from job description';

-- Add preferred_skills array for bonus skill matching
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS preferred_skills TEXT[] DEFAULT '{}';
COMMENT ON COLUMN jobs.preferred_skills IS 'Array of nice-to-have skills extracted from job description';

-- Add work_arrangement for location matching
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_arrangement TEXT;
COMMENT ON COLUMN jobs.work_arrangement IS 'Remote, Hybrid, On-site, or Unknown';

-- Add company_logo for UI display
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_logo TEXT;
COMMENT ON COLUMN jobs.company_logo IS 'URL to company logo image';

-- Add search_id to track which search found this job
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS search_id UUID;
COMMENT ON COLUMN jobs.search_id IS 'ID of the job search that found this job';

-- Add scraped_at timestamp
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ;
COMMENT ON COLUMN jobs.scraped_at IS 'When this job was scraped from job boards';

-- Add compatibility breakdown JSONB for detailed match scores
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS compatibility_breakdown JSONB DEFAULT '{
  "skillMatch": 0,
  "experienceMatch": 0,
  "industryMatch": 0,
  "locationMatch": 0
}'::jsonb;
COMMENT ON COLUMN jobs.compatibility_breakdown IS 'Detailed compatibility scores: skillMatch, experienceMatch, industryMatch, locationMatch';

-- Add missing_skills array to track skill gaps
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS missing_skills TEXT[] DEFAULT '{}';
COMMENT ON COLUMN jobs.missing_skills IS 'Array of required skills the user does not have';

-- Add recommendations array for AI-generated application tips
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS recommendations TEXT[] DEFAULT '{}';
COMMENT ON COLUMN jobs.recommendations IS 'Array of AI-generated recommendations for applying to this job';

-- Create index on required_skills for faster skill-based searching
CREATE INDEX IF NOT EXISTS idx_jobs_required_skills ON jobs USING GIN(required_skills);

-- Create index on compatibility_breakdown for filtering by match type
CREATE INDEX IF NOT EXISTS idx_jobs_compatibility ON jobs USING GIN(compatibility_breakdown);

-- Create index on work_arrangement for filtering
CREATE INDEX IF NOT EXISTS idx_jobs_work_arrangement ON jobs(work_arrangement) WHERE work_arrangement IS NOT NULL;

-- Create index on search_id for looking up all jobs from a search
CREATE INDEX IF NOT EXISTS idx_jobs_search_id ON jobs(search_id) WHERE search_id IS NOT NULL;
