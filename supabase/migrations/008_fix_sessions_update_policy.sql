-- ============================================================================
-- Fix Sessions UPDATE Policy for Login Flow
-- ============================================================================
-- Allows unauthenticated session updates to support on_conflict upserts
-- during login when JWT token may not be immediately available

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;

-- Create new UPDATE policy that allows unauthenticated updates
CREATE POLICY "Users can update own sessions"
  ON sessions
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() IS NULL)
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

COMMENT ON POLICY "Users can update own sessions" ON sessions IS
  'Users can update sessions. Allows unauthenticated updates during login/signup for on_conflict upserts.';
