-- Migration: Enhance existing profile tables for LinkedIn import
-- Description: Add missing columns to work_experience, education, and skills tables
-- Created: 2025-12-21

-- Add missing columns to work_experience table
ALTER TABLE public.work_experience
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS employment_type TEXT; -- 'Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'

-- Add missing columns to education table
ALTER TABLE public.education
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS grade TEXT; -- GPA or grade

-- Add missing columns to skills table
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
  ADD COLUMN IF NOT EXISTS endorsed_count INTEGER DEFAULT 0; -- Future: track endorsements

-- Add unique constraint to skills table to prevent duplicate skills per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_user_skill_name'
    AND conrelid = 'public.skills'::regclass
  ) THEN
    ALTER TABLE public.skills
      ADD CONSTRAINT unique_user_skill_name UNIQUE(user_id, name);
  END IF;
END $$;

-- Add indexes for performance (if they don't already exist)
CREATE INDEX IF NOT EXISTS idx_work_experience_location ON public.work_experience(user_id, location);
CREATE INDEX IF NOT EXISTS idx_education_current ON public.education(user_id, is_current);
CREATE INDEX IF NOT EXISTS idx_skills_name ON public.skills(name);

-- Comments for documentation
COMMENT ON COLUMN public.work_experience.location IS 'Job location (city, state, or remote)';
COMMENT ON COLUMN public.work_experience.employment_type IS 'Employment type: Full-time, Part-time, Contract, Freelance, Internship';
COMMENT ON COLUMN public.education.is_current IS 'True if user currently studies here';
COMMENT ON COLUMN public.education.grade IS 'GPA or grade (e.g., 3.8, Honors)';
COMMENT ON COLUMN public.skills.years_of_experience IS 'Years of experience with this skill';
COMMENT ON COLUMN public.skills.endorsed_count IS 'Number of endorsements (for future LinkedIn integration)';
