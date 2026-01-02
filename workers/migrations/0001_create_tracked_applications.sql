-- Migration: Create tracked_applications table for Cloudflare D1
-- Created: 2026-01-01
-- Purpose: Store user's job application tracking data in D1 (SQLite)

-- Create tracked_applications table
CREATE TABLE IF NOT EXISTS tracked_applications (
  -- Primary Key
  id TEXT PRIMARY KEY,

  -- Foreign Keys (stored as TEXT UUIDs in D1)
  user_id TEXT NOT NULL,
  job_id TEXT,
  application_id TEXT,

  -- Core Fields
  company TEXT NOT NULL,
  job_title TEXT NOT NULL,
  location TEXT,
  match_score REAL CHECK (match_score >= 0 AND match_score <= 100),
  status TEXT NOT NULL DEFAULT 'interested' CHECK (
    status IN (
      'interested',
      'applied',
      'phone_screen',
      'technical_interview',
      'onsite_interview',
      'final_interview',
      'offer',
      'rejected',
      'withdrew',
      'accepted',
      'declined'
    )
  ),

  -- Dates (stored as ISO 8601 strings in SQLite)
  applied_date TEXT,
  last_updated TEXT DEFAULT (datetime('now')),
  next_action_date TEXT,
  next_interview_date TEXT,

  -- JSON Fields (stored as TEXT in SQLite)
  status_history TEXT DEFAULT '[]',
  interviews TEXT DEFAULT '[]',
  recruiter TEXT,
  hiring_manager TEXT,
  follow_up_actions TEXT DEFAULT '[]',
  offer_details TEXT,
  activity_log TEXT DEFAULT '[]',

  -- Action Tracking
  next_action TEXT,

  -- Archive/Notes
  archived INTEGER DEFAULT 0 CHECK (archived IN (0, 1)),
  notes TEXT,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracked_applications_user_id
  ON tracked_applications(user_id);

CREATE INDEX IF NOT EXISTS idx_tracked_applications_user_status
  ON tracked_applications(user_id, status);

CREATE INDEX IF NOT EXISTS idx_tracked_applications_user_archived
  ON tracked_applications(user_id, archived);

CREATE INDEX IF NOT EXISTS idx_tracked_applications_applied_date
  ON tracked_applications(applied_date DESC);

CREATE INDEX IF NOT EXISTS idx_tracked_applications_next_action_date
  ON tracked_applications(next_action_date)
  WHERE next_action_date IS NOT NULL;

-- Create trigger to auto-update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS set_tracked_applications_updated_at
  AFTER UPDATE ON tracked_applications
  FOR EACH ROW
BEGIN
  UPDATE tracked_applications
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;
