# Frontend Supabase Database Calls Audit Report

**Generated:** 2026-01-03
**Purpose:** Identify all direct Supabase database operations in frontend that need migration to Cloudflare Workers API
**Migration Status:** Cloudflare Workers backend is deployed and operational

---

## Executive Summary

✅ **Good News:** Most critical paths already use Workers API
⚠️ **Action Required:** 5 files contain direct Supabase database operations that bypass Workers API

### Migration Progress
- **Total Files Audited:** 12 files with database operations
- **Files Already Using Workers API:** 7 files ✅
- **Files With Direct Supabase Calls:** 5 files ⚠️
- **Total Database Operations to Migrate:** ~25 operations

---

## Files Already Using Workers API ✅

These files correctly use the Workers API and do NOT need changes:

### 1. `/src/hooks/useResumes.ts` ✅
- **Status:** Fully migrated to Workers API
- **Endpoints Used:**
  - `GET /api/resume` - Fetch resumes
  - `POST /api/resume` - Create resume
  - `PATCH /api/resume/:id` - Update resume
  - `DELETE /api/resume/:id` - Delete resume
- **Note:** Uses Supabase realtime subscription for UI updates (acceptable)

### 2. `/src/hooks/useWorkExperience.ts` ✅
- **Status:** Fully migrated to Workers API via `workersApi` wrapper
- **Endpoints Used:**
  - `workersApi.getWorkExperience()`
  - `workersApi.createWorkExperience()`
  - `workersApi.updateWorkExperience()`
  - `workersApi.deleteWorkExperience()`
- **Note:** Uses Supabase realtime subscription for UI updates (acceptable)

### 3. `/src/hooks/useWorkExperienceNarratives.ts` ✅
- **Status:** Fully migrated to Workers API
- **Endpoints Used:**
  - `GET /api/profile/work-experience-narratives`
  - `POST /api/profile/work-experience-narratives`
  - `DELETE /api/profile/work-experience-narratives/:id`
- **Note:** Uses Supabase realtime subscription for UI updates (acceptable)

### 4. `/src/hooks/useJobScraping.ts` (Partial) ⚠️→✅
- **Status:** Job scraping uses Workers API ✅
- **Endpoints Used:**
  - `POST /api/jobs/scrape` - Job scraping via Workers
- **Remaining Issue:** `useSavedJobs()` function has direct Supabase calls (see below)

### 5. `/src/lib/jobQualityService.ts` (Partial) ⚠️→✅
- **Status:** All API calls use Workers API ✅
- **Endpoints Used:**
  - `POST /api/spam-detection/analyze/:jobId`
  - `POST /api/spam-detection/batch`
  - `GET /api/spam-detection/stats`
  - `POST /api/jobs/deduplicate`
  - `GET /api/jobs/:id/duplicates`
  - `POST /api/jobs/merge`
  - `DELETE /api/jobs/:id/duplicates/:duplicateId`
- **Remaining Issue:** User feedback functions use direct Supabase (see below)

### 6. `/src/sections/profile-resume-management/components/ResumeUploadDialog.tsx` (Partial) ⚠️→✅
- **Status:** Resume parsing and gap analysis use Workers API ✅
- **Endpoints Used:**
  - `POST /api/resume/analyze-gaps` - Gap analysis via Workers
- **Remaining Issue:** `saveWorkNarratives()` has direct Supabase call (see below)

### 7. `/src/lib/oauthProfileSync.ts` ✅
- **Status:** Only uses `supabase.auth.getSession()` for JWT tokens
- **No database operations** - Just auth token retrieval

---

## Files Requiring Migration ⚠️

These files contain direct Supabase database operations that MUST be migrated to Workers API:

---

### 1. `/src/hooks/useJobs.ts` ⚠️
**Priority:** CRITICAL (Core job management functionality)

#### Direct Supabase Operations Found:

| Line | Operation | Table | Type | Description |
|------|-----------|-------|------|-------------|
| 62-69 | `supabase.from('jobs').select()` | `jobs` | READ | Fetch paginated jobs for user |
| 167-172 | `supabase.from('jobs').update()` | `jobs` | UPDATE | Save/bookmark a job |
| 193-199 | `supabase.from('jobs').update()` | `jobs` | UPDATE | Unsave/unbookmark a job |
| 237-242 | `supabase.from('jobs').update()` | `jobs` | UPDATE | Update job details |
| 309-314 | `supabase.from('jobs').select()` | `jobs` | READ | Fetch single job by ID |
| 386-391 | `supabase.from('jobs').update()` | `jobs` | UPDATE | Save job (in `useJob` hook) |
| 412-417 | `supabase.from('jobs').update()` | `jobs` | UPDATE | Unsave job (in `useJob` hook) |
| 454-459 | `supabase.from('jobs').update()` | `jobs` | UPDATE | Update job (in `useJob` hook) |
| 493-514 | `supabase.from('jobs').insert()` | `jobs` | CREATE | Create new job manually |
| 540-546 | `supabase.from('jobs').select()` | `jobs` | READ | Fetch saved jobs (in `useSavedJobs` hook) |

#### Existing Workers API Endpoints:
✅ **Available:**
- `GET /api/jobs` - List user's jobs with pagination and filters
- `GET /api/jobs/:id` - Get job by ID
- `PATCH /api/jobs/:id` - Update job (save/archive)
- `DELETE /api/jobs/:id` - Delete job
- `POST /api/jobs/:id/analyze` - Analyze job compatibility

❌ **Missing:**
- `POST /api/jobs` - Create new job (manual entry)

#### Migration Actions Required:
1. **Create endpoint:** `POST /api/jobs` in `workers/api/routes/jobs.ts`
2. **Replace all `supabase.from('jobs')` calls with Workers API:**
   - Use `GET /api/jobs?page=X&limit=20&archived=false` for pagination
   - Use `GET /api/jobs?saved=true` for saved jobs
   - Use `GET /api/jobs/:id` for single job fetch
   - Use `PATCH /api/jobs/:id` with `{ saved: true }` for saving
   - Use `PATCH /api/jobs/:id` with `{ saved: false }` for unsaving
   - Use `PATCH /api/jobs/:id` for updating job details
   - Use `POST /api/jobs` for creating new jobs

3. **Keep Supabase realtime subscription** for UI updates (already implemented)

---

### 2. `/src/hooks/useJobScraping.ts` ⚠️
**Priority:** HIGH (Saved jobs functionality)

#### Direct Supabase Operations Found:

| Line | Operation | Table | Type | Description |
|------|-----------|-------|------|-------------|
| 165-180 | `supabase.from('jobs').upsert()` | `jobs` | UPSERT | Save scraped job to database |
| 195-199 | `supabase.from('jobs').update()` | `jobs` | UPDATE | Mark job as unsaved |
| 217-222 | `supabase.from('jobs').select()` | `jobs` | READ | Fetch saved jobs for user |
| 254-269 | `supabase.channel().on()` | `jobs` | REALTIME | Realtime subscription |

#### Existing Workers API Endpoints:
✅ **Available:**
- `GET /api/jobs?saved=true` - Fetch saved jobs
- `PATCH /api/jobs/:id` - Update job (for save/unsave)

❌ **Missing:**
- `POST /api/jobs` - Create/upsert job from scraping

#### Migration Actions Required:
1. **Use existing endpoint:** `PATCH /api/jobs/:id` for save/unsave
2. **Create endpoint:** `POST /api/jobs` for upserting scraped jobs
3. **Replace `useSavedJobs()` hook:**
   - Fetch via `GET /api/jobs?saved=true`
   - Keep realtime subscription for UI updates

---

### 3. `/src/lib/jobQualityService.ts` ⚠️
**Priority:** MEDIUM (User feedback feature)

#### Direct Supabase Operations Found:

| Line | Operation | Table | Type | Description |
|------|-----------|-------|------|-------------|
| 242-250 | `supabase.from('job_feedback').insert()` | `job_feedback` | CREATE | Save user feedback on job |
| 259-267 | `supabase.from('spam_reports').insert()` | `spam_reports` | CREATE | Save spam report |
| 283-290 | `supabase.from('job_feedback').select()` | `job_feedback` | READ | Get user's feedback for a job |
| 311-314 | `supabase.from('spam_reports').select()` | `spam_reports` | READ | Get spam report count |

#### Existing Workers API Endpoints:
✅ **Spam detection endpoints exist** (analysis, batch, stats)

❌ **Missing:**
- `POST /api/jobs/:id/feedback` - Submit user feedback
- `GET /api/jobs/:id/feedback` - Get user's feedback
- `GET /api/jobs/:id/spam-report-count` - Get spam report count

#### Migration Actions Required:
1. **Create endpoints in `workers/api/routes/jobs.ts`:**
   - `POST /api/jobs/:id/feedback` - Submit feedback (saves to both tables)
   - `GET /api/jobs/:id/feedback` - Get user's feedback
   - `GET /api/jobs/:id/spam-reports` - Get spam report count
2. **Replace direct Supabase calls in functions:**
   - `submitJobFeedback()` → `POST /api/jobs/:id/feedback`
   - `getUserJobFeedback()` → `GET /api/jobs/:id/feedback`
   - `getJobSpamReportCount()` → `GET /api/jobs/:id/spam-reports`

---

### 4. `/src/sections/profile-resume-management/components/ResumeUploadDialog.tsx` ⚠️
**Priority:** LOW (Work narratives feature - already disabled)

#### Direct Supabase Operations Found:

| Line | Operation | Table | Type | Description |
|------|-----------|-------|------|-------------|
| 260-265 | `supabase.from('work_experience').select()` | `work_experience` | READ | Fetch work experiences to match narratives |
| 278-280 | `supabase.from('work_experience_narratives').insert()` | `work_experience_narratives` | CREATE | Save work narratives |

#### Existing Workers API Endpoints:
✅ **Available:**
- Work experience narratives already have full CRUD via `useWorkExperienceNarratives.ts`

#### Migration Actions Required:
1. **Replace `saveWorkNarratives()` function:**
   - Use `workersApi.getWorkExperience()` instead of direct select
   - Use `upsertNarrative()` from `useWorkExperienceNarratives` hook
2. **Better approach:** Refactor to use the existing `useWorkExperienceNarratives` hook

---

### 5. `/src/sections/profile-resume-management/components/ResumeUploadDialog.tsx` - Gap Analysis ⚠️
**Priority:** LOW (Feature currently disabled - lines 160-220 commented out)

#### Direct Supabase Operations Found (COMMENTED OUT):

| Line | Operation | Table | Type | Description |
|------|-----------|-------|------|-------------|
| 169-181 | `supabase.from('gap_analyses').insert()` | `gap_analyses` | CREATE | Save gap analysis (DISABLED) |
| 205-207 | `supabase.from('gap_analysis_answers').insert()` | `gap_analysis_answers` | CREATE | Save answers (DISABLED) |

#### Existing Workers API Endpoints:
✅ **Gap analysis routes already exist:**
- `GET /api/gap-analyses` - List gap analyses
- `GET /api/gap-analysis/:id` - Get gap analysis with answers
- `POST /api/gap-analyses` - Create gap analysis (LIKELY EXISTS)
- `PATCH /api/gap-analysis/:id/answer` - Update answers

#### Migration Actions Required:
1. **Feature is already disabled** with TODO comment (lines 147-159)
2. **When re-enabling:**
   - Use `POST /api/gap-analyses` for creating gap analysis
   - Use `PATCH /api/gap-analysis/:id/answer` for saving answers
3. **Create frontend hook:** `useGapAnalysis.ts` (mentioned in TODO)

---

## Summary of Required Workers API Endpoints

### Endpoints That Need to Be Created ❌

| Endpoint | Method | Purpose | Priority | Estimated Effort |
|----------|--------|---------|----------|------------------|
| `/api/jobs` | POST | Create/upsert job manually or from scraping | HIGH | 1 hour |
| `/api/jobs/:id/feedback` | POST | Submit user feedback (job_feedback + spam_reports) | MEDIUM | 2 hours |
| `/api/jobs/:id/feedback` | GET | Get user's feedback for a job | MEDIUM | 30 min |
| `/api/jobs/:id/spam-reports` | GET | Get spam report count | LOW | 30 min |

**Total Estimated Migration Time:** 4 hours

---

## Migration Priority Order

### Phase 1: Critical (Week 1)
1. **Create `POST /api/jobs` endpoint** - Required for job creation and scraping
2. **Migrate `/src/hooks/useJobs.ts`** - Core job management (10 operations)
3. **Migrate `/src/hooks/useJobScraping.ts`** - Saved jobs (3 operations)

### Phase 2: Important (Week 2)
4. **Create job feedback endpoints** - User feedback feature
5. **Migrate `/src/lib/jobQualityService.ts`** - User feedback (4 operations)

### Phase 3: Nice to Have (Week 3)
6. **Refactor `ResumeUploadDialog.tsx`** - Use existing hooks for work narratives
7. **Re-enable gap analysis** - When D1 migration is complete

---

## Files That Are Acceptable ✅

These files use Supabase but ONLY for acceptable purposes:

### Authentication Only (Keep As-Is)
- All files using `supabase.auth.getSession()` - JWT token retrieval
- All files using `supabase.auth.getUser()` - User info retrieval
- `/src/lib/oauthProfileSync.ts` - Only auth operations

### Realtime Subscriptions Only (Keep As-Is)
- All files using `supabase.channel().on('postgres_changes')` - UI reactivity
- This is acceptable as it doesn't query data, just listens for changes
- Examples:
  - `useResumes.ts` - Lines 79-104
  - `useWorkExperience.ts` - Lines 51-76
  - `useWorkExperienceNarratives.ts` - Lines 79-121
  - `useJobScraping.ts` - Lines 254-269

---

## Code Locations Reference

### Frontend Database Operations
```
/src/hooks/useJobs.ts                     - 10 operations ⚠️
/src/hooks/useJobScraping.ts              - 3 operations ⚠️
/src/lib/jobQualityService.ts             - 4 operations ⚠️
/src/sections/profile-resume-management/
  components/ResumeUploadDialog.tsx       - 2 operations ⚠️ (low priority)
```

### Workers API Routes (Backend)
```
/workers/api/routes/jobs.ts               - Job CRUD + scraping
/workers/api/routes/gap_analyses.ts       - Gap analysis CRUD
/workers/api/routes/profile.ts            - Profile + work experience
/workers/api/routes/resume.ts             - Resume CRUD
```

---

## Testing Checklist

After migration, test these workflows:

### Jobs Feature
- [ ] Browse jobs with pagination
- [ ] Save/unsave jobs
- [ ] View job details
- [ ] Update job information
- [ ] Create manual job entry
- [ ] Job scraping from LinkedIn/Indeed
- [ ] Saved jobs view updates in realtime

### Job Quality Feature
- [ ] Submit "interested" feedback
- [ ] Submit "not interested" feedback
- [ ] Submit spam report
- [ ] View user's feedback on a job
- [ ] See spam report count

### Resume Upload
- [ ] Upload resume and parse
- [ ] Save work experience narratives
- [ ] Gap analysis (when re-enabled)

---

## Migration Implementation Guide

### Step 1: Create Missing Endpoints

**File:** `/workers/api/routes/jobs.ts`

Add these endpoints:

```typescript
// POST /api/jobs - Create new job
app.post('/', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  // Validate with Zod
  // Insert into D1 database
  // Return created job
});

// POST /api/jobs/:id/feedback - Submit user feedback
app.post('/:id/feedback', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const jobId = c.req.param('id');
  const { feedbackType, reason, customReason } = await c.req.json();

  // Insert into job_feedback table
  // If spam, also insert into spam_reports
  // Return success
});

// GET /api/jobs/:id/feedback - Get user's feedback
app.get('/:id/feedback', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const jobId = c.req.param('id');

  // Query job_feedback for this user + job
  // Return feedback or null
});

// GET /api/jobs/:id/spam-reports - Get spam report count
app.get('/:id/spam-reports', authenticateUser, async (c) => {
  const jobId = c.req.param('id');

  // Count spam_reports for this job
  // Return { count: number }
});
```

### Step 2: Create API Client Functions

**File:** `/src/lib/workersApi.ts` (or create `/src/lib/jobsApi.ts`)

```typescript
// Example API client function
export async function createJob(data: CreateJobInput): Promise<Job> {
  const session = await supabase.auth.getSession();
  if (!session.data.session) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/api/jobs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.data.session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Failed to create job');
  return response.json();
}
```

### Step 3: Refactor Frontend Hooks

Replace all `supabase.from('jobs')` calls with API client functions.

**Example:**

```typescript
// BEFORE
const { data, error } = await supabase
  .from('jobs')
  .select('*')
  .eq('user_id', userId)
  .range(offset, offset + limit - 1);

// AFTER
const jobs = await fetchJobs({
  page: Math.floor(offset / limit) + 1,
  limit,
});
```

---

## Notes

1. **Supabase Auth is staying:** All `supabase.auth.*` calls remain unchanged (getting JWT tokens)
2. **Realtime is staying:** Supabase realtime subscriptions are acceptable for UI updates
3. **Storage migration is separate:** File uploads (avatars, resumes) will migrate to R2 later
4. **Gap analysis is disabled:** Feature is commented out pending D1 migration completion
5. **D1 vs PostgreSQL:** Once migrated to Workers API, backend will use D1 instead of Supabase PostgreSQL

---

## Conclusion

**Overall Migration Status:**
- 🟢 **Most features already migrated** - Resume, work experience, narratives all use Workers API
- 🟡 **Jobs feature needs migration** - Core CRUD operations still use direct Supabase
- 🟡 **Job feedback needs endpoints** - Simple API additions required
- 🟢 **Architecture is sound** - Realtime subscriptions preserved for good UX

**Recommended Approach:**
1. Create the 4 missing endpoints (4 hours)
2. Migrate `useJobs.ts` first (highest impact)
3. Migrate job feedback next (medium impact)
4. Test thoroughly with existing realtime subscriptions
5. Keep Supabase auth and realtime (working as designed)

**Risk Assessment:** LOW
- Small, focused changes
- Existing patterns to follow (useResumes, useWorkExperience)
- Realtime subscriptions mitigate stale data concerns
- Rollback is easy (just revert the hook changes)
