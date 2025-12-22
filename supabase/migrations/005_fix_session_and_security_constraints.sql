-- ============================================================================
-- Fix Session and Security Events Constraints
-- ============================================================================
-- Fixes issues with session upserts and security event logging during signup

-- ----------------------------------------------------------------------------
-- Fix 1: Add unique constraint on session_id alone
-- ----------------------------------------------------------------------------
-- The frontend uses on_conflict=session_id which requires a single-column
-- unique constraint, but we only have UNIQUE(user_id, session_id).
-- Session IDs should be globally unique anyway.

ALTER TABLE sessions
  ADD CONSTRAINT unique_session_id UNIQUE (session_id);

COMMENT ON CONSTRAINT unique_session_id ON sessions IS
  'Session IDs must be globally unique for on_conflict upserts';

-- ----------------------------------------------------------------------------
-- Fix 2: Update security_events INSERT policy for signup flow
-- ----------------------------------------------------------------------------
-- During signup, auth.uid() is NULL because user hasn't authenticated yet.
-- The frontend tries to create security events immediately after signup.
-- We need to allow INSERT when auth.uid() IS NULL (during signup).

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own security events" ON security_events;

-- Create new INSERT policy that allows unauthenticated inserts
CREATE POLICY "Users can insert own security events"
  ON security_events
  FOR INSERT
  WITH CHECK (
    -- Allow if authenticated and matches user_id, OR if not authenticated (signup flow)
    auth.uid() = user_id OR auth.uid() IS NULL
  );

COMMENT ON POLICY "Users can insert own security events" ON security_events IS
  'Users can insert security events. Allows unauthenticated inserts during signup.';
