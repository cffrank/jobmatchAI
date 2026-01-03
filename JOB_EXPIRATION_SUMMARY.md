# Job Expiration and Save Functionality - Implementation Summary

## Overview

Successfully implemented automatic job expiration and save functionality for JobMatch AI with the following key features:

1. **48-Hour Auto-Expiration**: Unsaved jobs automatically expire and are deleted after 48 hours
2. **Save to Persist**: Users can save jobs to prevent expiration (saved jobs persist indefinitely)
3. **Save-Before-Apply**: Users must save a job before they can generate an application
4. **Automatic Cleanup**: Background job removes expired jobs hourly
5. **User Feedback**: Clear UI indicators for expiration status and save requirements

## Implementation Files

### Database Layer
- `/supabase/migrations/015_add_job_expiration_and_save_tracking.sql` - Schema changes, triggers, and functions
- `/scripts/test-job-expiration.sql` - Test script for validation

### Backend Layer
- `/backend/src/routes/jobs.ts` - Updated PATCH endpoint for save/unsave
- `/backend/src/routes/applications.ts` - Added save-before-apply validation
- `/supabase/functions/cleanup-expired-jobs/index.ts` - Cleanup Edge Function

### Frontend Layer
- `/src/sections/job-discovery-matching/types.ts` - Updated Job interface with savedAt/expiresAt
- `/src/hooks/useJobs.ts` - Updated hooks with timestamp handling
- `/src/sections/job-discovery-matching/components/JobDetail.tsx` - UI enhancements

### Documentation
- `/docs/JOB_EXPIRATION_IMPLEMENTATION.md` - Complete implementation guide

## Key Features

### 1. Database Schema
**New Columns:**
- `saved_at` - Timestamp when job was saved (NULL if not saved)
- `expires_at` - Timestamp when unsaved job expires (NULL for saved jobs)

**Triggers:**
- Auto-set `expires_at` on job creation (48 hours from creation)
- Auto-update timestamps when `saved` status changes

**Functions:**
- `cleanup_expired_jobs()` - Deletes expired unsaved jobs
- `get_job_expiration_summary(user_id)` - Returns expiration statistics

### 2. Backend Changes
**Jobs API (`PATCH /api/jobs/:id`):**
- Supports saving/unsaving jobs
- Timestamps managed automatically by database triggers
- Returns updated `saved_at` and `expires_at`

**Applications API (`POST /api/applications/generate`):**
- Validates job is saved before generating application
- Returns 400 error with clear message if not saved

### 3. Frontend Changes
**UI Enhancements:**
- Disabled "Apply Now" button for unsaved jobs with tooltip
- Expiration warning banner showing hours until deletion
- Urgent alert (amber) when < 6 hours remaining
- Save-before-apply info banner
- Visual feedback for save status

**Hook Updates:**
- `useJobs` and `useJob` fetch and update expiration fields
- Save/unsave functions update local state with timestamps
- Proper type support for `savedAt` and `expiresAt`

### 4. Cleanup System
**Edge Function:**
- Runs periodically (recommended: hourly)
- Deletes expired unsaved jobs
- Returns count of deleted jobs
- Secured with service role key

## Next Steps

### 1. Deploy Database Migration
```bash
cd supabase
supabase db push
```

### 2. Deploy Edge Function
```bash
supabase functions deploy cleanup-expired-jobs
```

### 3. Set Up Cron Job
Choose one option:

**Option A: Supabase Cron (Recommended)**
```sql
SELECT cron.schedule(
  'cleanup-expired-jobs',
  '0 * * * *',
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/cleanup-expired-jobs',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );$$
);
```

**Option B: GitHub Actions**
Add `.github/workflows/cleanup-jobs.yml` (see docs)

**Option C: External Cron**
Use your preferred cron service to call the Edge Function hourly

### 4. Test Implementation
```bash
# Run SQL test script
psql -f scripts/test-job-expiration.sql

# Test Edge Function
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://your-project.supabase.co/functions/v1/cleanup-expired-jobs
```

### 5. Monitor
- Check Edge Function logs: `supabase functions logs cleanup-expired-jobs`
- Monitor expired job count: See queries in test script
- Review user feedback and adjust expiration time if needed

## User Flow

### New Job Created
1. Job scraped or manually added
2. Database trigger sets `expires_at = NOW() + 48 hours`
3. User sees expiration warning in UI

### User Saves Job
1. User clicks "Save Job" button
2. Backend updates `saved = true`
3. Database trigger sets `saved_at = NOW()` and clears `expires_at`
4. UI updates: removes warning, enables "Apply Now" button

### User Applies to Job
1. User clicks "Apply Now" (only enabled if saved)
2. Backend validates job is saved
3. Application generation proceeds if validation passes
4. Error returned if job not saved

### Job Expires
1. 48 hours pass without user saving job
2. Hourly cleanup function runs
3. Expired job deleted from database
4. User no longer sees job in list

## Benefits

1. **Reduced Database Size**: Automatic cleanup of uninteresting jobs
2. **Better Organization**: Only jobs user cares about persist
3. **Prevented Accidental Applications**: Must consciously save before applying
4. **Clear User Intent**: Save action indicates genuine interest
5. **Improved UX**: Clear feedback about job status and requirements

## Technical Decisions

### Why 48 Hours?
- Long enough for users to review jobs
- Short enough to keep database clean
- Can be adjusted per user requirements

### Why Save-Before-Apply?
- Prevents accidental applications to jobs just scraped
- Encourages user to review job before committing
- Creates clear user intent signal
- Organizes job search workflow

### Why Database Triggers?
- Ensures timestamp consistency
- Reduces backend code complexity
- Guarantees data integrity
- Simplifies frontend logic

### Why Edge Function for Cleanup?
- Serverless (no infrastructure to maintain)
- Scalable and cost-effective
- Easy to monitor and debug
- Simple cron integration

## Monitoring Queries

```sql
-- Count jobs by status
SELECT
  COUNT(*) FILTER (WHERE saved = true) as saved_jobs,
  COUNT(*) FILTER (WHERE saved = false AND expires_at > NOW()) as active_unsaved,
  COUNT(*) FILTER (WHERE saved = false AND expires_at <= NOW()) as expired_pending_cleanup
FROM jobs
WHERE user_id = 'your-user-id';

-- Check next cleanup targets
SELECT id, title, company, expires_at
FROM jobs
WHERE saved = false AND expires_at <= NOW()
ORDER BY expires_at
LIMIT 10;

-- User expiration summary
SELECT * FROM get_job_expiration_summary('your-user-id');
```

## Future Enhancements

1. **Configurable Expiration**: Allow users to set custom expiration times
2. **Email Reminders**: Notify users before jobs expire
3. **Bulk Operations**: Save/unsave multiple jobs at once
4. **Smart Expiration**: Extend expiration for high-match jobs
5. **Analytics**: Track save rates and expiration patterns
6. **Archive Instead of Delete**: Soft delete with recovery option

## Support

For issues or questions:
1. Check `/docs/JOB_EXPIRATION_IMPLEMENTATION.md` for detailed guide
2. Review test script: `/scripts/test-job-expiration.sql`
3. Check Edge Function logs for cleanup issues
4. Verify database triggers are active

## Rollback

If needed, see "Rollback Plan" section in `/docs/JOB_EXPIRATION_IMPLEMENTATION.md`
