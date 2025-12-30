-- Migration: Add Gap Analysis and Work Experience Narratives tables
-- Description: Store AI-generated gap analysis, user answers, and position narratives

-- =============================================================================
-- Gap Analyses Table
-- Stores the AI-generated gap analysis results for each resume import
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.gap_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Overall assessment
  overall_assessment TEXT NOT NULL,
  gap_count INTEGER NOT NULL DEFAULT 0,
  red_flag_count INTEGER NOT NULL DEFAULT 0,
  urgency TEXT NOT NULL CHECK (urgency IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),

  -- Detailed gaps and flags (stored as JSONB)
  identified_gaps_and_flags JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Next steps (stored as JSONB)
  next_steps JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for user lookups
CREATE INDEX IF NOT EXISTS idx_gap_analyses_user_id ON public.gap_analyses(user_id);

-- Add index for recent analyses
CREATE INDEX IF NOT EXISTS idx_gap_analyses_created_at ON public.gap_analyses(created_at DESC);

-- Add RLS policies
ALTER TABLE public.gap_analyses ENABLE ROW LEVEL SECURITY;

-- Users can view their own gap analyses
CREATE POLICY "Users can view their own gap analyses"
  ON public.gap_analyses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own gap analyses
CREATE POLICY "Users can create their own gap analyses"
  ON public.gap_analyses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own gap analyses
CREATE POLICY "Users can update their own gap analyses"
  ON public.gap_analyses
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own gap analyses
CREATE POLICY "Users can delete their own gap analyses"
  ON public.gap_analyses
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- Gap Analysis Answers Table
-- Stores user answers to clarification questions
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.gap_analysis_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_analysis_id UUID NOT NULL REFERENCES public.gap_analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Question metadata
  question_id INTEGER NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  gap_addressed TEXT NOT NULL,
  question TEXT NOT NULL,
  context TEXT NOT NULL,
  expected_outcome TEXT NOT NULL,

  -- User's answer
  answer TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for gap analysis lookups
CREATE INDEX IF NOT EXISTS idx_gap_analysis_answers_gap_analysis_id
  ON public.gap_analysis_answers(gap_analysis_id);

-- Add index for user lookups
CREATE INDEX IF NOT EXISTS idx_gap_analysis_answers_user_id
  ON public.gap_analysis_answers(user_id);

-- Add RLS policies
ALTER TABLE public.gap_analysis_answers ENABLE ROW LEVEL SECURITY;

-- Users can view their own answers
CREATE POLICY "Users can view their own gap analysis answers"
  ON public.gap_analysis_answers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own answers
CREATE POLICY "Users can create their own gap analysis answers"
  ON public.gap_analysis_answers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own answers
CREATE POLICY "Users can update their own gap analysis answers"
  ON public.gap_analysis_answers
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own answers
CREATE POLICY "Users can delete their own gap analysis answers"
  ON public.gap_analysis_answers
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- Work Experience Narratives Table
-- Stores user-provided context/narratives for each work experience
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.work_experience_narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_experience_id UUID NOT NULL REFERENCES public.work_experience(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Narrative content
  narrative TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one narrative per work experience
  UNIQUE(work_experience_id)
);

-- Add index for work experience lookups
CREATE INDEX IF NOT EXISTS idx_work_experience_narratives_work_experience_id
  ON public.work_experience_narratives(work_experience_id);

-- Add index for user lookups
CREATE INDEX IF NOT EXISTS idx_work_experience_narratives_user_id
  ON public.work_experience_narratives(user_id);

-- Add RLS policies
ALTER TABLE public.work_experience_narratives ENABLE ROW LEVEL SECURITY;

-- Users can view their own narratives
CREATE POLICY "Users can view their own work experience narratives"
  ON public.work_experience_narratives
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own narratives
CREATE POLICY "Users can create their own work experience narratives"
  ON public.work_experience_narratives
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own narratives
CREATE POLICY "Users can update their own work experience narratives"
  ON public.work_experience_narratives
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own narratives
CREATE POLICY "Users can delete their own work experience narratives"
  ON public.work_experience_narratives
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- Triggers for updated_at timestamps
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gap_analyses_updated_at
  BEFORE UPDATE ON public.gap_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gap_analysis_answers_updated_at
  BEFORE UPDATE ON public.gap_analysis_answers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_experience_narratives_updated_at
  BEFORE UPDATE ON public.work_experience_narratives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE public.gap_analyses IS 'Stores AI-generated resume gap analysis results';
COMMENT ON TABLE public.gap_analysis_answers IS 'Stores user answers to gap analysis clarification questions';
COMMENT ON TABLE public.work_experience_narratives IS 'Stores user-provided narratives/context for work experiences';

COMMENT ON COLUMN public.gap_analyses.identified_gaps_and_flags IS 'JSONB array of identified gaps and red flags with severity levels';
COMMENT ON COLUMN public.gap_analyses.next_steps IS 'JSONB object with immediate_action and long_term_recommendations arrays';
COMMENT ON COLUMN public.work_experience_narratives.narrative IS 'User explanation for position context (why left, overlaps, short tenure, etc.)';
