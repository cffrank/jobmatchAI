# Gap Analysis Feature - Cloudflare Migration Plan

**Created:** 2026-01-03
**Status:** Analysis Complete - Ready for Implementation
**Priority:** HIGH (Blocking feature)

---

## Problem Summary

The gap analysis feature is broken because it's caught in a **hybrid migration state**:

1. **Backend (Workers):** Gap analysis generation works ✅
   - Endpoint: `POST /api/resume/analyze-gaps`
   - Uses Workers AI (Llama 3.3 70B) for free analysis
   - Stores in a custom table: `resume_gap_analyses` (PostgreSQL-style)

2. **Frontend:** Trying to use Supabase directly ❌
   - Hook: `src/hooks/useGapAnalysis.ts` queries Supabase tables directly
   - Tables expected: `gap_analyses` and `gap_analysis_answers`
   - Error: 404 because these tables don't exist in Supabase OR D1

3. **D1 Schema:** Gap analysis tables missing entirely ❌
   - File: `workers/migrations/0001_initial_schema.sql`
   - Has 26 core tables but NO gap analysis tables
   - The `resume_gap_analyses` table was documented but never migrated to D1

---

## Root Cause Analysis

### Schema Mismatch

**Supabase Schema (Original):**
```sql
-- Table: gap_analyses
CREATE TABLE gap_analyses (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  gap_count INTEGER,
  red_flag_count INTEGER,
  urgency TEXT,
  overall_assessment TEXT,
  identified_gaps_and_flags JSONB,
  next_steps JSONB
);

-- Table: gap_analysis_answers
CREATE TABLE gap_analysis_answers (
  id UUID PRIMARY KEY,
  gap_analysis_id UUID REFERENCES gap_analyses(id),
  user_id UUID NOT NULL,
  question_id INTEGER,
  priority TEXT,
  gap_addressed TEXT,
  question TEXT,
  context TEXT,
  expected_outcome TEXT,
  answer TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Workers Implementation (Current):**
```sql
-- Table: resume_gap_analyses (single table, JSONB for questions)
CREATE TABLE resume_gap_analyses (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  analyzed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  overall_assessment TEXT,
  gap_count INTEGER,
  red_flag_count INTEGER,
  urgency TEXT,
  identified_gaps JSONB,           -- Combined
  clarification_questions JSONB,   -- Combined (includes answers inline)
  long_term_recommendations JSONB,
  immediate_action TEXT,
  questions_answered INTEGER,
  questions_total INTEGER,
  completion_percentage INTEGER GENERATED,
  status TEXT
);
```

**D1 Schema (Missing):**
- ❌ No `gap_analyses` table
- ❌ No `gap_analysis_answers` table
- ❌ No `resume_gap_analyses` table

### Code Flow Breakdown

#### Current (Broken) Flow:
```
1. User uploads resume
   ↓
2. Frontend calls Workers API: POST /api/resume/analyze-gaps
   ↓
3. Workers AI generates analysis (WORKS ✅)
   ↓
4. Workers attempts to save to D1 `resume_gap_analyses` (FAILS - table doesn't exist ❌)
   ↓
5. Frontend tries to read from Supabase `gap_analyses` (FAILS - 404 ❌)
   ↓
6. useGapAnalysis hook returns empty array
```

---

## Migration Strategy

### Option A: Two-Table Approach (Match Supabase Schema) ⭐ RECOMMENDED

**Advantages:**
- Matches existing frontend code closely
- Easier to query individual questions
- Better data normalization
- Allows partial answer updates without JSON manipulation

**Disadvantages:**
- More complex queries (JOIN required)
- Two tables to maintain

**Schema (D1 SQLite):**
```sql
-- Gap Analyses (main analysis record)
CREATE TABLE gap_analyses (
  id TEXT PRIMARY KEY,               -- UUID as TEXT
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  gap_count INTEGER DEFAULT 0,
  red_flag_count INTEGER DEFAULT 0,
  urgency TEXT CHECK(urgency IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  overall_assessment TEXT,
  identified_gaps_and_flags TEXT,    -- JSON array as TEXT
  next_steps TEXT,                   -- JSON object as TEXT
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_gap_analyses_user_id ON gap_analyses(user_id);
CREATE INDEX idx_gap_analyses_created_at ON gap_analyses(created_at DESC);

-- Gap Analysis Answers (individual question answers)
CREATE TABLE gap_analysis_answers (
  id TEXT PRIMARY KEY,
  gap_analysis_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  priority TEXT CHECK(priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  gap_addressed TEXT,
  question TEXT NOT NULL,
  context TEXT,
  expected_outcome TEXT,
  answer TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (gap_analysis_id) REFERENCES gap_analyses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_gap_analysis_answers_gap_analysis_id ON gap_analysis_answers(gap_analysis_id);
CREATE INDEX idx_gap_analysis_answers_user_id ON gap_analysis_answers(user_id);
CREATE UNIQUE INDEX idx_gap_analysis_answers_unique ON gap_analysis_answers(gap_analysis_id, question_id);
```

### Option B: Single-Table Approach (Match Workers Implementation)

**Advantages:**
- Simpler queries (no JOINs)
- Single source of truth
- All data in one place

**Disadvantages:**
- Frontend needs major refactor
- JSON manipulation for partial updates
- Harder to query individual questions
- Larger rows in database

---

## Implementation Tasks

### Phase 1: Database Schema Migration ⏰ Est: 1 hour

**Task 1.1: Create D1 migration file**
- File: `workers/migrations/0003_add_gap_analyses.sql`
- Add both `gap_analyses` and `gap_analysis_answers` tables
- Include indexes for performance
- Match Supabase schema but use D1 types (TEXT for UUID, JSON as TEXT)

**Task 1.2: Apply migration to all environments**
```bash
# Development
wrangler d1 execute jobmatch-dev --file=workers/migrations/0003_add_gap_analyses.sql

# Staging
wrangler d1 execute jobmatch-staging --file=workers/migrations/0003_add_gap_analyses.sql

# Production
wrangler d1 execute jobmatch-prod --file=workers/migrations/0003_add_gap_analyses.sql
```

**Task 1.3: Verify schema**
```bash
wrangler d1 execute jobmatch-dev --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%gap%'"
```

---

### Phase 2: Workers API Endpoints ⏰ Est: 3 hours

**Task 2.1: Create gap_analyses route file**
- File: `workers/api/routes/gap_analyses.ts`
- Endpoints needed:
  - `GET /api/gap-analyses` - List user's gap analyses
  - `GET /api/gap-analyses/:id` - Get single gap analysis with answers
  - `POST /api/gap-analyses` - Create new gap analysis
  - `PATCH /api/gap-analyses/:id/answer` - Answer a question
  - `DELETE /api/gap-analyses/:id` - Delete gap analysis

**Task 2.2: Refactor existing resume route**
- File: `workers/api/routes/resume.ts`
- Currently uses `resume_gap_analyses` table
- Change to use new `gap_analyses` + `gap_analysis_answers` tables
- Keep the AI analysis service (`resumeGapAnalysis.ts`) unchanged

**Task 2.3: Update index.ts**
- File: `workers/api/index.ts`
- Register new route: `app.route('/api/gap-analyses', gapAnalysesRoutes)`

**Example Endpoint Implementation:**
```typescript
// GET /api/gap-analyses/:id
app.get('/:id', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const analysisId = c.req.param('id');

  // Fetch main analysis
  const { results: analyses } = await c.env.DB.prepare(
    'SELECT * FROM gap_analyses WHERE id = ? AND user_id = ?'
  ).bind(analysisId, userId).all();

  if (analyses.length === 0) {
    return c.json({ error: 'Gap analysis not found' }, 404);
  }

  const analysis = analyses[0];

  // Fetch answers
  const { results: answers } = await c.env.DB.prepare(
    'SELECT * FROM gap_analysis_answers WHERE gap_analysis_id = ? ORDER BY question_id ASC'
  ).bind(analysisId).all();

  return c.json({
    ...analysis,
    answers,
  }, 200);
});
```

---

### Phase 3: Frontend Updates ⏰ Est: 2 hours

**Task 3.1: Update useGapAnalysis hook**
- File: `src/hooks/useGapAnalysis.ts`
- Remove all Supabase direct queries
- Replace with Workers API calls via fetch
- Use VITE_API_URL environment variable

**Before (Broken):**
```typescript
const { data: analysesData, error: analysesError } = await supabase
  .from('gap_analyses')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
```

**After (Fixed):**
```typescript
const backendUrl = import.meta.env.VITE_API_URL
const response = await fetch(`${backendUrl}/api/gap-analyses`, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
})
const analysesData = await response.json()
```

**Task 3.2: Update ResumeUploadDialog component**
- File: `src/sections/profile-resume-management/components/ResumeUploadDialog.tsx`
- Remove `saveGapAnalysisData()` function (lines 145-202)
- Workers API already saves gap analysis in `/api/resume/analyze-gaps`
- No need to save again in frontend

**Task 3.3: Update types**
- File: `src/types/supabase.ts`
- Types already exist for `gap_analyses` and `gap_analysis_answers` (lines 300-406)
- Verify they match the new D1 schema

---

### Phase 4: Testing ⏰ Est: 2 hours

**Task 4.1: Unit tests for API endpoints**
- File: `workers/tests/gap_analyses.test.ts`
- Test CRUD operations
- Test user isolation (can't access other users' data)
- Test answer updates

**Task 4.2: Integration test**
- Upload resume via frontend
- Verify gap analysis is generated
- Answer questions
- Verify data persists in D1
- Check useGapAnalysis hook returns correct data

**Task 4.3: Production smoke test**
- Deploy to staging environment
- Test full flow with real user account
- Verify performance (D1 queries should be <50ms)

---

## Code Changes Required

### 1. New Migration File

**File:** `workers/migrations/0003_add_gap_analyses.sql`

```sql
-- =====================================================================
-- Gap Analysis Tables Migration
-- =====================================================================
-- Created: 2026-01-03
-- Purpose: Add gap_analyses and gap_analysis_answers tables to D1
--
-- These tables were present in Supabase but missing from D1 schema
-- =====================================================================

-- Gap Analyses (main analysis record)
CREATE TABLE IF NOT EXISTS gap_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  gap_count INTEGER DEFAULT 0,
  red_flag_count INTEGER DEFAULT 0,
  urgency TEXT CHECK(urgency IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  overall_assessment TEXT,
  identified_gaps_and_flags TEXT,  -- JSON array as TEXT
  next_steps TEXT,                 -- JSON object as TEXT
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_gap_analyses_user_id ON gap_analyses(user_id);
CREATE INDEX idx_gap_analyses_created_at ON gap_analyses(created_at DESC);

-- Gap Analysis Answers (individual question answers)
CREATE TABLE IF NOT EXISTS gap_analysis_answers (
  id TEXT PRIMARY KEY,
  gap_analysis_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  priority TEXT CHECK(priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  gap_addressed TEXT,
  question TEXT NOT NULL,
  context TEXT,
  expected_outcome TEXT,
  answer TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (gap_analysis_id) REFERENCES gap_analyses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_gap_analysis_answers_gap_analysis_id ON gap_analysis_answers(gap_analysis_id);
CREATE INDEX idx_gap_analysis_answers_user_id ON gap_analysis_answers(user_id);
CREATE UNIQUE INDEX idx_gap_analysis_answers_unique ON gap_analysis_answers(gap_analysis_id, question_id);

-- =====================================================================
-- Migration Complete
-- =====================================================================
```

### 2. New Workers Route File

**File:** `workers/api/routes/gap_analyses.ts`

See detailed implementation in Phase 2, Task 2.1 above.

### 3. Updated Frontend Hook

**File:** `src/hooks/useGapAnalysis.ts`

Replace entire file content - remove Supabase queries, add Workers API calls.

### 4. Updated Component

**File:** `src/sections/profile-resume-management/components/ResumeUploadDialog.tsx`

Remove `saveGapAnalysisData()` function, rely on Workers API.

---

## Data Migration

**No data migration needed** because:
1. Feature is new/experimental
2. No production users with existing gap analyses
3. If needed, can export from Supabase and import to D1 manually

---

## Rollback Plan

If migration fails:

1. **Revert D1 migration:**
   ```bash
   wrangler d1 execute jobmatch-dev --command="DROP TABLE gap_analysis_answers"
   wrangler d1 execute jobmatch-dev --command="DROP TABLE gap_analyses"
   ```

2. **Revert code changes:**
   ```bash
   git revert <commit-hash>
   git push origin develop
   ```

3. **Fallback to Supabase:**
   - Re-enable Supabase queries in useGapAnalysis hook
   - Keep gap analysis tables in Supabase (they still exist)
   - Document as "partial migration" state

---

## Success Metrics

- ✅ Gap analyses tables exist in D1 (all 3 environments)
- ✅ Workers API endpoints return 200 OK
- ✅ Frontend hook fetches data from Workers API (not Supabase)
- ✅ Resume upload flow completes without errors
- ✅ Gap analysis questions persist in D1
- ✅ Answer updates save correctly
- ✅ useGapAnalysis hook returns correct data structure
- ✅ No 404 errors in console
- ✅ Query performance <50ms (D1 is faster than Supabase)

---

## Timeline

| Phase | Tasks | Estimated Time | Owner |
|-------|-------|----------------|-------|
| 1. Database Schema | 3 tasks | 1 hour | Backend |
| 2. Workers API | 3 tasks | 3 hours | Backend |
| 3. Frontend Updates | 3 tasks | 2 hours | Frontend |
| 4. Testing | 3 tasks | 2 hours | QA |
| **Total** | **12 tasks** | **8 hours** | **Full Stack** |

---

## Dependencies

**Before starting:**
- ✅ D1 databases exist (dev, staging, prod)
- ✅ Workers AI is active and working
- ✅ Resume analysis endpoint is functional
- ✅ Authentication middleware works

**Blockers:**
- None - all prerequisites met

---

## Notes

1. **Why not use resume_gap_analyses table?**
   - Workers implementation uses a single-table design with JSONB
   - Frontend expects two-table design (gap_analyses + gap_analysis_answers)
   - Two-table design is more queryable and matches existing frontend code
   - Less refactoring required

2. **Why not keep Supabase for gap analyses?**
   - Goal is to fully migrate to Cloudflare infrastructure
   - D1 is faster and cheaper than Supabase PostgreSQL
   - Reduces dependency on Supabase (eventual sunset)
   - Keeps all Workers data in D1 (single source of truth)

3. **Performance considerations:**
   - D1 queries are <10ms for indexed lookups
   - Workers AI analysis takes 2-5 seconds (acceptable)
   - No impact on other features

4. **Security:**
   - App-level `WHERE user_id = ?` filters replace RLS
   - Authentication middleware enforces user isolation
   - No risk of cross-user data leakage

---

## Next Steps

1. Review this migration plan with team
2. Create GitHub issue with task checklist
3. Assign to developer
4. Start with Phase 1 (database schema)
5. Test incrementally after each phase
6. Deploy to staging before production

---

**Document Status:** ✅ Ready for Implementation
**Last Updated:** 2026-01-03
**Reviewed By:** Claude Code (Automated Analysis)
