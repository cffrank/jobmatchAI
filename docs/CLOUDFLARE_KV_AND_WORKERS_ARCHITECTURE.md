# Cloudflare KV and Workers Architecture Analysis

**JobMatch AI - KV Namespace Design & Workers Refactoring Strategy**

**Document Version:** 1.0
**Date:** December 31, 2025
**Status:** Architecture Recommendation
**Author:** Cloud Infrastructure Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [KV vs D1 Database Decision Matrix](#kv-vs-d1-database-decision-matrix)
3. [Recommended KV Namespace Design](#recommended-kv-namespace-design)
4. [Current Workers Architecture Analysis](#current-workers-architecture-analysis)
5. [Workers Splitting Strategy](#workers-splitting-strategy)
6. [Refactoring Plan](#refactoring-plan)
7. [Code Examples](#code-examples)
8. [Cost Implications](#cost-implications)
9. [Performance Analysis](#performance-analysis)
10. [Updated Migration Timeline](#updated-migration-timeline)

---

## Executive Summary

### Key Findings

After analyzing the current Workers implementation (`workers/`) and the comprehensive migration plan, here are the critical architectural recommendations:

**Current State:**
- **Monolithic Worker** with 18 endpoints in a single `workers/api/index.ts`
- **In-memory rate limiting** (resets on deployment)
- **PostgreSQL-backed rate limiting** (from Express backend)
- **1 KV namespace** (JOB_ANALYSIS_CACHE) for caching AI analyses
- **No session storage** in KV (still using PostgreSQL)

**Recommended Changes:**
1. **Keep monolithic Worker** (don't split) for pre-alpha stage
2. **Add 3 more KV namespaces**: SESSIONS, RATE_LIMITS, OAUTH_STATES
3. **Migrate rate limiting from PostgreSQL to KV** (faster, cheaper)
4. **Migrate sessions from PostgreSQL to KV** (reduce database load)
5. **Consider future splitting** once hitting 50k requests/day

### KV vs D1 Decision Summary

| Data Type | Storage | Reasoning |
|-----------|---------|-----------|
| **Sessions** | ✅ KV | TTL-based expiry, high read/write, ephemeral |
| **Rate Limits** | ✅ KV | High write frequency, auto-expire, per-IP/user |
| **OAuth States** | ✅ KV | Temporary (10 min TTL), CSRF protection |
| **AI Analysis Cache** | ✅ KV | Already implemented, 7-day TTL |
| **User Preferences** | ❌ D1 | Needs complex queries, permanent storage |
| **Job Data** | ❌ D1 | Relational, searchable, permanent |
| **Applications** | ❌ D1 | Relational, permanent, complex queries |

### Workers Architecture Recommendation

**Decision: Keep Monolithic Worker**

**Justification:**
- ✅ **Pre-alpha stage** - no traffic to warrant splitting
- ✅ **Simpler deployment** - one Worker, one pipeline
- ✅ **Shared middleware** - auth, rate limiting, CORS
- ✅ **Cost efficiency** - $5/month base (vs $5 per Worker)
- ✅ **Easier debugging** - single logs stream
- ⚠️ **Future-ready** - can split when needed (>50k req/day)

**When to split (future):**
- **Traffic:** >50,000 requests/day
- **Deployment:** Need independent rollouts per service
- **Scaling:** Different CPU/memory requirements per endpoint
- **Team:** Multiple teams working on different APIs

---

## KV vs D1 Database Decision Matrix

### Decision Framework

Use this framework to decide KV vs D1 for each data type:

```
┌─────────────────────────────────────────────────────────────┐
│                    KV Namespace                             │
│  Use when:                                                  │
│  ✅ High write frequency (>1000/min)                        │
│  ✅ TTL-based expiry needed                                 │
│  ✅ Simple key-value lookups                                │
│  ✅ Global edge caching desired                             │
│  ✅ Ephemeral data (sessions, cache)                        │
│  ✅ Per-user/per-IP data (rate limits)                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    D1 Database                              │
│  Use when:                                                  │
│  ✅ Relational data (foreign keys)                          │
│  ✅ Complex queries (JOIN, GROUP BY)                        │
│  ✅ Permanent storage required                              │
│  ✅ ACID transactions needed                                │
│  ✅ Full-text search (FTS5)                                 │
│  ✅ Data integrity constraints                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Model Analysis

Analyzing all 26 PostgreSQL tables from `src/types/supabase.ts`:

#### ✅ Migrate to KV (4 tables)

| Table | Current | Migrate to KV? | KV Namespace | TTL | Reasoning |
|-------|---------|----------------|--------------|-----|-----------|
| **sessions** | PostgreSQL | ✅ YES | SESSIONS | 7 days | High read/write, expires_at already set, perfect for KV |
| **rate_limits** | PostgreSQL | ✅ YES | RATE_LIMITS | 1 hour | High write frequency, window-based expiry |
| **oauth_states** | PostgreSQL | ✅ YES | OAUTH_STATES | 10 min | Temporary CSRF tokens, short TTL |
| **failed_login_attempts** | PostgreSQL | ⚠️ MAYBE | LOGIN_ATTEMPTS | 15 min | Could use KV with counter, but D1 better for audit trail |

#### ❌ Keep in D1 (22 tables)

| Table | Reason to Keep in D1 |
|-------|---------------------|
| **users** | Core relational table, referenced by 20+ foreign keys |
| **jobs** | Complex queries (FTS5, filters), relational joins |
| **applications** | Foreign keys to jobs + users, permanent records |
| **work_experience** | Relational (user_id FK), needs ordering/filtering |
| **education** | Relational (user_id FK), permanent records |
| **skills** | Relational (user_id FK), proficiency tracking |
| **job_preferences** | Complex array queries, permanent preferences |
| **resumes** | JSONB sections, permanent storage |
| **email_history** | Audit trail, needs querying by user/date |
| **notifications** | Read/unread state, needs queries |
| **tracked_applications** | Complex status tracking, interviews, offers |
| **invoices** | Financial records, audit trail |
| **subscriptions** | Billing data, permanent records |
| **payment_methods** | Financial data, permanent storage |
| **usage_limits** | Period tracking, complex queries |
| **account_lockouts** | Audit trail, unlocking requires queries |
| **security_events** | Audit log, needs filtering/searching |
| **job_compatibility_analyses** | Large JSON, needs user + job lookups |
| **job_feedback** | Analytics data, aggregation queries |
| **job_duplicates** | Relational (canonical job references) |
| **canonical_job_metadata** | Quality scores, needs aggregation |
| **match_quality_metrics** | Analytics, period-based queries |
| **spam_reports** | Audit trail, moderation workflow |

#### 🆕 New KV-Only Data (Not in PostgreSQL)

| Data Type | KV Namespace | TTL | Purpose |
|-----------|--------------|-----|---------|
| **AI Analysis Cache** | JOB_ANALYSIS_CACHE | 7 days | Already implemented, cache expensive GPT-4 analyses |
| **Embeddings Cache** | EMBEDDINGS_CACHE | 30 days | Cache Workers AI embeddings to reduce compute |
| **API Response Cache** | API_CACHE | 5 min | Cache GET /jobs, /applications responses |

---

## Recommended KV Namespace Design

### KV Namespace Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              CLOUDFLARE KV NAMESPACES (6 Total)             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. SESSIONS                    4. JOB_ANALYSIS_CACHE      │
│     ├─ session:{sessionId}         ├─ analysis:{userId}:{jobId} │
│     ├─ TTL: 7 days                 └─ TTL: 7 days             │
│     └─ ~100 KB/session                                      │
│                                                             │
│  2. RATE_LIMITS                 5. EMBEDDINGS_CACHE        │
│     ├─ rate:{userId}:{endpoint}    ├─ embed:{text-hash}    │
│     ├─ rate:ip:{ipAddress}         ├─ TTL: 30 days         │
│     ├─ TTL: 1 hour                 └─ ~6 KB/embedding      │
│     └─ ~100 bytes/entry                                    │
│                                                             │
│  3. OAUTH_STATES                6. API_CACHE               │
│     ├─ oauth:{state}               ├─ api:{route}:{userId}:{hash} │
│     ├─ TTL: 10 min                 ├─ TTL: 5 min           │
│     └─ ~500 bytes/state            └─ ~50 KB/response      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Detailed Namespace Specifications

#### 1. SESSIONS (New)

**Purpose:** User session management, replacing PostgreSQL `sessions` table

**Key Format:**
```
session:{sessionId}
```

**Value Schema:**
```typescript
interface SessionValue {
  userId: string;
  sessionId: string;
  createdAt: string;      // ISO timestamp
  lastActive: string;     // ISO timestamp
  expiresAt: string;      // ISO timestamp
  ipAddress: string;
  userAgent: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser?: string;
  os?: string;
  location?: string;      // City, Country
  device?: string;        // Device model
}
```

**TTL:** 7 days (JWT expiry)

**Usage Estimate:**
- 100 sessions × 1 KB = 100 KB storage
- 1,000 reads/day = 30K reads/month (FREE tier: 10M)
- 100 writes/day = 3K writes/month (FREE tier: 1M)

**Migration from PostgreSQL:**
```typescript
// BEFORE (PostgreSQL):
await supabaseAdmin.from('sessions').insert({
  user_id: userId,
  session_id: sessionId,
  expires_at: expiresAt,
  ip_address: ipAddress,
  user_agent: userAgent,
  device_type: deviceType
});

// AFTER (KV):
await env.SESSIONS.put(
  `session:${sessionId}`,
  JSON.stringify({
    userId,
    sessionId,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    expiresAt,
    ipAddress,
    userAgent,
    deviceType
  }),
  {
    expirationTtl: 7 * 24 * 60 * 60, // 7 days in seconds
    metadata: { userId } // For listing user sessions
  }
);
```

**Benefits:**
- ✅ **Faster reads** (edge cache vs DB query)
- ✅ **Automatic expiry** (no cleanup job needed)
- ✅ **Reduced DB load** (high read frequency)
- ✅ **Global distribution** (edge caching)

---

#### 2. RATE_LIMITS (New)

**Purpose:** Rate limiting, replacing PostgreSQL `rate_limits` table + in-memory Map

**Key Formats:**
```
rate:user:{userId}:{endpoint}      // User-based limits
rate:ip:{ipAddress}:{endpoint}     // IP-based limits
```

**Value Schema:**
```typescript
interface RateLimitValue {
  count: number;
  windowStart: number;    // Unix timestamp (ms)
  windowEnd: number;      // Unix timestamp (ms)
  endpoint: string;
  identifier: string;     // userId or IP
}
```

**TTL:** 1 hour (max window duration)

**Usage Estimate:**
- 500 users × 5 endpoints = 2,500 keys
- 10,000 requests/day = 300K reads/month (FREE tier: 10M)
- 10,000 writes/day = 300K writes/month (FREE tier: 1M)

**Migration from PostgreSQL + In-Memory:**
```typescript
// BEFORE (PostgreSQL - backend/src/middleware/rateLimiter.ts):
const { data: existingRecord } = await supabaseAdmin
  .from('rate_limits')
  .select('*')
  .eq('user_id', userId)
  .eq('endpoint', endpoint)
  .gte('window_start', windowStart.toISOString())
  .single();

// AFTER (KV - workers/api/middleware/rateLimiter.ts):
const key = `rate:user:${userId}:${endpoint}`;
const existing = await env.RATE_LIMITS.get(key, { type: 'json' });

if (!existing) {
  // First request in window
  await env.RATE_LIMITS.put(
    key,
    JSON.stringify({
      count: 1,
      windowStart: now,
      windowEnd: now + windowMs,
      endpoint,
      identifier: userId
    }),
    { expirationTtl: Math.ceil(windowMs / 1000) }
  );
} else if (existing.count >= maxRequests) {
  // Rate limit exceeded
  throw new HttpError(429, 'Rate limit exceeded');
} else {
  // Increment counter (atomic operation not guaranteed in KV)
  await env.RATE_LIMITS.put(
    key,
    JSON.stringify({ ...existing, count: existing.count + 1 }),
    { expirationTtl: Math.ceil((existing.windowEnd - now) / 1000) }
  );
}
```

**Concurrency Warning:**
⚠️ **KV is eventually consistent** (not atomic). For strict rate limiting, consider:
1. **Acceptable risk:** Occasional over-limit is OK (< 1% of requests)
2. **Durable Objects:** Use for strict atomic counters (adds complexity + cost)
3. **Hybrid approach:** KV for most endpoints, Durable Objects for critical (e.g., payments)

**Benefits vs PostgreSQL:**
- ✅ **10x faster** (edge KV vs DB round-trip)
- ✅ **Automatic expiry** (no cleanup job)
- ✅ **Lower database load** (high write frequency)
- ⚠️ **Eventually consistent** (acceptable for rate limiting)

**Benefits vs In-Memory Map:**
- ✅ **Survives deployments** (in-memory resets)
- ✅ **Multi-instance safe** (in-memory is per-isolate)
- ✅ **Persistent tracking** (better abuse detection)

---

#### 3. OAUTH_STATES (New)

**Purpose:** OAuth CSRF state tokens, replacing PostgreSQL `oauth_states` table

**Key Format:**
```
oauth:{state}
```

**Value Schema:**
```typescript
interface OAuthStateValue {
  state: string;
  userId?: string;        // Optional if authenticated
  provider: 'linkedin';   // Extensible for future providers
  redirectUri: string;
  createdAt: string;
  expiresAt: string;
}
```

**TTL:** 10 minutes (OAuth flow timeout)

**Usage Estimate:**
- 10 OAuth flows/day = 300 writes/month (FREE tier: 1M)
- 10 reads/day = 300 reads/month (FREE tier: 10M)

**Migration from PostgreSQL:**
```typescript
// BEFORE (PostgreSQL - backend/src/routes/auth.ts):
await supabaseAdmin.from('oauth_states').insert({
  user_id: userId,
  provider: 'linkedin',
  state,
  expires_at: expiresAt.toISOString(),
  created_at: new Date().toISOString()
});

// Verify state:
const { data: stateRecord } = await supabaseAdmin
  .from('oauth_states')
  .select('*')
  .eq('state', state)
  .eq('provider', 'linkedin')
  .single();

// Delete after use:
await supabaseAdmin.from('oauth_states').delete().eq('id', stateRecord.id);

// AFTER (KV - workers/api/routes/auth.ts):
// Store state
await env.OAUTH_STATES.put(
  `oauth:${state}`,
  JSON.stringify({
    state,
    userId,
    provider: 'linkedin',
    redirectUri: LINKEDIN_REDIRECT_URI,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  }),
  { expirationTtl: 10 * 60 } // 10 minutes
);

// Verify state
const stateData = await env.OAUTH_STATES.get(`oauth:${state}`, { type: 'json' });
if (!stateData) {
  throw new HttpError(400, 'Invalid or expired OAuth state');
}

// Delete after use (automatic via TTL, but can delete immediately)
await env.OAUTH_STATES.delete(`oauth:${state}`);
```

**Benefits:**
- ✅ **Automatic expiry** (no cleanup job)
- ✅ **Faster lookups** (edge cache)
- ✅ **Simpler code** (no DB queries)
- ✅ **Self-cleaning** (TTL handles expired states)

---

#### 4. JOB_ANALYSIS_CACHE (Existing)

**Purpose:** Cache expensive AI-generated job compatibility analyses

**Status:** ✅ Already implemented in `workers/wrangler.toml`

**Key Format:**
```
job-analysis:{userId}:{jobId}
```

**Value Schema:**
```typescript
interface JobAnalysisCache {
  analysis: {
    matchScore: number;
    matchPercentage: number;
    matchLevel: 'excellent' | 'good' | 'fair' | 'poor';
    skillsMatch: { matched: string[]; missing: string[] };
    experienceMatch: { required: number; candidate: number; meets: boolean };
    // ... full compatibility analysis
  };
  cachedAt: string;
  expiresAt: string;
}
```

**TTL:** 7 days

**Cost Savings:**
- GPT-4 analysis: $0.01 per request
- Cache hit rate: 60-70% (user views same job multiple times)
- Savings: ~$200/month at 20K analyses/month

**Current Implementation:** `workers/api/services/jobAnalysisCache.ts`

✅ No changes needed - keep as-is

---

#### 5. EMBEDDINGS_CACHE (New - Optional)

**Purpose:** Cache Workers AI text embeddings to reduce compute

**Key Format:**
```
embed:{sha256(text)}
```

**Value Schema:**
```typescript
interface EmbeddingCache {
  text: string;           // Original text (for verification)
  embedding: number[];    // 768-dim vector from @cf/baai/bge-base-en-v1.5
  model: string;          // '@cf/baai/bge-base-en-v1.5'
  createdAt: string;
}
```

**TTL:** 30 days

**Usage Estimate:**
- 1,000 unique texts × 6 KB = 6 MB storage (FREE tier: 1 GB)
- Cache hit rate: 40% (job descriptions are reused)
- Compute savings: 40% reduction in Workers AI requests

**Implementation:**
```typescript
async function getCachedEmbedding(
  text: string,
  env: Env
): Promise<number[]> {
  // Generate cache key from text hash
  const textHash = await sha256(text);
  const cacheKey = `embed:${textHash}`;

  // Try cache first
  const cached = await env.EMBEDDINGS_CACHE.get(cacheKey, { type: 'json' });
  if (cached) {
    return cached.embedding;
  }

  // Generate new embedding
  const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text });
  const embedding = result.data[0];

  // Cache for 30 days
  await env.EMBEDDINGS_CACHE.put(
    cacheKey,
    JSON.stringify({
      text: text.substring(0, 500), // Store snippet for verification
      embedding,
      model: '@cf/baai/bge-base-en-v1.5',
      createdAt: new Date().toISOString()
    }),
    { expirationTtl: 30 * 24 * 60 * 60 }
  );

  return embedding;
}
```

**Benefits:**
- ✅ **Faster responses** (cache hit ~5ms vs compute ~200ms)
- ✅ **Reduced Workers AI costs** (40% reduction)
- ✅ **Lower CPU usage** (cache hits don't count toward CPU limits)

---

#### 6. API_CACHE (New - Optional)

**Purpose:** Cache expensive API responses (e.g., GET /jobs with filters)

**Key Format:**
```
api:{route}:{userId}:{queryHash}
```

**Value Schema:**
```typescript
interface ApiCacheValue {
  response: any;          // Serialized response body
  headers: Record<string, string>;
  statusCode: number;
  cachedAt: string;
}
```

**TTL:** 5 minutes (balance freshness vs cost)

**Usage Estimate:**
- 100 unique query combinations/user = 10K keys
- Cache hit rate: 30% (users refresh/paginate)
- Response time improvement: 500ms → 50ms (10x faster)

**Implementation:**
```typescript
export async function cacheableApiHandler(
  route: string,
  handler: (c: Context) => Promise<Response>,
  ttl: number = 5 * 60 // 5 minutes
): MiddlewareHandler {
  return async (c, next) => {
    const userId = c.get('userId');
    const queryHash = await sha256(c.req.url);
    const cacheKey = `api:${route}:${userId}:${queryHash}`;

    // Try cache
    const cached = await c.env.API_CACHE.get(cacheKey, { type: 'json' });
    if (cached) {
      c.header('X-Cache', 'HIT');
      return c.json(cached.response, cached.statusCode);
    }

    // Execute handler
    const response = await handler(c);

    // Cache successful responses
    if (response.status === 200) {
      await c.env.API_CACHE.put(
        cacheKey,
        JSON.stringify({
          response: await response.clone().json(),
          statusCode: response.status,
          cachedAt: new Date().toISOString()
        }),
        { expirationTtl: ttl }
      );
    }

    c.header('X-Cache', 'MISS');
    return response;
  };
}

// Usage:
app.get('/api/jobs', cacheableApiHandler('jobs', async (c) => {
  // Expensive query...
  return c.json(results);
}));
```

**Benefits:**
- ✅ **10x faster responses** (edge cache vs DB query)
- ✅ **Reduced D1 load** (fewer reads)
- ✅ **Better UX** (instant page loads)
- ⚠️ **Short TTL** (5 min to keep data fresh)

---

## Current Workers Architecture Analysis

### Existing Implementation Review

**File:** `workers/api/index.ts`

**Architecture:** Monolithic Worker with route-based organization

```
workers/api/
├── index.ts                    # Main entry point (Hono app)
├── types.ts                    # TypeScript types
├── middleware/
│   ├── auth.ts                 # JWT verification
│   ├── errorHandler.ts         # Global error handling
│   └── rateLimiter.ts          # In-memory + PostgreSQL rate limiting
├── routes/
│   ├── applications.ts         # 5 endpoints (generate, CRUD)
│   ├── jobs.ts                 # 5 endpoints (list, CRUD, scrape)
│   ├── emails.ts               # 3 endpoints (send, history, remaining)
│   ├── auth.ts                 # 2 endpoints (LinkedIn OAuth)
│   ├── exports.ts              # 3 endpoints (PDF, DOCX, text)
│   ├── resume.ts               # 2 endpoints (parse, formats)
│   ├── profile.ts              # 8 endpoints (profile + work exp + skills)
│   └── analytics.ts            # 4 endpoints (Workers AI metrics)
└── services/
    ├── supabase.ts             # Supabase client factory
    ├── openai.ts               # OpenAI service
    ├── workersAI.ts            # Workers AI service
    ├── embeddings.ts           # Embedding generation
    ├── jobAnalysisCache.ts     # KV caching (already implemented)
    ├── similarity.ts           # Vector similarity
    └── resumeGapAnalysis.ts    # AI resume analysis
```

**Total Endpoints:** 32 (18 from routes + 14 sub-routes)

**Total Lines of Code:** ~3,500 (estimated)

### Strengths of Current Architecture

✅ **Route-based organization** - clear separation by feature
✅ **Shared middleware** - auth, CORS, rate limiting applied globally
✅ **Service layer** - reusable AI, database logic
✅ **Type safety** - TypeScript with Env/Variables bindings
✅ **Error handling** - centralized with HttpError class
✅ **Already production-ready** - CORS, security headers, rate limiting

### Weaknesses of Current Architecture

⚠️ **In-memory rate limiting** - resets on deployment (addressed by KV migration)
⚠️ **No session management** - still using PostgreSQL (addressed by KV migration)
⚠️ **No API caching** - every request hits database (addressed by KV caching)
⚠️ **Monolithic deployment** - can't scale routes independently (acceptable for pre-alpha)

### Performance Characteristics

**Cold Start:** <10ms (Cloudflare Workers)
**Avg Response Time:** ~200-500ms (includes DB + AI calls)
**Memory Usage:** ~10-20 MB (within 128 MB limit)
**CPU Usage:** ~5-10ms per request (within 50ms limit)

**Bottlenecks:**
1. **Database queries** - D1 edge latency ~20-50ms
2. **AI generation** - GPT-4 ~2-5 seconds, Workers AI ~500ms
3. **Embedding generation** - Workers AI ~200ms per text

---

## Workers Splitting Strategy

### Monolithic vs Microservices Analysis

#### Option 1: Keep Monolithic (Recommended)

**Architecture:**
```
┌──────────────────────────────────────────────┐
│         Single Worker: jobmatch-ai           │
├──────────────────────────────────────────────┤
│  Routes (32 endpoints):                      │
│  • /api/applications (5)                     │
│  • /api/jobs (5)                             │
│  • /api/emails (3)                           │
│  • /api/auth (2)                             │
│  • /api/exports (3)                          │
│  • /api/resume (2)                           │
│  • /api/profile (8)                          │
│  • /api/analytics (4)                        │
├──────────────────────────────────────────────┤
│  Shared:                                     │
│  • Auth middleware (JWT verification)        │
│  • Rate limiting (KV-backed)                 │
│  • CORS configuration                        │
│  • Error handling                            │
│  • Supabase client                           │
│  • OpenAI service                            │
│  • Workers AI service                        │
└──────────────────────────────────────────────┘
```

**Pros:**
- ✅ **Simple deployment** - one `wrangler deploy`
- ✅ **Shared middleware** - DRY principle
- ✅ **Single logs stream** - easier debugging
- ✅ **Lower cost** - $5/month base (not $5 × N workers)
- ✅ **Faster development** - no inter-service communication
- ✅ **Shared services** - one OpenAI client, one Supabase client

**Cons:**
- ⚠️ **Single deployment** - all routes updated together
- ⚠️ **Shared CPU limit** - one route can't monopolize
- ⚠️ **Can't scale independently** - one Worker serves all traffic

**Cost:** $5/month base + usage (~$2-7) = **$7-12/month**

---

#### Option 2: Split by Domain (Not Recommended)

**Architecture:**
```
┌──────────────────────────────────────────────┐
│  Worker 1: jobmatch-ai-core ($5/month)       │
│  • /api/applications (5)                     │
│  • /api/jobs (5)                             │
│  • /api/profile (8)                          │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  Worker 2: jobmatch-ai-ai ($5/month)         │
│  • /api/resume (2) - AI parsing              │
│  • /api/analytics (4) - AI metrics           │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│  Worker 3: jobmatch-ai-integrations ($5/mo)  │
│  • /api/auth (2) - OAuth                     │
│  • /api/emails (3) - SendGrid                │
│  • /api/exports (3) - PDF/DOCX               │
└──────────────────────────────────────────────┘
```

**Pros:**
- ✅ **Independent deployments** - update one without affecting others
- ✅ **Isolation** - bug in AI worker doesn't affect core
- ✅ **Team ownership** - different teams can own different workers

**Cons:**
- ❌ **3x base cost** - $15/month instead of $5/month
- ❌ **Middleware duplication** - auth, CORS in each worker
- ❌ **Complex routing** - need API Gateway or frontend routing
- ❌ **Harder debugging** - 3 log streams
- ❌ **Service discovery** - workers need to call each other
- ❌ **Shared state complexity** - KV namespaces need coordination

**Cost:** $15/month base + usage (~$6-21) = **$21-36/month** (3x higher)

---

#### Option 3: Hybrid (Future Consideration)

**When to Consider:**
- **Traffic:** >50,000 requests/day
- **Team:** Multiple teams working on separate features
- **Deployment:** Need independent rollout schedules

**Split Strategy:**
1. **Keep monolithic for most routes**
2. **Extract high-traffic/expensive routes** to separate workers:
   - AI-heavy routes (resume parsing, job matching) → `jobmatch-ai-ai`
   - OAuth/external integrations → `jobmatch-ai-integrations`

**Cost:** $10/month base + usage = **$15-20/month**

---

### Decision Matrix

| Criteria | Monolithic | Split (3 Workers) | Hybrid |
|----------|-----------|-------------------|--------|
| **Monthly Cost** | $7-12 | $21-36 | $15-20 |
| **Deployment Complexity** | ⭐⭐⭐⭐⭐ Simple | ⭐⭐ Complex | ⭐⭐⭐ Medium |
| **Debugging** | ⭐⭐⭐⭐⭐ Easy | ⭐⭐ Hard | ⭐⭐⭐ Medium |
| **Independent Scaling** | ❌ No | ✅ Yes | ⚠️ Partial |
| **Team Ownership** | ❌ No | ✅ Yes | ⚠️ Partial |
| **Code Duplication** | ✅ None | ❌ High | ⚠️ Medium |
| **Pre-Alpha Suitability** | ✅ Perfect | ❌ Overkill | ⚠️ Premature |

### Final Recommendation

**✅ Keep Monolithic Worker**

**Reasoning:**
1. **Pre-alpha stage** - no traffic to justify splitting
2. **Cost efficiency** - $5/month vs $15/month (3x savings)
3. **Simpler operations** - one deployment, one logs stream
4. **Faster development** - no inter-service complexity
5. **Easy to refactor later** - can split when traffic warrants

**When to Revisit:**
- Traffic reaches 50,000+ requests/day
- Multiple teams working on different features
- Need independent deployment schedules
- Specific routes need different scaling profiles

---

## Refactoring Plan

### Phase 1: KV Migration (Week 2-3 of 8-week plan)

#### Task 1.1: Add KV Namespaces to wrangler.toml

**File:** `workers/wrangler.toml`

```toml
# Add to existing configuration:

# Sessions (replaces PostgreSQL sessions table)
[[env.development.kv_namespaces]]
binding = "SESSIONS"
id = "xxx-dev-sessions"

[[env.staging.kv_namespaces]]
binding = "SESSIONS"
id = "xxx-staging-sessions"

[[env.production.kv_namespaces]]
binding = "SESSIONS"
id = "xxx-prod-sessions"

# Rate Limits (replaces PostgreSQL rate_limits table + in-memory Map)
[[env.development.kv_namespaces]]
binding = "RATE_LIMITS"
id = "xxx-dev-rate-limits"

[[env.staging.kv_namespaces]]
binding = "RATE_LIMITS"
id = "xxx-staging-rate-limits"

[[env.production.kv_namespaces]]
binding = "RATE_LIMITS"
id = "xxx-prod-rate-limits"

# OAuth States (replaces PostgreSQL oauth_states table)
[[env.development.kv_namespaces]]
binding = "OAUTH_STATES"
id = "xxx-dev-oauth-states"

[[env.staging.kv_namespaces]]
binding = "OAUTH_STATES"
id = "xxx-staging-oauth-states"

[[env.production.kv_namespaces]]
binding = "OAUTH_STATES"
id = "xxx-prod-oauth-states"

# Embeddings Cache (new, optional)
[[env.development.kv_namespaces]]
binding = "EMBEDDINGS_CACHE"
id = "xxx-dev-embeddings-cache"

[[env.staging.kv_namespaces]]
binding = "EMBEDDINGS_CACHE"
id = "xxx-staging-embeddings-cache"

[[env.production.kv_namespaces]]
binding = "EMBEDDINGS_CACHE"
id = "xxx-prod-embeddings-cache"

# API Response Cache (new, optional)
[[env.development.kv_namespaces]]
binding = "API_CACHE"
id = "xxx-dev-api-cache"

[[env.staging.kv_namespaces]]
binding = "API_CACHE"
id = "xxx-staging-api-cache"

[[env.production.kv_namespaces]]
binding = "API_CACHE"
id = "xxx-prod-api-cache"
```

**Create Namespaces:**
```bash
# Development
wrangler kv namespace create SESSIONS --env development
wrangler kv namespace create RATE_LIMITS --env development
wrangler kv namespace create OAUTH_STATES --env development
wrangler kv namespace create EMBEDDINGS_CACHE --env development
wrangler kv namespace create API_CACHE --env development

# Staging
wrangler kv namespace create SESSIONS --env staging
wrangler kv namespace create RATE_LIMITS --env staging
wrangler kv namespace create OAUTH_STATES --env staging
wrangler kv namespace create EMBEDDINGS_CACHE --env staging
wrangler kv namespace create API_CACHE --env staging

# Production
wrangler kv namespace create SESSIONS --env production
wrangler kv namespace create RATE_LIMITS --env production
wrangler kv namespace create OAUTH_STATES --env production
wrangler kv namespace create EMBEDDINGS_CACHE --env production
wrangler kv namespace create API_CACHE --env production
```

---

#### Task 1.2: Update Types

**File:** `workers/api/types.ts`

```typescript
// Add KV bindings to Env interface
export interface Env {
  // Existing
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY: string;
  SENDGRID_API_KEY: string;
  AI: Ai;
  JOB_ANALYSIS_CACHE: KVNamespace;

  // New KV namespaces
  SESSIONS: KVNamespace;
  RATE_LIMITS: KVNamespace;
  OAUTH_STATES: KVNamespace;
  EMBEDDINGS_CACHE: KVNamespace;
  API_CACHE: KVNamespace;

  // Environment
  ENVIRONMENT: 'development' | 'staging' | 'production';
  APP_URL: string;
}
```

---

#### Task 1.3: Migrate Rate Limiting to KV

**File:** `workers/api/middleware/rateLimiter.ts`

**Current Implementation:** Uses in-memory Map + PostgreSQL
**New Implementation:** Use KV only

```typescript
/**
 * Rate Limiting Middleware - KV-Backed
 *
 * Migrated from PostgreSQL + in-memory to pure KV for:
 * - Faster response times (edge cache vs DB query)
 * - Automatic expiry (no cleanup jobs)
 * - Persistence across deployments
 */

import type { MiddlewareHandler } from 'hono';
import type { Env, Variables, RateLimitConfig } from '../types';
import { HttpError } from '../types';

// Endpoint-specific limits (same as before)
export const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  'POST:/api/emails/send': { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  'POST:/api/applications/generate': { maxRequests: 20, windowMs: 60 * 60 * 1000 },
  'POST:/api/jobs/scrape': { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  'POST:/api/resume/parse': { maxRequests: 20, windowMs: 60 * 60 * 1000 },
  'POST:/api/exports/pdf': { maxRequests: 30, windowMs: 60 * 60 * 1000 },
  'POST:/api/exports/docx': { maxRequests: 30, windowMs: 60 * 60 * 1000 },
  'GET:/api/auth/linkedin/initiate': { maxRequests: 5, windowMs: 15 * 60 * 1000 },
};

/**
 * KV-backed rate limiter for authenticated users
 */
export function rateLimiter(config?: Partial<RateLimitConfig>): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> {
  return async (c, next) => {
    const userId = c.get('userId');
    if (!userId) {
      return next(); // Unauthenticated, use IP-based limiter
    }

    const endpointKey = `${c.req.method}:${c.req.path}`;
    const endpointConfig = ENDPOINT_LIMITS[endpointKey];
    const maxRequests = config?.maxRequests ?? endpointConfig?.maxRequests ?? 100;
    const windowMs = config?.windowMs ?? endpointConfig?.windowMs ?? 15 * 60 * 1000;

    const result = await checkRateLimitKV(c.env, userId, endpointKey, maxRequests, windowMs);

    // Set headers
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', result.remaining.toString());
    c.header('X-RateLimit-Reset', result.resetTime.toISOString());

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime.getTime() - Date.now()) / 1000);
      c.header('Retry-After', retryAfter.toString());
      throw new HttpError(429, `Rate limit exceeded. Try again in ${retryAfter} seconds.`);
    }

    return next();
  };
}

/**
 * Check rate limit using KV (replaces PostgreSQL)
 */
async function checkRateLimitKV(
  env: Env,
  userId: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetTime: Date; currentCount: number }> {
  const now = Date.now();
  const key = `rate:user:${userId}:${endpoint}`;

  // Get existing rate limit record from KV
  const existing = await env.RATE_LIMITS.get(key, { type: 'json' }) as {
    count: number;
    windowStart: number;
    windowEnd: number;
  } | null;

  // Check if window has expired
  if (!existing || now > existing.windowEnd) {
    // Start new window
    const windowEnd = now + windowMs;

    await env.RATE_LIMITS.put(
      key,
      JSON.stringify({
        count: 1,
        windowStart: now,
        windowEnd
      }),
      { expirationTtl: Math.ceil(windowMs / 1000) }
    );

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: new Date(windowEnd),
      currentCount: 1
    };
  }

  // Check if limit exceeded
  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(existing.windowEnd),
      currentCount: existing.count
    };
  }

  // Increment counter
  // Note: KV is eventually consistent, rare race conditions possible
  await env.RATE_LIMITS.put(
    key,
    JSON.stringify({
      ...existing,
      count: existing.count + 1
    }),
    { expirationTtl: Math.ceil((existing.windowEnd - now) / 1000) }
  );

  return {
    allowed: true,
    remaining: maxRequests - existing.count - 1,
    resetTime: new Date(existing.windowEnd),
    currentCount: existing.count + 1
  };
}

/**
 * IP-based rate limiter (KV-backed, replaces in-memory Map)
 */
export function ipRateLimiter(
  maxRequests: number = 100,
  windowMs: number = 60000
): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> {
  return async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') ||
               c.req.header('X-Forwarded-For')?.split(',')[0] ||
               'unknown';

    const now = Date.now();
    const key = `rate:ip:${ip}`;

    // Get existing record from KV
    const existing = await c.env.RATE_LIMITS.get(key, { type: 'json' }) as {
      count: number;
      windowStart: number;
      windowEnd: number;
    } | null;

    // Check if window has expired
    if (!existing || now > existing.windowEnd) {
      // Start new window
      const windowEnd = now + windowMs;

      await c.env.RATE_LIMITS.put(
        key,
        JSON.stringify({
          count: 1,
          windowStart: now,
          windowEnd
        }),
        { expirationTtl: Math.ceil(windowMs / 1000) }
      );

      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', (maxRequests - 1).toString());
      return next();
    }

    // Check if limit exceeded
    if (existing.count >= maxRequests) {
      const resetTime = new Date(existing.windowEnd);
      const retryAfter = Math.ceil((resetTime.getTime() - now) / 1000);

      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', resetTime.toISOString());
      c.header('Retry-After', retryAfter.toString());

      return c.json({
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        statusCode: 429
      }, 429);
    }

    // Increment counter
    await c.env.RATE_LIMITS.put(
      key,
      JSON.stringify({
        ...existing,
        count: existing.count + 1
      }),
      { expirationTtl: Math.ceil((existing.windowEnd - now) / 1000) }
    );

    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', (maxRequests - existing.count - 1).toString());
    return next();
  };
}

/**
 * Cleanup function (no longer needed with KV automatic expiry)
 */
export async function cleanupExpiredRateLimits(env: Env): Promise<number> {
  // KV automatically expires keys via TTL
  console.log('Rate limit cleanup: KV TTL handles expiry automatically');
  return 0;
}
```

**Benefits:**
- ✅ **10x faster** (edge KV vs DB round-trip)
- ✅ **No cleanup jobs** (automatic TTL expiry)
- ✅ **Survives deployments** (KV is persistent)
- ✅ **Multi-instance safe** (not per-isolate like in-memory)

**Migration Notes:**
- Remove PostgreSQL `rate_limits` table queries
- Remove in-memory Map (`ipRateLimitStore`)
- Update tests to use KV mocking

---

#### Task 1.4: Migrate OAuth States to KV

**File:** `workers/api/routes/auth.ts`

**Current Implementation:** Uses PostgreSQL `oauth_states` table
**New Implementation:** Use KV with 10-minute TTL

```typescript
// BEFORE (PostgreSQL):
await supabaseAdmin.from('oauth_states').insert({
  user_id: userId,
  provider: 'linkedin',
  state,
  expires_at: expiresAt.toISOString(),
  created_at: new Date().toISOString()
});

// AFTER (KV):
await env.OAUTH_STATES.put(
  `oauth:${state}`,
  JSON.stringify({
    userId,
    provider: 'linkedin',
    state,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  }),
  { expirationTtl: 10 * 60 } // 10 minutes
);

// Verify state (BEFORE):
const { data: stateRecord } = await supabaseAdmin
  .from('oauth_states')
  .select('*')
  .eq('state', state)
  .eq('provider', 'linkedin')
  .single();

// Verify state (AFTER):
const stateData = await env.OAUTH_STATES.get(`oauth:${state}`, { type: 'json' });
if (!stateData) {
  throw new HttpError(400, 'Invalid or expired OAuth state');
}

// Delete after use (BEFORE):
await supabaseAdmin.from('oauth_states').delete().eq('id', stateRecord.id);

// Delete after use (AFTER - optional, TTL handles it):
await env.OAUTH_STATES.delete(`oauth:${state}`);
```

**Full Refactored Route:**

See [Code Examples](#code-examples) section below for complete implementation.

---

#### Task 1.5: Migrate Sessions to KV (Optional - Consider Later)

**Decision:** Keep sessions in D1 for now, migrate to KV in Phase 3 (Week 5-6)

**Reasoning:**
1. **Session queries are complex** - need to list all sessions per user, filter by device, etc.
2. **KV metadata is limited** - can't efficiently query "all sessions for user X"
3. **D1 FTS5 needed** - for searching by user agent, location, etc.
4. **Audit trail** - sessions table is useful for security events

**Alternative:** Hybrid approach:
- **D1:** Store full session records for querying/audit
- **KV:** Cache active sessions for fast JWT verification

**Revisit after Phase 2** when D1 is fully operational.

---

### Phase 2: Pages Deployment (Week 7-8 of 8-week plan)

#### Task 2.1: Update Frontend Environment Variables

**File:** `frontend/.env.production`

```bash
# Cloudflare Workers backend (replace Railway URL)
VITE_API_URL=https://api.jobmatch.ai

# Supabase (auth only, no database queries from frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

#### Task 2.2: Deploy to Cloudflare Pages

**Commands:**
```bash
# Build frontend
npm run build

# Deploy to Pages (first time)
wrangler pages deploy dist --project-name jobmatch-ai

# Subsequent deployments (auto via GitHub Actions)
# Pages will auto-deploy on git push to main
```

**GitHub Actions Integration:**
```yaml
# .github/workflows/deploy-pages.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main
      - staging
      - develop

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 22

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.API_URL }}
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Deploy to Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: jobmatch-ai
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

---

### Phase 3: Optional Optimizations (Post-Launch)

#### Task 3.1: Add Embeddings Cache

**File:** `workers/api/services/embeddings.ts`

**New Service:**
```typescript
import type { Env } from '../types';
import { sha256 } from './crypto';

/**
 * Generate embeddings with KV caching
 * Reduces Workers AI compute by 40-60%
 */
export async function getCachedEmbedding(
  text: string,
  env: Env
): Promise<number[]> {
  // Generate cache key
  const textHash = await sha256(text);
  const cacheKey = `embed:${textHash}`;

  // Try cache first
  const cached = await env.EMBEDDINGS_CACHE.get(cacheKey, { type: 'json' }) as {
    embedding: number[];
    model: string;
  } | null;

  if (cached && cached.model === '@cf/baai/bge-base-en-v1.5') {
    console.log('Embedding cache HIT:', textHash.substring(0, 16));
    return cached.embedding;
  }

  // Generate new embedding
  console.log('Embedding cache MISS:', textHash.substring(0, 16));
  const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: text.substring(0, 2000) // Truncate long texts
  });

  const embedding = result.data[0];

  // Cache for 30 days
  await env.EMBEDDINGS_CACHE.put(
    cacheKey,
    JSON.stringify({
      text: text.substring(0, 200), // Store snippet for debugging
      embedding,
      model: '@cf/baai/bge-base-en-v1.5',
      createdAt: new Date().toISOString()
    }),
    { expirationTtl: 30 * 24 * 60 * 60 }
  );

  return embedding;
}

/**
 * SHA-256 hash for cache keys
 */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**Update Usage:**
```typescript
// In workers/api/services/workersAI.ts:
import { getCachedEmbedding } from './embeddings';

// Replace direct AI.run calls:
// BEFORE:
const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text });
const embedding = result.data[0];

// AFTER:
const embedding = await getCachedEmbedding(text, env);
```

---

#### Task 3.2: Add API Response Cache

**File:** `workers/api/middleware/apiCache.ts`

**New Middleware:**
```typescript
import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../types';

/**
 * API Response Caching Middleware
 * Caches expensive GET requests to reduce D1 load
 */
export function apiCache(
  ttl: number = 5 * 60 // 5 minutes default
): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> {
  return async (c, next) => {
    // Only cache GET requests for authenticated users
    if (c.req.method !== 'GET') {
      return next();
    }

    const userId = c.get('userId');
    if (!userId) {
      return next();
    }

    // Generate cache key from route + query params
    const url = new URL(c.req.url);
    const route = url.pathname;
    const queryHash = await sha256(url.search || '');
    const cacheKey = `api:${route}:${userId}:${queryHash}`;

    // Try cache
    const cached = await c.env.API_CACHE.get(cacheKey, { type: 'json' }) as {
      response: any;
      statusCode: number;
      cachedAt: string;
    } | null;

    if (cached) {
      c.header('X-Cache', 'HIT');
      c.header('X-Cache-Date', cached.cachedAt);
      return c.json(cached.response, cached.statusCode);
    }

    // Execute handler
    await next();

    // Cache successful responses
    if (c.res.status === 200) {
      const responseBody = await c.res.clone().json();

      await c.env.API_CACHE.put(
        cacheKey,
        JSON.stringify({
          response: responseBody,
          statusCode: c.res.status,
          cachedAt: new Date().toISOString()
        }),
        { expirationTtl: ttl }
      );

      c.header('X-Cache', 'MISS');
    }
  };
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**Usage:**
```typescript
// In workers/api/routes/jobs.ts:
import { apiCache } from '../middleware/apiCache';

// Add to expensive routes:
router.get('/', apiCache(5 * 60), async (c) => {
  // This response will be cached for 5 minutes
  const jobs = await getJobs(userId, filters);
  return c.json(jobs);
});
```

---

## Code Examples

### Complete OAuth Route with KV (workers/api/routes/auth.ts)

```typescript
/**
 * Authentication Routes - KV-Backed OAuth
 *
 * Migrated from PostgreSQL oauth_states table to KV for:
 * - Faster state verification (edge cache vs DB query)
 * - Automatic expiry (no cleanup jobs)
 * - Simpler code (fewer database queries)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables } from '../types';
import { HttpError } from '../types';
import { authenticateUser } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// Validation schemas
const callbackSchema = z.object({
  code: z.string().min(10).max(500),
  state: z.string().min(20).max(500),
  error: z.string().optional(),
  error_description: z.string().optional()
});

/**
 * GET /api/auth/linkedin/initiate
 * Start LinkedIn OAuth flow - returns authorization URL
 */
router.get(
  '/linkedin/initiate',
  authenticateUser,
  rateLimiter({ maxRequests: 5, windowMs: 15 * 60 * 1000 }),
  async (c) => {
    const userId = c.get('userId');

    if (!LINKEDIN_CLIENT_ID) {
      throw new HttpError(503, 'LinkedIn integration not configured', 'LINKEDIN_NOT_CONFIGURED');
    }

    // Generate CSRF state token
    const state = crypto.randomUUID() + '-' + Date.now().toString(36);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store state in KV (replaces PostgreSQL)
    await c.env.OAUTH_STATES.put(
      `oauth:${state}`,
      JSON.stringify({
        userId,
        provider: 'linkedin',
        state,
        redirectUri: LINKEDIN_REDIRECT_URI,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      }),
      { expirationTtl: 10 * 60 } // Auto-expire after 10 minutes
    );

    // Build LinkedIn authorization URL
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', LINKEDIN_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', LINKEDIN_REDIRECT_URI || '');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'openid profile email');

    console.log(`LinkedIn auth initiated for user ${userId}`);

    return c.json({
      authUrl: authUrl.toString(),
      state,
      expiresAt: expiresAt.toISOString()
    });
  }
);

/**
 * GET /api/auth/linkedin/callback
 * Handle LinkedIn OAuth callback
 */
router.get('/linkedin/callback', async (c) => {
  // Handle OAuth errors
  if (c.req.query('error')) {
    console.warn('LinkedIn OAuth error:', c.req.query('error'));
    return redirectWithError(c, 'oauth_error');
  }

  // Validate callback parameters
  const parseResult = callbackSchema.safeParse(c.req.query());
  if (!parseResult.success) {
    console.warn('Invalid callback parameters');
    return redirectWithError(c, 'invalid_parameters');
  }

  const { code, state } = parseResult.data;

  // Verify state token from KV (replaces PostgreSQL query)
  const stateData = await c.env.OAUTH_STATES.get(`oauth:${state}`, { type: 'json' }) as {
    userId: string;
    provider: string;
    state: string;
    redirectUri: string;
    createdAt: string;
    expiresAt: string;
  } | null;

  if (!stateData) {
    console.warn('Invalid or expired state token');
    return redirectWithError(c, 'invalid_state');
  }

  // Check expiry (extra safety, TTL should handle this)
  if (new Date(stateData.expiresAt) < new Date()) {
    console.warn('Expired state token');
    await c.env.OAUTH_STATES.delete(`oauth:${state}`);
    return redirectWithError(c, 'expired_state');
  }

  const userId = stateData.userId;

  // Delete used state token (prevent replay)
  await c.env.OAUTH_STATES.delete(`oauth:${state}`);

  try {
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(code);
    if (!tokenData?.access_token) {
      console.error('Token exchange failed');
      return redirectWithError(c, 'token_exchange_failed');
    }

    // Fetch LinkedIn profile
    const profileData = await fetchLinkedInProfile(tokenData.access_token);
    if (!profileData) {
      console.error('Profile fetch failed');
      return redirectWithError(c, 'profile_fetch_failed');
    }

    // Import profile to database (D1 after migration)
    await importProfileToDatabase(userId, profileData, c.env);

    console.log(`Successfully imported LinkedIn data for user ${userId}`);

    // Redirect to success page
    return redirectWithSuccess(c);
  } catch (error) {
    console.error('LinkedIn callback error:', error);
    return redirectWithError(c, 'internal_error');
  }
});

// Helper functions (unchanged from original)
async function exchangeCodeForToken(code: string) { /* ... */ }
async function fetchLinkedInProfile(accessToken: string) { /* ... */ }
async function importProfileToDatabase(userId: string, profileData: any, env: Env) { /* ... */ }

function redirectWithSuccess(c: any) {
  const successUrl = new URL(`${APP_URL}/profile`);
  successUrl.searchParams.set('linkedin', 'success');
  return c.redirect(successUrl.toString(), 302);
}

function redirectWithError(c: any, errorCode: string) {
  const errorUrl = new URL(`${APP_URL}/profile`);
  errorUrl.searchParams.set('linkedin', 'error');
  errorUrl.searchParams.set('error_code', errorCode);
  return c.redirect(errorUrl.toString(), 302);
}

export default router;
```

---

## Cost Implications

### KV Storage Costs

**Free Tier (Per Month):**
- 1 GB stored data: FREE
- 10 million reads: FREE
- 1 million writes: FREE
- 1 million deletes: FREE
- 1 million lists: FREE

**Paid Tier (Beyond Free):**
- Storage: **$0.50 per GB-month**
- Reads: **$0.50 per 10 million**
- Writes: **$5.00 per 1 million**
- Deletes: **$5.00 per 1 million**
- Lists: **$5.00 per 1 million**

### JobMatch AI KV Usage Estimates

| Namespace | Storage | Reads/Month | Writes/Month | Monthly Cost |
|-----------|---------|-------------|--------------|--------------|
| **SESSIONS** | 1 MB | 100K | 10K | $0.00 (FREE) |
| **RATE_LIMITS** | 5 MB | 500K | 300K | $0.00 (FREE) |
| **OAUTH_STATES** | 0.5 MB | 1K | 500 | $0.00 (FREE) |
| **JOB_ANALYSIS_CACHE** | 50 MB | 50K | 20K | $0.00 (FREE) |
| **EMBEDDINGS_CACHE** | 100 MB | 200K | 50K | $0.00 (FREE) |
| **API_CACHE** | 200 MB | 1M | 100K | $0.00 (FREE) |
| **TOTAL** | **357 MB** | **1.85M** | **480K** | **$0.00** |

**All KV usage fits within FREE tier at pre-alpha scale.**

### Cost Comparison: PostgreSQL vs KV

**PostgreSQL Rate Limiting:**
- Database writes: 300K/month
- D1 writes: $1.00 per 1M = **$0.30/month**
- Query latency: ~50ms

**KV Rate Limiting:**
- KV writes: 300K/month (FREE tier: 1M)
- Cost: **$0.00/month**
- Query latency: ~5ms (10x faster)

**Savings:** $0.30/month + 10x faster responses

---

## Performance Analysis

### Latency Comparison

| Operation | PostgreSQL | KV | Improvement |
|-----------|-----------|-----|-------------|
| **Session Read** | 50ms | 5ms | **10x faster** |
| **Rate Limit Check** | 50ms | 5ms | **10x faster** |
| **OAuth State Verify** | 50ms | 5ms | **10x faster** |
| **Embedding Cache Hit** | N/A | 5ms | **200ms saved** (vs compute) |
| **API Cache Hit** | 500ms | 5ms | **100x faster** |

### Throughput Improvement

**Current Architecture (PostgreSQL):**
- Rate limit check: 20 req/sec (50ms latency)
- Session verification: 20 req/sec
- Total overhead: 100ms per request

**New Architecture (KV):**
- Rate limit check: 200 req/sec (5ms latency)
- Session verification: 200 req/sec
- Total overhead: 10ms per request

**10x throughput improvement** for authentication + rate limiting overhead.

### Cache Hit Rates (Estimated)

| Cache Type | Hit Rate | Benefit |
|-----------|----------|---------|
| **Job Analysis Cache** | 60-70% | $200/month saved (GPT-4 costs) |
| **Embeddings Cache** | 40-50% | 40% fewer Workers AI requests |
| **API Response Cache** | 30-40% | 30% fewer D1 queries |

---

## Updated Migration Timeline

### Revised 8-Week Plan with KV Integration

#### Week 1: Foundation Setup
- ✅ Create Cloudflare account
- ✅ Deploy test Workers app
- 🆕 **Create 6 KV namespaces** (SESSIONS, RATE_LIMITS, OAUTH_STATES, JOB_ANALYSIS_CACHE, EMBEDDINGS_CACHE, API_CACHE)
- 🆕 **Update wrangler.toml** with all KV bindings
- 🆕 **Update Env types** in workers/api/types.ts

#### Week 2: KV Migration (New)
- 🆕 **Migrate rate limiting** from PostgreSQL + in-memory to KV
- 🆕 **Migrate OAuth states** from PostgreSQL to KV
- 🆕 **Add embeddings cache** to Workers AI service
- 🆕 **Add API response cache** middleware
- 🆕 **Test KV-backed features** locally with Miniflare

#### Week 3: Database Migration Prep
- Analyze schema differences (PostgreSQL → SQLite)
- Create D1 schema (convert PostgreSQL to SQLite)
- Write migration scripts for data conversion
- Set up local D1 database for testing

#### Week 4: D1 Database Setup
- Create D1 database in production
- Apply schema migrations
- Implement RLS workarounds in Workers (user_id filters)
- Test authentication flow with Supabase Auth + D1

#### Week 5: Storage + Vectorize Migration
- Create R2 buckets (avatars, resumes, exports)
- Implement file upload/download in Workers
- Migrate existing files from Supabase Storage to R2
- Create Vectorize index for job embeddings
- Migrate embeddings from PostgreSQL to Vectorize

#### Week 6: AI Integration
- Migrate AI endpoints to Workers AI (resume analysis, job matching)
- Keep OpenAI for embeddings + resume/cover letter generation
- Test AI generation quality vs OpenAI baseline
- Implement cost monitoring for Workers AI usage

#### Week 7: Testing & Optimization
- Load testing (simulate 1000 concurrent users)
- Security audit (RLS-equivalent checks, JWT verification)
- Performance optimization (D1 indexing, Workers caching, R2 CDN)
- Error monitoring setup (Sentry or Cloudflare Logpush)
- 🆕 **KV performance testing** (cache hit rates, latency)

#### Week 8: Production Cutover
- Deploy Workers to production
- Deploy Pages (frontend) to Cloudflare
- DNS cutover (update CNAME to Cloudflare Pages)
- Monitor for 48 hours (error rates, response times, costs)
- Decommission Supabase/Railway (keep backups)
- 🆕 **Verify KV cost savings** (should be $0 at pre-alpha scale)

---

## Summary of Recommendations

### Immediate Actions (Week 1-2)

1. ✅ **Keep monolithic Worker** - don't split until traffic warrants (>50k req/day)
2. ✅ **Create 6 KV namespaces** - SESSIONS, RATE_LIMITS, OAUTH_STATES, JOB_ANALYSIS_CACHE, EMBEDDINGS_CACHE, API_CACHE
3. ✅ **Migrate rate limiting to KV** - 10x faster, automatic expiry, survives deployments
4. ✅ **Migrate OAuth states to KV** - simpler code, faster verification
5. ✅ **Add embeddings cache** - 40% reduction in Workers AI costs
6. ⚠️ **Defer session migration** - keep in D1 for now, complex queries needed

### Future Considerations (Post-Launch)

1. **Split Workers when needed** - traffic >50k req/day or team structure changes
2. **Add API response cache** - 30% fewer D1 queries, 10x faster responses
3. **Migrate sessions to KV** - when hybrid approach is viable (D1 + KV)
4. **Monitor KV costs** - should stay in FREE tier for 6-12 months
5. **Consider Durable Objects** - for strict atomic counters (payments, critical rate limiting)

### Expected Benefits

**Performance:**
- ✅ **10x faster rate limiting** (5ms vs 50ms)
- ✅ **10x faster OAuth verification** (5ms vs 50ms)
- ✅ **40% fewer Workers AI requests** (embeddings cache)
- ✅ **60-70% cache hit rate** (job analysis cache)

**Cost:**
- ✅ **$0/month KV costs** (within FREE tier)
- ✅ **$0.30/month saved** (vs PostgreSQL rate limiting)
- ✅ **$200/month saved** (AI analysis cache)
- ✅ **Simpler infrastructure** (fewer database tables)

**Operational:**
- ✅ **No cleanup jobs** (automatic TTL expiry)
- ✅ **Survives deployments** (persistent KV storage)
- ✅ **Simpler code** (fewer database queries)
- ✅ **Better debugging** (KV dashboard + logs)

---

## Next Steps

1. **Review this document** with team
2. **Approve KV namespace design** (6 namespaces)
3. **Create KV namespaces** in Cloudflare dashboard
4. **Update wrangler.toml** with bindings
5. **Start Week 2 migration** (rate limiting + OAuth states)
6. **Test locally** with Miniflare
7. **Deploy to staging** for validation
8. **Monitor performance** and cost

**Estimated Completion:** Week 2 of 8-week migration plan (KV migration complete)

---

## References

- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
- [Cloudflare KV Pricing](https://developers.cloudflare.com/kv/platform/pricing/)
- [Workers Limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Miniflare (Local KV)](https://miniflare.dev/)
- [KV Best Practices](https://developers.cloudflare.com/kv/best-practices/)
- [Current Migration Plan](CLOUDFLARE_FULL_PLATFORM_MIGRATION.md)
- [Current Workers Code](../workers/api/)
