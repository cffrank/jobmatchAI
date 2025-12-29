-- Test Script: Job Expiration and Save Functionality
-- Purpose: Validate that job expiration and save features work correctly
-- Run this script in Supabase SQL Editor or via psql

-- =============================================================================
-- SETUP: Create test data
-- =============================================================================

-- Get your user ID (replace with actual user ID from auth.users)
DO $$
DECLARE
  test_user_id UUID;
  job1_id UUID;
  job2_id UUID;
  job3_id UUID;
BEGIN
  -- Use first user in the system (or specify your test user ID)
  SELECT id INTO test_user_id FROM users LIMIT 1;

  RAISE NOTICE 'Using test user: %', test_user_id;

  -- Test Case 1: Create unsaved job (should auto-set expires_at)
  INSERT INTO jobs (user_id, title, company, saved)
  VALUES (test_user_id, '[TEST] Unsaved Job', 'Test Company', false)
  RETURNING id INTO job1_id;

  RAISE NOTICE 'Created unsaved job: %', job1_id;

  -- Test Case 2: Create saved job (should have NULL expires_at)
  INSERT INTO jobs (user_id, title, company, saved)
  VALUES (test_user_id, '[TEST] Saved Job', 'Test Company', true)
  RETURNING id INTO job2_id;

  RAISE NOTICE 'Created saved job: %', job2_id;

  -- Test Case 3: Create expired job (for cleanup testing)
  INSERT INTO jobs (user_id, title, company, saved, expires_at)
  VALUES (
    test_user_id,
    '[TEST] Expired Job',
    'Test Company',
    false,
    NOW() - INTERVAL '1 hour'  -- Already expired
  )
  RETURNING id INTO job3_id;

  RAISE NOTICE 'Created expired job: %', job3_id;

END $$;

-- =============================================================================
-- VERIFICATION: Check initial state
-- =============================================================================

SELECT
  id,
  title,
  saved,
  saved_at,
  expires_at,
  CASE
    WHEN expires_at IS NULL THEN 'Never expires (saved)'
    WHEN expires_at < NOW() THEN 'EXPIRED'
    ELSE 'Expires in ' ||
      EXTRACT(EPOCH FROM (expires_at - NOW()))/3600 || ' hours'
  END as expiration_status,
  created_at
FROM jobs
WHERE title LIKE '[TEST]%'
ORDER BY created_at DESC;

-- =============================================================================
-- TEST 1: Save an unsaved job
-- =============================================================================

-- Save the unsaved job
UPDATE jobs
SET saved = true
WHERE title = '[TEST] Unsaved Job'
RETURNING
  id,
  title,
  saved,
  saved_at,
  expires_at;

-- Verify: saved_at should be set, expires_at should be NULL
SELECT
  title,
  saved,
  saved_at IS NOT NULL as "has_saved_at",
  expires_at IS NULL as "expires_at_cleared"
FROM jobs
WHERE title = '[TEST] Unsaved Job';

-- =============================================================================
-- TEST 2: Unsave a saved job
-- =============================================================================

-- Unsave the previously saved job
UPDATE jobs
SET saved = false
WHERE title = '[TEST] Saved Job'
RETURNING
  id,
  title,
  saved,
  saved_at,
  expires_at;

-- Verify: saved_at should be NULL, expires_at should be ~48 hours from now
SELECT
  title,
  saved,
  saved_at IS NULL as "saved_at_cleared",
  expires_at IS NOT NULL as "has_expires_at",
  EXTRACT(EPOCH FROM (expires_at - NOW()))/3600 as "hours_until_expiration"
FROM jobs
WHERE title = '[TEST] Saved Job';

-- =============================================================================
-- TEST 3: Cleanup expired jobs
-- =============================================================================

-- Count expired jobs before cleanup
SELECT COUNT(*) as expired_count
FROM jobs
WHERE title LIKE '[TEST]%'
  AND saved = false
  AND expires_at < NOW();

-- Run cleanup function
SELECT cleanup_expired_jobs();

-- Verify expired job was deleted
SELECT
  title,
  'Should be empty - expired job deleted' as status
FROM jobs
WHERE title = '[TEST] Expired Job';

-- =============================================================================
-- TEST 4: Expiration summary
-- =============================================================================

-- Get expiration summary for test user
SELECT * FROM get_job_expiration_summary(
  (SELECT id FROM users LIMIT 1)
);

-- =============================================================================
-- CLEANUP: Remove test data
-- =============================================================================

-- Remove all test jobs
DELETE FROM jobs WHERE title LIKE '[TEST]%';

-- Verify cleanup
SELECT COUNT(*) as remaining_test_jobs
FROM jobs
WHERE title LIKE '[TEST]%';

-- =============================================================================
-- RESULTS SUMMARY
-- =============================================================================

SELECT
  'Job Expiration Tests Complete!' as message,
  'Check output above for test results' as instructions;

-- Expected Results:
-- ✓ Unsaved job: expires_at set to NOW() + 48 hours
-- ✓ Saved job: saved_at set, expires_at NULL
-- ✓ Save action: clears expires_at, sets saved_at
-- ✓ Unsave action: clears saved_at, sets expires_at
-- ✓ Cleanup: removes expired jobs
-- ✓ Summary: accurate counts of job statuses
