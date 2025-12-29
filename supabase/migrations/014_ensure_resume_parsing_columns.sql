-- Migration: Ensure all columns needed for resume parsing exist
-- Description: Add missing linkedin_url and other profile columns if they don't exist
-- Created: 2025-12-25
-- Purpose: Fix "Could not find the 'linkedin_url' column" error

-- This migration is idempotent - it checks if columns exist before adding them
-- This ensures it can be safely run even if some columns already exist

-- Add linkedin_url column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'linkedin_url'
  ) THEN
    ALTER TABLE public.users
    ADD COLUMN linkedin_url TEXT;

    COMMENT ON COLUMN public.users.linkedin_url IS 'User LinkedIn profile URL (e.g., https://linkedin.com/in/username)';

    RAISE NOTICE 'Added linkedin_url column to users table';
  ELSE
    RAISE NOTICE 'linkedin_url column already exists in users table';
  END IF;
END $$;

-- Ensure other profile columns exist (from migration 012)
-- These are needed for LinkedIn import and resume parsing

-- Add location column to work_experience if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'work_experience'
    AND column_name = 'location'
  ) THEN
    ALTER TABLE public.work_experience
    ADD COLUMN location TEXT;

    COMMENT ON COLUMN public.work_experience.location IS 'Job location (city, state, or remote)';

    RAISE NOTICE 'Added location column to work_experience table';
  ELSE
    RAISE NOTICE 'location column already exists in work_experience table';
  END IF;
END $$;

-- Add employment_type column to work_experience if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'work_experience'
    AND column_name = 'employment_type'
  ) THEN
    ALTER TABLE public.work_experience
    ADD COLUMN employment_type TEXT;

    COMMENT ON COLUMN public.work_experience.employment_type IS 'Employment type: Full-time, Part-time, Contract, Freelance, Internship';

    RAISE NOTICE 'Added employment_type column to work_experience table';
  ELSE
    RAISE NOTICE 'employment_type column already exists in work_experience table';
  END IF;
END $$;

-- Add is_current column to education if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'education'
    AND column_name = 'is_current'
  ) THEN
    ALTER TABLE public.education
    ADD COLUMN is_current BOOLEAN DEFAULT false;

    COMMENT ON COLUMN public.education.is_current IS 'True if user currently studies here';

    RAISE NOTICE 'Added is_current column to education table';
  ELSE
    RAISE NOTICE 'is_current column already exists in education table';
  END IF;
END $$;

-- Add grade column to education if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'education'
    AND column_name = 'grade'
  ) THEN
    ALTER TABLE public.education
    ADD COLUMN grade TEXT;

    COMMENT ON COLUMN public.education.grade IS 'GPA or grade (e.g., 3.8, Honors)';

    RAISE NOTICE 'Added grade column to education table';
  ELSE
    RAISE NOTICE 'grade column already exists in education table';
  END IF;
END $$;

-- Add years_of_experience column to skills if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'skills'
    AND column_name = 'years_of_experience'
  ) THEN
    ALTER TABLE public.skills
    ADD COLUMN years_of_experience INTEGER;

    COMMENT ON COLUMN public.skills.years_of_experience IS 'Years of experience with this skill';

    RAISE NOTICE 'Added years_of_experience column to skills table';
  ELSE
    RAISE NOTICE 'years_of_experience column already exists in skills table';
  END IF;
END $$;

-- Add endorsed_count column to skills if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'skills'
    AND column_name = 'endorsed_count'
  ) THEN
    ALTER TABLE public.skills
    ADD COLUMN endorsed_count INTEGER DEFAULT 0;

    COMMENT ON COLUMN public.skills.endorsed_count IS 'Number of endorsements (for future LinkedIn integration)';

    RAISE NOTICE 'Added endorsed_count column to skills table';
  ELSE
    RAISE NOTICE 'endorsed_count column already exists in skills table';
  END IF;
END $$;

-- Add indexes for performance (if they don't already exist)
CREATE INDEX IF NOT EXISTS idx_work_experience_location ON public.work_experience(user_id, location);
CREATE INDEX IF NOT EXISTS idx_education_current ON public.education(user_id, is_current);
CREATE INDEX IF NOT EXISTS idx_skills_name_pattern ON public.skills(name);

-- Verify all columns exist and display status
DO $$
DECLARE
  missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check users.linkedin_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'linkedin_url'
  ) THEN
    missing_columns := array_append(missing_columns, 'users.linkedin_url');
  END IF;

  -- Check work_experience.location
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_experience' AND column_name = 'location'
  ) THEN
    missing_columns := array_append(missing_columns, 'work_experience.location');
  END IF;

  -- Check work_experience.employment_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_experience' AND column_name = 'employment_type'
  ) THEN
    missing_columns := array_append(missing_columns, 'work_experience.employment_type');
  END IF;

  -- Check education.is_current
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'education' AND column_name = 'is_current'
  ) THEN
    missing_columns := array_append(missing_columns, 'education.is_current');
  END IF;

  -- Check education.grade
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'education' AND column_name = 'grade'
  ) THEN
    missing_columns := array_append(missing_columns, 'education.grade');
  END IF;

  -- Check skills.years_of_experience
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'skills' AND column_name = 'years_of_experience'
  ) THEN
    missing_columns := array_append(missing_columns, 'skills.years_of_experience');
  END IF;

  -- Check skills.endorsed_count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'skills' AND column_name = 'endorsed_count'
  ) THEN
    missing_columns := array_append(missing_columns, 'skills.endorsed_count');
  END IF;

  -- Report status
  IF array_length(missing_columns, 1) IS NULL THEN
    RAISE NOTICE '✅ All required columns for resume parsing exist';
  ELSE
    RAISE WARNING '❌ Missing columns: %', array_to_string(missing_columns, ', ');
  END IF;
END $$;
