-- ============================================================================
-- Add Missing Application Columns Migration
-- ============================================================================
-- Adds columns that the backend expects but are missing from applications table
-- Columns: job_title, company, selected_variant_id
-- Date: 2025-12-27
-- Related Issue: Backend trying to save these fields causes HTTP 500 errors

-- Add job_title column (denormalized from jobs table for quick display)
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS job_title TEXT;

COMMENT ON COLUMN applications.job_title IS 'Job title (denormalized for quick display, can be NULL if job deleted)';

-- Add company column (denormalized from jobs table for quick display)
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS company TEXT;

COMMENT ON COLUMN applications.company IS 'Company name (denormalized for quick display, can be NULL if job deleted)';

-- Add selected_variant_id column (tracks which cover letter variant user selected)
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS selected_variant_id TEXT;

COMMENT ON COLUMN applications.selected_variant_id IS 'ID of the selected cover letter variant from variants array';

-- Create index for filtering applications by company
CREATE INDEX IF NOT EXISTS idx_applications_company ON applications(company) WHERE company IS NOT NULL;

-- Create index for filtering applications by job_title
CREATE INDEX IF NOT EXISTS idx_applications_job_title ON applications(job_title) WHERE job_title IS NOT NULL;
