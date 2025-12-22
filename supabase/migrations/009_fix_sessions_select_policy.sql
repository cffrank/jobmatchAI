-- ============================================================================
-- Fix Sessions SELECT Policy for on_conflict Lookups
-- ============================================================================
-- Allows unauthenticated session lookups to support on_conflict upserts
-- during login/signup when JWT token may not be immediately available

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;

-- Create new SELECT policy that allows unauthenticated lookups
CREATE POLICY "Users can view own sessions"
  ON sessions
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

COMMENT ON POLICY "Users can view own sessions" ON sessions IS
  'Users can view sessions. Allows unauthenticated lookups during login/signup for on_conflict upserts.';
