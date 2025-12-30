-- Migration: Add job_compatibility_analyses table
-- Purpose: Store AI-generated job compatibility analyses for historical tracking and fallback caching
-- Author: JobMatch AI Team
-- Date: 2025-12-29

-- Create table for storing job compatibility analyses
CREATE TABLE IF NOT EXISTS job_compatibility_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Analysis results (JSON)
  -- Stores the full JobCompatibilityAnalysis object:
  -- - overallScore: number (0-100)
  -- - recommendation: string
  -- - dimensions: object with 10 dimension scores
  -- - strengths: string[]
  -- - gaps: string[]
  -- - redFlags: string[]
  analysis JSONB NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Composite unique constraint (one analysis per user-job pair)
  CONSTRAINT unique_user_job_analysis UNIQUE (user_id, job_id)
);

-- Create indexes for common queries
CREATE INDEX idx_job_compatibility_analyses_user_id ON job_compatibility_analyses(user_id);
CREATE INDEX idx_job_compatibility_analyses_job_id ON job_compatibility_analyses(job_id);
CREATE INDEX idx_job_compatibility_analyses_created_at ON job_compatibility_analyses(created_at DESC);

-- GIN index for JSONB queries (e.g., filtering by recommendation)
CREATE INDEX idx_job_compatibility_analyses_analysis ON job_compatibility_analyses USING GIN(analysis);

-- Row Level Security (RLS)
ALTER TABLE job_compatibility_analyses ENABLE ROW LEVEL SECURITY;

-- Users can only view their own analyses
CREATE POLICY "Users can view their own job compatibility analyses"
  ON job_compatibility_analyses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own analyses
CREATE POLICY "Users can insert their own job compatibility analyses"
  ON job_compatibility_analyses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own analyses (for re-analysis)
CREATE POLICY "Users can update their own job compatibility analyses"
  ON job_compatibility_analyses
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own analyses
CREATE POLICY "Users can delete their own job compatibility analyses"
  ON job_compatibility_analyses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_compatibility_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_compatibility_analyses_updated_at
  BEFORE UPDATE ON job_compatibility_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_job_compatibility_analyses_updated_at();

-- Comments for documentation
COMMENT ON TABLE job_compatibility_analyses IS 'Stores AI-generated job compatibility analyses for historical tracking and fallback caching';
COMMENT ON COLUMN job_compatibility_analyses.analysis IS 'Full JobCompatibilityAnalysis JSON object with scores, dimensions, strengths, gaps, and red flags';
COMMENT ON COLUMN job_compatibility_analyses.user_id IS 'User who owns this analysis (references users.id)';
COMMENT ON COLUMN job_compatibility_analyses.job_id IS 'Job being analyzed (references jobs.id)';
