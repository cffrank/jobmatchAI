-- =============================================================================
-- Job Deduplication System
-- Migration: 018_add_job_deduplication.sql
--
-- This migration adds comprehensive job deduplication support:
-- - job_duplicates: Stores detected duplicate relationships
-- - canonical_job_metadata: Tracks quality scores for canonical job selection
-- - Indexes for efficient similarity matching and duplicate lookups
-- - Functions for deduplication processing
--
-- Features:
-- - Fuzzy matching on title, company, location, description
-- - Quality-based canonical job selection (completeness, source reliability)
-- - Similarity scoring with confidence levels
-- - Efficient O(log n) lookups via composite indexes
-- =============================================================================

-- =============================================================================
-- TABLE: job_duplicates
-- Stores detected duplicate job relationships with similarity scores
-- =============================================================================

CREATE TABLE job_duplicates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Job relationships
  -- canonical_job_id is the "best quality" job that represents the group
  -- duplicate_job_id is the inferior/duplicate job
  canonical_job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  duplicate_job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Similarity metrics (0-100 scale)
  title_similarity NUMERIC(5, 2) NOT NULL CHECK (title_similarity >= 0 AND title_similarity <= 100),
  company_similarity NUMERIC(5, 2) NOT NULL CHECK (company_similarity >= 0 AND company_similarity <= 100),
  location_similarity NUMERIC(5, 2) NOT NULL CHECK (location_similarity >= 0 AND location_similarity <= 100),
  description_similarity NUMERIC(5, 2) NOT NULL CHECK (description_similarity >= 0 AND description_similarity <= 100),

  -- Overall similarity (weighted average)
  overall_similarity NUMERIC(5, 2) NOT NULL CHECK (overall_similarity >= 0 AND overall_similarity <= 100),

  -- Confidence level
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('high', 'medium', 'low')),

  -- Detection metadata
  detection_method TEXT NOT NULL, -- e.g., 'fuzzy_match', 'url_match', 'manual'
  detection_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Manual override support
  manually_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  -- Prevent duplicate detection records
  CONSTRAINT unique_duplicate_pair UNIQUE (canonical_job_id, duplicate_job_id),
  -- Prevent self-referential duplicates
  CONSTRAINT no_self_duplicate CHECK (canonical_job_id != duplicate_job_id)
);

COMMENT ON TABLE job_duplicates IS 'Detected duplicate job relationships with similarity scores';
COMMENT ON COLUMN job_duplicates.canonical_job_id IS 'The canonical (best quality) job in the duplicate group';
COMMENT ON COLUMN job_duplicates.duplicate_job_id IS 'The duplicate (lower quality) job';
COMMENT ON COLUMN job_duplicates.overall_similarity IS 'Weighted average similarity score (0-100)';
COMMENT ON COLUMN job_duplicates.confidence_level IS 'Detection confidence: high (>85%), medium (70-85%), low (<70%)';
COMMENT ON COLUMN job_duplicates.detection_method IS 'How the duplicate was detected: fuzzy_match, url_match, manual';

-- Indexes for efficient duplicate lookups
CREATE INDEX idx_job_duplicates_canonical ON job_duplicates(canonical_job_id);
CREATE INDEX idx_job_duplicates_duplicate ON job_duplicates(duplicate_job_id);
CREATE INDEX idx_job_duplicates_similarity ON job_duplicates(overall_similarity DESC);
CREATE INDEX idx_job_duplicates_confidence ON job_duplicates(confidence_level);
CREATE INDEX idx_job_duplicates_detection_date ON job_duplicates(detection_date DESC);

-- Composite index for finding all duplicates of a canonical job
CREATE INDEX idx_job_duplicates_canonical_similarity ON job_duplicates(canonical_job_id, overall_similarity DESC);

-- RLS Policies
ALTER TABLE job_duplicates ENABLE ROW LEVEL SECURITY;

-- Users can view duplicates for their jobs
CREATE POLICY "Users can view duplicates for their jobs"
  ON job_duplicates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_duplicates.canonical_job_id
      AND jobs.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_duplicates.duplicate_job_id
      AND jobs.user_id = auth.uid()
    )
  );

-- Users can manually confirm duplicates for their jobs
CREATE POLICY "Users can confirm duplicates for their jobs"
  ON job_duplicates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_duplicates.canonical_job_id
      AND jobs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_duplicates.canonical_job_id
      AND jobs.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER set_job_duplicates_updated_at
  BEFORE UPDATE ON job_duplicates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE: canonical_job_metadata
-- Stores quality scores for canonical job selection
-- =============================================================================

CREATE TABLE canonical_job_metadata (
  job_id UUID PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,

  -- Quality scores (0-100 scale)
  completeness_score NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (completeness_score >= 0 AND completeness_score <= 100),
  source_reliability_score NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (source_reliability_score >= 0 AND source_reliability_score <= 100),
  freshness_score NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (freshness_score >= 0 AND freshness_score <= 100),

  -- Overall quality score (weighted average)
  overall_quality_score NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (overall_quality_score >= 0 AND overall_quality_score <= 100),

  -- Metadata tracking
  field_count INTEGER DEFAULT 0 CHECK (field_count >= 0), -- Number of non-null fields
  description_length INTEGER DEFAULT 0 CHECK (description_length >= 0),
  has_salary_range BOOLEAN DEFAULT FALSE,
  has_url BOOLEAN DEFAULT FALSE,

  -- Source reliability mapping
  -- linkedin: 90, indeed: 85, manual: 100
  source_type TEXT,

  -- Duplicate group tracking
  is_canonical BOOLEAN DEFAULT FALSE, -- Is this job the canonical for a duplicate group?
  duplicate_count INTEGER DEFAULT 0 CHECK (duplicate_count >= 0), -- Number of duplicates pointing to this

  -- Timestamps
  calculated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE canonical_job_metadata IS 'Quality scores for canonical job selection';
COMMENT ON COLUMN canonical_job_metadata.completeness_score IS 'Score based on number of filled fields (0-100)';
COMMENT ON COLUMN canonical_job_metadata.source_reliability_score IS 'Score based on data source reliability (0-100)';
COMMENT ON COLUMN canonical_job_metadata.freshness_score IS 'Score based on posting date recency (0-100)';
COMMENT ON COLUMN canonical_job_metadata.overall_quality_score IS 'Weighted average of all quality metrics';
COMMENT ON COLUMN canonical_job_metadata.is_canonical IS 'TRUE if this job is canonical for a duplicate group';

-- Indexes for canonical selection
CREATE INDEX idx_canonical_metadata_quality ON canonical_job_metadata(overall_quality_score DESC);
CREATE INDEX idx_canonical_metadata_is_canonical ON canonical_job_metadata(is_canonical) WHERE is_canonical = TRUE;
CREATE INDEX idx_canonical_metadata_duplicate_count ON canonical_job_metadata(duplicate_count DESC);

-- RLS Policies
ALTER TABLE canonical_job_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metadata for their jobs"
  ON canonical_job_metadata FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = canonical_job_metadata.job_id
      AND jobs.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER set_canonical_metadata_updated_at
  BEFORE UPDATE ON canonical_job_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FUNCTION: calculate_job_quality_score
-- Calculates quality score for a job to determine canonical selection
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_job_quality_score(p_job_id UUID)
RETURNS NUMERIC AS $$
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
  SELECT * INTO v_job FROM jobs WHERE id = p_job_id;

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
  -- Jobs posted within 7 days: 100
  -- Jobs posted within 30 days: 75
  -- Jobs posted within 90 days: 50
  -- Older jobs: 25
  v_days_old := EXTRACT(EPOCH FROM (NOW() - v_job.created_at::TIMESTAMPTZ)) / 86400;

  v_freshness_score := CASE
    WHEN v_days_old <= 7 THEN 100
    WHEN v_days_old <= 30 THEN 75
    WHEN v_days_old <= 90 THEN 50
    ELSE 25
  END;

  -- Calculate overall score (weighted average)
  -- Weights: completeness 50%, source reliability 30%, freshness 20%
  v_overall_score := (v_completeness_score * 0.5) + (v_source_reliability_score * 0.3) + (v_freshness_score * 0.2);

  -- Insert or update metadata
  INSERT INTO canonical_job_metadata (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_job_quality_score IS 'Calculates quality score for canonical job selection';

-- =============================================================================
-- FUNCTION: get_canonical_jobs_only
-- Returns jobs excluding duplicates (only canonical jobs)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_canonical_jobs_only(p_user_id UUID, p_limit INTEGER DEFAULT 20, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  company TEXT,
  location TEXT,
  description TEXT,
  url TEXT,
  source TEXT,
  job_type job_type,
  experience_level experience_level,
  salary_min INTEGER,
  salary_max INTEGER,
  match_score NUMERIC,
  archived BOOLEAN,
  saved BOOLEAN,
  added_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  duplicate_count INTEGER
) AS $$
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
  FROM jobs j
  LEFT JOIN canonical_job_metadata cm ON j.id = cm.job_id
  WHERE j.user_id = p_user_id
    -- Exclude jobs that are marked as duplicates
    AND NOT EXISTS (
      SELECT 1 FROM job_duplicates jd
      WHERE jd.duplicate_job_id = j.id
    )
  ORDER BY j.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_canonical_jobs_only IS 'Returns jobs excluding duplicates (canonical jobs only)';

-- =============================================================================
-- FUNCTION: mark_as_canonical
-- Marks a job as canonical and updates duplicate counts
-- =============================================================================

CREATE OR REPLACE FUNCTION mark_as_canonical(p_job_id UUID)
RETURNS VOID AS $$
DECLARE
  v_duplicate_count INTEGER;
BEGIN
  -- Count duplicates
  SELECT COUNT(*) INTO v_duplicate_count
  FROM job_duplicates
  WHERE canonical_job_id = p_job_id;

  -- Update metadata
  UPDATE canonical_job_metadata
  SET
    is_canonical = TRUE,
    duplicate_count = v_duplicate_count,
    updated_at = NOW()
  WHERE job_id = p_job_id;

  -- If metadata doesn't exist, create it
  IF NOT FOUND THEN
    PERFORM calculate_job_quality_score(p_job_id);

    UPDATE canonical_job_metadata
    SET
      is_canonical = TRUE,
      duplicate_count = v_duplicate_count,
      updated_at = NOW()
    WHERE job_id = p_job_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_as_canonical IS 'Marks a job as canonical and updates duplicate counts';

-- =============================================================================
-- INDEXES: Full-text search and similarity matching
-- =============================================================================

-- GIN indexes for full-text search (used in fuzzy matching)
-- These enable efficient similarity searches on large datasets

-- Create tsvector columns for full-text search
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS title_tsv tsvector;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_tsv tsvector;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description_tsv tsvector;

-- Create indexes on tsvector columns
CREATE INDEX IF NOT EXISTS idx_jobs_title_tsv ON jobs USING GIN(title_tsv);
CREATE INDEX IF NOT EXISTS idx_jobs_company_tsv ON jobs USING GIN(company_tsv);
CREATE INDEX IF NOT EXISTS idx_jobs_description_tsv ON jobs USING GIN(description_tsv);

-- Trigger to automatically update tsvector columns
CREATE OR REPLACE FUNCTION update_jobs_tsv()
RETURNS TRIGGER AS $$
BEGIN
  NEW.title_tsv := to_tsvector('english', COALESCE(NEW.title, ''));
  NEW.company_tsv := to_tsvector('english', COALESCE(NEW.company, ''));
  NEW.description_tsv := to_tsvector('english', COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_tsv_update
  BEFORE INSERT OR UPDATE OF title, company, description ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_tsv();

-- Backfill tsvector columns for existing jobs
UPDATE jobs SET
  title_tsv = to_tsvector('english', COALESCE(title, '')),
  company_tsv = to_tsvector('english', COALESCE(company, '')),
  description_tsv = to_tsvector('english', COALESCE(description, ''));

-- =============================================================================
-- GRANTS
-- =============================================================================

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION calculate_job_quality_score TO authenticated;
GRANT EXECUTE ON FUNCTION get_canonical_jobs_only TO authenticated;
GRANT EXECUTE ON FUNCTION mark_as_canonical TO service_role;

-- =============================================================================
-- MIGRATION SUMMARY
-- =============================================================================
--
-- Tables created: 2
--   - job_duplicates: Duplicate relationships with similarity scores
--   - canonical_job_metadata: Quality scores for canonical selection
--
-- Functions created: 3
--   - calculate_job_quality_score: Quality scoring algorithm
--   - get_canonical_jobs_only: Query canonical jobs (excluding duplicates)
--   - mark_as_canonical: Update canonical status
--
-- Indexes: Optimized for O(log n) duplicate lookups
--   - Composite indexes for canonical/duplicate relationships
--   - Full-text search indexes for fuzzy matching
--   - Quality score indexes for canonical selection
--
-- RLS policies: Users can only view/manage duplicates for their own jobs
--
-- =============================================================================
