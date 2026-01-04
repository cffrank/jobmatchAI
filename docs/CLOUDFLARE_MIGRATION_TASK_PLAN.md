# Cloudflare Migration Task Plan

**JobMatch AI - Complete Migration Execution Plan**

**Document Version:** 1.0
**Date:** 2025-12-31
**Status:** Ready for Execution
**Timeline:** 8 weeks (pre-alpha advantage)

---

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [Phase 1: Foundation Setup (Week 1-2)](#phase-1-foundation-setup-week-1-2)
3. [Phase 2: Database Migration (Week 2-3)](#phase-2-database-migration-week-2-3)
4. [Phase 3: API Migration (Week 3-5)](#phase-3-api-migration-week-3-5)
5. [Phase 4: Security & Testing (Week 5-6)](#phase-4-security--testing-week-5-6)
6. [Phase 5: Deployment & Monitoring (Week 6-7)](#phase-5-deployment--monitoring-week-6-7)
7. [Phase 6: Decommissioning (Week 7-8)](#phase-6-decommissioning-week-7-8)
8. [Critical Path Tasks](#critical-path-tasks)
9. [Risk Mitigation](#risk-mitigation)

---

## Migration Overview

### Current Status ✅

**Already Complete:**
- ✅ Cloudflare account setup (carl.f.frank@gmail.com, ID: 280c58ea17d9fe3235c33bd0a52a256b)
- ✅ Wrangler CLI authenticated with full permissions
- ✅ 3 KV namespaces created (JOB_ANALYSIS_CACHE for dev/staging/prod)
- ✅ 18 Workers endpoints deployed in `workers/` directory
- ✅ Hono framework migration complete
- ✅ Workers AI integration (Llama 3.3 70B, Llama 3.2 Vision 11B)
- ✅ Resume gap analysis feature
- ✅ 10-dimension job compatibility scoring
- ✅ Basic middleware (auth, error handling, rate limiting)

**What Remains:**
- 🔄 5 additional KV namespaces (SESSIONS, RATE_LIMITS, OAUTH_STATES, EMBEDDINGS_CACHE, AI_GATEWAY_CACHE)
- 🔄 D1 database creation and schema migration (26 tables)
- 🔄 Replace PostgreSQL RLS with application-layer security
- 🔄 Migrate rate limiting from PostgreSQL to KV
- 🔄 Migrate sessions from PostgreSQL to KV
- 🔄 R2 bucket creation for file storage (avatars, resumes, exports)
- 🔄 Vectorize index for semantic job search
- 🔄 AI Gateway setup for dual-layer caching
- 🔄 CI/CD pipeline for multi-environment deployment
- 🔄 Production deployment and 48h monitoring
- 🔄 Decommission Railway and Supabase

### Target Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  Frontend (React 19)                         │
│              Cloudflare Pages ($0/month)                     │
└────────────────────┬─────────────────────────────────────────┘
                     │
         ┌───────────▼──────────────────────────────────┐
         │   Cloudflare Workers ($5/month base)         │
         │   - API endpoints (Hono framework)           │
         │   - JWT auth (no service role key leaks)     │
         │   - Application-layer RLS                    │
         │   - Rate limiting via KV                     │
         │   - Session management via KV                │
         └───────────┬──────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┬─────────────────┐
    │                │                │                 │
┌───▼────┐   ┌──────▼──────┐  ┌─────▼──────┐  ┌──────▼──────┐
│ D1 DB  │   │  KV (6 NS)  │  │ R2 Storage │  │  Vectorize  │
│ ($0)   │   │  ($0.50)    │  │  ($0.50)   │  │  ($0)       │
│ 3 DBs  │   │  18 total   │  │  3 buckets │  │  1 index    │
└────────┘   └─────────────┘  └────────────┘  └─────────────┘
                     │
              ┌──────▼──────────┐
              │  AI Gateway     │
              │  - Dual cache   │
              │  - OpenAI proxy │
              │  ($1-6/month)   │
              └─────────────────┘
```

**Total Cost:** $7-12/month (88-91% reduction from $75/month)

---

## Phase 1: Foundation Setup (Week 1-2)

**Goal:** Create all Cloudflare resources and configure bindings
**Duration:** 6.5 hours
**Dependencies:** None (account already set up)

### Task 1.1: Update Wrangler ✅ (ALREADY COMPLETE - but needs upgrade)

**Status:** ⚠️ Current: v3.114.16, Latest: v4.54.0
**Priority:** HIGH
**Estimated Time:** 0.25 hours
**Agent Type:** deployment-engineer

**Action:**
```bash
cd /home/carl/application-tracking/jobmatch-ai/workers
npm install --save-dev wrangler@4
npx wrangler --version
```

**Validation:**
- Wrangler v4.x.x installed
- `npx wrangler whoami` still works
- No breaking changes in wrangler.toml syntax

**Deliverables:**
- Updated package.json with wrangler@4
- Verified authentication still works

---

### Task 1.2: Create D1 Databases (CRITICAL PATH)

**Status:** 🔄 Pending
**Priority:** CRITICAL
**Estimated Time:** 0.5 hours
**Agent Type:** database-architect
**Dependencies:** 1.1

**Action:**
Create 3 D1 databases (development, staging, production):

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# Development
wrangler d1 create jobmatch-dev
# Copy database ID to wrangler.toml

# Staging
wrangler d1 create jobmatch-staging
# Copy database ID to wrangler.toml

# Production
wrangler d1 create jobmatch-prod
# Copy database ID to wrangler.toml
```

**Update wrangler.toml:**
```toml
# Development
[[env.development.d1_databases]]
binding = "DB"
database_name = "jobmatch-dev"
database_id = "<paste-dev-id-here>"

# Staging
[[env.staging.d1_databases]]
binding = "DB"
database_name = "jobmatch-staging"
database_id = "<paste-staging-id-here>"

# Production
[[env.production.d1_databases]]
binding = "DB"
database_name = "jobmatch-prod"
database_id = "<paste-prod-id-here>"
```

**Validation:**
```bash
wrangler d1 list
wrangler d1 execute jobmatch-dev --command "SELECT 1"
```

**Deliverables:**
- 3 D1 databases created
- Database IDs in wrangler.toml
- Test query successful

---

### Task 1.3: Create Additional KV Namespaces (CRITICAL PATH)

**Status:** 🔄 Pending
**Priority:** CRITICAL
**Estimated Time:** 1 hour
**Agent Type:** terraform-specialist
**Dependencies:** 1.1

**Action:**
Create 5 additional KV namespace types × 3 environments = 15 new namespaces:

1. **SESSIONS** - User session storage (30-min TTL)
2. **RATE_LIMITS** - Rate limiting counters (1-hour TTL)
3. **OAUTH_STATES** - OAuth CSRF protection (10-min TTL)
4. **EMBEDDINGS_CACHE** - Job/resume embeddings (30-day TTL)
5. **AI_GATEWAY_CACHE** - AI Gateway responses (7-day TTL)

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# SESSIONS namespaces
wrangler kv namespace create SESSIONS --env development
wrangler kv namespace create SESSIONS --env staging
wrangler kv namespace create SESSIONS --env production

# RATE_LIMITS namespaces
wrangler kv namespace create RATE_LIMITS --env development
wrangler kv namespace create RATE_LIMITS --env staging
wrangler kv namespace create RATE_LIMITS --env production

# OAUTH_STATES namespaces
wrangler kv namespace create OAUTH_STATES --env development
wrangler kv namespace create OAUTH_STATES --env staging
wrangler kv namespace create OAUTH_STATES --env production

# EMBEDDINGS_CACHE namespaces
wrangler kv namespace create EMBEDDINGS_CACHE --env development
wrangler kv namespace create EMBEDDINGS_CACHE --env staging
wrangler kv namespace create EMBEDDINGS_CACHE --env production

# AI_GATEWAY_CACHE namespaces
wrangler kv namespace create AI_GATEWAY_CACHE --env development
wrangler kv namespace create AI_GATEWAY_CACHE --env staging
wrangler kv namespace create AI_GATEWAY_CACHE --env production
```

**Update wrangler.toml:**
Add all 15 new KV bindings under each environment section.

**Validation:**
```bash
wrangler kv namespace list
# Should show 18 total namespaces (3 existing + 15 new)
```

**Deliverables:**
- 15 new KV namespaces created
- All IDs in wrangler.toml
- 6 KV namespace types × 3 environments = 18 total

---

### Task 1.4: Create Vectorize Index

**Status:** 🔄 Pending
**Priority:** HIGH
**Estimated Time:** 0.5 hours
**Agent Type:** ai-integration-specialist
**Dependencies:** 1.1

**Action:**
Create Vectorize index for semantic job/resume search:

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

wrangler vectorize create jobmatch-embeddings \
  --dimensions=768 \
  --metric=cosine
```

**Update wrangler.toml:**
```toml
[[vectorize]]
binding = "VECTORIZE"
index_name = "jobmatch-embeddings"
```

**Validation:**
```bash
wrangler vectorize list
wrangler vectorize get jobmatch-embeddings
```

**Deliverables:**
- Vectorize index created (768-dim, cosine similarity)
- Binding in wrangler.toml
- Compatible with Workers AI embeddings (@cf/baai/bge-base-en-v1.5)

---

### Task 1.5: Create R2 Buckets

**Status:** 🔄 Pending
**Priority:** HIGH
**Estimated Time:** 0.5 hours
**Agent Type:** cloud-architect
**Dependencies:** 1.1

**Action:**
Create 3 R2 buckets for file storage:

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# Development bucket
wrangler r2 bucket create jobmatch-dev-files

# Staging bucket
wrangler r2 bucket create jobmatch-staging-files

# Production bucket
wrangler r2 bucket create jobmatch-prod-files
```

**Update wrangler.toml:**
```toml
# Development
[[env.development.r2_buckets]]
binding = "STORAGE"
bucket_name = "jobmatch-dev-files"

# Staging
[[env.staging.r2_buckets]]
binding = "STORAGE"
bucket_name = "jobmatch-staging-files"

# Production
[[env.production.r2_buckets]]
binding = "STORAGE"
bucket_name = "jobmatch-prod-files"
```

**Validation:**
```bash
wrangler r2 bucket list
```

**Deliverables:**
- 3 R2 buckets created
- Bindings in wrangler.toml
- Replaces Supabase Storage (3 buckets: avatars, resumes, exports)

---

### Task 1.6: Create AI Gateway

**Status:** 🔄 Pending
**Priority:** MEDIUM
**Estimated Time:** 1 hour
**Agent Type:** ai-integration-specialist
**Dependencies:** 1.1

**Action:**
Create AI Gateway for OpenAI proxy with caching:

```bash
# Via Cloudflare Dashboard:
# 1. Go to AI > AI Gateway
# 2. Create new gateway:
#    - Name: jobmatch-ai-gateway
#    - Provider: OpenAI
#    - Enable caching: Yes
#    - Cache TTL: 7 days (for job analyses)
# 3. Copy gateway endpoint URL
```

**Update wrangler.toml secrets:**
```bash
wrangler secret put CLOUDFLARE_ACCOUNT_ID
# Paste: 280c58ea17d9fe3235c33bd0a52a256b

wrangler secret put AI_GATEWAY_SLUG
# Paste: jobmatch-ai-gateway
```

**Update workers/api/services/openai.ts:**
Replace OpenAI base URL with AI Gateway endpoint:
```typescript
const openaiBaseUrl = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_SLUG}/openai`;
```

**Validation:**
- AI Gateway visible in dashboard
- Test OpenAI request routes through gateway
- Verify caching works (2nd identical request = cache hit)

**Deliverables:**
- AI Gateway created and configured
- OpenAI service updated to use gateway
- Dual-layer caching operational (AI Gateway + KV)

---

### Task 1.7: Update Workers Types

**Status:** 🔄 Pending
**Priority:** HIGH
**Estimated Time:** 0.5 hours
**Agent Type:** backend-typescript-architect
**Dependencies:** 1.2, 1.3, 1.4, 1.5, 1.6

**Action:**
Update `workers/api/types.ts` with all new bindings:

```typescript
export interface Env {
  // Existing
  AI: Ai;
  JOB_ANALYSIS_CACHE: KVNamespace;

  // New bindings
  DB: D1Database;
  SESSIONS: KVNamespace;
  RATE_LIMITS: KVNamespace;
  OAUTH_STATES: KVNamespace;
  EMBEDDINGS_CACHE: KVNamespace;
  AI_GATEWAY_CACHE: KVNamespace;
  STORAGE: R2Bucket;
  VECTORIZE: VectorizeIndex;

  // Secrets (via wrangler secret put)
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY: string;
  SENDGRID_API_KEY?: string;
  SENDGRID_FROM_EMAIL?: string;
  LINKEDIN_CLIENT_ID?: string;
  LINKEDIN_CLIENT_SECRET?: string;
  LINKEDIN_REDIRECT_URI?: string;
  APIFY_API_TOKEN?: string;
  APP_URL: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  AI_GATEWAY_SLUG?: string;
}
```

**Validation:**
```bash
cd /home/carl/application-tracking/jobmatch-ai/workers
npm run typecheck
```

**Deliverables:**
- Updated Env interface with all bindings
- TypeScript compilation successful
- No type errors in codebase

---

### Task 1.8: Update GitHub Secrets

**Status:** 🔄 Pending
**Priority:** MEDIUM
**Estimated Time:** 0.5 hours
**Agent Type:** deployment-engineer
**Dependencies:** 1.2, 1.3, 1.4, 1.5, 1.6

**Action:**
Add all Cloudflare resource IDs to GitHub Secrets for CI/CD:

**Required Secrets:**
- `CLOUDFLARE_ACCOUNT_ID` = 280c58ea17d9fe3235c33bd0a52a256b
- `CLOUDFLARE_API_TOKEN` = (from Wrangler auth)
- `D1_DEV_DATABASE_ID` = (from Task 1.2)
- `D1_STAGING_DATABASE_ID` = (from Task 1.2)
- `D1_PROD_DATABASE_ID` = (from Task 1.2)
- All 18 KV namespace IDs (from existing + Task 1.3)
- R2 bucket names (from Task 1.5)
- Vectorize index name (from Task 1.4)
- AI Gateway slug (from Task 1.6)

**Validation:**
- All secrets visible in GitHub repo settings
- No secrets contain trailing whitespace or newlines

**Deliverables:**
- Complete GitHub Secrets configured
- Ready for CI/CD workflow creation

---

## Phase 2: Database Migration (Week 2-3)

**Goal:** Migrate PostgreSQL schema to D1 and KV
**Duration:** 18.5 hours
**Dependencies:** Phase 1 complete

### Task 2.1: Design D1 Schema (CRITICAL PATH)

**Status:** 🔄 Pending
**Priority:** CRITICAL
**Estimated Time:** 8 hours
**Agent Type:** database-architect + sql-pro
**Dependencies:** Phase 1 complete

**Action:**
Convert 26 PostgreSQL tables to SQLite-compatible D1 schema.

**Key Conversions:**
1. **UUIDs:** `UUID` → `TEXT` (store as 36-char strings)
2. **JSONB:** `JSONB` → `TEXT` (store as JSON strings, use JSON functions)
3. **Arrays:** `TEXT[]` → `TEXT` (store as JSON arrays)
4. **Timestamps:** `TIMESTAMPTZ` → `INTEGER` (Unix epoch milliseconds)
5. **Full-text search:** Use FTS5 virtual tables
6. **Enums:** `ENUM` → `TEXT CHECK(value IN (...))`

**Tables to migrate:**
1. users
2. jobs
3. applications
4. resumes
5. work_experiences
6. education
7. skills
8. projects
9. certifications
10. languages
11. publications
12. awards
13. volunteer_work
14. email_history
15. export_history
16. rate_limits (migrate to KV instead)
17. failed_login_attempts
18. account_lockouts
19. sessions (migrate to KV instead)
20. oauth_profiles
21. user_preferences
22. job_alerts
23. application_templates
24. cover_letter_templates
25. resume_variants
26. gap_analyses

**Create migration file:**
`migrations/d1/001_initial_schema.sql`

**Validation:**
```bash
# Test migration on development D1
wrangler d1 execute jobmatch-dev --file=migrations/d1/001_initial_schema.sql

# Verify schema
wrangler d1 execute jobmatch-dev --command "SELECT name FROM sqlite_master WHERE type='table'"
```

**Deliverables:**
- D1 schema migration file (SQLite-compatible)
- Schema applied to dev/staging/prod databases
- Documentation: `docs/D1_SCHEMA_MAPPING.md` (PostgreSQL → SQLite conversion guide)

---

### Task 2.2: Migrate Rate Limiting to KV

**Status:** 🔄 Pending
**Priority:** HIGH
**Estimated Time:** 4 hours
**Agent Type:** backend-typescript-architect
**Dependencies:** 1.3, 2.1

**Action:**
Replace PostgreSQL-backed rate limiting with KV-based implementation.

**Current:** `backend/src/middleware/rateLimiter.ts` (PostgreSQL)
**Target:** `workers/api/middleware/rateLimiter.ts` (KV)

**Implementation:**
```typescript
// workers/api/middleware/rateLimiter.ts
export async function rateLimiter(
  c: Context<{ Bindings: Env }>,
  limits: { window: number; max: number; scope: string }
) {
  const userId = c.get('userId');
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const key = `ratelimit:${limits.scope}:${userId || ip}`;

  const current = await c.env.RATE_LIMITS.get(key);
  const count = current ? parseInt(current) + 1 : 1;

  if (count > limits.max) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }

  await c.env.RATE_LIMITS.put(key, count.toString(), {
    expirationTtl: limits.window
  });

  return null; // Allow request
}
```

**Validation:**
- Test rate limiting works (exceeds limit → 429)
- Test TTL expiry (wait for window to reset)
- Performance: <10ms overhead per request

**Deliverables:**
- KV-based rate limiter middleware
- Updated all route handlers to use new middleware
- 10x faster than PostgreSQL (no database roundtrip)

---

### Task 2.3: Migrate Sessions to KV

**Status:** 🔄 Pending
**Priority:** HIGH
**Estimated Time:** 3 hours
**Agent Type:** backend-typescript-architect
**Dependencies:** 1.3, 2.1

**Action:**
Move session storage from PostgreSQL `sessions` table to KV.

**Session Key Format:**
```
session:{userId}:{sessionId} → {
  userId: string,
  deviceInfo: string,
  ipAddress: string,
  lastActivity: number,
  createdAt: number
}
```

**TTL:** 30 minutes (auto-expire on inactivity)

**Implementation:**
```typescript
// workers/api/lib/sessionManager.ts
export async function createSession(
  kv: KVNamespace,
  userId: string,
  sessionId: string,
  deviceInfo: string,
  ipAddress: string
) {
  const session = {
    userId,
    deviceInfo,
    ipAddress,
    lastActivity: Date.now(),
    createdAt: Date.now()
  };

  const key = `session:${userId}:${sessionId}`;
  await kv.put(key, JSON.stringify(session), {
    expirationTtl: 1800 // 30 minutes
  });

  return session;
}

export async function updateSessionActivity(
  kv: KVNamespace,
  userId: string,
  sessionId: string
) {
  const key = `session:${userId}:${sessionId}`;
  const session = await kv.get(key, 'json');

  if (!session) return null;

  session.lastActivity = Date.now();
  await kv.put(key, JSON.stringify(session), {
    expirationTtl: 1800 // Reset 30-min TTL
  });

  return session;
}
```

**Validation:**
- Session created successfully
- Auto-expires after 30 minutes of inactivity
- Activity update resets TTL

**Deliverables:**
- KV-based session manager
- Auth middleware updated to use KV sessions
- Remove PostgreSQL `sessions` table from schema

---

### Task 2.4: Migrate OAuth States to KV

**Status:** 🔄 Pending
**Priority:** MEDIUM
**Estimated Time:** 2 hours
**Agent Type:** security-auditor
**Dependencies:** 1.3

**Action:**
Store OAuth CSRF states in KV instead of in-memory or PostgreSQL.

**Key Format:**
```
oauth:state:{stateToken} → {
  userId: string,
  provider: 'linkedin',
  redirectUri: string,
  createdAt: number
}
```

**TTL:** 10 minutes (OAuth flow must complete within 10 min)

**Implementation:**
```typescript
// workers/api/routes/auth.ts (LinkedIn OAuth)
export async function initiateLinkedInOAuth(c: Context<{ Bindings: Env }>) {
  const state = crypto.randomUUID();
  const userId = c.get('userId');

  await c.env.OAUTH_STATES.put(
    `oauth:state:${state}`,
    JSON.stringify({
      userId,
      provider: 'linkedin',
      redirectUri: c.req.query('redirect_uri'),
      createdAt: Date.now()
    }),
    { expirationTtl: 600 } // 10 minutes
  );

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?...&state=${state}`;
  return c.redirect(authUrl);
}

export async function handleLinkedInCallback(c: Context<{ Bindings: Env }>) {
  const state = c.req.query('state');
  const key = `oauth:state:${state}`;

  const oauthState = await c.env.OAUTH_STATES.get(key, 'json');
  if (!oauthState) {
    return c.json({ error: 'Invalid or expired OAuth state' }, 400);
  }

  // Delete state after use (one-time token)
  await c.env.OAUTH_STATES.delete(key);

  // Continue OAuth flow...
}
```

**Validation:**
- OAuth flow completes successfully
- State tokens expire after 10 minutes
- Used states cannot be reused (deleted after consumption)

**Deliverables:**
- KV-based OAuth state management
- CSRF protection maintained
- No in-memory state storage (survives Worker restart)

---

### Task 2.5: Create Embeddings Cache in KV

**Status:** 🔄 Pending
**Priority:** MEDIUM
**Estimated Time:** 1 hour
**Agent Type:** ai-integration-specialist
**Dependencies:** 1.3, 1.4

**Action:**
Cache job/resume embeddings in KV to avoid re-computing.

**Key Format:**
```
embedding:job:{jobId} → [0.123, -0.456, ...] (768-dim vector as JSON)
embedding:resume:{resumeId} → [0.789, -0.234, ...] (768-dim vector as JSON)
```

**TTL:** 30 days (embeddings rarely change)

**Implementation:**
```typescript
// workers/api/services/embeddings.ts
export async function getJobEmbedding(
  env: Env,
  jobId: string,
  jobText: string
): Promise<number[]> {
  const cacheKey = `embedding:job:${jobId}`;

  // Check KV cache first
  const cached = await env.EMBEDDINGS_CACHE.get(cacheKey, 'json');
  if (cached) return cached as number[];

  // Generate embedding via Workers AI
  const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: jobText
  });

  // Cache for 30 days
  await env.EMBEDDINGS_CACHE.put(cacheKey, JSON.stringify(embedding.data), {
    expirationTtl: 2592000 // 30 days
  });

  return embedding.data;
}
```

**Validation:**
- First call generates embedding (Workers AI)
- Second call returns cached embedding (KV)
- Cache hit rate >70% after initial warmup

**Deliverables:**
- Embeddings caching service
- Reduced Workers AI calls by 70%+
- Faster job matching (no re-computation)

---

## Phase 3: API Migration (Week 3-5)

**Goal:** Replace Supabase queries with D1 and implement application-layer RLS
**Duration:** 33 hours
**Dependencies:** Phase 2 complete

### Task 3.1: Create D1 Query Helpers

**Status:** 🔄 Pending
**Priority:** CRITICAL
**Estimated Time:** 1 hour
**Agent Type:** backend-typescript-architect
**Dependencies:** 2.1

**Action:**
Create reusable D1 query helpers with automatic user filtering (RLS replacement).

**File:** `workers/api/lib/secureQueries.ts`

```typescript
// Application-layer RLS replacement
export async function queryUserData<T>(
  db: D1Database,
  userId: string,
  sql: string,
  params: any[] = []
): Promise<T[]> {
  // Automatically inject userId filter to prevent cross-user data leakage
  const secureSql = sql.includes('WHERE')
    ? sql.replace('WHERE', `WHERE user_id = ? AND`)
    : sql + ` WHERE user_id = ?`;

  const result = await db.prepare(secureSql).bind(userId, ...params).all();
  return result.results as T[];
}

export async function insertUserData(
  db: D1Database,
  userId: string,
  table: string,
  data: Record<string, any>
): Promise<D1Result> {
  // Automatically inject userId to ensure ownership
  const columns = [...Object.keys(data), 'user_id'];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [...Object.values(data), userId];

  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
  return await db.prepare(sql).bind(...values).run();
}

export async function updateUserData(
  db: D1Database,
  userId: string,
  table: string,
  id: string,
  data: Record<string, any>
): Promise<D1Result> {
  // Verify ownership before update
  const setClause = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(data), userId, id];

  const sql = `UPDATE ${table} SET ${setClause} WHERE user_id = ? AND id = ?`;
  return await db.prepare(sql).bind(...values).run();
}

export async function deleteUserData(
  db: D1Database,
  userId: string,
  table: string,
  id: string
): Promise<D1Result> {
  // Verify ownership before delete
  const sql = `DELETE FROM ${table} WHERE user_id = ? AND id = ?`;
  return await db.prepare(sql).bind(userId, id).run();
}
```

**Validation:**
- Test queries return only user's own data
- Cross-user data access prevented (returns empty)
- Performance: <5ms overhead

**Deliverables:**
- Secure query helpers library
- Prevents SQL injection
- Application-layer RLS replacement

---

### Task 3.2: Replace PostgreSQL RLS with Application-Layer Security (CRITICAL PATH)

**Status:** 🔄 Pending
**Priority:** CRITICAL (SECURITY RISK)
**Estimated Time:** 12 hours
**Agent Type:** security-auditor + backend-typescript-architect
**Dependencies:** 3.1

**Action:**
Audit all 184 RLS policies and replace with application-layer checks.

**Current:** PostgreSQL RLS policies enforce `auth.uid() = user_id`
**Target:** Application code enforces `c.get('userId') === row.user_id`

**Critical Files:**
- `workers/api/routes/applications.ts`
- `workers/api/routes/jobs.ts`
- `workers/api/routes/resume.ts`
- `workers/api/routes/profile.ts`
- `workers/api/routes/exports.ts`
- `workers/api/routes/emails.ts`

**Example Conversion:**
```typescript
// BEFORE (Supabase RLS)
const { data } = await supabase
  .from('applications')
  .select('*')
  .eq('id', applicationId);
// RLS automatically filters by auth.uid()

// AFTER (D1 + application-layer)
const userId = c.get('userId');
const result = await queryUserData(
  c.env.DB,
  userId,
  'SELECT * FROM applications WHERE id = ?',
  [applicationId]
);
// Manually enforce user ownership
```

**Security Checklist:**
- [ ] All SELECT queries filter by userId
- [ ] All INSERT queries set userId
- [ ] All UPDATE queries verify userId ownership
- [ ] All DELETE queries verify userId ownership
- [ ] No raw queries bypass security helpers
- [ ] Test cross-user access prevention
- [ ] Test SQL injection prevention
- [ ] Test privilege escalation attempts

**Validation:**
- Create 2 test users in D1
- User A creates application
- User B attempts to access User A's application (should fail)
- User B attempts to update User A's application (should fail)
- User B attempts to delete User A's application (should fail)

**Deliverables:**
- All routes use secure query helpers
- Security audit report: `docs/D1_RLS_AUDIT.md`
- Zero cross-user data leakage vulnerabilities

**⚠️ RISK:** User data leakage if not implemented correctly
**Mitigation:** Double-check by security-auditor + code-reviewer

---

### Task 3.3: Migrate 32 Endpoints from Supabase to D1 (CRITICAL PATH)

**Status:** 🔄 Pending
**Priority:** CRITICAL
**Estimated Time:** 20 hours
**Agent Type:** backend-typescript-architect
**Dependencies:** 3.2

**Action:**
Replace all Supabase queries with D1 queries across 32 endpoints.

**Endpoints to migrate:**

**Applications (8 endpoints):**
1. `POST /api/applications/generate` - Generate AI resume/cover letter
2. `GET /api/applications` - List user applications
3. `GET /api/applications/:id` - Get single application
4. `PATCH /api/applications/:id` - Update application
5. `DELETE /api/applications/:id` - Delete application
6. `POST /api/applications/:id/email` - Send application email
7. `GET /api/applications/:id/history` - Get application history
8. `POST /api/applications/:id/duplicate` - Duplicate application

**Jobs (7 endpoints):**
9. `GET /api/jobs` - List jobs with filters
10. `GET /api/jobs/:id` - Get single job
11. `POST /api/jobs` - Create job
12. `PATCH /api/jobs/:id` - Update job (save/archive)
13. `DELETE /api/jobs/:id` - Delete job
14. `POST /api/jobs/scrape` - Scrape jobs via Apify
15. `GET /api/jobs/saved` - Get saved jobs

**Resume (7 endpoints):**
16. `POST /api/resume/parse` - Parse resume via Vision API
17. `GET /api/resume` - Get user resume/profile
18. `PATCH /api/resume` - Update resume/profile
19. `POST /api/resume/analyze-gaps` - Analyze resume gaps
20. `GET /api/resume/gap-analysis/:id` - Get gap analysis
21. `PATCH /api/resume/gap-analysis/:id/answer` - Answer gap question
22. `GET /api/resume/gap-analyses` - List all gap analyses

**Profile (4 endpoints):**
23. `GET /api/profile` - Get user profile
24. `PATCH /api/profile` - Update user profile
25. `POST /api/profile/avatar` - Upload avatar to R2
26. `DELETE /api/profile/avatar` - Delete avatar from R2

**Exports (3 endpoints):**
27. `POST /api/exports/pdf` - Export as PDF (client-side)
28. `POST /api/exports/docx` - Export as DOCX (client-side)
29. `POST /api/exports/text` - Export as plain text

**Emails (2 endpoints):**
30. `POST /api/emails/send` - Send email via SendGrid
31. `GET /api/emails/history` - Get email history

**Analytics (1 endpoint):**
32. `GET /api/analytics` - Get user analytics

**Conversion Pattern:**
```typescript
// BEFORE (Supabase)
const { data, error } = await supabase
  .from('applications')
  .select('*, jobs(*)')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

// AFTER (D1)
const userId = c.get('userId');
const applications = await queryUserData(
  c.env.DB,
  userId,
  `SELECT a.*, j.*
   FROM applications a
   LEFT JOIN jobs j ON a.job_id = j.id
   ORDER BY a.created_at DESC`
);
```

**Validation:**
- Test each endpoint with authenticated user
- Test cross-user access prevention
- Test error handling (invalid IDs, missing data)
- Performance: <100ms p95 response time

**Deliverables:**
- All 32 endpoints migrated to D1
- Zero Supabase dependencies remaining
- Integration tests passing

---

## Phase 4: Security & Testing (Week 5-6)

**Goal:** Comprehensive security audit and testing
**Duration:** 15 hours
**Dependencies:** Phase 3 complete

### Task 4.1: Security Audit

**Status:** 🔄 Pending
**Priority:** CRITICAL
**Estimated Time:** 6 hours
**Agent Type:** security-auditor
**Dependencies:** Phase 3 complete

**Action:**
Comprehensive security review of migrated codebase.

**Audit Checklist:**
- [ ] **Authentication:** JWT verification on all protected routes
- [ ] **Authorization:** User ownership checks on all data operations
- [ ] **Rate Limiting:** All AI/email/export endpoints rate-limited
- [ ] **Input Validation:** Zod schemas on all request bodies
- [ ] **SQL Injection:** No raw SQL queries, all use parameterized queries
- [ ] **XSS Prevention:** All user input sanitized before storage
- [ ] **CSRF Protection:** OAuth states use cryptographically random tokens
- [ ] **Session Security:** 30-min TTL, auto-refresh, device tracking
- [ ] **Secrets Management:** No secrets in code, all in wrangler secrets
- [ ] **CORS:** Only whitelisted origins allowed
- [ ] **Error Handling:** No sensitive info in error messages

**Deliverables:**
- Security audit report: `docs/CLOUDFLARE_SECURITY_AUDIT.md`
- List of vulnerabilities (if any)
- Remediation plan for each vulnerability

---

### Task 4.2: Integration Testing

**Status:** 🔄 Pending
**Priority:** HIGH
**Estimated Time:** 6 hours
**Agent Type:** test-automator
**Dependencies:** Phase 3 complete

**Action:**
Create comprehensive integration tests for all 32 endpoints.

**Test Coverage:**
- [ ] Authentication flows (login, token refresh, logout)
- [ ] CRUD operations for all resources
- [ ] AI generation (resume, cover letter, job matching)
- [ ] File uploads to R2 (avatars, resume PDFs)
- [ ] Email sending via SendGrid
- [ ] OAuth flows (LinkedIn)
- [ ] Rate limiting enforcement
- [ ] Error handling (4xx, 5xx)
- [ ] Cross-user access prevention

**Test File:** `workers/api/__tests__/integration.test.ts`

**Validation:**
```bash
cd /home/carl/application-tracking/jobmatch-ai/workers
npm test
```

**Deliverables:**
- 100+ integration tests
- >80% code coverage
- All tests passing

---

### Task 4.3: Performance Testing

**Status:** 🔄 Pending
**Priority:** MEDIUM
**Estimated Time:** 3 hours
**Agent Type:** performance-optimizer
**Dependencies:** Phase 3 complete

**Action:**
Benchmark all endpoints and optimize slow queries.

**Performance Targets:**
- P50: <50ms
- P95: <200ms
- P99: <500ms
- AI generation: <5s
- PDF parsing: <10s

**Tools:**
- `wrangler tail` for real-time logs
- Cloudflare Analytics for metrics
- Custom benchmarking script

**Deliverables:**
- Performance report: `docs/CLOUDFLARE_PERFORMANCE_REPORT.md`
- Optimizations implemented (indexes, caching, query improvements)
- All targets met

---

## Phase 5: Deployment & Monitoring (Week 6-7)

**Goal:** Deploy to production and monitor for 48 hours
**Duration:** 62 hours (includes 48h monitoring)
**Dependencies:** Phase 4 complete

### Task 5.1: Create CI/CD Pipeline (CRITICAL PATH)

**Status:** 🔄 Pending
**Priority:** CRITICAL
**Estimated Time:** 12 hours
**Agent Type:** deployment-engineer
**Dependencies:** Phase 4 complete

**Action:**
Create GitHub Actions workflows for multi-environment deployment.

**File:** `.github/workflows/deploy-workers.yml`

```yaml
name: Deploy Cloudflare Workers

on:
  push:
    branches:
      - develop   # Deploy to development
      - staging   # Deploy to staging
      - main      # Deploy to production
    paths:
      - 'workers/**'
      - 'migrations/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: |
          cd workers
          npm ci

      - name: Run tests
        run: |
          cd workers
          npm test

      - name: Type check
        run: |
          cd workers
          npm run typecheck

      - name: Deploy to Development
        if: github.ref == 'refs/heads/develop'
        run: |
          cd workers
          npx wrangler deploy --env development
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Deploy to Staging
        if: github.ref == 'refs/heads/staging'
        run: |
          cd workers
          npx wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Deploy to Production
        if: github.ref == 'refs/heads/main'
        run: |
          cd workers
          npx wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Run D1 Migrations
        run: |
          cd workers
          if [ "${{ github.ref }}" == "refs/heads/develop" ]; then
            npx wrangler d1 migrations apply jobmatch-dev
          elif [ "${{ github.ref }}" == "refs/heads/staging" ]; then
            npx wrangler d1 migrations apply jobmatch-staging
          elif [ "${{ github.ref }}" == "refs/heads/main" ]; then
            npx wrangler d1 migrations apply jobmatch-prod
          fi
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

**Validation:**
- Push to `develop` → deploys to development environment
- Push to `staging` → deploys to staging environment
- Push to `main` → deploys to production environment
- D1 migrations run automatically

**Deliverables:**
- CI/CD pipeline operational
- Automated deployments working
- Zero manual deployment steps

---

### Task 5.2: Deploy Frontend to Cloudflare Pages

**Status:** 🔄 Pending
**Priority:** HIGH
**Estimated Time:** 2 hours
**Agent Type:** frontend-design + deployment-engineer
**Dependencies:** 5.1

**Action:**
Deploy React frontend to Cloudflare Pages.

**Steps:**
1. Connect GitHub repo to Cloudflare Pages
2. Configure build settings:
   - Build command: `npm run build`
   - Build output: `dist`
   - Root directory: `/`
3. Set environment variables:
   - `VITE_API_URL` = Workers production URL
   - `VITE_SUPABASE_URL` = (for auth only, will remove later)
   - `VITE_SUPABASE_ANON_KEY` = (for auth only, will remove later)
4. Deploy

**Validation:**
- Frontend loads successfully
- API calls reach Workers backend
- Authentication works

**Deliverables:**
- Frontend deployed to Cloudflare Pages
- Custom domain configured (optional)
- HTTPS enabled

---

### Task 5.3: Production Deployment (CRITICAL PATH)

**Status:** 🔄 Pending
**Priority:** CRITICAL
**Estimated Time:** 10 hours (includes validation)
**Agent Type:** deployment-engineer + observability-specialist
**Dependencies:** 5.1, 5.2

**Action:**
Deploy to production and validate all functionality.

**Deployment Checklist:**
- [ ] All wrangler secrets configured in production
- [ ] D1 production database has schema applied
- [ ] All KV namespaces operational
- [ ] R2 buckets configured with CORS
- [ ] Vectorize index ready
- [ ] AI Gateway configured
- [ ] Frontend points to production Workers URL
- [ ] DNS records updated (if custom domain)

**Post-Deployment Validation:**
- [ ] Health check endpoint returns 200
- [ ] User registration works
- [ ] User login works
- [ ] Profile creation works
- [ ] Resume parsing works (PDF upload)
- [ ] Job search works
- [ ] AI generation works (resume/cover letter)
- [ ] Job matching works (10-dimension scoring)
- [ ] Email sending works (SendGrid)
- [ ] LinkedIn OAuth works
- [ ] File uploads work (avatars to R2)
- [ ] Rate limiting enforces limits
- [ ] Session management works (30-min TTL)

**Rollback Plan:**
If production deployment fails:
1. Revert to Railway backend (still running in parallel)
2. Update frontend to point back to Railway URL
3. Investigate issues in staging environment
4. Fix and redeploy

**Deliverables:**
- Production deployment successful
- All validation checks passing
- Rollback plan tested (dry run)

---

### Task 5.4: 48-Hour Monitoring (CRITICAL PATH)

**Status:** 🔄 Pending
**Priority:** CRITICAL
**Estimated Time:** 48 hours (continuous monitoring)
**Agent Type:** observability-specialist
**Dependencies:** 5.3

**Action:**
Monitor production for 48 hours to ensure stability.

**Monitoring Dashboards:**
1. **Cloudflare Workers Analytics:**
   - Request volume
   - Error rate
   - Response time (p50, p95, p99)
   - CPU time usage
   - Invocations count

2. **D1 Analytics:**
   - Query count
   - Query latency
   - Database size
   - Read/write ratio

3. **KV Analytics:**
   - Read operations
   - Write operations
   - Cache hit rate
   - Storage usage

4. **R2 Analytics:**
   - Storage usage
   - Request count
   - Bandwidth usage
   - Error rate

5. **AI Gateway Analytics:**
   - OpenAI requests
   - Cache hit rate
   - Cost savings
   - Latency

**Success Criteria:**
- [ ] Error rate <1%
- [ ] P95 response time <500ms
- [ ] Zero security incidents
- [ ] Zero data loss incidents
- [ ] Cache hit rate >60%
- [ ] AI Gateway cost savings >50%

**Incident Response:**
If any metric fails:
1. Immediate rollback to Railway
2. Root cause analysis
3. Fix in staging
4. Redeploy to production

**Deliverables:**
- 48-hour monitoring report
- All success criteria met
- Production declared stable

---

## Phase 6: Decommissioning (Week 7-8)

**Goal:** Shut down Railway and Supabase
**Duration:** 4 hours
**Dependencies:** Phase 5 complete (48h monitoring successful)

### Task 6.1: Backup Railway Data

**Status:** 🔄 Pending
**Priority:** HIGH
**Estimated Time:** 2 hours
**Agent Type:** database-architect
**Dependencies:** Phase 5 complete

**Action:**
Final backup of Railway PostgreSQL before shutdown.

**Steps:**
1. Export PostgreSQL database to SQL dump
2. Export all Supabase Storage files (avatars, resumes, exports)
3. Store backups in R2 bucket: `jobmatch-backups`
4. Verify backup integrity

**Validation:**
- SQL dump imports successfully to local PostgreSQL
- All files accessible in R2 backup bucket

**Deliverables:**
- Complete data backup in R2
- Backup restore procedure documented

---

### Task 6.2: Decommission Railway

**Status:** 🔄 Pending
**Priority:** MEDIUM
**Estimated Time:** 1 hour
**Agent Type:** deployment-engineer
**Dependencies:** 6.1

**Action:**
Shut down Railway backend.

**Steps:**
1. Pause Railway backend service
2. Wait 24 hours (final validation period)
3. Delete Railway backend service
4. Cancel Railway subscription

**Cost Savings:** ~$50/month

**Deliverables:**
- Railway backend deleted
- Subscription canceled
- Cost savings verified

---

### Task 6.3: Decommission Supabase

**Status:** 🔄 Pending
**Priority:** MEDIUM
**Estimated Time:** 1 hour
**Agent Type:** deployment-engineer
**Dependencies:** 6.1

**Action:**
Downgrade or delete Supabase project.

**Steps:**
1. Export final database snapshot
2. Export all storage files
3. Downgrade to free tier (keep for auth only) OR delete project entirely
4. Cancel Supabase subscription (if fully migrating auth)

**Decision:** Keep Supabase for auth (free tier) or migrate auth to Cloudflare Access?

**If keeping Supabase Auth (recommended for now):**
- Downgrade to free tier
- Delete all tables (keep auth.users only)
- Delete all storage buckets
- Cost: $0/month

**If migrating auth to Cloudflare Access:**
- Full Supabase deletion
- Migrate auth.users to D1
- Implement JWT signing in Workers
- Cost: $0/month

**Deliverables:**
- Supabase subscription canceled or downgraded
- Cost savings verified ($25/month)

---

## Critical Path Tasks

These tasks determine the minimum timeline (must be sequential):

```
1.1 (0.25h) → 1.2 (0.5h) → 2.1 (8h) → 3.1 (1h) → 3.2 (12h) → 3.3 (20h) → 5.1 (12h) → 5.3 (10h) → 6.1 (2h) → 6.2 (1h) → 6.3 (1h)
```

**Total critical path:** 67.75 hours + 48h monitoring = **115.75 hours minimum**

**Parallelizable work:** 52.25 hours (can be done concurrently with critical path)

**Total effort:** 168 hours (4 weeks full-time, 8 weeks part-time)

---

## Risk Mitigation

### High-Risk Tasks

| Task | Risk | Mitigation |
|------|------|------------|
| **3.2: RLS Replacement** | User data leakage | Double-check by security-auditor, integration tests with 2 users, audit all queries |
| **3.3: Migrate 32 Endpoints** | Breaking changes | Deploy to staging first, run full integration tests, gradual rollout |
| **5.3: Production Deployment** | Service outage | Keep Railway running in parallel, instant rollback plan, phased traffic migration |
| **2.1: D1 Schema Design** | Data type incompatibility | SQLite testing, PostgreSQL→SQLite conversion guide, validate all queries |

### Rollback Procedures

**If production deployment fails:**
1. Keep Railway backend running during migration
2. Frontend points to Railway URL initially
3. Switch frontend to Workers URL only after validation
4. If issues, switch frontend back to Railway URL (instant rollback)
5. Fix issues in staging, redeploy

**If data loss detected:**
1. Restore from Railway/Supabase backups (Task 6.1)
2. Re-run D1 migrations
3. Investigate root cause

---

## Success Metrics

**Migration Complete When:**
- ✅ All 32 endpoints migrated to D1
- ✅ All 18 KV namespaces operational
- ✅ All 3 R2 buckets operational
- ✅ Vectorize index operational
- ✅ AI Gateway operational (>50% cost savings)
- ✅ Production deployment successful
- ✅ 48h monitoring: <1% error rate, <500ms p95
- ✅ Cost: $7-12/month (88-91% reduction verified)
- ✅ Railway decommissioned
- ✅ Supabase downgraded or decommissioned

**Final Cost Breakdown:**
- Workers Paid Plan: $5/month
- D1 usage: $0 (under free tier: 25 GB, 50M reads, 5M writes)
- KV usage: $0.50/month (18 namespaces × $0.50 = $9, but likely under free tier)
- R2 usage: $0.50/month (10 GB storage, 1M reads)
- Vectorize usage: $0 (under free tier: 30M vector dimensions, 5M queries)
- AI Gateway usage: $1-6/month (OpenAI API costs, 50-80% reduction via caching)

**Total: $7-12/month (vs $75/month = 88-91% savings)**

---

## Next Steps

1. **Create progress tracker:** `docs/MIGRATION_PROGRESS.md`
2. **Begin Phase 1, Task 1.1:** Update Wrangler to v4
3. **Execute tasks sequentially** respecting dependencies
4. **Report progress** after each phase
5. **Escalate blockers** immediately

---

**END OF TASK PLAN**
