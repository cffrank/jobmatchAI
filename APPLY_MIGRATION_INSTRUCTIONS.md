# Apply Database Migration Instructions

## Quick Guide: Apply Compatibility Fields Migration

**Migration File:** `supabase/migrations/014_add_job_compatibility_fields.sql`
**Estimated Time:** 2 minutes

---

## Method 1: Supabase Dashboard (Recommended - Easiest)

### Step 1: Open Supabase SQL Editor
Go to: **https://supabase.com/dashboard/project/wpupbucinufbaiphwogc/sql/new**

### Step 2: Copy Migration SQL
The SQL is already prepared in the file: `supabase/migrations/014_add_job_compatibility_fields.sql`

You can copy it from this file, or use this command:
```bash
cat supabase/migrations/014_add_job_compatibility_fields.sql
```

### Step 3: Paste and Execute
1. Paste the entire SQL content into the SQL Editor
2. Click the **"Run"** button (or press Ctrl+Enter / Cmd+Enter)
3. Wait for the success message

### Step 4: Verify Success
You should see a message like:
```
Success. No rows returned
```

This confirms the migration was applied successfully.

---

## What This Migration Does

### Creates `job_searches` Table
- Tracks user job search history
- Includes: keywords, location, work_arrangement, job_count
- RLS policies ensure users only see their own searches

### Adds Columns to `jobs` Table
| Column Name | Type | Purpose |
|-------------|------|---------|
| `required_skills` | TEXT[] | Skills extracted from job description |
| `preferred_skills` | TEXT[] | Nice-to-have skills |
| `work_arrangement` | TEXT | Remote/Hybrid/On-site |
| `company_logo` | TEXT | Company logo URL |
| `search_id` | UUID | Links to job_searches table |
| `scraped_at` | TIMESTAMPTZ | When job was scraped |
| `compatibility_breakdown` | JSONB | Detailed match scores |
| `missing_skills` | TEXT[] | Skills user doesn't have |
| `recommendations` | TEXT[] | AI-generated tips |

### Creates Performance Indexes
- GIN index on `required_skills` for fast skill-based searches
- GIN index on `compatibility_breakdown` for filtering by match type
- Filtered indexes on `work_arrangement` and `search_id`

---

## Verification Steps

After applying the migration, verify it worked:

### Check Tables Exist
Run this in SQL Editor:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('job_searches', 'jobs');
```

**Expected output:** 2 rows (job_searches, jobs)

### Check New Columns
Run this in SQL Editor:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'jobs'
AND column_name IN (
  'required_skills',
  'work_arrangement',
  'compatibility_breakdown'
);
```

**Expected output:** 3 rows with the column names and types

### Check Indexes
Run this in SQL Editor:
```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'jobs'
AND indexname LIKE 'idx_jobs_%';
```

**Expected output:** At least 4 index names (idx_jobs_required_skills, idx_jobs_compatibility, idx_jobs_work_arrangement, idx_jobs_search_id)

---

## After Migration: Update TypeScript Types

Once the migration is applied, regenerate the TypeScript types to match the new schema:

```bash
# If you have Supabase CLI linked
npx supabase gen types typescript --linked > src/types/supabase.ts

# Or using the project ID
npx supabase gen types typescript --project-id wpupbucinufbaiphwogc > src/types/supabase.ts
```

---

## Troubleshooting

### Error: "relation already exists"
**Cause:** Migration was already partially applied
**Solution:** This is safe to ignore - the migration uses `IF NOT EXISTS` clauses

### Error: "column already exists"
**Cause:** Some columns were added in a previous migration
**Solution:** This is safe to ignore - the migration uses `ADD COLUMN IF NOT EXISTS`

### Error: "permission denied"
**Cause:** Not logged in or insufficient permissions
**Solution:**
1. Make sure you're logged into Supabase Dashboard
2. Verify you have admin access to the project
3. Try refreshing the page

### Error: "syntax error"
**Cause:** SQL was not copied correctly
**Solution:**
1. Delete all content in SQL Editor
2. Re-copy the ENTIRE migration file
3. Make sure no characters were cut off
4. Try again

---

## Alternative Method 2: Command Line (Requires Database Password)

If you prefer command line:

```bash
# Install pg library if not already installed
npm install pg

# Set database password (get from Supabase Dashboard)
export SUPABASE_DB_PASSWORD="your-database-password"

# Run migration script
node apply-migration.mjs
```

**Where to find database password:**
Supabase Dashboard → Project Settings → Database → Connection Pooling → Password

---

## Next Steps After Migration

1. **Regenerate TypeScript types** (see above)
2. **Restart development servers**:
   ```bash
   # Frontend
   npm run dev

   # Backend
   cd backend && npm run dev
   ```
3. **Test compatibility scoring**:
   - Search for new jobs (they will have required_skills populated)
   - View job details to see dynamic compatibility scores
   - Verify scores change based on user profile

---

## Support

If you encounter issues:
1. Check the Supabase Dashboard → Logs for error details
2. Verify you're using the correct project (wpupbucinufbaiphwogc)
3. Review the migration file for any syntax issues
4. Contact support if database is locked or corrupted

---

**Migration File Location:** `/home/carl-f-frank/projects/jobmatchAI/supabase/migrations/014_add_job_compatibility_fields.sql`

**Supabase Project:** wpupbucinufbaiphwogc
**Dashboard:** https://supabase.com/dashboard/project/wpupbucinufbaiphwogc
