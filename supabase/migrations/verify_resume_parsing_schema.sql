-- Verification Script: Check if all columns needed for resume parsing exist
-- Run this in Supabase Dashboard > SQL Editor to verify schema

-- =============================================================================
-- COLUMN EXISTENCE CHECK
-- =============================================================================

DO $$
DECLARE
  users_linkedin_url BOOLEAN;
  work_exp_location BOOLEAN;
  work_exp_emp_type BOOLEAN;
  education_is_current BOOLEAN;
  education_grade BOOLEAN;
  skills_years_exp BOOLEAN;
  skills_endorsed BOOLEAN;
  all_exist BOOLEAN := true;
BEGIN
  -- Check each required column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'linkedin_url'
  ) INTO users_linkedin_url;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_experience' AND column_name = 'location'
  ) INTO work_exp_location;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'work_experience' AND column_name = 'employment_type'
  ) INTO work_exp_emp_type;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'education' AND column_name = 'is_current'
  ) INTO education_is_current;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'education' AND column_name = 'grade'
  ) INTO education_grade;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'skills' AND column_name = 'years_of_experience'
  ) INTO skills_years_exp;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'skills' AND column_name = 'endorsed_count'
  ) INTO skills_endorsed;

  -- Display results
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'RESUME PARSING SCHEMA VERIFICATION';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'users table:';
  RAISE NOTICE '  linkedin_url: %', CASE WHEN users_linkedin_url THEN '✅ EXISTS' ELSE '❌ MISSING' END;

  RAISE NOTICE '';
  RAISE NOTICE 'work_experience table:';
  RAISE NOTICE '  location: %', CASE WHEN work_exp_location THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '  employment_type: %', CASE WHEN work_exp_emp_type THEN '✅ EXISTS' ELSE '❌ MISSING' END;

  RAISE NOTICE '';
  RAISE NOTICE 'education table:';
  RAISE NOTICE '  is_current: %', CASE WHEN education_is_current THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '  grade: %', CASE WHEN education_grade THEN '✅ EXISTS' ELSE '❌ MISSING' END;

  RAISE NOTICE '';
  RAISE NOTICE 'skills table:';
  RAISE NOTICE '  years_of_experience: %', CASE WHEN skills_years_exp THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '  endorsed_count: %', CASE WHEN skills_endorsed THEN '✅ EXISTS' ELSE '❌ MISSING' END;

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';

  -- Overall status
  all_exist := users_linkedin_url AND work_exp_location AND work_exp_emp_type AND
               education_is_current AND education_grade AND skills_years_exp AND skills_endorsed;

  IF all_exist THEN
    RAISE NOTICE 'STATUS: ✅ ALL REQUIRED COLUMNS EXIST';
    RAISE NOTICE 'Resume parsing should work correctly.';
  ELSE
    RAISE NOTICE 'STATUS: ❌ MISSING COLUMNS DETECTED';
    RAISE NOTICE 'Apply migration 014_ensure_resume_parsing_columns.sql to fix.';
  END IF;

  RAISE NOTICE '=================================================================';
END $$;

-- =============================================================================
-- DETAILED COLUMN INFORMATION
-- =============================================================================

-- Show detailed info for all relevant columns
SELECT
  'users' AS table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN ('linkedin_url', 'first_name', 'last_name', 'phone', 'location', 'photo_url', 'current_title', 'professional_summary')

UNION ALL

SELECT
  'work_experience' AS table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'work_experience'
  AND column_name IN ('location', 'employment_type', 'company', 'title', 'description', 'start_date', 'end_date', 'is_current')

UNION ALL

SELECT
  'education' AS table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'education'
  AND column_name IN ('is_current', 'grade', 'institution', 'degree', 'field_of_study', 'start_date', 'end_date')

UNION ALL

SELECT
  'skills' AS table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'skills'
  AND column_name IN ('years_of_experience', 'endorsed_count', 'name', 'proficiency_level')

ORDER BY table_name, column_name;
