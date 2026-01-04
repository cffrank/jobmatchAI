-- =====================================================================
-- Gap Analysis Tables Migration
-- =====================================================================
-- Created: 2026-01-03
-- Purpose: Add gap_analyses and gap_analysis_answers tables to D1
--
-- These tables were present in Supabase but missing from D1 schema.
-- Frontend code was querying Supabase directly causing 404 errors.
-- This migration adds the tables to D1 and enables Workers API integration.
-- =====================================================================

-- Gap Analyses (main analysis record)
CREATE TABLE IF NOT EXISTS gap_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  gap_count INTEGER DEFAULT 0,
  red_flag_count INTEGER DEFAULT 0,
  urgency TEXT CHECK(urgency IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  overall_assessment TEXT,
  identified_gaps_and_flags TEXT,  -- JSON array as TEXT
  next_steps TEXT,                 -- JSON object as TEXT
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gap_analyses_user_id ON gap_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_gap_analyses_created_at ON gap_analyses(created_at DESC);

-- Gap Analysis Answers (individual question answers)
CREATE TABLE IF NOT EXISTS gap_analysis_answers (
  id TEXT PRIMARY KEY,
  gap_analysis_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  priority TEXT CHECK(priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  gap_addressed TEXT,
  question TEXT NOT NULL,
  context TEXT,
  expected_outcome TEXT,
  answer TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (gap_analysis_id) REFERENCES gap_analyses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gap_analysis_answers_gap_analysis_id ON gap_analysis_answers(gap_analysis_id);
CREATE INDEX IF NOT EXISTS idx_gap_analysis_answers_user_id ON gap_analysis_answers(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gap_analysis_answers_unique ON gap_analysis_answers(gap_analysis_id, question_id);

-- =====================================================================
-- Migration Complete
-- =====================================================================
