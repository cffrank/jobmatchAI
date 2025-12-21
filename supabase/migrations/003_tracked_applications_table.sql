-- Migration: Create tracked_applications table
-- Description: Stores application tracking data with status updates, interviews, and follow-ups
-- Author: Migration Script
-- Date: 2025-12-20

-- Create application tracking status enum
CREATE TYPE tracked_application_status AS ENUM (
  'applied',
  'screening',
  'interview_scheduled',
  'interview_completed',
  'offer',
  'accepted',
  'rejected',
  'withdrawn'
);

-- Create tracked_applications table
CREATE TABLE tracked_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,

  -- Job summary (denormalized for quick display)
  company TEXT NOT NULL,
  job_title TEXT NOT NULL,
  location TEXT,
  match_score NUMERIC,

  -- Status tracking
  status tracked_application_status NOT NULL DEFAULT 'applied',
  applied_date TIMESTAMPTZ,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_history JSONB DEFAULT '[]'::jsonb,

  -- Interview tracking
  interviews JSONB DEFAULT '[]'::jsonb,
  next_interview_date TIMESTAMPTZ,

  -- Contacts
  recruiter JSONB,
  hiring_manager JSONB,

  -- Follow-ups & reminders
  follow_up_actions JSONB DEFAULT '[]'::jsonb,
  next_action TEXT,
  next_action_date TIMESTAMPTZ,

  -- Notes & timeline
  notes TEXT,
  activity_log JSONB DEFAULT '[]'::jsonb,

  -- Offer details
  offer_details JSONB,

  -- Metadata
  archived BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT tracked_applications_user_id_not_null CHECK (user_id IS NOT NULL),
  CONSTRAINT tracked_applications_company_not_empty CHECK (LENGTH(TRIM(company)) > 0),
  CONSTRAINT tracked_applications_job_title_not_empty CHECK (LENGTH(TRIM(job_title)) > 0),
  CONSTRAINT tracked_applications_match_score_range CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100))
);

-- Create indexes for performance
CREATE INDEX idx_tracked_applications_user_id ON tracked_applications(user_id);
CREATE INDEX idx_tracked_applications_status ON tracked_applications(status);
CREATE INDEX idx_tracked_applications_archived ON tracked_applications(archived);
CREATE INDEX idx_tracked_applications_last_updated ON tracked_applications(last_updated DESC);
CREATE INDEX idx_tracked_applications_user_status ON tracked_applications(user_id, status);
CREATE INDEX idx_tracked_applications_user_archived ON tracked_applications(user_id, archived);
CREATE INDEX idx_tracked_applications_next_action_date ON tracked_applications(next_action_date) WHERE next_action_date IS NOT NULL;
CREATE INDEX idx_tracked_applications_next_interview_date ON tracked_applications(next_interview_date) WHERE next_interview_date IS NOT NULL;
CREATE INDEX idx_tracked_applications_job_id ON tracked_applications(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_tracked_applications_application_id ON tracked_applications(application_id) WHERE application_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE tracked_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own tracked applications"
  ON tracked_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracked applications"
  ON tracked_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tracked applications"
  ON tracked_applications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracked applications"
  ON tracked_applications FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to auto-update updated_at and last_updated timestamps
CREATE OR REPLACE FUNCTION update_tracked_application_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tracked_applications_timestamps
  BEFORE UPDATE ON tracked_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_tracked_application_timestamps();

-- Add helpful comments
COMMENT ON TABLE tracked_applications IS 'Application tracking with status updates, interviews, and follow-ups';
COMMENT ON COLUMN tracked_applications.status_history IS 'JSONB array of status changes with date and notes';
COMMENT ON COLUMN tracked_applications.interviews IS 'JSONB array of interview entries with round, date, interviewers, notes';
COMMENT ON COLUMN tracked_applications.recruiter IS 'JSONB object with recruiter contact info (name, role, email, phone)';
COMMENT ON COLUMN tracked_applications.hiring_manager IS 'JSONB object with hiring manager contact info';
COMMENT ON COLUMN tracked_applications.follow_up_actions IS 'JSONB array of follow-up actions with title, description, dueDate, completed, priority';
COMMENT ON COLUMN tracked_applications.activity_log IS 'JSONB array of activity log entries with date, type, description';
COMMENT ON COLUMN tracked_applications.offer_details IS 'JSONB object with salary, equity, benefits, deadline, notes';
