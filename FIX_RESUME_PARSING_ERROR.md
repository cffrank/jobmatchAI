# Quick Fix: Resume Parsing Database Error

## Error
```
Could not find the 'linkedin_url' column of 'users' in the schema cache
```

## Cause
The `linkedin_url` column (and possibly other columns) don't exist in the Supabase database yet. The migrations were created but not applied.

## Fix (5 Minutes)

### Step 1: Verify Current State

1. Open **Supabase Dashboard**: https://supabase.com/dashboard
2. Go to **SQL Editor**
3. Run this verification script:

```bash
# The verification script is at:
supabase/migrations/verify_resume_parsing_schema.sql
```

Copy and paste the contents into SQL Editor and click **Run**. This will show which columns are missing.

### Step 2: Apply the Fix

1. In **Supabase Dashboard > SQL Editor**
2. Create a new query
3. Copy and paste the contents of:

```bash
supabase/migrations/014_ensure_resume_parsing_columns.sql
```

4. Click **Run**

This migration:
- ✅ Checks if each column exists before adding it
- ✅ Safe to run multiple times (idempotent)
- ✅ Adds all missing columns needed for resume parsing
- ✅ Provides detailed feedback on what was added

### Step 3: Verify the Fix

Run the verification script again (Step 1) to confirm all columns now exist.

You should see:
```
✅ ALL REQUIRED COLUMNS EXIST
Resume parsing should work correctly.
```

### Step 4: Test Resume Upload

1. Upload a resume with a LinkedIn URL
2. Verify the profile update succeeds
3. Check that the LinkedIn URL is saved in your profile

## What Gets Added

### users table
- `linkedin_url` (TEXT) - User's LinkedIn profile URL

### work_experience table
- `location` (TEXT) - Job location
- `employment_type` (TEXT) - Full-time, Part-time, Contract, etc.

### education table
- `is_current` (BOOLEAN) - Currently enrolled
- `grade` (TEXT) - GPA or grade

### skills table
- `years_of_experience` (INTEGER) - Years of experience with skill
- `endorsed_count` (INTEGER) - Number of endorsements

## Files Created

1. **Migration**: `/home/carl/application-tracking/jobmatch-ai/supabase/migrations/014_ensure_resume_parsing_columns.sql`
   - The fix migration to apply

2. **Verification**: `/home/carl/application-tracking/jobmatch-ai/supabase/migrations/verify_resume_parsing_schema.sql`
   - Script to check current schema state

3. **Documentation**: `/home/carl/application-tracking/jobmatch-ai/docs/FIX_LINKEDIN_URL_SCHEMA_ERROR.md`
   - Detailed explanation and troubleshooting

## Need Help?

If you encounter any issues:

1. Check the Supabase logs: Dashboard > Logs
2. Verify you're connected to the correct project
3. Ensure you have admin access to run SQL migrations
4. Review the detailed docs at: `docs/FIX_LINKEDIN_URL_SCHEMA_ERROR.md`
