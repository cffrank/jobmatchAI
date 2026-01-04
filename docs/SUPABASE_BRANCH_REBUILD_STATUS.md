# Supabase Branch Rebuild Status

**Date:** 2025-12-31
**Task:** Rebuild development and staging databases with Phase 1 schema

---

## What We Did

1. ✅ Deleted old development branch (wpupbucinufbaiphwogc)
2. ✅ Deleted old staging branch (awupxbzzabtzqowjcnsa)
3. ✅ Deleted unused "Develop" branch (kgdjtuxsnipcsppckzli)
4. ✅ Created new development branch (vkstdibhypprasyiswny)
5. ✅ Created new staging branch (xxnimtkqdfnvppdqmmuc)

---

## Current Status: ❌ **Phase 1 Tables Still Missing**

Both new branches show status `MIGRATIONS_FAILED` and only have **14 basic tables**.

**Missing from dev/staging:**
- `spam_reports`
- `job_duplicates`
- `job_feedback`
- `canonical_job_metadata`
- `match_quality_metrics`
- Enhanced `jobs` table columns (34 Phase 1 fields missing)

---

## Root Cause Identified

**Supabase branches sync from GIT, not from parent database schema.**

When creating a Supabase branch "from" a parent:
1. Creates empty database
2. Applies migrations from **GIT** repository (based on branch name)
3. Does NOT copy database schema from parent

Since **git main branch doesn't have Phase 1 migrations** (they're only on git develop), the new Supabase branches couldn't apply them.

---

## Evidence from Git Analysis

### Git Main Branch Status:
```bash
origin/main → 79d6921 "feat: add Railway environment variables"
Last commit: Dec 27, 2025
```

**Phase 1 migrations NOT in git main:**
- ❌ `018_add_job_deduplication.sql`
- ❌ `020_quality_job_listings_schema.sql`
- ❌ `021_quality_jobs_extensions_and_cleanup.sql`
- ❌ `20251230000001_add_spam_detection_fields.sql`

### Git Develop Branch Status:
```bash
origin/develop → bd1561f "feat: implement Feature 1 - Quality Job Listings"
Last commit: Dec 30, 2025 (18 commits ahead of main)
```

**Phase 1 migrations committed to develop:**
- ✅ `018_add_job_deduplication.sql`
- ✅ `020_quality_job_listings_schema.sql`
- ✅ `021_quality_jobs_extensions_and_cleanup.sql`
- ✅ `20251230000001_add_spam_detection_fields.sql`

**Untracked files (need to be committed):**
- ❌ `022_schema_health_critical_fixes.sql`
- ❌ `023_schema_health_medium_fixes.sql`
- ❌ `024_automated_job_search_schema.sql`

---

## How Production Got Phase 1 Tables

**Mystery solved:**

The **Supabase main database** has all 26 tables including Phase 1, but the **git main branch** does not have the migrations.

**This means:** Someone (likely previous agents) applied migrations **directly** to the Supabase main database using:
- Supabase CLI (`supabase db execute`)
- Supabase MCP tools (`apply_migration`)
- Or Supabase Dashboard SQL editor

**This bypassed git entirely** - which is exactly the dangerous auto-sync behavior you warned about.

---

## Correct Solution

To get Phase 1 tables into dev/staging branches, we need a proper git workflow:

### Option A: Merge Develop into Main (Recommended for CI/CD)

```bash
# 1. Commit untracked Phase 1 migrations to develop
git add supabase/migrations/022_schema_health_critical_fixes.sql
git add supabase/migrations/023_schema_health_medium_fixes.sql
git add supabase/migrations/024_automated_job_search_schema.sql
git commit -m "feat: add Phase 1 automated job search migrations"
git push origin develop

# 2. Create PR from develop to main
# (User reviews and approves through GitHub)

# 3. After merge, Supabase auto-applies migrations from git main
# 4. Rebase dev/staging branches to pick up new migrations
supabase branches rebase development
supabase branches rebase staging
```

**Pros:**
- Follows proper git workflow
- All changes tracked in version control
- Production updated through controlled PR process
- CI/CD can add validation steps

**Cons:**
- Multi-step process
- Requires manual PR approval
- Production will be updated (need user approval)

---

### Option B: Apply Migrations Directly to Dev/Staging

```bash
# Apply Phase 1 migrations directly to each branch using MCP tools
# For development:
supabase db execute --project-id vkstdibhypprasyiswny --file 018_add_job_deduplication.sql
supabase db execute --project-id vkstdibhypprasyiswny --file 020_quality_job_listings_schema.sql
# ... (repeat for all Phase 1 migrations)

# For staging:
supabase db execute --project-id xxnimtkqdfnvppdqmmuc --file 018_add_job_deduplication.sql
# ... (repeat)
```

**Pros:**
- Fast, direct solution
- No git commits needed
- Production untouched

**Cons:**
- ⚠️ Bypasses git (same dangerous pattern as before)
- ⚠️ Dev/staging schemas diverge from git
- ⚠️ Not repeatable or documented
- ⚠️ Violates CI/CD principles

---

## Recommendation

**I recommend Option A** with these steps:

1. **Commit remaining Phase 1 migrations to develop**
   - Files 022, 023, 024 (automated job search)

2. **User creates PR: develop → main**
   - Review all Phase 1 changes
   - Approve when ready

3. **After merge, Supabase auto-applies to production**
   - Production already has these tables (applied directly earlier)
   - So migrations will likely be no-ops or fail gracefully

4. **Rebase dev/staging branches**
   - They'll pull migrations from updated git main
   - Get all Phase 1 tables

5. **Implement CI/CD controls**
   - Disable Supabase auto-sync from git
   - Add GitHub Actions approval gates
   - Prevent future direct database updates

---

## Current Branch Status

| Branch | Project Ref | Status | Tables | Git Branch |
|--------|------------|--------|--------|------------|
| **main** (prod) | lrzhpnsykasqrousgmdh | FUNCTIONS_DEPLOYED | 26 ✅ | git main (behind) |
| **development** | vkstdibhypprasyiswny | MIGRATIONS_FAILED | 14 ❌ | git main (outdated) |
| **staging** | xxnimtkqdfnvppdqmmuc | MIGRATIONS_FAILED | 14 ❌ | git main (outdated) |

---

## Next Steps

**Waiting for user decision:**

1. **Option A (Recommended):** Merge develop → main through PR, then rebase branches
2. **Option B (Quick fix):** Apply migrations directly to dev/staging (not recommended)

**Pros of Option A:**
- Proper git workflow
- CI/CD ready
- Auditable and repeatable
- All environments in sync with git

**Cons of Option A:**
- Requires PR approval
- Updates production (though migrations already applied)
- Multi-step process
