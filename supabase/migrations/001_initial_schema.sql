-- =============================================================================
-- JobMatch AI: Firebase to Supabase Migration
-- Migration: 001_initial_schema.sql
--
-- This migration creates the complete database schema for JobMatch AI,
-- converting the Firestore subcollection structure to relational tables
-- with proper foreign keys, indexes, RLS policies, and triggers.
--
-- Tables: users, work_experience, education, skills, jobs, applications,
--         sessions, security_events, email_history
-- =============================================================================

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to automatically update updated_at timestamp
-- This is called by triggers on all tables that have an updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABLE: users
-- Primary user profile data. Maps from Firestore users/{userId} document.
-- The id column will store the Supabase auth.users UUID for seamless RLS.
-- =============================================================================

CREATE TABLE users (
  -- Primary key matches Supabase auth.users.id for RLS integration
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core profile fields
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  location TEXT,
  photo_url TEXT,

  -- Professional profile
  current_title TEXT,
  years_of_experience INTEGER CHECK (years_of_experience >= 0),
  professional_summary TEXT,

  -- Security settings
  two_factor_enabled BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE users IS 'User profiles migrated from Firestore users/{userId} documents';
COMMENT ON COLUMN users.id IS 'References Supabase auth.users.id for RLS integration';
COMMENT ON COLUMN users.years_of_experience IS 'Total years of professional experience';

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON users FOR DELETE
  USING (auth.uid() = id);

-- Trigger for updated_at
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE: work_experience
-- Employment history. Maps from Firestore users/{userId}/workExperience/{docId}
-- Supports cursor-based pagination via (user_id, start_date DESC, id)
-- =============================================================================

CREATE TABLE work_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Employment details
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Date range
  start_date DATE NOT NULL,
  end_date DATE,  -- NULL indicates current position
  is_current BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraint: end_date must be after start_date when provided
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date),
  -- Constraint: is_current should be true only when end_date is NULL
  CONSTRAINT current_position_consistency CHECK (
    (is_current = TRUE AND end_date IS NULL) OR
    (is_current = FALSE)
  )
);

COMMENT ON TABLE work_experience IS 'Work history migrated from Firestore users/{userId}/workExperience subcollection';
COMMENT ON COLUMN work_experience.is_current IS 'TRUE if this is the users current position (end_date must be NULL)';

-- Indexes for common queries
CREATE INDEX idx_work_experience_user_id ON work_experience(user_id);
CREATE INDEX idx_work_experience_user_chronological ON work_experience(user_id, start_date DESC, id);
CREATE INDEX idx_work_experience_current ON work_experience(user_id, is_current) WHERE is_current = TRUE;

-- RLS Policies
ALTER TABLE work_experience ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own work experience"
  ON work_experience FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own work experience"
  ON work_experience FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own work experience"
  ON work_experience FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own work experience"
  ON work_experience FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_work_experience_updated_at
  BEFORE UPDATE ON work_experience
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE: education
-- Education history. Maps from Firestore users/{userId}/education/{docId}
-- =============================================================================

CREATE TABLE education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Institution details
  institution TEXT NOT NULL,
  degree TEXT,
  field_of_study TEXT,
  description TEXT,

  -- Date range
  start_date DATE,
  end_date DATE,  -- NULL indicates currently enrolled

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraint: end_date must be after start_date when both provided
  CONSTRAINT valid_education_date_range CHECK (
    start_date IS NULL OR end_date IS NULL OR end_date >= start_date
  )
);

COMMENT ON TABLE education IS 'Education history migrated from Firestore users/{userId}/education subcollection';

-- Indexes
CREATE INDEX idx_education_user_id ON education(user_id);
CREATE INDEX idx_education_user_chronological ON education(user_id, end_date DESC NULLS FIRST, id);

-- RLS Policies
ALTER TABLE education ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own education"
  ON education FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own education"
  ON education FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own education"
  ON education FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own education"
  ON education FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_education_updated_at
  BEFORE UPDATE ON education
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE: skills
-- User skills with proficiency levels. Maps from Firestore users/{userId}/skills/{docId}
-- =============================================================================

-- Enum for skill proficiency levels
CREATE TYPE skill_proficiency AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Skill details
  name TEXT NOT NULL,
  proficiency_level skill_proficiency DEFAULT 'intermediate',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Prevent duplicate skills for the same user
  CONSTRAINT unique_user_skill UNIQUE (user_id, name)
);

COMMENT ON TABLE skills IS 'User skills migrated from Firestore users/{userId}/skills subcollection';
COMMENT ON COLUMN skills.proficiency_level IS 'Skill level: beginner, intermediate, advanced, or expert';

-- Indexes
CREATE INDEX idx_skills_user_id ON skills(user_id);
CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_user_proficiency ON skills(user_id, proficiency_level);

-- RLS Policies
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skills"
  ON skills FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own skills"
  ON skills FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skills"
  ON skills FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own skills"
  ON skills FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE: jobs
-- Job listings saved by users. Maps from Firestore users/{userId}/jobs/{jobId}
-- Supports cursor-based pagination with composite index for efficient queries.
-- =============================================================================

-- Enum for job types
CREATE TYPE job_type AS ENUM ('full-time', 'part-time', 'contract', 'internship', 'temporary', 'remote');

-- Enum for experience levels
CREATE TYPE experience_level AS ENUM ('entry', 'mid', 'senior', 'lead', 'executive');

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Job details
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  description TEXT,
  url TEXT,
  source TEXT,  -- e.g., 'linkedin', 'indeed', 'glassdoor'

  -- Job metadata
  job_type job_type,
  experience_level experience_level,
  salary_min INTEGER CHECK (salary_min >= 0),
  salary_max INTEGER CHECK (salary_max >= 0),

  -- Match and status
  match_score NUMERIC(5, 2) CHECK (match_score >= 0 AND match_score <= 100),
  archived BOOLEAN DEFAULT FALSE,
  saved BOOLEAN DEFAULT FALSE,

  -- Timestamps
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraint: salary_max should be >= salary_min when both provided
  CONSTRAINT valid_salary_range CHECK (
    salary_min IS NULL OR salary_max IS NULL OR salary_max >= salary_min
  )
);

COMMENT ON TABLE jobs IS 'Job listings migrated from Firestore users/{userId}/jobs subcollection';
COMMENT ON COLUMN jobs.match_score IS 'AI-calculated match score 0-100 based on user profile';
COMMENT ON COLUMN jobs.added_at IS 'When the job was added to the users list (may differ from created_at)';

-- Primary index for paginated job listings (most important query pattern)
-- Supports: WHERE user_id = ? AND archived = ? ORDER BY match_score DESC, added_at DESC
CREATE INDEX idx_jobs_user_listing ON jobs(user_id, archived, match_score DESC NULLS LAST, added_at DESC);

-- Additional indexes
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_user_saved ON jobs(user_id, saved) WHERE saved = TRUE;
CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_match_score ON jobs(match_score DESC NULLS LAST);

-- RLS Policies
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs"
  ON jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE: applications
-- Job applications with cover letter variants.
-- Maps from Firestore users/{userId}/applications/{applicationId}
-- Uses JSONB for the variants array to preserve the flexible structure.
-- =============================================================================

-- Enum for application status
CREATE TYPE application_status AS ENUM (
  'draft',
  'ready',
  'submitted',
  'interviewing',
  'offered',
  'accepted',
  'rejected',
  'withdrawn'
);

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,  -- SET NULL preserves application if job deleted

  -- Application content
  cover_letter TEXT,
  custom_resume TEXT,  -- Could also be a URL to stored file

  -- Status tracking
  status application_status DEFAULT 'draft',

  -- Cover letter variants stored as JSONB array
  -- Structure: [{ "type": "aggressive"|"balanced"|"conservative", "content": "..." }, ...]
  variants JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraint: validate variants is an array
  CONSTRAINT valid_variants CHECK (jsonb_typeof(variants) = 'array')
);

COMMENT ON TABLE applications IS 'Job applications migrated from Firestore users/{userId}/applications subcollection';
COMMENT ON COLUMN applications.variants IS 'Array of cover letter variants: [{type, content}, ...]';
COMMENT ON COLUMN applications.job_id IS 'References jobs table; SET NULL on delete to preserve application history';

-- Primary index for recent applications query
CREATE INDEX idx_applications_user_recent ON applications(user_id, created_at DESC);

-- Additional indexes
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(user_id, status);

-- GIN index for querying inside variants JSONB
CREATE INDEX idx_applications_variants ON applications USING GIN (variants);

-- RLS Policies
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications"
  ON applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications"
  ON applications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own applications"
  ON applications FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TABLE: sessions
-- Active user sessions for device/session management.
-- Maps from Firestore users/{userId}/sessions/{sessionId}
-- Sessions expire after 30 days (enforced at application level).
-- =============================================================================

-- Enum for device types
CREATE TYPE device_type AS ENUM ('desktop', 'mobile', 'tablet', 'unknown');

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Session identifier (may be different from id for compatibility)
  session_id TEXT NOT NULL,

  -- Device information
  device TEXT,
  browser TEXT,
  os TEXT,
  device_type device_type DEFAULT 'unknown',

  -- Network information
  ip_address INET,
  location TEXT,
  user_agent TEXT,

  -- Session lifecycle
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_active TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,  -- Default 30 days from creation

  -- Unique session_id per user
  CONSTRAINT unique_user_session UNIQUE (user_id, session_id)
);

COMMENT ON TABLE sessions IS 'Active sessions migrated from Firestore users/{userId}/sessions subcollection';
COMMENT ON COLUMN sessions.session_id IS 'Application-level session identifier';
COMMENT ON COLUMN sessions.expires_at IS 'Session expiration (typically 30 days from creation)';

-- Primary index for active sessions query
CREATE INDEX idx_sessions_user_active ON sessions(user_id, expires_at DESC, last_active DESC);

-- Additional indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_last_active ON sessions(last_active DESC);

-- Index for cleanup of expired sessions (removed WHERE clause - NOW() is not IMMUTABLE)
-- The expires_at index above is sufficient for cleanup queries
-- CREATE INDEX idx_sessions_expired ON sessions(expires_at) WHERE expires_at < NOW();

-- RLS Policies
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  USING (auth.uid() = user_id);

-- No updated_at trigger needed - sessions use last_active instead

-- =============================================================================
-- TABLE: security_events
-- Security audit log for tracking user security-related actions.
-- Maps from Firestore users/{userId}/securityEvents/{eventId}
-- CRITICAL: Users can READ but NOT DELETE their security events (audit trail).
-- =============================================================================

-- Enum for security event status
CREATE TYPE security_event_status AS ENUM ('success', 'failed');

CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Event details
  action TEXT NOT NULL,  -- e.g., 'login', 'logout', 'password_change', '2fa_enabled'
  status security_event_status NOT NULL,

  -- Device information
  device TEXT,
  browser TEXT,
  os TEXT,

  -- Network information
  ip_address INET,
  location TEXT,
  user_agent TEXT,

  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp (immutable - no updated_at for audit trail)
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE security_events IS 'Security audit log from Firestore users/{userId}/securityEvents subcollection';
COMMENT ON COLUMN security_events.action IS 'Security action: login, logout, password_change, 2fa_enabled, etc.';
COMMENT ON COLUMN security_events.metadata IS 'Additional context specific to the event type';

-- Primary index for recent security events
CREATE INDEX idx_security_events_user_recent ON security_events(user_id, timestamp DESC);

-- Additional indexes
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_action ON security_events(action);
CREATE INDEX idx_security_events_status ON security_events(user_id, status);
CREATE INDEX idx_security_events_timestamp ON security_events(timestamp DESC);

-- GIN index for metadata queries
CREATE INDEX idx_security_events_metadata ON security_events USING GIN (metadata);

-- RLS Policies
-- CRITICAL: No DELETE policy - security events are immutable audit trail
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own security events"
  ON security_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own security events"
  ON security_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- NOTE: No UPDATE or DELETE policies - security events are immutable
-- This preserves the audit trail integrity

-- =============================================================================
-- TABLE: email_history
-- Email tracking for application-related emails.
-- Maps from Firestore users/{userId}/emailHistory/{emailId}
-- =============================================================================

-- Enum for email status
CREATE TYPE email_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'bounced');

CREATE TABLE email_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,

  -- Email details
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,

  -- Status tracking
  status email_status DEFAULT 'pending',

  -- Timestamps
  sent_at TIMESTAMPTZ,  -- NULL until actually sent
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE email_history IS 'Email tracking from Firestore users/{userId}/emailHistory subcollection';
COMMENT ON COLUMN email_history.sent_at IS 'Actual send time; NULL if not yet sent';

-- Primary index for email history query
CREATE INDEX idx_email_history_user_recent ON email_history(user_id, sent_at DESC NULLS LAST);

-- Additional indexes
CREATE INDEX idx_email_history_user_id ON email_history(user_id);
CREATE INDEX idx_email_history_application_id ON email_history(application_id);
CREATE INDEX idx_email_history_status ON email_history(user_id, status);

-- RLS Policies
ALTER TABLE email_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email history"
  ON email_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email history"
  ON email_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email history"
  ON email_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own email history"
  ON email_history FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_email_history_updated_at
  BEFORE UPDATE ON email_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to clean up expired sessions
-- Can be called periodically via pg_cron or application-level scheduler
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_sessions IS 'Removes expired sessions; call periodically via scheduler';

-- Function to get active session count for a user
CREATE OR REPLACE FUNCTION get_active_session_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM sessions
    WHERE user_id = p_user_id
    AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_active_session_count IS 'Returns count of active (non-expired) sessions for a user';

-- =============================================================================
-- GRANTS
-- =============================================================================

-- Grant usage on all custom types
GRANT USAGE ON TYPE skill_proficiency TO authenticated;
GRANT USAGE ON TYPE job_type TO authenticated;
GRANT USAGE ON TYPE experience_level TO authenticated;
GRANT USAGE ON TYPE application_status TO authenticated;
GRANT USAGE ON TYPE device_type TO authenticated;
GRANT USAGE ON TYPE security_event_status TO authenticated;
GRANT USAGE ON TYPE email_status TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions TO service_role;
GRANT EXECUTE ON FUNCTION get_active_session_count TO authenticated;

-- =============================================================================
-- SCHEMA SUMMARY
-- =============================================================================
--
-- Tables created: 9
--   - users (profile data, references auth.users)
--   - work_experience (employment history)
--   - education (education history)
--   - skills (user skills with proficiency)
--   - jobs (saved job listings)
--   - applications (job applications with variants)
--   - sessions (active user sessions)
--   - security_events (immutable audit log)
--   - email_history (email tracking)
--
-- Custom types created: 7
--   - skill_proficiency, job_type, experience_level
--   - application_status, device_type, security_event_status, email_status
--
-- RLS policies: All tables enabled
--   - Users can only access their own data
--   - security_events: SELECT/INSERT only (no UPDATE/DELETE for audit integrity)
--
-- Indexes: Optimized for common query patterns
--   - Composite indexes for cursor-based pagination
--   - GIN indexes for JSONB columns
--
-- Triggers: Automatic updated_at on applicable tables
--
-- Helper functions:
--   - cleanup_expired_sessions(): Periodic session cleanup
--   - get_active_session_count(user_id): Active session count
--
-- =============================================================================
