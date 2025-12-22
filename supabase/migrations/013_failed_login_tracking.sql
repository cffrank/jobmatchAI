-- SEC-004: Failed Login Tracking and Account Lockout
-- This migration creates the infrastructure to track failed login attempts
-- and implement account lockout after 5 failed attempts within 15 minutes

-- Create failed_login_attempts table
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  -- Metadata for security analysis
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_failed_logins_email_time
  ON failed_login_attempts(email, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_failed_logins_ip_time
  ON failed_login_attempts(ip_address, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_failed_logins_attempted_at
  ON failed_login_attempts(attempted_at DESC);

-- Add comment for documentation
COMMENT ON TABLE failed_login_attempts IS
  'SEC-004: Tracks failed login attempts for brute force protection. Records are automatically cleaned after 24 hours.';

-- Create account_lockouts table
CREATE TABLE IF NOT EXISTS account_lockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  locked_until TIMESTAMPTZ NOT NULL,
  failed_attempt_count INTEGER NOT NULL,
  reason TEXT DEFAULT 'Multiple failed login attempts',
  -- Allow admin to unlock
  unlocked_by UUID REFERENCES auth.users(id),
  unlocked_at TIMESTAMPTZ,
  CONSTRAINT valid_lockout_period CHECK (locked_until > locked_at)
);

-- Index for quick lockout checks
CREATE INDEX IF NOT EXISTS idx_lockouts_email
  ON account_lockouts(email) WHERE unlocked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lockouts_locked_until
  ON account_lockouts(locked_until) WHERE unlocked_at IS NULL;

COMMENT ON TABLE account_lockouts IS
  'SEC-004: Tracks account lockouts after failed login attempts. Accounts auto-unlock after locked_until timestamp.';

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lockout_record RECORD;
BEGIN
  -- Find active lockout for this email
  SELECT * INTO lockout_record
  FROM account_lockouts
  WHERE email = user_email
    AND unlocked_at IS NULL
    AND locked_until > NOW()
  ORDER BY locked_at DESC
  LIMIT 1;

  -- Return true if locked, false otherwise
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION is_account_locked IS
  'SEC-004: Check if an account is currently locked due to failed login attempts';

-- Function to record failed login attempt
CREATE OR REPLACE FUNCTION record_failed_login(
  user_email TEXT,
  client_ip INET,
  user_agent_string TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  failed_count INTEGER;
  lockout_threshold INTEGER := 5;
  lockout_window_minutes INTEGER := 15;
  lockout_duration_minutes INTEGER := 30;
  result JSONB;
BEGIN
  -- Insert failed attempt
  INSERT INTO failed_login_attempts (email, ip_address, user_agent)
  VALUES (user_email, client_ip, user_agent_string);

  -- Count recent failed attempts (within lockout window)
  SELECT COUNT(*) INTO failed_count
  FROM failed_login_attempts
  WHERE email = user_email
    AND attempted_at > (NOW() - (lockout_window_minutes || ' minutes')::INTERVAL);

  -- Check if threshold reached
  IF failed_count >= lockout_threshold THEN
    -- Create lockout record
    INSERT INTO account_lockouts (
      email,
      locked_until,
      failed_attempt_count,
      reason
    )
    VALUES (
      user_email,
      NOW() + (lockout_duration_minutes || ' minutes')::INTERVAL,
      failed_count,
      'Too many failed login attempts (' || failed_count || ' in ' || lockout_window_minutes || ' minutes)'
    )
    ON CONFLICT (email)
    DO UPDATE SET
      locked_at = NOW(),
      locked_until = NOW() + (lockout_duration_minutes || ' minutes')::INTERVAL,
      failed_attempt_count = account_lockouts.failed_attempt_count + 1,
      unlocked_at = NULL;

    result := jsonb_build_object(
      'locked', true,
      'failed_attempts', failed_count,
      'locked_until', NOW() + (lockout_duration_minutes || ' minutes')::INTERVAL,
      'message', 'Account locked due to multiple failed login attempts'
    );
  ELSE
    result := jsonb_build_object(
      'locked', false,
      'failed_attempts', failed_count,
      'attempts_remaining', lockout_threshold - failed_count,
      'message', 'Login failed. ' || (lockout_threshold - failed_count) || ' attempts remaining before lockout.'
    );
  END IF;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION record_failed_login IS
  'SEC-004: Record a failed login attempt and lock account if threshold exceeded';

-- Function to clear failed attempts after successful login
CREATE OR REPLACE FUNCTION clear_failed_login_attempts(user_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete all failed attempts for this email
  DELETE FROM failed_login_attempts
  WHERE email = user_email;

  -- Mark any lockouts as unlocked
  UPDATE account_lockouts
  SET unlocked_at = NOW()
  WHERE email = user_email
    AND unlocked_at IS NULL;
END;
$$;

COMMENT ON FUNCTION clear_failed_login_attempts IS
  'SEC-004: Clear failed login attempts and unlock account after successful login';

-- Function to manually unlock account (admin use)
CREATE OR REPLACE FUNCTION unlock_account(
  user_email TEXT,
  admin_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update lockout record
  UPDATE account_lockouts
  SET
    unlocked_at = NOW(),
    unlocked_by = admin_user_id
  WHERE email = user_email
    AND unlocked_at IS NULL;

  -- Clear failed attempts
  DELETE FROM failed_login_attempts
  WHERE email = user_email;

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION unlock_account IS
  'SEC-004: Manually unlock account (admin function)';

-- Automatic cleanup of old failed login attempts (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_failed_logins()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete attempts older than 24 hours
  DELETE FROM failed_login_attempts
  WHERE attempted_at < (NOW() - INTERVAL '24 hours');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_failed_logins IS
  'SEC-004: Clean up failed login attempts older than 24 hours';

-- Automatic cleanup of expired lockouts
CREATE OR REPLACE FUNCTION cleanup_expired_lockouts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mark expired lockouts as unlocked
  UPDATE account_lockouts
  SET unlocked_at = locked_until
  WHERE unlocked_at IS NULL
    AND locked_until < NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_lockouts IS
  'SEC-004: Automatically unlock accounts after lockout period expires';

-- Enable Row Level Security
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_lockouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only service role can access these tables
-- (These are security-sensitive and should not be exposed to regular users)

CREATE POLICY "Service role full access to failed_login_attempts"
  ON failed_login_attempts
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to account_lockouts"
  ON account_lockouts
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant execute permissions to authenticated users (functions are SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION is_account_locked TO authenticated;
GRANT EXECUTE ON FUNCTION is_account_locked TO anon;

-- Note: These functions should only be called from backend with service role
-- Frontend should never directly call record_failed_login
GRANT EXECUTE ON FUNCTION record_failed_login TO service_role;
GRANT EXECUTE ON FUNCTION clear_failed_login_attempts TO service_role;
GRANT EXECUTE ON FUNCTION unlock_account TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_failed_logins TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_lockouts TO service_role;
