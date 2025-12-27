# Database Schema Gaps Analysis

**Generated:** 2025-12-24
**Purpose:** Document mismatches between TypeScript application code expectations and actual Supabase database schema

---

## Overview

This document identifies missing columns in the Supabase database that are expected by the application code. These gaps are causing TypeScript errors and potential runtime issues.

**Total Missing Columns:** 13 across 4 tables
- subscriptions: 1 column
- users: 2 columns
- jobs: 9 columns
- usage_limits: Already exists (verified in schema)

---

## 1. Subscriptions Table

### Missing Column: `billing_cycle`

**Expected Type:** `VARCHAR(10)` or `TEXT`
**Current Status:** Does not exist in database schema
**Default Behavior:** Application defaults to `'monthly'`

#### Used In:
- `/home/carl/application-tracking/jobmatch-ai/src/hooks/useSubscription.ts` (lines 48, 89, 119)
  - Currently hardcoded to `'monthly'` with comments noting the missing column

#### Why It's Needed:
The subscription system needs to track whether a user is on a monthly or annual billing cycle for:
- Correct invoice generation
- Pricing calculations
- Subscription management UI display

#### Suggested Migration SQL:
```sql
-- Add billing_cycle column to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN billing_cycle VARCHAR(10) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual'));

-- Update existing records to have default value
UPDATE subscriptions
SET billing_cycle = 'monthly'
WHERE billing_cycle IS NULL;

-- Add constraint comment
COMMENT ON COLUMN subscriptions.billing_cycle IS 'Billing frequency: monthly or annual';
```

---

## 2. Users Table

### Missing Column 1: `two_factor_setup_complete`

**Expected Type:** `BOOLEAN`
**Current Status:** Does not exist in database schema (only `two_factor_enabled` exists)
**Default Behavior:** Application defaults to `false`

#### Used In:
- `/home/carl/application-tracking/jobmatch-ai/src/lib/securityService.ts` (lines 367, 375)
  - Function: `get2FASettings()` - Fetches 2FA setup status

#### Why It's Needed:
Security feature to track the completion of 2FA setup workflow:
- `two_factor_enabled` = User has 2FA turned on
- `two_factor_setup_complete` = User has completed the initial setup (generated backup codes, verified device)

This distinction allows the app to prompt users to complete setup if they've enabled 2FA but haven't finished the setup process.

#### Suggested Migration SQL:
```sql
-- Add two_factor_setup_complete column to users table
ALTER TABLE users
ADD COLUMN two_factor_setup_complete BOOLEAN DEFAULT FALSE;

-- Set to TRUE for users who already have 2FA enabled (assume they completed setup)
UPDATE users
SET two_factor_setup_complete = TRUE
WHERE two_factor_enabled = TRUE;

-- Add constraint comment
COMMENT ON COLUMN users.two_factor_setup_complete IS 'Whether user has completed 2FA setup process including backup codes';
```

---

### Missing Column 2: `backup_codes_generated`

**Expected Type:** `BOOLEAN`
**Current Status:** Does not exist in database schema
**Default Behavior:** Application defaults to `false`

#### Used In:
- `/home/carl/application-tracking/jobmatch-ai/src/lib/securityService.ts` (lines 367, 376)
  - Function: `get2FASettings()` - Tracks whether user has generated backup codes

#### Why It's Needed:
Security best practice for 2FA implementation:
- Tracks whether user has generated recovery backup codes
- Prevents account lockout if user loses access to their 2FA device
- Used in security settings UI to prompt users to generate codes

#### Suggested Migration SQL:
```sql
-- Add backup_codes_generated column to users table
ALTER TABLE users
ADD COLUMN backup_codes_generated BOOLEAN DEFAULT FALSE;

-- Assume users with 2FA enabled have generated codes (conservative default)
UPDATE users
SET backup_codes_generated = TRUE
WHERE two_factor_enabled = TRUE;

-- Add constraint comment
COMMENT ON COLUMN users.backup_codes_generated IS 'Whether user has generated backup codes for account recovery';
```

---

## 3. Jobs Table

The jobs table has the most significant schema gaps. The code expects multiple fields that don't exist in the current schema.

### Missing Column 1: `company_logo`

**Expected Type:** `TEXT` (URL string)
**Current Status:** Does not exist in database schema

#### Used In:
- `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/applications.ts` (line 392)
  - Function: `mapDatabaseJob()` - Maps DB records to Job type
- `/home/carl/application-tracking/jobmatch-ai/backend/src/services/jobScraper.service.ts` (lines 242, 382)
  - Job scraping and storage logic
- `/home/carl/application-tracking/jobmatch-ai/backend/src/types/index.ts` (line 113)
  - Job type definition

#### Why It's Needed:
Enhances job listing UI with company branding:
- Display company logos in job search results
- Improve visual recognition and user experience
- Scraped from job posting sites (LinkedIn, Indeed)

#### Suggested Migration SQL:
```sql
-- Add company_logo column to jobs table
ALTER TABLE jobs
ADD COLUMN company_logo TEXT NULL;

-- Add constraint comment
COMMENT ON COLUMN jobs.company_logo IS 'URL to company logo image';
```

---

### Missing Column 2: `work_arrangement`

**Expected Type:** `TEXT` (enum-like: 'Remote', 'Hybrid', 'On-site', 'Unknown')
**Current Status:** Does not exist in database schema

#### Used In:
- `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/jobs.ts` (line 114)
  - Query filter: `query.eq('work_arrangement', workArrangement)`
- `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/applications.ts` (line 394)
  - Function: `mapDatabaseJob()`
- `/home/carl/application-tracking/jobmatch-ai/backend/src/services/jobScraper.service.ts` (lines 170, 220, 244, 384)
  - Job scraping and filtering
- `/home/carl/application-tracking/jobmatch-ai/backend/src/jobs/scheduled.ts` (line 237)
  - Scheduled job searches based on user preferences
- `/home/carl/application-tracking/jobmatch-ai/backend/src/types/index.ts` (lines 94, 115)
  - Type definitions for Job and JobPreferences

#### Why It's Needed:
Core filtering feature for job search:
- Users can filter jobs by work arrangement preference (Remote/Hybrid/On-site)
- Critical for matching jobs to user preferences
- Scraped from job postings

#### Suggested Migration SQL:
```sql
-- Add work_arrangement column to jobs table with enum constraint
ALTER TABLE jobs
ADD COLUMN work_arrangement TEXT CHECK (work_arrangement IN ('Remote', 'Hybrid', 'On-site', 'Unknown'));

-- Set default for existing records
UPDATE jobs
SET work_arrangement = 'Unknown'
WHERE work_arrangement IS NULL;

-- Add constraint comment
COMMENT ON COLUMN jobs.work_arrangement IS 'Work location arrangement: Remote, Hybrid, On-site, or Unknown';
```

---

### Missing Column 3: `posted_date`

**Expected Type:** `TIMESTAMP WITH TIME ZONE` or `TEXT` (ISO 8601 date string)
**Current Status:** Does not exist in database schema (has `added_at` instead)

#### Used In:
- `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/applications.ts` (line 397)
  - Function: `mapDatabaseJob()`
- `/home/carl/application-tracking/jobmatch-ai/backend/src/services/jobScraper.service.ts` (lines 165, 216, 247, 387)
  - Job scraping and storage
- `/home/carl/application-tracking/jobmatch-ai/backend/src/types/index.ts` (line 118)
  - Job type definition

#### Why It's Needed:
Tracks when the job was originally posted by the employer:
- Different from `created_at` (when record was created in our DB)
- Different from `added_at` (when job was added to user's list)
- Important for job freshness indicators in UI
- Helps users prioritize recent postings

#### Suggested Migration SQL:
```sql
-- Add posted_date column to jobs table
ALTER TABLE jobs
ADD COLUMN posted_date TIMESTAMP WITH TIME ZONE NULL;

-- Backfill with added_at date for existing records (best guess)
UPDATE jobs
SET posted_date = added_at
WHERE posted_date IS NULL;

-- Add constraint comment
COMMENT ON COLUMN jobs.posted_date IS 'Date when job was originally posted by employer (may differ from when scraped)';
```

---

### Missing Column 4: `required_skills`

**Expected Type:** `TEXT[]` or `JSONB` (array of skill strings)
**Current Status:** Does not exist in database schema

#### Used In:
- `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/applications.ts` (line 401)
  - Function: `mapDatabaseJob()`
- `/home/carl/application-tracking/jobmatch-ai/backend/src/services/jobScraper.service.ts` (lines 251, 391)
  - Function: `extractRequiredSkills()` - Parses skills from job description
- `/home/carl/application-tracking/jobmatch-ai/backend/src/services/openai.service.ts` (lines 110, 360, 405)
  - AI resume generation and matching logic
- `/home/carl/application-tracking/jobmatch-ai/backend/src/types/index.ts` (line 122)
  - Job type definition

#### Why It's Needed:
Core matching functionality:
- Used in algorithmic skill matching score calculation
- AI uses this to tailor resumes and cover letters
- Displayed in job details UI
- Critical for "missing skills" analysis

#### Suggested Migration SQL:
```sql
-- Add required_skills column to jobs table as text array
ALTER TABLE jobs
ADD COLUMN required_skills TEXT[] NULL;

-- Add GIN index for efficient array searching
CREATE INDEX idx_jobs_required_skills ON jobs USING GIN(required_skills);

-- Add constraint comment
COMMENT ON COLUMN jobs.required_skills IS 'Array of required skills extracted from job description';
```

---

### Missing Column 5: `preferred_skills`

**Expected Type:** `TEXT[]` or `JSONB` (array of skill strings)
**Current Status:** Does not exist in database schema

#### Used In:
- `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/applications.ts` (line 402)
  - Function: `mapDatabaseJob()`
- `/home/carl/application-tracking/jobmatch-ai/backend/src/services/openai.service.ts` (lines 258-260, 293)
  - AI resume generation includes preferred skills in context
- `/home/carl/application-tracking/jobmatch-ai/backend/src/types/index.ts` (line 123)
  - Job type definition

#### Why It's Needed:
Enhanced matching and AI generation:
- Differentiates "must-have" vs "nice-to-have" skills
- AI can prioritize highlighting required skills while mentioning preferred ones
- Provides more nuanced matching beyond binary yes/no

#### Suggested Migration SQL:
```sql
-- Add preferred_skills column to jobs table as text array
ALTER TABLE jobs
ADD COLUMN preferred_skills TEXT[] NULL;

-- Add GIN index for efficient array searching
CREATE INDEX idx_jobs_preferred_skills ON jobs USING GIN(preferred_skills);

-- Add constraint comment
COMMENT ON COLUMN jobs.preferred_skills IS 'Array of preferred/nice-to-have skills extracted from job description';
```

---

### Missing Column 6: `algorithmic_score`

**Expected Type:** `NUMERIC` or `FLOAT` (0-100 range)
**Current Status:** Does not exist in database schema (only `match_score` exists)

#### Used In:
- `/home/carl/application-tracking/jobmatch-ai/backend/src/types/index.ts` (line 126)
  - Job type definition

#### Why It's Needed:
Dual scoring system architecture:
- `algorithmic_score`: Rule-based matching score (skills, location, salary)
- `ai_score`: AI-generated semantic matching score
- `match_score`: Combined/weighted final score
- Allows debugging and comparison of scoring methods

#### Suggested Migration SQL:
```sql
-- Add algorithmic_score column to jobs table
ALTER TABLE jobs
ADD COLUMN algorithmic_score NUMERIC(5,2) NULL CHECK (algorithmic_score >= 0 AND algorithmic_score <= 100);

-- Add constraint comment
COMMENT ON COLUMN jobs.algorithmic_score IS 'Rule-based matching score (0-100) calculated from skills, location, salary alignment';
```

---

### Missing Column 7: `ai_score`

**Expected Type:** `NUMERIC` or `FLOAT` (0-100 range)
**Current Status:** Does not exist in database schema

#### Used In:
- `/home/carl/application-tracking/jobmatch-ai/backend/src/types/index.ts` (line 127)
  - Job type definition

#### Why It's Needed:
Dual scoring system (see `algorithmic_score` above):
- AI-generated semantic match score
- Based on OpenAI analysis of job description vs user profile
- More nuanced than keyword matching

#### Suggested Migration SQL:
```sql
-- Add ai_score column to jobs table
ALTER TABLE jobs
ADD COLUMN ai_score NUMERIC(5,2) NULL CHECK (ai_score >= 0 AND ai_score <= 100);

-- Add constraint comment
COMMENT ON COLUMN jobs.ai_score IS 'AI-generated semantic matching score (0-100) from OpenAI analysis';
```

---

### Missing Column 8: `is_saved`

**Expected Type:** `BOOLEAN`
**Current Status:** Column exists as `saved` (different name)

#### Used In:
- `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/jobs.ts` (line 102)
  - Query: `query.eq('is_saved', saved)`
- `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/applications.ts` (line 405)
  - Function: `mapDatabaseJob()`
- `/home/carl/application-tracking/jobmatch-ai/backend/src/services/jobScraper.service.ts` (lines 253, 393)
  - Default value and storage

**Note:** The database schema shows this column exists as `saved` (line 373 in supabase.ts), not `is_saved`. This is a naming inconsistency.

#### Why It's Needed:
User can save/bookmark jobs for later review.

#### Suggested Migration SQL:
```sql
-- Option 1: Rename existing column to match code expectations
ALTER TABLE jobs
RENAME COLUMN saved TO is_saved;

-- Option 2: Keep database column as 'saved' and update code mappers
-- (No migration needed, just update TypeScript mapping layer)
```

**Recommendation:** Option 2 - Keep database as `saved` and fix the mapping functions. The current column name is clearer and more concise.

---

### Missing Column 9: `is_archived`

**Expected Type:** `BOOLEAN`
**Current Status:** Column exists as `archived` (different name)

#### Used In:
- `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/jobs.ts` (lines 96, 303, 307)
  - Archive job endpoint and queries
- `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/applications.ts` (line 406)
  - Function: `mapDatabaseJob()`
- `/home/carl/application-tracking/jobmatch-ai/backend/src/services/jobScraper.service.ts` (lines 254, 394)
  - Default value and storage

**Note:** The database schema shows this column exists as `archived` (line 360 in supabase.ts), not `is_archived`. This is a naming inconsistency.

#### Why It's Needed:
User can archive jobs they're no longer interested in (soft delete).

#### Suggested Migration SQL:
```sql
-- Option 1: Rename existing column to match code expectations
ALTER TABLE jobs
RENAME COLUMN archived TO is_archived;

-- Option 2: Keep database column as 'archived' and update code mappers
-- (No migration needed, just update TypeScript mapping layer)
```

**Recommendation:** Option 2 - Keep database as `archived` and fix the mapping functions. The current column name is clearer and more concise.

---

### Missing Column 10: `scraped_at`

**Expected Type:** `TIMESTAMP WITH TIME ZONE` or `TEXT` (ISO 8601 timestamp)
**Current Status:** Does not exist in database schema

#### Used In:
- `/home/carl/application-tracking/jobmatch-ai/backend/src/services/jobScraper.service.ts` (lines 255, 395)
  - Records when job was scraped from external source
- `/home/carl/application-tracking/jobmatch-ai/backend/src/types/index.ts` (line 134)
  - Job type definition

#### Why It's Needed:
Tracks data freshness:
- Different from `created_at` (database record creation)
- Different from `posted_date` (employer posting date)
- Important for re-scraping logic and stale data detection
- Used in scheduled job updates

#### Suggested Migration SQL:
```sql
-- Add scraped_at column to jobs table
ALTER TABLE jobs
ADD COLUMN scraped_at TIMESTAMP WITH TIME ZONE NULL;

-- Backfill with created_at for existing records
UPDATE jobs
SET scraped_at = created_at
WHERE scraped_at IS NULL AND source IN ('linkedin', 'indeed');

-- Add constraint comment
COMMENT ON COLUMN jobs.scraped_at IS 'Timestamp when job data was scraped from external source';
```

---

## 4. Usage Limits Table

### Status: ALL COLUMNS EXIST ✓

The code expects these columns in `usage_limits` table:
- `ai_generations_limit` - **EXISTS** (line 919 in supabase.ts)
- `ai_generations_used` - **EXISTS** (line 920 in supabase.ts)
- `job_searches_limit` - **EXISTS** (line 925 in supabase.ts)
- `job_searches_used` - **EXISTS** (line 926 in supabase.ts)
- `emails_sent_limit` - **EXISTS** (line 922 in supabase.ts)
- `emails_sent_used` - **EXISTS** (line 923 in supabase.ts)

#### Used In:
- `/home/carl/application-tracking/jobmatch-ai/src/sections/account-billing/SettingsPage.tsx` (lines 136, 138)
  - Displays usage limits in billing settings UI

**No migration needed** - columns already exist in database schema.

---

## Summary Table

| Table | Missing Column | Type | Priority | Impact |
|-------|---------------|------|----------|--------|
| subscriptions | `billing_cycle` | VARCHAR(10) | Medium | Billing display incorrect |
| users | `two_factor_setup_complete` | BOOLEAN | Medium | 2FA workflow incomplete |
| users | `backup_codes_generated` | BOOLEAN | Medium | Security risk |
| jobs | `company_logo` | TEXT | Low | UI enhancement |
| jobs | `work_arrangement` | TEXT | **HIGH** | **Core filtering broken** |
| jobs | `posted_date` | TIMESTAMP | Medium | Freshness indicators missing |
| jobs | `required_skills` | TEXT[] | **HIGH** | **Matching broken** |
| jobs | `preferred_skills` | TEXT[] | Medium | AI quality reduced |
| jobs | `algorithmic_score` | NUMERIC | Low | Score debugging unavailable |
| jobs | `ai_score` | NUMERIC | Low | Score debugging unavailable |
| jobs | ~~`is_saved`~~ | ~~BOOLEAN~~ | N/A | **Exists as `saved`** (rename not needed) |
| jobs | ~~`is_archived`~~ | ~~BOOLEAN~~ | N/A | **Exists as `archived`** (rename not needed) |
| jobs | `scraped_at` | TIMESTAMP | Medium | Data freshness tracking missing |

**Total:** 10 missing columns (3 HIGH priority, 5 MEDIUM priority, 2 LOW priority)

---

## Priority Recommendations

### High Priority (Blocking Core Features)
1. **jobs.work_arrangement** - Required for job filtering
2. **jobs.required_skills** - Required for skill matching and AI generation

### Medium Priority (Degraded UX)
3. **subscriptions.billing_cycle** - Incorrect billing display
4. **users.two_factor_setup_complete** - Incomplete 2FA workflow
5. **users.backup_codes_generated** - Security gap
6. **jobs.posted_date** - Missing freshness indicators
7. **jobs.preferred_skills** - Reduced AI quality
8. **jobs.scraped_at** - Cannot track data staleness

### Low Priority (Nice to Have)
9. **jobs.company_logo** - UI enhancement
10. **jobs.algorithmic_score** - Debugging tool
11. **jobs.ai_score** - Debugging tool

### Code Fixes (No Migration)
- **jobs.saved → is_saved**: Update TypeScript mappers to use `saved`
- **jobs.archived → is_archived**: Update TypeScript mappers to use `archived`

---

## Complete Migration Script

Run this SQL script in your Supabase SQL editor to add all missing columns:

```sql
-- ============================================================================
-- JobMatch AI - Database Schema Updates
-- Generated: 2025-12-24
-- Purpose: Add missing columns expected by application code
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. SUBSCRIPTIONS TABLE
-- ----------------------------------------------------------------------------

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(10) DEFAULT 'monthly'
CHECK (billing_cycle IN ('monthly', 'annual'));

COMMENT ON COLUMN subscriptions.billing_cycle IS 'Billing frequency: monthly or annual';

UPDATE subscriptions
SET billing_cycle = 'monthly'
WHERE billing_cycle IS NULL;

-- ----------------------------------------------------------------------------
-- 2. USERS TABLE
-- ----------------------------------------------------------------------------

ALTER TABLE users
ADD COLUMN IF NOT EXISTS two_factor_setup_complete BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN users.two_factor_setup_complete IS 'Whether user has completed 2FA setup process including backup codes';

-- Set to TRUE for users who already have 2FA enabled
UPDATE users
SET two_factor_setup_complete = TRUE
WHERE two_factor_enabled = TRUE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS backup_codes_generated BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN users.backup_codes_generated IS 'Whether user has generated backup codes for account recovery';

-- Assume users with 2FA enabled have generated codes
UPDATE users
SET backup_codes_generated = TRUE
WHERE two_factor_enabled = TRUE;

-- ----------------------------------------------------------------------------
-- 3. JOBS TABLE
-- ----------------------------------------------------------------------------

-- Company branding
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS company_logo TEXT NULL;

COMMENT ON COLUMN jobs.company_logo IS 'URL to company logo image';

-- Work arrangement (CRITICAL for filtering)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS work_arrangement TEXT
CHECK (work_arrangement IN ('Remote', 'Hybrid', 'On-site', 'Unknown'));

COMMENT ON COLUMN jobs.work_arrangement IS 'Work location arrangement: Remote, Hybrid, On-site, or Unknown';

UPDATE jobs
SET work_arrangement = 'Unknown'
WHERE work_arrangement IS NULL;

-- Job posting date
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS posted_date TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN jobs.posted_date IS 'Date when job was originally posted by employer (may differ from when scraped)';

-- Backfill with added_at date
UPDATE jobs
SET posted_date = added_at
WHERE posted_date IS NULL;

-- Skills arrays (CRITICAL for matching)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS required_skills TEXT[] NULL;

COMMENT ON COLUMN jobs.required_skills IS 'Array of required skills extracted from job description';

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS preferred_skills TEXT[] NULL;

COMMENT ON COLUMN jobs.preferred_skills IS 'Array of preferred/nice-to-have skills extracted from job description';

-- Create GIN indexes for efficient array searching
CREATE INDEX IF NOT EXISTS idx_jobs_required_skills ON jobs USING GIN(required_skills);
CREATE INDEX IF NOT EXISTS idx_jobs_preferred_skills ON jobs USING GIN(preferred_skills);

-- Scoring columns
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS algorithmic_score NUMERIC(5,2) NULL
CHECK (algorithmic_score >= 0 AND algorithmic_score <= 100);

COMMENT ON COLUMN jobs.algorithmic_score IS 'Rule-based matching score (0-100) calculated from skills, location, salary alignment';

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS ai_score NUMERIC(5,2) NULL
CHECK (ai_score >= 0 AND ai_score <= 100);

COMMENT ON COLUMN jobs.ai_score IS 'AI-generated semantic matching score (0-100) from OpenAI analysis';

-- Scraping metadata
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN jobs.scraped_at IS 'Timestamp when job data was scraped from external source';

-- Backfill scraped_at for existing scraped jobs
UPDATE jobs
SET scraped_at = created_at
WHERE scraped_at IS NULL AND source IN ('linkedin', 'indeed');

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check subscriptions columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'subscriptions' AND column_name = 'billing_cycle';

-- Check users columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('two_factor_setup_complete', 'backup_codes_generated');

-- Check jobs columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'jobs'
AND column_name IN (
  'company_logo', 'work_arrangement', 'posted_date',
  'required_skills', 'preferred_skills',
  'algorithmic_score', 'ai_score', 'scraped_at'
)
ORDER BY column_name;
```

---

## Post-Migration Code Updates

After running the migration, update these TypeScript mapping functions to remove workarounds:

### 1. Update `/backend/src/routes/jobs.ts`
```typescript
// Remove this line (line 114):
query = query.eq('work_arrangement', workArrangement);
// Should now work correctly ✓
```

### 2. Update `/backend/src/routes/applications.ts`
```typescript
// Change mapDatabaseJob() to use correct column names (lines 405-406):
isSaved: record.saved,        // Not is_saved
isArchived: record.archived,  // Not is_archived
```

### 3. Update `/src/hooks/useSubscription.ts`
```typescript
// Remove hardcoded billing_cycle defaults (lines 48, 89, 119):
billingCycle: data.billing_cycle as 'monthly' | 'annual', // Use actual DB value
```

### 4. Update `/src/lib/securityService.ts`
```typescript
// Lines 367-376 should now work correctly
// No changes needed - columns will exist ✓
```

---

## Testing Checklist

After migration, test these features:

- [ ] Job filtering by work arrangement (Remote/Hybrid/On-site)
- [ ] Job skill matching and match scores display correctly
- [ ] AI resume generation uses required/preferred skills
- [ ] Subscription billing cycle displays correctly
- [ ] 2FA setup workflow completes successfully
- [ ] Backup codes generation works
- [ ] Job scraper stores all fields correctly
- [ ] Company logos display in job listings (if scraper supports it)

---

## Notes

1. **Breaking Changes:** None - all columns are additive with NULL defaults or sensible defaults
2. **Data Loss:** None - existing data is preserved
3. **Downtime:** Migration should run in <1 second on tables with <10k rows
4. **Rollback:** If needed, columns can be dropped with `ALTER TABLE table_name DROP COLUMN column_name;`

---

**End of Document**
