# Quick Start: Job Expiration & Save Functionality

## TL;DR

Jobs expire after 48 hours unless saved. Users must save a job before applying. Automatic cleanup runs hourly.

## Quick Deploy

### 1. Apply Database Migration (Required)
```bash
cd /home/carl/application-tracking/jobmatch-ai
supabase db push
```

### 2. Deploy Cleanup Function (Required)
```bash
supabase functions deploy cleanup-expired-jobs
```

### 3. Setup Cron (Choose One)

**Option A: Supabase Cron (Easiest)**
```sql
-- Run in Supabase SQL Editor
SELECT cron.schedule(
  'cleanup-expired-jobs',
  '0 * * * *',  -- Every hour
  $$SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-expired-jobs',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );$$
);
```

**Option B: Manual Cron**
Add to your server's crontab:
```bash
0 * * * * curl -X POST -H "Authorization: Bearer YOUR_KEY" https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-expired-jobs
```

### 4. Test (Optional but Recommended)
```bash
# Run test script
psql -f scripts/test-job-expiration.sql

# Test cleanup function
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-expired-jobs
```

## What Changed?

### Database
- Added `saved_at` and `expires_at` columns to `jobs` table
- Triggers automatically manage timestamps when jobs are saved/unsaved
- Cleanup function removes expired jobs

### Backend
- `PATCH /api/jobs/:id` - Save/unsave sets timestamps via triggers
- `POST /api/applications/generate` - Validates job is saved before applying

### Frontend
- Apply button disabled until job is saved
- Expiration warnings show time remaining
- Save button clearly visible

## User Experience

### Before (Problem)
- Jobs accumulated indefinitely
- Users could apply to any job immediately
- Database grew with stale jobs

### After (Solution)
- Unsaved jobs auto-delete after 48 hours
- Users must save before applying
- Clear feedback on job status
- Only relevant jobs persist

## Quick Verification

```sql
-- Check if migration applied
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'jobs'
  AND column_name IN ('saved_at', 'expires_at');
-- Should return 2 rows

-- Check triggers exist
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_name LIKE '%job%expiration%';
-- Should return 2 triggers

-- Test cleanup function
SELECT cleanup_expired_jobs();
-- Should return number of deleted jobs
```

## Troubleshooting

### Migration Failed
```bash
# Check migration status
supabase db diff

# Reset if needed
supabase db reset
```

### Cleanup Not Running
```bash
# Check Edge Function logs
supabase functions logs cleanup-expired-jobs

# Manually trigger
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT.supabase.co/functions/v1/cleanup-expired-jobs
```

### UI Not Showing Expiration
- Verify migration applied (`saved_at`/`expires_at` columns exist)
- Check browser console for errors
- Refresh page to clear cache

## Configuration

### Change Expiration Time
Edit `/supabase/migrations/015_add_job_expiration_and_save_tracking.sql`:

```sql
-- Change '48 hours' to desired duration
NEW.expires_at := NOW() + INTERVAL '72 hours';  -- 3 days instead
```

Then re-apply migration.

### Disable Auto-Expiration
```sql
-- Remove triggers (jobs won't auto-expire)
DROP TRIGGER trigger_set_job_expiration ON jobs;
DROP TRIGGER trigger_update_job_save_status ON jobs;

-- Update existing jobs to never expire
UPDATE jobs SET expires_at = NULL WHERE expires_at IS NOT NULL;
```

## Monitoring

### Dashboard Query
```sql
-- Quick status overview
SELECT
  'Total Jobs' as metric,
  COUNT(*) as count
FROM jobs
UNION ALL
SELECT
  'Saved Jobs',
  COUNT(*) FILTER (WHERE saved = true)
FROM jobs
UNION ALL
SELECT
  'Expiring Soon (< 6h)',
  COUNT(*) FILTER (WHERE saved = false AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '6 hours')
FROM jobs
UNION ALL
SELECT
  'Expired (pending cleanup)',
  COUNT(*) FILTER (WHERE saved = false AND expires_at < NOW())
FROM jobs;
```

## Support

- **Full Docs:** `/docs/JOB_EXPIRATION_IMPLEMENTATION.md`
- **Test Script:** `/scripts/test-job-expiration.sql`
- **Summary:** `/JOB_EXPIRATION_SUMMARY.md`

## Rollback

```sql
-- Quick rollback (keeps data)
DROP TRIGGER IF EXISTS trigger_set_job_expiration ON jobs;
DROP TRIGGER IF EXISTS trigger_update_job_save_status ON jobs;
DROP FUNCTION IF EXISTS cleanup_expired_jobs();

-- Full rollback (removes columns)
ALTER TABLE jobs DROP COLUMN IF EXISTS saved_at;
ALTER TABLE jobs DROP COLUMN IF EXISTS expires_at;
```

## Success Criteria

✅ Migration applied successfully
✅ Edge Function deployed
✅ Cron job scheduled
✅ Test script passes
✅ UI shows expiration warnings
✅ Apply button disabled for unsaved jobs
✅ Save button works
✅ Cleanup function removes expired jobs

You're done! 🎉
