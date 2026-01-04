# Job Expiration and Save Functionality Implementation

## Overview

This implementation adds automatic job expiration and save functionality to JobMatch AI. Jobs automatically expire after 48 hours unless saved by the user. Users must save a job before they can apply to it.

## Features

### 1. Automatic Job Expiration
- **Unsaved jobs expire after 48 hours** from creation
- **Saved jobs never expire** (persist indefinitely)
- **Automatic cleanup** via scheduled Edge Function
- **Database triggers** automatically manage `saved_at` and `expires_at` timestamps

### 2. Save/Unsave Functionality
- Users can save jobs to prevent expiration
- Saving a job:
  - Sets `saved = true`
  - Sets `saved_at = NOW()`
  - Clears `expires_at` (NULL = never expires)
- Unsaving a job:
  - Sets `saved = false`
  - Clears `saved_at`
  - Sets `expires_at = NOW() + 48 hours`

### 3. Save-Before-Apply Enforcement
- **Backend validation**: Application generation endpoint checks if job is saved
- **Frontend enforcement**: Apply button disabled until job is saved
- **User feedback**: Clear messaging about save requirement

### 4. User Experience Enhancements
- **Expiration warnings**: Banner shows time remaining for unsaved jobs
- **Urgent alerts**: Highlighted warning when job expires in < 6 hours
- **Visual indicators**: Disabled apply button with tooltip for unsaved jobs
- **Save prompts**: Clear calls-to-action to save jobs

## Database Schema Changes

### Migration: `015_add_job_expiration_and_save_tracking.sql`

**New Columns:**
```sql
-- Jobs table additions
saved_at TIMESTAMPTZ     -- When job was saved (NULL if not saved)
expires_at TIMESTAMPTZ   -- When unsaved job expires (NULL if saved)
```

**Indexes:**
```sql
idx_jobs_expires_at          -- For cleanup queries
idx_jobs_saved_at            -- For saved jobs queries
idx_jobs_unsaved_expired     -- Optimized for cleanup (user_id, expires_at)
```

**Database Functions:**
```sql
cleanup_expired_jobs()              -- Deletes expired unsaved jobs
get_job_expiration_summary(user_id) -- Returns expiration statistics
```

**Database Triggers:**
```sql
trigger_set_job_expiration         -- Sets expires_at on INSERT
trigger_update_job_save_status     -- Manages saved_at/expires_at on UPDATE
```

## Backend Changes

### 1. Jobs Routes (`backend/src/routes/jobs.ts`)

**Updated PATCH /api/jobs/:id**
- Supports both `saved` and `isSaved` naming conventions
- Database triggers automatically handle timestamp updates
- Returns updated `saved_at` and `expires_at` values

### 2. Applications Routes (`backend/src/routes/applications.ts`)

**Updated POST /api/applications/generate**
- Validates that job is saved before generating application
- Returns 400 error with clear message if job is not saved

## Frontend Changes

### 1. Type Definitions (`src/sections/job-discovery-matching/types.ts`)

**Updated Job interface:**
```typescript
export interface Job {
  // ... existing fields
  savedAt?: string    // ISO timestamp when job was saved
  expiresAt?: string  // ISO timestamp when unsaved job expires
}
```

### 2. Hooks (`src/hooks/useJobs.ts`)

**Updated useJobs:**
- Fetches `saved_at` and `expires_at` from database
- `saveJob()` and `unsaveJob()` update local state with timestamps
- Maps database columns to frontend types

**Updated useJob:**
- Single job fetch includes expiration fields
- Save/unsave functions update timestamps

### 3. UI Components (`src/sections/job-discovery-matching/components/JobDetail.tsx`)

**New Features:**
- Expiration warning banner (shows hours until expiration)
- Urgent alert (when < 6 hours remaining)
- Save-before-apply info banner
- Disabled apply button with tooltip
- Time-based visual feedback

## Cleanup System

### Edge Function: `cleanup-expired-jobs`

**Location:** `/supabase/functions/cleanup-expired-jobs/index.ts`

**Purpose:** Periodically removes expired unsaved jobs

**Invocation:**
```bash
# Manual test
curl -X POST https://your-project.supabase.co/functions/v1/cleanup-expired-jobs \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# Response
{
  "success": true,
  "deletedCount": 5,
  "timestamp": "2025-12-28T10:30:00.000Z",
  "message": "Cleaned up 5 expired job(s)"
}
```

### Setting Up Cron Job

**Option 1: Supabase Cron (Recommended)**

1. Install pg_cron extension:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

2. Schedule the cleanup:
```sql
-- Run every hour
SELECT cron.schedule(
  'cleanup-expired-jobs',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/cleanup-expired-jobs',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

**Option 2: External Cron (GitHub Actions, etc.)**

Create `.github/workflows/cleanup-jobs.yml`:
```yaml
name: Cleanup Expired Jobs

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            https://your-project.supabase.co/functions/v1/cleanup-expired-jobs
```

**Option 3: Direct Database Function**

```sql
-- Run cleanup directly (can be scheduled with pg_cron)
SELECT cleanup_expired_jobs();
```

## Testing Guide

### 1. Database Migration

```bash
# Apply migration
cd supabase
supabase db push

# Verify schema
supabase db inspect
```

### 2. Test Database Triggers

```sql
-- Test 1: Insert unsaved job (should set expires_at)
INSERT INTO jobs (user_id, title, company, saved)
VALUES ('your-user-id', 'Test Job', 'Test Company', false)
RETURNING id, saved, saved_at, expires_at;

-- Result: expires_at should be ~48 hours from now

-- Test 2: Save job (should clear expires_at, set saved_at)
UPDATE jobs
SET saved = true
WHERE id = 'job-id'
RETURNING saved, saved_at, expires_at;

-- Result: saved_at should be NOW(), expires_at should be NULL

-- Test 3: Unsave job (should clear saved_at, set expires_at)
UPDATE jobs
SET saved = false
WHERE id = 'job-id'
RETURNING saved, saved_at, expires_at;

-- Result: saved_at should be NULL, expires_at should be NOW() + 48 hours
```

### 3. Test Cleanup Function

```sql
-- Create expired test job
INSERT INTO jobs (user_id, title, company, saved, expires_at)
VALUES (
  'your-user-id',
  'Expired Job',
  'Test Company',
  false,
  NOW() - INTERVAL '1 hour'  -- Already expired
);

-- Run cleanup
SELECT cleanup_expired_jobs();

-- Verify job was deleted
SELECT * FROM jobs WHERE title = 'Expired Job';
-- Should return no rows
```

### 4. Test Frontend

1. **Create unsaved job:**
   - Navigate to job discovery
   - Scrape or create a new job
   - Verify it shows expiration warning

2. **Save job:**
   - Click "Save Job" button
   - Verify banner disappears
   - Verify "Apply Now" button is enabled

3. **Try to apply to unsaved job:**
   - Create/find unsaved job
   - Try clicking "Apply Now"
   - Verify button is disabled
   - Verify tooltip shows "Save this job first"

4. **Test expiration display:**
   - Create job with custom `expires_at`:
   ```sql
   UPDATE jobs
   SET expires_at = NOW() + INTERVAL '3 hours'
   WHERE id = 'job-id';
   ```
   - Refresh job detail page
   - Verify warning shows "3 hours" remaining

### 5. Test Backend Validation

```bash
# Test save-before-apply enforcement
curl -X POST http://localhost:3000/api/applications/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"jobId": "unsaved-job-id"}'

# Expected response (400):
{
  "error": "Validation failed",
  "message": "You must save this job before applying",
  "details": {
    "job": "Please save this job first, then you can generate an application for it"
  }
}
```

### 6. Test Edge Function

```bash
# Deploy function
supabase functions deploy cleanup-expired-jobs

# Test invocation
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://your-project.supabase.co/functions/v1/cleanup-expired-jobs

# Expected response:
{
  "success": true,
  "deletedCount": 0,
  "timestamp": "2025-12-28T10:30:00.000Z",
  "message": "Cleaned up 0 expired job(s)"
}
```

## Monitoring and Maintenance

### Check Expiration Statistics

```sql
-- Get expiration summary for a user
SELECT * FROM get_job_expiration_summary('user-id');

-- Returns:
-- total_jobs | saved_jobs | unsaved_jobs | expiring_soon | expired_jobs
```

### Monitor Cleanup Effectiveness

```sql
-- Count expired but not cleaned up jobs
SELECT COUNT(*) as expired_count
FROM jobs
WHERE saved = false
  AND expires_at < NOW();

-- Should be 0 if cleanup is running properly
```

### View Cleanup Logs

Check Supabase Edge Function logs:
```bash
supabase functions logs cleanup-expired-jobs
```

## Rollback Plan

If issues arise, you can rollback:

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS trigger_set_job_expiration ON jobs;
DROP TRIGGER IF EXISTS trigger_update_job_save_status ON jobs;

-- Remove functions
DROP FUNCTION IF EXISTS set_job_expiration();
DROP FUNCTION IF EXISTS update_job_save_status();
DROP FUNCTION IF EXISTS cleanup_expired_jobs();
DROP FUNCTION IF EXISTS get_job_expiration_summary(UUID);

-- Remove columns (optional - keeps data)
ALTER TABLE jobs DROP COLUMN IF EXISTS saved_at;
ALTER TABLE jobs DROP COLUMN IF EXISTS expires_at;
```

## Performance Considerations

1. **Indexes:** All cleanup queries use optimized indexes
2. **Trigger overhead:** Minimal - only fires on INSERT/UPDATE
3. **Cleanup frequency:** Hourly recommended (balance between cleanup and DB load)
4. **Batch size:** Cleanup deletes all expired jobs (typically < 100/hour)

## Security

1. **Edge Function:** Requires service role key (not accessible to users)
2. **Database Function:** SECURITY DEFINER prevents privilege escalation
3. **RLS Policies:** All job queries respect user-level RLS
4. **Validation:** Backend enforces save-before-apply rule

## Future Enhancements

1. **Configurable expiration time** (per user or system-wide)
2. **Email notifications** before jobs expire
3. **Bulk save/unsave** operations
4. **Job expiration history** tracking
5. **Analytics dashboard** for expiration metrics
