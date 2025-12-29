-- Migration: Enhance Application Status Tracking
-- Description: Updates tracked_application_status enum and adds status change tracking
-- Author: Migration Script
-- Date: 2025-12-28

-- Add new status values to the existing enum
-- Current: 'applied', 'screening', 'interview_scheduled', 'interview_completed', 'offer', 'accepted', 'rejected', 'withdrawn'
-- Adding: 'response_received', 'offer_declined', 'abandoned'

-- First, create a new enum with all the values
CREATE TYPE tracked_application_status_new AS ENUM (
  'applied',
  'response_received',
  'screening',
  'interview_scheduled',
  'interview_completed',
  'offer',
  'offer_accepted',
  'offer_declined',
  'accepted',
  'rejected',
  'withdrawn',
  'abandoned'
);

-- Update the column to use the new enum type
ALTER TABLE tracked_applications
  ALTER COLUMN status TYPE tracked_application_status_new
  USING status::text::tracked_application_status_new;

-- Drop the old enum type
DROP TYPE tracked_application_status;

-- Rename the new type to the original name
ALTER TYPE tracked_application_status_new RENAME TO tracked_application_status;

-- Add a new column to track when status was last changed
ALTER TABLE tracked_applications
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT NOW();

-- Create an index on status_changed_at for queries
CREATE INDEX IF NOT EXISTS idx_tracked_applications_status_changed
  ON tracked_applications(status_changed_at DESC);

-- Update the trigger to also update status_changed_at when status changes
CREATE OR REPLACE FUNCTION update_tracked_application_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_updated = NOW();

  -- Only update status_changed_at if the status actually changed
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.status_changed_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace the existing trigger with the new one
DROP TRIGGER IF EXISTS update_tracked_applications_timestamps ON tracked_applications;

CREATE TRIGGER update_tracked_applications_timestamps
  BEFORE UPDATE ON tracked_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_tracked_application_status_timestamp();

-- Create a function to automatically add status history entries when status changes
CREATE OR REPLACE FUNCTION track_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
  new_history_entry jsonb;
BEGIN
  -- Only add to history if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Create new history entry
    new_history_entry := jsonb_build_object(
      'status', NEW.status,
      'date', NOW(),
      'note', NULL  -- Can be updated manually if needed
    );

    -- Append to status_history array
    NEW.status_history := COALESCE(NEW.status_history, '[]'::jsonb) || new_history_entry;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status history tracking
DROP TRIGGER IF EXISTS track_status_changes ON tracked_applications;

CREATE TRIGGER track_status_changes
  BEFORE UPDATE ON tracked_applications
  FOR EACH ROW
  EXECUTE FUNCTION track_application_status_change();

-- Add helpful comments
COMMENT ON COLUMN tracked_applications.status_changed_at IS 'Timestamp of the most recent status change';
COMMENT ON TYPE tracked_application_status IS 'Application status: applied, response_received, screening, interview_scheduled, interview_completed, offer, offer_accepted, offer_declined, accepted, rejected, withdrawn, abandoned';

-- Backfill status_changed_at for existing records based on last_updated
UPDATE tracked_applications
SET status_changed_at = last_updated
WHERE status_changed_at IS NULL;

-- Grant usage on the updated enum type
GRANT USAGE ON TYPE tracked_application_status TO authenticated;
