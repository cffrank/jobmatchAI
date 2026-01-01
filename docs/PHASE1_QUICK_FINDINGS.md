# Phase 1 Apify Integration - Quick Findings

**Status:** ⚠️ **PARTIALLY IMPLEMENTED - DO NOT ENABLE AUTO-SEARCH**

---

## TL;DR

The job scraping works, but **user preferences are NOT applied** during automated searches. Blacklisted companies, source selection, and result limits are ignored.

---

## What Works ✅

1. Manual job scraping from LinkedIn and Indeed
2. Job normalization (salary parsing, skill extraction, work arrangement)
3. Database storage with batch inserts
4. Background deduplication
5. Preference CRUD API endpoints
6. Scheduled daily job search (runs at 2 AM UTC)

---

## What's Broken ❌

### 1. Blacklist Filtering (Critical)
**Location:** `backend/src/services/jobScraper.service.ts`

```typescript
// ISSUE: No filtering logic exists
export async function scrapeJobs(userId, params) {
  // ... scrapes jobs ...
  await saveJobsToDatabase(userId, searchId, normalizedJobs);
  // ❌ ALL jobs saved, blacklist ignored
}
```

**Impact:** Users receive jobs from blacklisted companies.

**Fix Required:** Add `applyUserPreferencesFilter()` function before saving.

---

### 2. Source Selection (Critical)
**Location:** `backend/src/jobs/scheduled.ts:241`

```typescript
// ISSUE: Sources are hardcoded
sources: ['linkedin', 'indeed'], // ❌ Ignores preferences.enabled_sources
```

**Impact:** User preference to disable Indeed/LinkedIn is ignored.

**Fix Required:** Read from `preferences.enabled_sources` array.

---

### 3. Max Results Limit (Critical)
**Location:** `backend/src/jobs/scheduled.ts:240`

```typescript
// ISSUE: Max results hardcoded to 20
maxResults: 20, // ❌ Ignores preferences.max_results_per_search
```

**Impact:** Users cannot control result volume, wastes Apify credits.

**Fix Required:** Read from `preferences.max_results_per_search`.

---

### 4. Multiple Locations (Critical)
**Location:** `backend/src/jobs/scheduled.ts:236`

```typescript
// ISSUE: Only first location used
location: preferences.desired_locations?.[0], // ❌ Ignores rest of array
```

**Impact:** Users with multiple locations only get results for first one.

**Fix Required:** Loop through all locations OR pass array to Apify.

---

### 5. Search History (Critical)
**Location:** `backend/src/routes/searchPreferences.ts:479-555`

```typescript
// ISSUE: Stub implementation
res.json({
  searches: [],
  message: 'Search history feature requires database migration',
});
```

**Impact:** No audit trail of searches, cannot debug failed searches.

**Fix Required:** Populate `job_search_history` table (migration 024 already created it).

---

### 6. Manual Search Trigger (Critical)
**Location:** `backend/src/routes/searchPreferences.ts:742-751`

```typescript
// ISSUE: Returns stub response
res.status(202).json({
  searchId: 'stub-search-id',
  note: 'Manual search trigger requires integration',
});
```

**Impact:** Frontend button to trigger search doesn't work.

**Fix Required:** Call `scrapeJobs()` with user preferences.

---

### 7. Search Templates (Medium Priority)
**Location:** `backend/src/routes/searchPreferences.ts:569-704`

All template endpoints return stubs. Table exists (`job_search_templates`), but routes not implemented.

---

## Risk Assessment 🔴

**Current Risk:** HIGH - Do NOT enable `auto_search_enabled` for users

**Why:**
- Jobs from blacklisted companies will be shown
- Preferences are ignored (poor user experience)
- No audit trail (compliance risk)
- Potential cost overruns (ignores max results)

---

## Quick Fix Priority

### Must Fix Before Launch (2-3 days)
1. Implement `applyUserPreferencesFilter()` in scraper
2. Fix `scheduled.ts` to use `enabled_sources` array
3. Fix `scheduled.ts` to use `max_results_per_search`
4. Fix `scheduled.ts` to handle multiple locations
5. Implement search history tracking

### Should Fix Soon (1-2 days)
6. Implement manual search trigger endpoint
7. Add integration tests for preference filtering

### Nice to Have (1 day)
8. Implement search templates endpoints
9. Add Redis caching for recent searches

---

## Code Example: How It Should Work

```typescript
// In jobScraper.service.ts - ADD THIS FUNCTION
function applyUserPreferencesFilter(
  jobs: Job[],
  preferences: SearchPreferences
): Job[] {
  return jobs.filter(job => {
    // Filter blacklisted companies
    if (preferences.blacklistCompanies?.includes(job.company)) {
      return false;
    }

    // Filter blacklisted keywords
    const text = `${job.title} ${job.description}`.toLowerCase();
    for (const keyword of preferences.blacklistKeywords || []) {
      if (text.includes(keyword.toLowerCase())) {
        return false;
      }
    }

    // Filter by minimum match score
    if (preferences.minMatchScore && job.matchScore < preferences.minMatchScore) {
      return false;
    }

    // Filter remote-only preference
    if (preferences.remoteOnly && job.workArrangement !== 'Remote') {
      return false;
    }

    return true;
  });
}

// In scrapeJobs() - MODIFY THIS
export async function scrapeJobs(userId, params, preferences?) {
  // ... existing scraping logic ...

  const allJobs = results.flatMap(r => r.value);
  const normalizedJobs = allJobs.map(normalizeJob);

  // NEW: Apply preference-based filtering
  const filteredJobs = preferences
    ? applyUserPreferencesFilter(normalizedJobs, preferences)
    : normalizedJobs;

  await saveJobsToDatabase(userId, searchId, filteredJobs);

  return { success: true, jobCount: filteredJobs.length, jobs: filteredJobs };
}
```

---

## Testing Checklist

Before enabling auto-search:

- [ ] Blacklist company filtering works
- [ ] Blacklist keyword filtering works
- [ ] Source selection is respected
- [ ] Max results limit is respected
- [ ] Multiple locations are searched
- [ ] Search history is recorded
- [ ] Manual search trigger works
- [ ] Integration tests pass
- [ ] Load test with 100 users

---

## Files to Review

1. `/backend/src/services/jobScraper.service.ts` - Add filtering logic
2. `/backend/src/jobs/scheduled.ts` - Fix preference usage
3. `/backend/src/routes/searchPreferences.ts` - Implement stubs
4. `/supabase/migrations/024_automated_job_search_schema.sql` - Verify applied
5. `/backend/src/services/searchPreferences.service.ts` - Update schema mapping

---

## Next Steps

1. Read full report: `docs/PHASE1_APIFY_INTEGRATION_TEST_REPORT.md`
2. Create tasks for critical fixes
3. Implement `applyUserPreferencesFilter()`
4. Add integration tests
5. Test with real user data
6. Enable auto-search for beta users

---

**Last Updated:** 2025-12-30
**Reviewed By:** Senior Backend TypeScript Architect
