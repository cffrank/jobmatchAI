# Fix for Compatibility Score Generation Issue

## Problem
The compatibility analysis was showing static percentages (50%, 70%, 100%, 30%, 64%) instead of actual calculated scores based on user profile vs job requirements.

## Root Cause
The database schema was missing critical columns that the job scraper and matching algorithm need:
- `required_skills` - Array of required skills extracted from job descriptions
- `preferred_skills` - Array of nice-to-have skills
- `work_arrangement` - Remote/Hybrid/On-site status
- `company_logo` - Company logo URL
- `search_id` - Link to the search that found this job
- `scraped_at` - Timestamp when job was scraped
- `compatibility_breakdown` - JSONB with detailed match scores (skillMatch, experienceMatch, industryMatch, locationMatch)
- `missing_skills` - Array of required skills the user doesn't have
- `recommendations` - Array of AI-generated application tips

Additionally, the `job_searches` table was referenced by the backend but didn't exist in the database.

## What Was Changed

### 1. Database Migration Created
**File:** `supabase/migrations/014_add_job_compatibility_fields.sql`

This migration:
- Creates the `job_searches` table to track user search history
- Adds all missing columns to the `jobs` table
- Creates appropriate indexes for performance
- Sets up RLS policies for data security

### 2. Frontend Hook Updated
**File:** `src/hooks/useJobs.ts`

Updated the `useJobs` and `useJob` hooks to:
- Read `required_skills`, `work_arrangement`, `company_logo`, etc. from database
- Read `compatibility_breakdown`, `missing_skills`, `recommendations` from database
- Properly map database column names (snake_case) to frontend types (camelCase)

### 3. Backend Job Scraper Updated
**File:** `backend/src/services/jobScraper.service.ts`

Updated the `saveJobsToDatabase` function to:
- Use correct column names (`saved` instead of `is_saved`, `archived` instead of `is_archived`)
- Include `preferred_skills` in the saved data
- Add comments explaining that compatibility scores are calculated on the frontend

## How to Apply the Fix

### Step 1: Run the Database Migration

```bash
# Make sure you're in the project root
cd /home/carl-f-frank/projects/jobmatchAI

# Apply the migration to your Supabase database
# Option A: Using Supabase CLI (recommended)
npx supabase db push

# Option B: Using Supabase Dashboard
# Go to your Supabase project dashboard > SQL Editor
# Copy and paste the contents of supabase/migrations/014_add_job_compatibility_fields.sql
# Execute the SQL
```

### Step 2: Regenerate Supabase Types

After running the migration, regenerate the TypeScript types to match the new schema:

```bash
# Generate types from your Supabase database
npx supabase gen types typescript --project-id <your-project-id> > src/types/supabase.ts

# Or if you have the Supabase CLI configured with a linked project:
npx supabase gen types typescript --linked > src/types/supabase.ts
```

### Step 3: Restart Backend and Frontend

```bash
# Restart backend (if running)
cd backend
npm run dev

# Restart frontend (if running)
cd ..
npm run dev
```

### Step 4: Test the Fix

1. **Search for new jobs** using the job search feature
   - The job scraper will now save `required_skills` and `work_arrangement` to the database
   - These fields are needed for compatibility scoring

2. **View job details** for any job
   - The compatibility breakdown should now show real calculated scores instead of static values
   - Scores are based on:
     - **Skill Match:** Percentage of required skills you have
     - **Experience Match:** Your years of experience vs job requirements
     - **Industry Match:** Your industry experience alignment
     - **Location Match:** Geographic compatibility

3. **Verify the scores are dynamic**
   - Update your user profile (add/remove skills, change location, etc.)
   - Refresh the job list
   - Compatibility scores should recalculate based on your new profile

## How the Compatibility Scoring Works Now

1. **Job Scraping** (`backend/src/services/jobScraper.service.ts`)
   - Scrapes jobs from LinkedIn/Indeed
   - Extracts `required_skills` from job description using keyword matching
   - Detects `work_arrangement` (Remote/Hybrid/On-site)
   - Saves all data including required_skills to database

2. **Job Fetching** (`src/hooks/useJobs.ts`)
   - Fetches jobs from database with all fields including `required_skills`
   - Passes jobs to the ranking algorithm

3. **Compatibility Calculation** (`src/lib/jobMatching.ts`)
   - `calculateJobMatch()` function runs for each job
   - Calculates four match dimensions:
     - **Skill Match:** Compares user skills vs `job.requiredSkills`
     - **Experience Match:** Compares user work history vs estimated job requirements
     - **Industry Match:** Checks if user has relevant industry experience
     - **Location Match:** Evaluates location compatibility considering work arrangement
   - Returns weighted overall score (Skills 40%, Experience 30%, Industry 20%, Location 10%)
   - Generates `missingSkills` array and `recommendations` for the user

4. **Display** (`src/sections/job-discovery-matching/components/JobDetail.tsx`)
   - Displays the calculated `compatibilityBreakdown` with progress bars
   - Shows `missingSkills` with warning indicators
   - Displays AI `recommendations` for improving application

## Verification Checklist

After applying the fix, verify:

- [ ] Migration ran successfully (check Supabase dashboard > Table Editor > jobs table has new columns)
- [ ] Supabase types regenerated (check `src/types/supabase.ts` has `required_skills`, `work_arrangement`, etc.)
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can search for new jobs successfully
- [ ] New jobs have `required_skills` populated
- [ ] Job detail page shows dynamic compatibility scores (not all zeros or static values)
- [ ] Compatibility breakdown shows different percentages for different jobs
- [ ] Missing skills are highlighted correctly
- [ ] Updating user profile causes scores to recalculate

## Troubleshooting

### TypeScript errors about missing properties

**Problem:** TypeScript complains that properties like `required_skills` don't exist on `JobRow` type.

**Solution:** Make sure you regenerated the Supabase types after running the migration (Step 2 above).

### Compatibility scores still showing zero

**Problem:** Jobs show 0% for all compatibility metrics.

**Possible causes:**
1. **Old jobs in database:** Jobs scraped before the migration won't have `required_skills`. Solution: Search for new jobs.
2. **Empty user profile:** User hasn't added skills/experience. Solution: Complete user profile.
3. **Migration not applied:** The new columns don't exist. Solution: Run migration (Step 1).

### Job scraper failing to save jobs

**Problem:** Job scraper returns an error when trying to save jobs.

**Possible cause:** Migration not applied or partially failed.

**Solution:**
```bash
# Check if columns exist
# Go to Supabase Dashboard > SQL Editor and run:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'jobs'
AND column_name IN ('required_skills', 'work_arrangement', 'compatibility_breakdown');

# Should return 3 rows. If not, re-run the migration.
```

## Additional Notes

- **Compatibility scores are calculated in real-time on the frontend** - This allows scores to update immediately when user profile changes
- **required_skills extraction uses keyword matching** - The job scraper looks for common tech skills in job descriptions. This is not AI-powered but works well for technical roles.
- **For better skill extraction in the future**, consider adding OpenAI integration to extract skills more intelligently from job descriptions
- **The database stores match_score but also calculates it dynamically** - This is intentional to allow for algorithm improvements without migrating old data

## Related Files Changed

1. `supabase/migrations/014_add_job_compatibility_fields.sql` - NEW migration file
2. `src/hooks/useJobs.ts` - Updated to read new database columns
3. `backend/src/services/jobScraper.service.ts` - Updated to use correct column names
4. `FIX_COMPATIBILITY_SCORES.md` - THIS FILE - documentation of the fix
