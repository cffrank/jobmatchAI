-- Migration: Add linkedin_url column to users table
-- Description: Allow users to save and display their LinkedIn profile URL
-- Created: 2025-12-21

-- Add linkedin_url column
ALTER TABLE public.users
ADD COLUMN linkedin_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.users.linkedin_url IS 'User LinkedIn profile URL (e.g., https://linkedin.com/in/username)';
