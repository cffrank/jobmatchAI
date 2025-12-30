-- Resume Gap Analysis Table
-- Stores AI-generated gap analysis with questions to improve resume/profile

CREATE TABLE IF NOT EXISTS public.resume_gap_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Analysis metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Analysis results (from AI)
  overall_assessment TEXT,
  gap_count INTEGER NOT NULL DEFAULT 0,
  red_flag_count INTEGER NOT NULL DEFAULT 0,
  urgency TEXT CHECK (urgency IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),

  -- Gaps and flags (JSONB for structured data)
  -- Array of: { id, type, category, description, impact, severity }
  identified_gaps JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Questions for user to answer (JSONB)
  -- Array of: { question_id, priority, gap_addressed, question, context, expected_outcome, answer }
  clarification_questions JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Next steps recommendations
  immediate_action TEXT,
  long_term_recommendations JSONB DEFAULT '[]'::jsonb,

  -- User progress
  questions_answered INTEGER NOT NULL DEFAULT 0,
  questions_total INTEGER NOT NULL DEFAULT 0,
  completion_percentage INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN questions_total > 0 THEN (questions_answered * 100 / questions_total)
      ELSE 100
    END
  ) STORED,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'archived')),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resume_gap_analyses_user_id ON public.resume_gap_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_gap_analyses_status ON public.resume_gap_analyses(status);
CREATE INDEX IF NOT EXISTS idx_resume_gap_analyses_created_at ON public.resume_gap_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resume_gap_analyses_urgency ON public.resume_gap_analyses(urgency);

-- RLS Policies
ALTER TABLE public.resume_gap_analyses ENABLE ROW LEVEL SECURITY;

-- Users can view their own analyses
CREATE POLICY "Users can view their own gap analyses"
  ON public.resume_gap_analyses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own analyses
CREATE POLICY "Users can create their own gap analyses"
  ON public.resume_gap_analyses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own analyses (to add answers)
CREATE POLICY "Users can update their own gap analyses"
  ON public.resume_gap_analyses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own analyses
CREATE POLICY "Users can delete their own gap analyses"
  ON public.resume_gap_analyses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_resume_gap_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_resume_gap_analyses_updated_at
  BEFORE UPDATE ON public.resume_gap_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_resume_gap_analyses_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.resume_gap_analyses IS 'Stores AI-generated resume gap analysis with improvement questions';
COMMENT ON COLUMN public.resume_gap_analyses.identified_gaps IS 'Array of gap objects with id, type, category, description, impact, severity';
COMMENT ON COLUMN public.resume_gap_analyses.clarification_questions IS 'Array of question objects with question_id, priority, gap_addressed, question, context, expected_outcome, and user answer';
COMMENT ON COLUMN public.resume_gap_analyses.completion_percentage IS 'Percentage of questions answered (auto-calculated)';
