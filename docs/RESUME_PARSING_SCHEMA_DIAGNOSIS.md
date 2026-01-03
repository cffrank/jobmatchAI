# Resume Parsing Schema Error - Complete Diagnosis

## Problem Summary

**Error**: `Could not find the 'linkedin_url' column of 'users' in the schema cache`

**Status**: Resume parsing works correctly, but saving the parsed data to the database fails.

## Root Cause Analysis

### What's Working
1. ✅ Resume upload to Supabase Storage
2. ✅ Backend resume parsing with OpenAI GPT-4o Vision
3. ✅ LinkedIn URL extraction from resume
4. ✅ Structured data extraction (name, email, experience, education, skills)

### What's Failing
5. ❌ Frontend profile update with parsed data
6. ❌ Saving `linkedin_url` to `users` table

### Why It's Failing

The database schema is missing columns that the frontend code expects:

**Frontend Code** (`src/hooks/useProfile.ts`, line 177):
```typescript
function mapUserToDbUser(user: Partial<Omit<User, 'id'>>): Partial<Database['public']['Tables']['users']['Update']> {
  return {
    first_name: user.firstName,
    last_name: user.lastName,
    phone: user.phone,
    location: user.location,
    photo_url: user.profileImageUrl || undefined,
    current_title: user.headline,
    professional_summary: user.summary,
    linkedin_url: user.linkedInUrl,  // ❌ THIS COLUMN DOESN'T EXIST IN DATABASE
  }
}
```

**Database Schema** (`supabase/migrations/001_initial_schema.sql`, line 33-56):
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  location TEXT,
  photo_url TEXT,
  current_title TEXT,
  years_of_experience INTEGER,
  professional_summary TEXT,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
  -- ❌ NO linkedin_url COLUMN
);
```

## Migration History

### Migrations Created (But Not Applied)

1. **Migration 011** (`011_add_linkedin_url_column.sql`) - Created Dec 21
   - Adds `linkedin_url` to `users` table

2. **Migration 012** (`012_enhance_profile_tables_for_linkedin.sql`) - Created Dec 21
   - Adds `location`, `employment_type` to `work_experience`
   - Adds `is_current`, `grade` to `education`
   - Adds `years_of_experience`, `endorsed_count` to `skills`

### Why Weren't They Applied?

According to `SUPABASE_MIGRATION_COMPLETE.md`:
> However, **2 database migrations require manual application** via Supabase Dashboard.

The migrations were created but the user was instructed to apply them manually in the Supabase Dashboard. This step may not have been completed.

## Impact

### Affected Features
- ❌ Resume parsing import to profile
- ❌ OAuth profile sync with LinkedIn
- ❌ Manual LinkedIn URL input in profile
- ❌ Work experience location tracking
- ❌ Education current status

### Still Working
- ✅ Resume upload and storage
- ✅ Resume parsing and extraction
- ✅ Basic profile fields (name, email, phone)
- ✅ Work experience (without location)
- ✅ Education (without grade/current status)
- ✅ Skills (without years/endorsements)

## Solution

### Created Files

1. **Consolidated Migration** (NEW)
   - File: `supabase/migrations/014_ensure_resume_parsing_columns.sql`
   - Purpose: Idempotent migration that adds all missing columns
   - Features: Checks existence before adding, safe to run multiple times

2. **Verification Script** (NEW)
   - File: `supabase/migrations/verify_resume_parsing_schema.sql`
   - Purpose: Check which columns exist/missing
   - Output: Clear ✅/❌ status for each column

3. **Quick Fix Guide** (NEW)
   - File: `FIX_RESUME_PARSING_ERROR.md`
   - Purpose: 5-minute step-by-step fix guide

4. **Detailed Documentation** (NEW)
   - File: `docs/FIX_LINKEDIN_URL_SCHEMA_ERROR.md`
   - Purpose: Comprehensive troubleshooting guide

### Application Steps

1. **Verify Current State**
   - Run `verify_resume_parsing_schema.sql` in Supabase Dashboard > SQL Editor
   - Review which columns are missing

2. **Apply Fix**
   - Run `014_ensure_resume_parsing_columns.sql` in Supabase Dashboard > SQL Editor
   - Migration will add all missing columns

3. **Verify Fix**
   - Run `verify_resume_parsing_schema.sql` again
   - Confirm all columns now exist

4. **Test**
   - Upload resume with LinkedIn URL
   - Verify profile update succeeds
   - Check LinkedIn URL saved in profile

## Technical Details

### Missing Columns Breakdown

| Table | Column | Type | Nullable | Default | Purpose |
|-------|--------|------|----------|---------|---------|
| users | linkedin_url | TEXT | YES | NULL | Store LinkedIn profile URL |
| work_experience | location | TEXT | YES | NULL | Job location (city/state/remote) |
| work_experience | employment_type | TEXT | YES | NULL | Full-time/Part-time/Contract |
| education | is_current | BOOLEAN | YES | false | Currently enrolled flag |
| education | grade | TEXT | YES | NULL | GPA or grade |
| skills | years_of_experience | INTEGER | YES | NULL | Years with this skill |
| skills | endorsed_count | INTEGER | YES | 0 | LinkedIn endorsements count |

### Migration Safety

The new migration `014_ensure_resume_parsing_columns.sql` is **idempotent**:

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'linkedin_url'
  ) THEN
    ALTER TABLE public.users ADD COLUMN linkedin_url TEXT;
  ELSE
    RAISE NOTICE 'linkedin_url column already exists';
  END IF;
END $$;
```

This means:
- ✅ Safe to run multiple times
- ✅ Won't error if column already exists
- ✅ Won't overwrite existing data
- ✅ Provides clear feedback on what was added

## Code Flow

### Successful Resume Parsing Flow
1. User uploads resume file
2. File saved to Supabase Storage
3. Frontend calls `/api/resume/parse` with storage path
4. Backend downloads file, parses with OpenAI
5. Backend returns structured data (including LinkedIn URL)
6. ✅ **Frontend receives parsed data**

### Failed Profile Update Flow
7. ❌ **Frontend calls `useProfile().updateProfile()` with LinkedIn URL**
8. ❌ **Supabase rejects update: "linkedin_url column not found"**
9. ❌ **User sees error, data not saved**

### Expected Flow After Fix
7. ✅ **Frontend calls `useProfile().updateProfile()` with LinkedIn URL**
8. ✅ **Supabase accepts update: linkedin_url column exists**
9. ✅ **Profile saved successfully**

## Prevention

To prevent this in the future:

1. **Run all migrations immediately** when created
2. **Verify schema** matches TypeScript types
3. **Test end-to-end** after schema changes
4. **Add migration verification** to CI/CD pipeline
5. **Document manual steps** clearly in deployment guides

## Related Issues

This same schema mismatch could affect:
- OAuth profile sync (`src/lib/oauthProfileSync.ts`)
- LinkedIn import features
- Resume-to-profile autofill
- Profile completeness checks

All of these features try to update `linkedin_url` and will fail until the migration is applied.

## Next Steps

1. Apply the migration following `FIX_RESUME_PARSING_ERROR.md`
2. Test resume upload end-to-end
3. Consider adding schema validation tests
4. Update deployment documentation
