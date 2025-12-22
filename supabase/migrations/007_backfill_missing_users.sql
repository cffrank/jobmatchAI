-- ============================================================================
-- Backfill Missing Public Users
-- ============================================================================
-- Fixes issue where users created before migration 006 don't have
-- corresponding public.users records, causing foreign key constraint violations

-- Insert public.users records for any auth.users without them
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT
  au.id,
  au.email,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Log how many records were backfilled
DO $$
DECLARE
  backfilled_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO backfilled_count
  FROM auth.users au
  INNER JOIN public.users pu ON au.id = pu.id;

  RAISE NOTICE 'Backfilled % total users in public.users', backfilled_count;
END $$;
