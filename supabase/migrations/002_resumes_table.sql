-- Migration: Create resumes table
-- Description: Stores user resumes (master and tailored versions)
-- Author: Migration Script
-- Date: 2025-12-20

-- Create resume_type enum
CREATE TYPE resume_type AS ENUM ('master', 'tailored');

-- Create resumes table
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type resume_type NOT NULL DEFAULT 'master',
  title TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  formats TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT resumes_user_id_not_null CHECK (user_id IS NOT NULL),
  CONSTRAINT resumes_title_not_empty CHECK (LENGTH(TRIM(title)) > 0)
);

-- Create indexes for performance
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_type ON resumes(type);
CREATE INDEX idx_resumes_updated_at ON resumes(updated_at DESC);
CREATE INDEX idx_resumes_user_type ON resumes(user_id, type);

-- Enable Row Level Security
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own resumes"
  ON resumes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resumes"
  ON resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resumes"
  ON resumes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resumes"
  ON resumes FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to auto-update updated_at timestamp
CREATE TRIGGER update_resumes_updated_at
  BEFORE UPDATE ON resumes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comment
COMMENT ON TABLE resumes IS 'User resumes with master and tailored versions';
COMMENT ON COLUMN resumes.sections IS 'JSONB containing header, summary, experience, education, skills sections';
COMMENT ON COLUMN resumes.formats IS 'Array of available export formats (pdf, docx, txt)';
