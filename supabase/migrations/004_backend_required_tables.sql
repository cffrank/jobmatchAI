-- ============================================================================
-- Backend Required Tables Migration
-- ============================================================================
-- Creates tables that the Express backend expects but are missing from schema
-- Tables: oauth_states, rate_limits, notifications, job_preferences

-- ----------------------------------------------------------------------------
-- OAuth States Table
-- ----------------------------------------------------------------------------
-- Stores temporary OAuth state tokens for LinkedIn OAuth flow
-- States expire after 10 minutes for security
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL UNIQUE,
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cleanup and validation
CREATE INDEX IF NOT EXISTS oauth_states_expires_at_idx ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS oauth_states_state_idx ON oauth_states(state);

COMMENT ON TABLE oauth_states IS 'Temporary OAuth state tokens for LinkedIn authentication';
COMMENT ON COLUMN oauth_states.state IS 'Random state token for CSRF protection';
COMMENT ON COLUMN oauth_states.expires_at IS 'State expires after 10 minutes';

-- ----------------------------------------------------------------------------
-- Rate Limits Table
-- ----------------------------------------------------------------------------
-- Tracks API rate limiting per user per endpoint
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for rate limit checks and cleanup
CREATE INDEX IF NOT EXISTS rate_limits_user_endpoint_idx ON rate_limits(user_id, endpoint);
CREATE INDEX IF NOT EXISTS rate_limits_window_end_idx ON rate_limits(window_end);

COMMENT ON TABLE rate_limits IS 'API rate limiting tracking per user per endpoint';
COMMENT ON COLUMN rate_limits.endpoint IS 'API endpoint path (e.g., /api/applications/generate)';
COMMENT ON COLUMN rate_limits.count IS 'Number of requests in current window';
COMMENT ON COLUMN rate_limits.window_start IS 'Start of rate limit window';
COMMENT ON COLUMN rate_limits.window_end IS 'End of rate limit window';

-- ----------------------------------------------------------------------------
-- Notifications Table
-- ----------------------------------------------------------------------------
-- In-app notifications for users (new matches, status updates, etc.)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT,
  action_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fetching user notifications
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS 'In-app notifications for users';
COMMENT ON COLUMN notifications.type IS 'Notification type (new_job_matches, status_update, etc.)';
COMMENT ON COLUMN notifications.action_url IS 'Optional URL for notification action button';
COMMENT ON COLUMN notifications.action_text IS 'Optional text for notification action button';

-- ----------------------------------------------------------------------------
-- Job Preferences Table
-- ----------------------------------------------------------------------------
-- User job search preferences for automated matching
CREATE TABLE IF NOT EXISTS job_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  desired_titles TEXT[] NOT NULL DEFAULT '{}',
  desired_locations TEXT[] DEFAULT '{}',
  work_arrangement TEXT[] DEFAULT '{}',
  job_types TEXT[] DEFAULT '{}',
  salary_min INTEGER CHECK (salary_min >= 0),
  salary_max INTEGER CHECK (salary_max >= 0),
  experience_levels TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',
  company_sizes TEXT[] DEFAULT '{}',
  benefits TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  exclude_keywords TEXT[] DEFAULT '{}',
  auto_search_enabled BOOLEAN DEFAULT FALSE,
  notification_frequency TEXT DEFAULT 'daily',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS job_preferences_user_id_idx ON job_preferences(user_id);
CREATE INDEX IF NOT EXISTS job_preferences_auto_search_idx ON job_preferences(auto_search_enabled);

COMMENT ON TABLE job_preferences IS 'User job search preferences for automated matching';
COMMENT ON COLUMN job_preferences.desired_titles IS 'Array of desired job titles';
COMMENT ON COLUMN job_preferences.work_arrangement IS 'Array: remote, hybrid, onsite';
COMMENT ON COLUMN job_preferences.auto_search_enabled IS 'Enable automated daily job searches';
COMMENT ON COLUMN job_preferences.notification_frequency IS 'How often to notify: daily, weekly, realtime';

-- ----------------------------------------------------------------------------
-- Enable Row Level Security
-- ----------------------------------------------------------------------------

ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_preferences ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS Policies
-- ----------------------------------------------------------------------------

-- OAuth States: Only authenticated users can access their own states
CREATE POLICY "Users can manage their own OAuth states"
  ON oauth_states
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Rate Limits: Users can only view their own rate limits (backend manages via service role)
CREATE POLICY "Users can view their own rate limits"
  ON rate_limits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Notifications: Users can manage their own notifications
CREATE POLICY "Users can manage their own notifications"
  ON notifications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Job Preferences: Users can manage their own preferences
CREATE POLICY "Users can manage their own job preferences"
  ON job_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Updated At Trigger
-- ----------------------------------------------------------------------------

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_preferences_updated_at
  BEFORE UPDATE ON job_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
