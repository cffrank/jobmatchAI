-- ============================================================================
-- Fix Signup Flow Issues
-- ============================================================================
-- Fixes two critical issues preventing signup from working:
-- 1. Missing trigger to create public.users from auth.users
-- 2. Sessions INSERT policy requires authenticated user

-- ----------------------------------------------------------------------------
-- Fix 1: Create trigger to auto-create public.users record
-- ----------------------------------------------------------------------------
-- When a user signs up via Supabase Auth, we need to create a corresponding
-- record in the public.users table so foreign keys work properly.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates a public.users record when a new auth.users record is created';

-- ----------------------------------------------------------------------------
-- Fix 2: Update sessions INSERT policy to allow unauthenticated inserts
-- ----------------------------------------------------------------------------
-- During signup, auth.uid() is NULL because the user hasn't authenticated yet.
-- The frontend needs to create a session immediately after signup.

DROP POLICY IF EXISTS "Users can insert own sessions" ON sessions;

CREATE POLICY "Users can insert own sessions"
  ON sessions
  FOR INSERT
  WITH CHECK (
    -- Allow if authenticated and matches user_id, OR if not authenticated (signup flow)
    auth.uid() = user_id OR auth.uid() IS NULL
  );

COMMENT ON POLICY "Users can insert own sessions" ON sessions IS
  'Users can insert sessions. Allows unauthenticated inserts during signup.';
