# Cloudflare Migration Completion Plan

**Date:** 2026-01-02
**Current Status:** 70% Complete (Route layer ✅, Service layer pending)
**Estimated Completion:** 2-3 weeks
**Owner:** Development Team

---

## Executive Summary

### What's Complete ✅ (Phase 3.1)

**Infrastructure (100%):**
- ✅ D1 databases created (dev, staging, prod) with 26-table schema
- ✅ R2 buckets created (9 total: avatars, resumes, exports × 3 envs)
- ✅ Vectorize indexes created (768-dim, cosine similarity)
- ✅ KV namespaces active (6 per env: rate limits, OAuth, caching)
- ✅ AI Gateway integrated (60-80% cache hit rate, $25/mo savings)
- ✅ Workers AI active (BGE-base-en-v1.5 embeddings)

**Backend Routes (100%):**
- ✅ All 8 route files migrated to D1 prepared statements
- ✅ Zero Supabase database calls in route layer
- ✅ App-level RLS implemented (`WHERE user_id = ?` filters)
- ✅ Proven migration patterns established

**Files Migrated:**
```
✅ applications.ts   - 13 D1 calls (was 13 Supabase)
✅ jobs.ts           - 18 D1 calls (was 14 Supabase)
✅ resume.ts         - 6 D1 calls (was 8 Supabase)
✅ profile.ts        - 25 D1 calls (was 17 Supabase)
✅ exports.ts        - Migrated to D1 + R2
✅ skills.ts         - Migrated to D1
✅ auth.ts           - Migrated to D1
✅ emails.ts         - Migrated to D1
```

### What's Pending ⏳ (Phases 3.2-3.5)

**Backend Services (0%):**
- ❌ 8 service files with 54 Supabase calls requiring migration
- ❌ R2 storage integration (openai.service.ts has 4 Supabase Storage calls)
- ❌ RPC replacement (jobDeduplication.service.ts has complex stored procedures)

**Frontend (0%):**
- ❌ 24 files with 68+ Supabase client calls
- ❌ Authentication layer (AuthContext.tsx)
- ❌ 17 data hooks (useApplications, useJobs, etc.)
- ❌ File upload hooks (useFileUpload.ts)

---

## Phase 3.2: Service Layer Migration

**Priority:** P0 (CRITICAL PATH)
**Estimated Time:** 3-4 days
**Dependencies:** Route layer complete ✅

### Service Files to Migrate

| Service | Calls | Complexity | Priority | Est. Time |
|---------|-------|------------|----------|-----------|
| `openai.service.ts` (R2) | 4 | HIGH | P0 | 6h |
| `jobDeduplication.service.ts` | 17 | HIGH | P0 | 8h |
| `spamDetection.service.ts` | 5 | MEDIUM | P1 | 3h |
| `searchHistory.service.ts` | 6 | MEDIUM | P1 | 3h |
| `searchPreferences.service.ts` | 7 | MEDIUM | P1 | 3h |
| `searchTemplates.service.ts` | 10 | MEDIUM | P1 | 4h |
| `jobScraper.service.ts` | 3 | LOW | P2 | 2h |
| `sendgrid.service.ts` | 2 | LOW | P2 | 1h |
| **TOTAL** | **54** | - | - | **30h** |

### Migration Pattern (Proven from Routes)

```typescript
// ❌ OLD: Supabase PostgreSQL
const supabase = createSupabaseAdmin(env);
const { data, error } = await supabase
  .from('skills')
  .select('*')
  .eq('user_id', userId);

// ✅ NEW: D1 SQLite
const { results } = await env.DB.prepare(
  'SELECT * FROM skills WHERE user_id = ?'
)
  .bind(userId)
  .all();
```

### Key Conversions Required

1. **Data Types:**
   - UUID → TEXT (use `crypto.randomUUID()`)
   - JSONB → TEXT (store as JSON strings, parse with `JSON.parse()`)
   - Arrays → TEXT (store as JSON arrays)
   - BOOLEAN → INTEGER (0/1)
   - Timestamps → TEXT (ISO 8601)

2. **Security:**
   - Add `WHERE user_id = ?` to ALL queries
   - Use `.bind()` for parameterized queries (prevent SQL injection)
   - Test with multiple users to verify data isolation

3. **Error Handling:**
   - PostgreSQL error codes → SQLite equivalents
   - Constraint violations (e.g., `23505` → SQLite `SQLITE_CONSTRAINT_UNIQUE`)

### Detailed Migration Tasks

#### Task 1: Migrate openai.service.ts (R2 Storage) - 6h

**Current Supabase Storage calls (lines 814-993):**
- Line 814-825: `downloadFile()` from Supabase `files` bucket
- Line 865-878: List files verification
- Line 977-993: Generate signed URL for image parsing

**Migration steps:**
1. Replace `supabaseAdmin.storage.from('files')` with `env.RESUMES` (R2 binding)
2. Update `downloadFile()` to use R2's `get()` method
3. Use R2's `createSignedUrl()` for presigned URLs (see wrangler.toml lines 209-217)
4. Test PDF parsing with R2 backend
5. Test image resume parsing with R2 signed URLs
6. Update error handling for R2 exceptions

**Acceptance criteria:**
- [ ] Resume PDF parsing works with R2
- [ ] Image resume parsing works with R2 presigned URLs
- [ ] File downloads from R2 successful
- [ ] Error handling verified
- [ ] Unit tests passing

---

#### Task 2: Migrate jobDeduplication.service.ts - 8h

**Current Supabase dependencies (lines 359-729):**
- 17 Supabase calls including RPC calls to stored procedures
- Uses PostgreSQL functions: `calculate_job_quality_score`, `mark_as_canonical`

**Complex areas:**
1. **RPC: `calculate_job_quality_score` (line 359-380)**
   - Calculates quality score based on job metadata
   - **Solution:** Reimplement in TypeScript or create D1 SQL function

2. **RPC: `mark_as_canonical` (line 535-552)**
   - Marks job as canonical in duplicate set
   - **Solution:** Create D1 transaction with UPDATE queries

**Migration steps:**
1. Extract RPC logic from Supabase stored procedures
2. Reimplement `calculateJobQualityScore()` in TypeScript
3. Reimplement `markAsCanonical()` with D1 transactions
4. Replace all `.from('job_duplicates')` with D1 prepared statements
5. Replace all `.from('canonical_job_metadata')` with D1
6. Update duplicate pair insertion to use batch D1 inserts
7. Test deduplication end-to-end with sample job data
8. Verify quality scores match previous PostgreSQL calculations

**Acceptance criteria:**
- [ ] Quality score calculation matches PostgreSQL results
- [ ] Duplicate detection logic works correctly
- [ ] Canonical job marking atomic and safe
- [ ] All 17 Supabase calls replaced
- [ ] Integration tests passing
- [ ] Performance benchmarks acceptable

---

#### Task 3: Migrate spamDetection.service.ts - 3h

**Current dependencies (lines 508-600):**
- 5 Supabase calls to `jobs` table
- Updates spam detection results (spam_probability, spam_categories, spam_flags)
- Queries jobs for analysis and statistics

**Migration steps:**
1. Replace `supabaseAdmin.from(TABLES.JOBS)` with D1
2. Handle JSONB arrays (`spam_categories`, `spam_flags`) as JSON TEXT
3. Ensure spam_probability stored as REAL in SQLite
4. Update timestamp comparisons for SQLite
5. Test spam detection flow end-to-end

**Acceptance criteria:**
- [ ] Spam detection updates jobs correctly
- [ ] Spam statistics queries work
- [ ] JSON arrays parse/stringify correctly
- [ ] Unit tests passing

---

#### Task 4: Migrate searchHistory.service.ts - 3h

**Current dependencies (lines 71-333):**
- 6 Supabase calls to `search_history` table
- Unique constraint on `search_fingerprint` + timeframe

**Migration steps:**
1. Replace all `supabaseAdmin.from('search_history')` with D1
2. Handle unique constraint violations (PostgreSQL `23505` → SQLite)
3. Update date range queries for SQLite date functions
4. Test search history recording and deduplication

**Acceptance criteria:**
- [ ] Search history records saved correctly
- [ ] Duplicate search fingerprints handled
- [ ] Date range queries work
- [ ] Pagination working
- [ ] Unit tests passing

---

#### Task 5: Migrate searchPreferences.service.ts - 3h

**Current dependencies (lines 57-368):**
- 7 Supabase calls with JSONB field updates
- JSONB fields: `enabled_sources`, `company_blacklist`, `keyword_blacklist`

**Migration steps:**
1. Replace all Supabase calls with D1
2. Convert JSONB fields to JSON TEXT storage
3. Use SQLite JSON functions for array operations
4. Test blacklist add/remove operations
5. Test enabled sources toggle

**Acceptance criteria:**
- [ ] JSONB → JSON TEXT conversion works
- [ ] Array operations (add/remove) work
- [ ] Preferences CRUD working
- [ ] Unit tests passing

---

#### Task 6: Migrate searchTemplates.service.ts - 4h

**Current dependencies (lines 76-396):**
- 10 Supabase calls including ILIKE search
- Template use count tracking

**Migration steps:**
1. Replace all `.from('search_templates')` with D1
2. Migrate ILIKE queries (line 396) to SQLite LIKE (case-insensitive)
3. Update use count increment logic
4. Test template search by name

**Acceptance criteria:**
- [ ] Template CRUD working
- [ ] Case-insensitive search working
- [ ] Use count tracking accurate
- [ ] Unit tests passing

---

#### Task 7: Migrate jobScraper.service.ts - 2h

**Current dependencies (lines 374-415):**
- 3 Supabase calls (inserts only)
- Job search record insertion
- Batch job insertion

**Migration steps:**
1. Replace insert with D1 prepared statement
2. Use D1 batch API for bulk job inserts
3. Test job scraping flow end-to-end

**Acceptance criteria:**
- [ ] Job search records saved
- [ ] Batch job inserts working
- [ ] Unit tests passing

---

#### Task 8: Migrate sendgrid.service.ts - 1h

**Current dependencies (lines 110-137):**
- 2 Supabase calls (email history logging)
- Simple inserts/updates

**Migration steps:**
1. Replace `.from(TABLES.EMAILS)` with D1
2. Replace `.from(TABLES.APPLICATIONS).update()` with D1
3. Test email sending flow

**Acceptance criteria:**
- [ ] Email history logged correctly
- [ ] Application last_email_sent_at updated
- [ ] Unit tests passing

---

## Phase 3.3: Configuration Verification

**Status:** ✅ Complete (per audit)
**Time:** 0h (already done)

The `workers/wrangler.toml` is production-ready with all bindings configured:
- ✅ D1 databases (3 environments)
- ✅ KV namespaces (18 total)
- ✅ R2 buckets (9 total)
- ✅ Vectorize indexes (3 environments)
- ✅ Workers AI binding
- ✅ AI Gateway configuration

**Only missing:** Cron triggers (disabled due to account limit)

---

## Phase 3.5: Frontend Migration

**Priority:** P1 (After service layer)
**Estimated Time:** 9-12 days
**Dependencies:** Service layer complete

### Frontend Files to Migrate

**24 files with 68+ Supabase calls**

#### Category 1: Authentication (P0 - CRITICAL)

| File | Calls | Complexity | Est. Time |
|------|-------|------------|-----------|
| `AuthContext.tsx` | 10+ | HIGH | 8h |
| `lib/supabase.ts` | N/A | HIGH | 2h |
| `lib/sessionManagement.ts` | 3 | MEDIUM | 3h |
| `AuthCallbackPage.tsx` | 2 | MEDIUM | 2h |

**Total:** 15h

**Migration approach:**
1. Create `lib/workersApi.ts` wrapper for Workers API
2. Replace `supabase.auth.*` calls with Workers API fetch calls
3. Update session management to use Workers JWT tokens
4. Migrate OAuth flows (Google, LinkedIn) to Workers
5. Comprehensive auth testing

---

#### Category 2: Data Hooks (P1)

**17 hook files with 68 Supabase calls**

| Hook | Calls | Est. Time |
|------|-------|-----------|
| `useApplications.ts` | 6 | 3h |
| `useJobs.ts` | 10 | 4h |
| `useProfile.ts` | 2 | 2h |
| `useWorkExperience.ts` | 4 | 2h |
| `useEducation.ts` | 4 | 2h |
| `useSkills.ts` | 4 | 2h |
| `useResumes.ts` | 4 | 2h |
| `useTrackedApplications.ts` | 8 | 3h |
| `useJobScraping.ts` | 4 | 2h |
| `useResumeParser.ts` | 2 | 2h |
| `useResumeExport.ts` | 4 | 2h |
| `useGapAnalysis.ts` | 5 | 2h |
| `useWorkExperienceNarratives.ts` | 3 | 2h |
| `useUsageMetrics.ts` | 1 | 1h |
| `useSubscription.ts` | 6 | 2h |
| `useLinkedInAuth.ts` | 1 | 1h |
| **TOTAL** | **68** | **34h** |

**Migration pattern:**
```typescript
// ❌ OLD: Direct Supabase
const { data, error } = await supabase
  .from('applications')
  .select('*')
  .eq('user_id', userId);

// ✅ NEW: Workers API
const response = await fetch(`${API_URL}/api/applications`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
```

---

#### Category 3: File Uploads (P0 - CRITICAL)

| File | Current | Target | Est. Time |
|------|---------|--------|-----------|
| `useFileUpload.ts` | Supabase Storage | R2 presigned URLs | 4h |
| `ProfilePhotoUpload.tsx` | Supabase avatars | R2 via Workers | 2h |
| `ResumeUpload.tsx` | Supabase files | R2 via Workers | 3h |

**Total:** 9h

**Migration flow:**
```typescript
// 1. Request presigned upload URL from Workers
const { uploadUrl, fileKey } = await fetch('/api/storage/upload-url', {
  method: 'POST',
  body: JSON.stringify({ fileName, fileType })
});

// 2. Upload directly to R2
await fetch(uploadUrl, {
  method: 'PUT',
  body: fileBlob
});

// 3. Confirm upload
await fetch('/api/storage/confirm-upload', {
  method: 'POST',
  body: JSON.stringify({ fileKey })
});
```

---

#### Category 4: Cleanup (P2)

**Tasks:**
1. Remove `@supabase/supabase-js` dependency
2. Delete `src/lib/supabase.ts`
3. Clean up unused imports
4. Update environment variables
5. Final integration testing

**Time:** 4h

---

### Frontend Migration Timeline

**Week 1 (5 days):**
- Day 1: Create `lib/workersApi.ts` + auth migration planning
- Day 2-3: Migrate authentication layer (AuthContext, session management)
- Day 4: Migrate file upload hooks
- Day 5: Testing and bug fixes

**Week 2 (5 days):**
- Day 1-2: Migrate data hooks (applications, jobs, profile)
- Day 3: Migrate data hooks (skills, education, work experience)
- Day 4: Migrate data hooks (resumes, scraping, exports)
- Day 5: Migrate data hooks (analytics, subscriptions)

**Week 3 (2 days):**
- Day 1: Final cleanup and testing
- Day 2: E2E testing and deployment

---

## Testing Strategy

### Service Layer Testing

**For each migrated service:**
1. **Unit tests** - Test individual functions in isolation
2. **Integration tests** - Test D1 queries against test database
3. **Security tests** - Verify `WHERE user_id = ?` prevents data leakage
4. **Performance tests** - Benchmark D1 vs Supabase latency
5. **Error handling tests** - Verify error cases handled correctly

**Test files to create:**
```
workers/tests/unit/
  ├── openai.service.test.ts (R2 file operations)
  ├── jobDeduplication.service.test.ts (RPC replacement)
  ├── spamDetection.service.test.ts
  ├── searchHistory.service.test.ts
  ├── searchPreferences.service.test.ts
  ├── searchTemplates.service.test.ts
  ├── jobScraper.service.test.ts
  └── sendgrid.service.test.ts

workers/tests/integration/
  ├── d1-security.test.ts (RLS bypass prevention)
  ├── r2-storage.test.ts (file upload/download)
  └── service-layer.test.ts (end-to-end flows)
```

---

### Frontend Testing

**For each migrated component:**
1. **Mock Workers API** - Create mock server for testing
2. **Hook tests** - Test each hook in isolation
3. **Component tests** - Test UI components with React Testing Library
4. **E2E tests** - Test critical user flows with Playwright
5. **Error boundary tests** - Verify error states render correctly

**Test files to create:**
```
tests/e2e/
  ├── auth-flow.spec.ts (login, logout, OAuth)
  ├── file-upload.spec.ts (avatar, resume uploads)
  ├── job-application.spec.ts (create/edit/delete applications)
  ├── profile-management.spec.ts (update profile, work exp)
  └── job-search.spec.ts (search, filter, save jobs)
```

---

## Deployment Strategy

### Phase 1: Service Layer (Week 1)

**Deploy to development:**
1. Migrate and test each service individually
2. Deploy to `develop` branch → development environment
3. Run integration tests
4. Monitor for errors (use Cloudflare Workers logs)

**Validation checklist:**
- [ ] All service tests passing
- [ ] D1 queries performing well (< 50ms p95)
- [ ] R2 file operations working
- [ ] No Supabase calls in backend services
- [ ] Error rates < 1%

---

### Phase 2: Frontend Auth (Week 2, Day 1-3)

**Deploy to development:**
1. Migrate authentication layer
2. Deploy to `develop` branch
3. Test login/logout flows manually
4. Test OAuth flows (Google, LinkedIn)

**Validation checklist:**
- [ ] Login/logout working
- [ ] OAuth flows working
- [ ] Session management correct
- [ ] Token refresh working
- [ ] No Supabase auth calls

---

### Phase 3: Frontend Data Hooks (Week 2, Day 4-5 + Week 3)

**Deploy incrementally:**
1. Migrate hooks in batches of 3-4
2. Deploy to development after each batch
3. Test affected features manually
4. Monitor for errors

**Validation checklist:**
- [ ] All CRUD operations working
- [ ] Real-time updates working
- [ ] Error handling correct
- [ ] Loading states working
- [ ] No Supabase client calls

---

### Phase 4: Staging Deployment (Week 3, Day 1)

**Deploy to staging:**
1. Merge `develop` → `staging` branch
2. Automated deployment via GitHub Actions
3. Run full E2E test suite
4. Performance testing (load test 100+ concurrent users)
5. Security audit

**Validation checklist:**
- [ ] All E2E tests passing
- [ ] Performance benchmarks met
- [ ] Security audit clean
- [ ] No Supabase dependencies
- [ ] Monitoring dashboards green

---

### Phase 5: Production Deployment (Week 3, Day 2)

**Deploy to production:**
1. Merge `staging` → `main` branch
2. Automated deployment via GitHub Actions
3. Monitor deployment closely (first 24 hours)
4. Gradual traffic shift (if possible)

**Validation checklist:**
- [ ] Production deployment successful
- [ ] Health checks passing
- [ ] Error rates normal
- [ ] Response times acceptable
- [ ] No user reports of issues

---

### Phase 6: Supabase Decommission (Week 4)

**After 1 week of stable production:**
1. Export Supabase data as backup
2. Verify all data in D1/R2
3. Cancel Supabase subscription
4. Remove Supabase dependencies from codebase
5. Update documentation

**Cost savings:**
- Supabase: -$25/month
- **New total:** ~$40/month (28% reduction)

---

## Risk Mitigation

### High-Risk Areas

1. **Authentication Migration**
   - Risk: Users locked out during migration
   - Mitigation: Feature flag, gradual rollout, test accounts
   - Rollback: Keep Supabase Auth active for 1 week

2. **File Upload Migration**
   - Risk: Files lost during R2 migration
   - Mitigation: Copy files to R2 before cutover, dual-write period
   - Rollback: Fallback to Supabase Storage if R2 fails

3. **Job Deduplication RPC**
   - Risk: Quality scores incorrect, duplicates not detected
   - Mitigation: Extensive testing with production data samples
   - Rollback: Disable deduplication temporarily if needed

4. **Data Integrity**
   - Risk: Data loss during Supabase → D1 migration
   - Mitigation: Comprehensive data export, verification scripts
   - Rollback: Restore from Supabase backup

---

### Rollback Plan

**If critical issues arise:**

1. **Revert code deployment:**
   ```bash
   git revert <commit-hash>
   git push origin <branch>
   ```

2. **Restore Supabase access:**
   - Re-enable Supabase client in code
   - Redeploy previous version
   - Verify data sync

3. **Data recovery:**
   - Restore from Supabase backup
   - Sync D1 data to Supabase
   - Verify data integrity

---

## Success Metrics

### Technical Metrics

**Performance:**
- [ ] D1 query latency < 50ms p95
- [ ] R2 file operations < 200ms p95
- [ ] Workers response time < 100ms p95
- [ ] API error rate < 1%

**Cost:**
- [ ] Monthly cost reduced to ~$40 (from $65)
- [ ] Supabase subscription cancelled
- [ ] AI Gateway saving ~$25/month on OpenAI

**Code Quality:**
- [ ] 0 Supabase calls in backend
- [ ] 0 Supabase calls in frontend
- [ ] All tests passing (unit + integration + E2E)
- [ ] Code coverage > 80%

---

### Business Metrics

**User Experience:**
- [ ] No increase in error reports
- [ ] Page load times same or better
- [ ] File upload/download working smoothly
- [ ] No authentication issues

**Operational:**
- [ ] Monitoring dashboards green
- [ ] On-call incidents 0
- [ ] User complaints 0
- [ ] Rollbacks 0

---

## Next Steps (Immediate)

### This Week (Week 1)

**Monday:**
- [ ] Review this migration plan with team
- [ ] Set up D1 test database with sample data
- [ ] Create test users for security testing
- [ ] **Start Task 1:** Migrate `openai.service.ts` (R2)

**Tuesday:**
- [ ] **Continue Task 1:** Complete R2 migration
- [ ] Test PDF parsing with R2
- [ ] **Start Task 2:** Migrate `jobDeduplication.service.ts`

**Wednesday:**
- [ ] **Continue Task 2:** Complete RPC replacement
- [ ] Test deduplication logic thoroughly
- [ ] **Start Task 3:** Migrate `spamDetection.service.ts`

**Thursday:**
- [ ] **Tasks 4-6:** Migrate search services (history, preferences, templates)
- [ ] Run integration tests for all migrated services

**Friday:**
- [ ] **Tasks 7-8:** Migrate `jobScraper` and `sendgrid`
- [ ] Comprehensive testing of service layer
- [ ] Deploy to development environment
- [ ] **Week 1 Demo:** Show service layer migration complete

---

### Week 2: Frontend Migration

**Monday-Tuesday:**
- [ ] Create `lib/workersApi.ts` wrapper
- [ ] Migrate authentication layer
- [ ] Test auth flows

**Wednesday-Thursday:**
- [ ] Migrate data hooks (applications, jobs, profile)
- [ ] Migrate file upload hooks

**Friday:**
- [ ] Continue data hooks migration
- [ ] Deploy to development

---

### Week 3: Testing & Deployment

**Monday:**
- [ ] Complete remaining data hooks
- [ ] E2E testing
- [ ] Deploy to staging

**Tuesday:**
- [ ] Production deployment
- [ ] Monitoring and validation

---

## Conclusion

**Current state:** 70% complete (infrastructure + routes done)
**Remaining work:** 30% (services + frontend)
**Estimated completion:** 2-3 weeks

**Critical success factors:**
1. Service layer migration (Phase 3.2) - 3-4 days
2. Frontend migration (Phase 3.5) - 9-12 days
3. Comprehensive testing throughout
4. Gradual deployment with feature flags
5. Active monitoring and rollback readiness

**Confidence level:** HIGH - Proven migration patterns from Phase 3.1

---

**Report generated:** 2026-01-02
**Next review:** After Phase 3.2 completion
**Owner:** Development Team
**Priority:** CRITICAL PATH
