# Fix: LinkedIn URL Schema Error

## Problem

Resume parsing is working correctly, but saving the parsed data fails with:

```json
{
    "code": "PGRST204",
    "details": null,
    "hint": null,
    "message": "Could not find the 'linkedin_url' column of 'users' in the schema cache"
}
```

## Root Cause

The `users` table in the Supabase database is **missing the `linkedin_url` column** and potentially other profile columns. While migrations 011 and 012 were created to add these columns, they may not have been applied to the production database.

## Missing Columns

The following columns are needed for resume parsing but may be missing:

### users table
- `linkedin_url` (TEXT, nullable)

### work_experience table
- `location` (TEXT, nullable)
- `employment_type` (TEXT, nullable)

### education table
- `is_current` (BOOLEAN, default false)
- `grade` (TEXT, nullable)

### skills table
- `years_of_experience` (INTEGER, nullable)
- `endorsed_count` (INTEGER, default 0)

## Solution

### Option 1: Apply Consolidated Migration (Recommended)

A new consolidated migration has been created that checks for and adds all missing columns:

**File**: `/home/carl/application-tracking/jobmatch-ai/supabase/migrations/014_ensure_resume_parsing_columns.sql`

**Steps to apply**:

1. Open Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `014_ensure_resume_parsing_columns.sql`
5. Click **Run**

This migration is **idempotent** - it safely checks if each column exists before attempting to add it, so it can be run multiple times without errors.

### Option 2: Apply Individual Migrations

Alternatively, apply the individual migrations in order:

1. **Migration 011**: `011_add_linkedin_url_column.sql`
   - Adds `linkedin_url` to users table

2. **Migration 012**: `012_enhance_profile_tables_for_linkedin.sql`
   - Adds other profile columns to work_experience, education, skills

Apply each in Supabase Dashboard > SQL Editor.

## Verification

After applying the migration, verify the columns exist:

```sql
-- Check users table columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN ('linkedin_url', 'first_name', 'last_name', 'phone', 'location', 'photo_url', 'current_title', 'professional_summary');

-- Check work_experience table columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'work_experience'
  AND column_name IN ('location', 'employment_type');

-- Check education table columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'education'
  AND column_name IN ('is_current', 'grade');

-- Check skills table columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'skills'
  AND column_name IN ('years_of_experience', 'endorsed_count');
```

## Testing

After applying the migration:

1. **Upload a resume** with LinkedIn URL
2. **Verify parsing** extracts the LinkedIn URL
3. **Check profile update** succeeds without errors
4. **View profile** to confirm LinkedIn URL is saved

## Expected Behavior After Fix

1. Resume parsing extracts LinkedIn URL from resume
2. Profile update API call succeeds
3. LinkedIn URL is saved to `users.linkedin_url`
4. Profile displays the LinkedIn URL

## Related Files

### Frontend Code
- `/home/carl/application-tracking/jobmatch-ai/src/hooks/useProfile.ts` - Profile update logic
- `/home/carl/application-tracking/jobmatch-ai/src/lib/oauthProfileSync.ts` - OAuth profile sync

### Migrations
- `/home/carl/application-tracking/jobmatch-ai/supabase/migrations/001_initial_schema.sql` - Initial schema (no linkedin_url)
- `/home/carl/application-tracking/jobmatch-ai/supabase/migrations/011_add_linkedin_url_column.sql` - Adds linkedin_url
- `/home/carl/application-tracking/jobmatch-ai/supabase/migrations/012_enhance_profile_tables_for_linkedin.sql` - Adds other columns
- `/home/carl/application-tracking/jobmatch-ai/supabase/migrations/014_ensure_resume_parsing_columns.sql` - **NEW: Consolidated idempotent migration**

## Notes

- The migration is **idempotent** and safe to run multiple times
- All columns are **nullable** to allow gradual profile completion
- The `linkedin_url` column accepts any text value (no validation constraint)
- Indexes are created for performance on commonly queried columns
