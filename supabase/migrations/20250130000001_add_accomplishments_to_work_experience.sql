-- Migration: Add accomplishments column to work_experience table
-- Description: Store key accomplishments/achievements for each work experience position

-- Add accomplishments column as TEXT array
ALTER TABLE public.work_experience
ADD COLUMN IF NOT EXISTS accomplishments TEXT[] DEFAULT '{}';

-- Add index for querying accomplishments
CREATE INDEX IF NOT EXISTS idx_work_experience_accomplishments
  ON public.work_experience USING GIN (accomplishments);

-- Add comment for documentation
COMMENT ON COLUMN public.work_experience.accomplishments IS 'Array of key accomplishments and achievements for this position';
