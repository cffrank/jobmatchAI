# Supabase to Cloudflare D1 Migration Plan

**Document Version:** 1.0
**Date:** 2025-12-31
**Status:** Analysis Complete - Migration NOT Recommended

---

## Executive Summary

### Recommendation: DO NOT MIGRATE to Cloudflare D1

After comprehensive analysis of Cloudflare D1's capabilities and JobMatch AI's requirements, **we strongly recommend staying with Supabase** for the foreseeable future. While Cloudflare D1 is production-ready (GA since 2024), it lacks critical features required by our application.

**Key Finding:** Migration to D1 would require extensive architectural changes, significant data model compromises, and custom implementation of security features that Supabase provides natively.

### Critical Blockers

| Feature | Supabase | Cloudflare D1 | Impact |
|---------|----------|---------------|---------|
| **Row Level Security (RLS)** | Native PostgreSQL RLS | **Not supported** - must implement in application layer | **CRITICAL** - 184 RLS policy uses, 13 tables with RLS |
| **JSONB Type** | Native JSONB | **Not supported** - JSON stored as TEXT | **HIGH** - Embedding storage, variant data affected |
| **Array Types** | Native arrays (`text[]`, `integer[]`) | **Not supported** - must convert to JSON | **HIGH** - Skills, keywords, preferences affected |
| **UUID Type** | Native UUID with `gen_random_uuid()` | **Not supported** - must use TEXT | **MEDIUM** - All 26 tables use UUID primary keys |
| **PostgreSQL Extensions** | pg_trgm, pgvector, full-text search | **Limited** - Only FTS5, JSON, Math | **HIGH** - Job deduplication, search affected |
| **Authentication** | Integrated Supabase Auth | **None** - must build custom JWT system | **CRITICAL** - Would need to rebuild auth |
| **Storage** | Integrated Supabase Storage | **Separate** - Must use R2 | **MEDIUM** - Avatar/resume storage migration |

### Cost-Benefit Analysis

**Estimated Migration Effort:** 12-16 weeks
**Estimated Cost Savings:** $75/month (Supabase $81/month → D1 $5.50/month)
**ROI:** Negative - 16 weeks of development for $75/month savings is not justified
**Risk Level:** Very High - Data model compromises, security concerns, feature parity gaps

### Alternative Recommendation

**Stay with Supabase, migrate backend to Cloudflare Workers:**
- Keep Supabase for PostgreSQL database, auth, and storage
- Migrate Express backend to Cloudflare Workers (Hono framework)
- Cost savings: ~$75/month (Railway → Workers)
- Migration time: 8-10 weeks (already in progress per COST_ANALYSIS.md)
- Risk: Low - No database migration, proven integration pattern

---

## Table of Contents

- [1. Current Supabase Usage Analysis](#1-current-supabase-usage-analysis)
- [2. Cloudflare D1 Capabilities & Limitations](#2-cloudflare-d1-capabilities--limitations)
- [3. Feature Comparison Matrix](#3-feature-comparison-matrix)
- [4. Authentication Migration Strategy](#4-authentication-migration-strategy)
- [5. Storage Migration Strategy](#5-storage-migration-strategy)
- [6. Database Schema Migration](#6-database-schema-migration)
- [7. Code Changes Required](#7-code-changes-required)
- [8. Migration Timeline & Phases](#8-migration-timeline--phases)
- [9. Risk Analysis](#9-risk-analysis)
- [10. Cost Analysis](#10-cost-analysis)
- [11. Alternative Solutions](#11-alternative-solutions)
- [12. Final Recommendation](#12-final-recommendation)

---

## 1. Current Supabase Usage Analysis

### 1.1 Database Tables

JobMatch AI currently has **26 database tables** across 37 migration files:

**Core Tables:**
- `users` - User profiles with UUID, JSONB embeddings, arrays
- `jobs` - Job listings with UUID, JSONB embeddings, arrays, full-text search
- `applications` - Job applications with UUID, JSONB variants
- `work_experience` - Work history with JSONB accomplishments
- `education` - Education records
- `skills` - Skills with proficiency levels
- `resumes` - Resume storage metadata

**Security Tables:**
- `sessions` - User sessions with device tracking
- `failed_login_attempts` - Login protection (account lockout)
- `account_lockouts` - Temporary account locks
- `security_events` - Security audit log
- `oauth_states` - OAuth CSRF tokens

**Feature Tables:**
- `job_preferences` - Search preferences (arrays)
- `job_searches` - Search history
- `job_search_templates` - Saved search templates
- `job_search_history` - Automated search logs
- `job_compatibility_analyses` - AI compatibility scores
- `job_duplicates` - Deduplication tracking (uses pg_trgm)
- `spam_reports` - Job quality control
- `match_quality_metrics` - Quality scoring
- `job_feedback` - User feedback
- `canonical_job_metadata` - Normalized job data

**Support Tables:**
- `notifications` - In-app notifications
- `notification_preferences` - Notification settings
- `email_history` - Email tracking
- `rate_limits` - API rate limiting (PostgreSQL-backed)
- `gap_analyses` - Resume gap analysis
- `gap_analysis_answers` - Gap analysis responses
- `resume_gap_analyses` - Resume gap tracking
- `work_experience_narratives` - AI-generated narratives

### 1.2 PostgreSQL-Specific Features in Use

**1. Row Level Security (RLS):**
- **184 uses** of `auth.uid()` across migrations
- **13 migration files** enable RLS on tables
- All user data protected by RLS policies
- Critical security feature for multi-tenant data isolation

**2. JSONB Columns:**
- `jobs.embedding` - 768-dimensional vectors for semantic search
- `users.resume_embedding` - User profile embeddings
- `applications.variants` - Cover letter variants
- `work_experience.accomplishments` - Structured accomplishments

**3. Array Types:**
- `job_preferences.desired_titles` - TEXT[]
- `job_preferences.desired_locations` - TEXT[]
- `job_preferences.work_arrangement` - TEXT[]
- `job_preferences.keywords` - TEXT[]
- Skills, industries, benefits, etc.

**4. UUID Type:**
- All 26 tables use `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- Foreign keys reference UUID columns
- Critical for security and distributed systems

**5. PostgreSQL Extensions:**
- **pg_trgm** - Fuzzy text matching for job deduplication (SIMILARITY function)
- **pgvector** (planned) - Native vector operations for semantic search
- Trigram indexes on job title, company, location

**6. Advanced Indexes:**
- GIN indexes on JSONB columns
- GIN trigram indexes on text columns
- Composite indexes for query optimization

**7. Triggers:**
- `update_updated_at_column()` - Auto-update timestamps
- Applied to 10+ tables

**8. Enums:**
- `application_status` - ENUM type for application tracking

### 1.3 Supabase Auth Usage

**Authentication Methods:**
- Email/password authentication
- LinkedIn OAuth integration (via `oauth_states` table)
- JWT token verification with 7-day expiry
- Automatic token refresh
- PKCE flow for OAuth security

**Auth Features Used:**
- `auth.uid()` for RLS policies
- `supabase.auth.getUser()` for token verification
- Session management with 30-minute inactivity timeout
- Password reset flows
- Email confirmation

**Backend Auth Middleware:**
- `backend/src/middleware/auth.ts` - JWT verification
- `backend/src/middleware/loginProtection.ts` - Account lockout (5 attempts → 30min lock)
- All protected routes use `authenticateUser` middleware

### 1.4 Supabase Storage Usage

**Buckets:**
- `avatars` - User profile photos (public read, RLS for write)
- `resumes` - Resume files (PDF/DOCX, private)
- `exports` - Generated application exports (PDF/DOCX, private)

**Storage Features:**
- RLS policies on buckets (users can only access their own files)
- Public URL generation for avatars
- Signed URLs for private files (resumes, exports)
- File upload with progress tracking
- File validation (type, size)

**Storage Code:**
- `src/hooks/useFileUpload.ts` - Generic upload hook
- `src/hooks/useProfilePhoto.ts` - Avatar management
- Upload/download/delete operations

### 1.5 Real-time & Edge Functions

**Currently NOT using:**
- Supabase Realtime subscriptions
- Supabase Edge Functions (using Railway backend instead)

**Migration Note:** Since we're not using real-time or edge functions, these don't factor into migration complexity.

---

## 2. Cloudflare D1 Capabilities & Limitations

### 2.1 D1 Overview

**What is D1?**
- Cloudflare's managed, serverless SQLite database
- Built on SQLite's query engine
- Global edge distribution with read replication
- Production-ready (GA since 2024)

**Sources:**
- [Cloudflare D1 Overview](https://developers.cloudflare.com/d1/)
- [D1 GA Announcement](https://blog.cloudflare.com/making-full-stack-easier-d1-ga-hyperdrive-queues/)
- [D1 Read Replication Beta](https://developers.cloudflare.com/changelog/2025-04-10-d1-read-replication-beta/)

### 2.2 D1 Capabilities

**Supported Features:**
- **SQL Compatibility:** Most SQLite SQL conventions
- **Extensions:** FTS5 (full-text search), JSON functions, Math functions
- **Transactions:** SQLite transaction isolation
- **Backup:** Time Travel (30-day point-in-time recovery)
- **Replication:** Global read replication (beta)
- **Pricing:** $0.75/GB storage, rows read/written pricing
- **Free Tier:** 5GB storage, 5M rows read/day, 100K rows write/day

**Sources:**
- [D1 SQL Statements](https://developers.cloudflare.com/d1/sql-api/sql-statements/)
- [D1 Limits](https://developers.cloudflare.com/d1/platform/limits/)
- [D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/)

### 2.3 D1 Limitations (CRITICAL)

#### 2.3.1 Database Size & Concurrency

**Storage Limits:**
- **Maximum database size:** 10 GB (hard limit, cannot be increased)
- **Workaround:** Horizontal scaling with multiple per-tenant databases
- **Impact:** Our database is currently <1GB, but 10GB limit constrains growth

**Concurrency:**
- **Single-threaded:** Each D1 database processes queries one at a time
- **Throughput:** 1,000 queries/sec if avg query = 1ms, 10 queries/sec if avg query = 100ms
- **No multi-write transactions:** Only one write transaction at a time globally
- **Impact:** High-concurrency operations (bulk imports, job scraping) would be slow

**Sources:**
- [D1 Limits Documentation](https://developers.cloudflare.com/d1/platform/limits/)
- [D1 Scaling Discussion](https://dev.to/araldhafeeri/scaling-your-cloudflare-d1-database-from-the-10-gb-limit-to-tbs-4a16)

#### 2.3.2 No Row Level Security (RLS)

**CRITICAL BLOCKER:**
- D1/SQLite has **NO native RLS support**
- PostgreSQL RLS cannot be replicated in SQLite
- Must implement authorization in application layer (Cloudflare Workers)

**Current Usage:**
- 184 uses of `auth.uid()` in RLS policies
- 13 tables with RLS enabled
- All user data protected by `USING (auth.uid() = user_id)` policies

**Migration Impact:**
- Must rewrite ALL queries to filter by `user_id` in Workers code
- Every database query must include `WHERE user_id = ?` clause
- Risk of data leakage if developers forget to add filters
- Cannot leverage database-level security enforcement

**Alternatives:**
1. **Application-level filtering** - Add user_id checks to ALL queries (high risk)
2. **Per-tenant databases** - Separate D1 database per user (10GB limit per user, complex)
3. **Custom RLS middleware** - Intercept queries and inject filters (complex, error-prone)

**Sources:**
- [D1 Data Security](https://developers.cloudflare.com/d1/reference/data-security/)
- [Turso RLS Demo](https://github.com/nileshtrivedi/turso-row-level-security-demo)
- [Drizzle RLS Docs](https://orm.drizzle.team/docs/rls)

#### 2.3.3 Limited Data Types

**Missing Types:**

| PostgreSQL Type | D1/SQLite Equivalent | Migration Strategy | Impact |
|-----------------|---------------------|-------------------|--------|
| **JSONB** | TEXT (JSON stored as string) | Convert JSONB to TEXT, parse in application | **HIGH** - Lose indexing, validation |
| **UUID** | TEXT | Store UUID as TEXT string | **MEDIUM** - Lose type safety |
| **TEXT[]** (arrays) | TEXT (JSON array) | Convert arrays to JSON strings | **HIGH** - Lose array operators |
| **INTEGER[]** | TEXT (JSON array) | Convert arrays to JSON strings | **HIGH** - Lose array operators |
| **ENUM** | TEXT with CHECK constraint | Convert ENUMs to TEXT with validation | **MEDIUM** - Lose type safety |

**JSONB Migration Example:**

```sql
-- PostgreSQL (current)
CREATE TABLE jobs (
  embedding JSONB, -- 768-dimensional vector
  metadata JSONB   -- Arbitrary JSON data
);

CREATE INDEX idx_jobs_embedding ON jobs USING GIN(embedding);
SELECT * FROM jobs WHERE embedding ? 'key'; -- JSONB operators

-- D1/SQLite (target)
CREATE TABLE jobs (
  embedding TEXT, -- JSON string (no JSONB type)
  metadata TEXT   -- JSON string
);

CREATE INDEX idx_jobs_embedding ON jobs(json_extract(embedding, '$.key'));
SELECT * FROM jobs WHERE json_extract(embedding, '$.key') IS NOT NULL;
```

**Array Migration Example:**

```sql
-- PostgreSQL (current)
CREATE TABLE job_preferences (
  desired_titles TEXT[] NOT NULL DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}'
);

SELECT * FROM job_preferences WHERE 'Engineer' = ANY(desired_titles);

-- D1/SQLite (target)
CREATE TABLE job_preferences (
  desired_titles TEXT NOT NULL DEFAULT '[]', -- JSON array as string
  keywords TEXT DEFAULT '[]'
);

-- Must parse JSON in application code
-- No native array operators in SQLite
```

**UUID Migration Example:**

```sql
-- PostgreSQL (current)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id)
);

-- D1/SQLite (target)
CREATE TABLE users (
  id TEXT PRIMARY KEY, -- UUID as string
  user_id TEXT NOT NULL -- UUID as string
);

-- Must generate UUIDs in application code (Workers)
-- Example: crypto.randomUUID() in JavaScript
```

**Sources:**
- [D1 Query JSON](https://developers.cloudflare.com/d1/sql-api/query-json/)
- [PostgreSQL to SQLite Conversion](https://gist.github.com/fiftin/18221054c7777e1f1207)

#### 2.3.4 Limited Extensions

**Supported:**
- FTS5 (full-text search) - replacement for PostgreSQL's full-text search
- JSON extension - basic JSON functions
- Math functions - standard math operations

**NOT Supported:**
- **pg_trgm** - Used for fuzzy text matching in job deduplication
- **pgvector** - Planned for semantic search (native vector operations)
- **fuzzystrmatch** - Fuzzy string matching

**Migration Impact:**
- Job deduplication using `SIMILARITY()` function must be rewritten
- Trigram indexes on job title/company/location cannot be replicated
- Semantic search with pgvector must use application-level similarity calculation

**Current Usage:**

```sql
-- PostgreSQL (current) - uses pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_jobs_title_trgm ON jobs USING GIN (title gin_trgm_ops);

-- Find similar job titles
SELECT title, SIMILARITY(title, 'Software Engineer') AS sim
FROM jobs
WHERE SIMILARITY(title, 'Software Engineer') > 0.6
ORDER BY sim DESC;
```

**D1 Alternative:**
- Use FTS5 for keyword search (not fuzzy matching)
- Implement Levenshtein distance in Workers code
- Trade-off: Slower, less accurate, more complex

**Sources:**
- [D1 SQL Statements](https://developers.cloudflare.com/d1/sql-api/sql-statements/)

#### 2.3.5 No Native Authentication

**CRITICAL:**
- D1 has **NO built-in authentication system**
- No equivalent to Supabase Auth
- Must build custom JWT authentication from scratch

**Options:**

1. **Custom JWT Auth in Workers**
   - Generate/verify JWT tokens in Cloudflare Workers
   - Store user credentials in D1 (hashed passwords)
   - Implement password reset, email verification, OAuth flows manually
   - **Effort:** 4-6 weeks of development

2. **Cloudflare Access**
   - Enterprise authentication service
   - Not suitable for consumer applications
   - Designed for corporate SSO

3. **Third-party Auth (e.g., Auth0, Clerk)**
   - Additional cost ($25-100/month)
   - Integration complexity
   - Vendor lock-in

4. **Keep Supabase Auth** (RECOMMENDED)
   - Continue using Supabase Auth even with D1 database
   - Exchange Supabase JWT for custom JWT for D1 queries
   - Proven pattern: Workers → Supabase Auth → D1

**Current Supabase Auth Features:**
- Email/password authentication
- LinkedIn OAuth
- Automatic session management
- Password reset flows
- Email confirmation
- JWT token generation/verification
- Account lockout protection

**Migration Impact:**
- Must rebuild ALL authentication features
- High security risk if implemented incorrectly
- Significant development effort

**Sources:**
- [Cloudflare Workers JWT Validation](https://developers.cloudflare.com/api-shield/security/jwt-validation/jwt-worker/)
- [Simple JWT Auth with Workers](https://blog.chapimenge.com/blog/programming/simple-jwt-authentication-with-cloudflare-workers/)

---

## 3. Feature Comparison Matrix

### 3.1 Database Features

| Feature | Supabase (PostgreSQL) | Cloudflare D1 (SQLite) | Migration Difficulty |
|---------|----------------------|------------------------|---------------------|
| **Max Database Size** | 8GB free, unlimited paid | 10GB (hard limit) | ⚠️ Medium |
| **Row Level Security** | ✅ Native | ❌ Not supported | 🔴 Critical |
| **JSONB Type** | ✅ Native | ❌ TEXT only | 🟡 High |
| **Array Types** | ✅ Native | ❌ JSON strings | 🟡 High |
| **UUID Type** | ✅ Native | ❌ TEXT only | 🟡 Medium |
| **ENUMs** | ✅ Native | ❌ TEXT + CHECK | 🟢 Low |
| **Full-Text Search** | ✅ tsvector, GIN | ✅ FTS5 | 🟡 Medium |
| **Fuzzy Matching** | ✅ pg_trgm | ❌ Manual implementation | 🟡 High |
| **Vector Search** | ✅ pgvector | ❌ Manual implementation | 🔴 Critical |
| **Triggers** | ✅ Full support | ✅ Full support | 🟢 Low |
| **Transactions** | ✅ ACID, multi-write | ⚠️ ACID, single-write | 🟡 Medium |
| **Concurrency** | ✅ High (multi-core) | ❌ Single-threaded | 🔴 Critical |
| **Global Replication** | ❌ Single region | ✅ Read replicas | 🟢 Advantage D1 |
| **Backup** | ✅ Point-in-time (7 days) | ✅ Time Travel (30 days) | 🟢 Advantage D1 |

### 3.2 Authentication & Security

| Feature | Supabase | Cloudflare D1 | Migration Difficulty |
|---------|----------|---------------|---------------------|
| **Built-in Auth** | ✅ Supabase Auth | ❌ None | 🔴 Critical |
| **Email/Password** | ✅ Native | ❌ Manual | 🔴 Critical |
| **OAuth (LinkedIn)** | ✅ Native | ❌ Manual | 🔴 Critical |
| **JWT Tokens** | ✅ Auto-generated | ❌ Manual | 🟡 High |
| **Session Management** | ✅ Built-in | ❌ Manual | 🟡 High |
| **Password Reset** | ✅ Built-in | ❌ Manual | 🟡 High |
| **Email Confirmation** | ✅ Built-in | ❌ Manual | 🟡 High |
| **Account Lockout** | ⚠️ Custom (DB table) | ❌ Manual | 🟡 Medium |
| **RLS Policies** | ✅ Native | ❌ Manual filtering | 🔴 Critical |

### 3.3 Storage

| Feature | Supabase Storage | Cloudflare R2 | Migration Difficulty |
|---------|-----------------|---------------|---------------------|
| **File Upload** | ✅ SDK | ✅ SDK | 🟢 Low |
| **Public URLs** | ✅ Native | ✅ Native | 🟢 Low |
| **Signed URLs** | ✅ Native | ✅ Pre-signed URLs | 🟢 Low |
| **RLS on Buckets** | ✅ Native | ❌ Manual ACLs | 🟡 Medium |
| **Storage Size** | 8GB free, $0.125/GB | Free unlimited, $0.015/GB | 🟢 Advantage R2 |
| **Egress Fees** | ✅ Included | ✅ Zero egress | 🟢 Both good |

### 3.4 Pricing

| Component | Supabase | Cloudflare D1 + R2 | Savings |
|-----------|----------|-------------------|---------|
| **Database** | $0.125/GB (8GB free) | $0.75/GB (5GB free) | ❌ D1 more expensive |
| **Storage** | $0.125/GB (8GB free) | $0.015/GB (free) | ✅ R2 cheaper |
| **Bandwidth** | Included | Zero egress | ✅ Both good |
| **Auth** | Included | ❌ Must build | ❌ Extra dev cost |
| **Total (typical)** | $25/month (free tier OK) | $5.50/month | ✅ $19.50 savings |

**BUT:** Development cost to rebuild auth, RLS, and migrate database: **12-16 weeks = $40,000-60,000 equivalent**

**Sources:**
- [Cloudflare D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Supabase Pricing](https://supabase.com/pricing)
- [D1 vs Supabase Cost Comparison](https://x.com/daniel_nguyenx/status/1860650757755937140)

---

## 4. Authentication Migration Strategy

### 4.1 Current Supabase Auth Architecture

**Frontend (React):**
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'jobmatch-auth-token',
    },
  }
)

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// Get session
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token // JWT token
```

**Backend (Express):**
```typescript
// backend/src/middleware/auth.ts
export async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization
  const token = authHeader.split(' ')[1] // Bearer <token>

  // Verify JWT with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  req.user = user
  req.userId = user.id
  next()
}
```

**Database RLS:**
```sql
-- RLS policies use auth.uid() - provided by Supabase Auth
CREATE POLICY "Users can manage their own applications"
  ON applications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 4.2 Option 1: Custom JWT Auth (NOT RECOMMENDED)

**Implementation:**

1. **Create Users Table in D1:**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY, -- UUID as TEXT
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- bcrypt hash
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

2. **Build Auth Workers:**
```typescript
// workers/api/routes/auth.ts
import { sign, verify } from '@tsndr/cloudflare-worker-jwt'
import bcrypt from 'bcryptjs'

// Signup
export async function signup(request: Request, env: Env) {
  const { email, password } = await request.json()

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10)

  // Insert user
  const userId = crypto.randomUUID()
  await env.DB.prepare(
    'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)'
  ).bind(userId, email, passwordHash).run()

  // Generate JWT
  const token = await sign({
    sub: userId,
    email,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
  }, env.JWT_SECRET)

  return new Response(JSON.stringify({ token, userId }))
}

// Login
export async function login(request: Request, env: Env) {
  const { email, password } = await request.json()

  // Get user
  const user = await env.DB.prepare(
    'SELECT id, email, password_hash FROM users WHERE email = ?'
  ).bind(email).first()

  if (!user) {
    return new Response('Invalid credentials', { status: 401 })
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return new Response('Invalid credentials', { status: 401 })
  }

  // Generate JWT
  const token = await sign({
    sub: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7)
  }, env.JWT_SECRET)

  return new Response(JSON.stringify({ token, userId: user.id }))
}

// Auth middleware
export async function authenticateRequest(request: Request, env: Env) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')

  try {
    const payload = await verify(token, env.JWT_SECRET)
    return payload.sub // user ID
  } catch {
    return null
  }
}
```

3. **Replace RLS with Manual Filtering:**
```typescript
// BEFORE (with Supabase RLS)
const { data, error } = await supabase
  .from('applications')
  .select('*')
// RLS automatically filters to user's data

// AFTER (with D1, manual filtering)
const userId = await authenticateRequest(request, env)
if (!userId) return new Response('Unauthorized', { status: 401 })

const applications = await env.DB.prepare(
  'SELECT * FROM applications WHERE user_id = ?'
).bind(userId).all()
```

**Additional Features to Build:**
- Password reset (email tokens, expiration)
- Email confirmation (verification tokens)
- OAuth integration (LinkedIn)
- Session management
- Account lockout protection
- Two-factor authentication (future)

**Effort Estimate:** 4-6 weeks

**Sources:**
- [Simple JWT Auth with Workers](https://blog.chapimenge.com/blog/programming/simple-jwt-authentication-with-cloudflare-workers/)
- [JWT Validation in Workers](https://developers.cloudflare.com/api-shield/security/jwt-validation/jwt-worker/)

### 4.3 Option 2: Third-Party Auth (Auth0, Clerk)

**Pros:**
- Pre-built authentication flows
- OAuth integrations included
- Security best practices
- Compliance (SOC2, GDPR)

**Cons:**
- Additional cost ($25-100/month)
- Vendor lock-in
- Still need to integrate with D1
- Still need manual RLS filtering

**Effort Estimate:** 2-3 weeks

### 4.4 Option 3: Keep Supabase Auth + D1 Database (HYBRID)

**Architecture:**
1. Use Supabase Auth for authentication (as-is)
2. Migrate database from Supabase PostgreSQL → Cloudflare D1
3. Verify Supabase JWT in Workers
4. Query D1 with manual user_id filtering

**Pros:**
- Keep robust auth system
- Avoid rebuilding auth
- Proven integration pattern

**Cons:**
- Still dependent on Supabase (defeats purpose of migration)
- Must maintain two services
- Still need manual RLS filtering

**Effort Estimate:** 8-10 weeks (database migration only)

**Sources:**
- [Using Supabase with Cloudflare Workers](https://supabase.com/partners/integrations/cloudflare-workers)
- [JWT Token Exchange Pattern](https://queen.raae.codes/2025-05-01-supabase-exchange/)

### 4.5 Recommendation

**DO NOT migrate authentication to custom JWT system.**

If migration is required, use **Option 3 (Hybrid)** - keep Supabase Auth, migrate only database. However, this still requires manual RLS filtering in all queries, which is a significant security risk.

---

## 5. Storage Migration Strategy

### 5.1 Current Supabase Storage Architecture

**Buckets:**
- `avatars` - Public read, RLS write (users can upload only their own avatar)
- `resumes` - Private, RLS (users can access only their own resumes)
- `exports` - Private, RLS (users can access only their own exports)

**Current Code:**
```typescript
// src/hooks/useFileUpload.ts
import { supabase } from '@/lib/supabase'

export async function uploadFile(file: File, storagePath: string, bucket: string) {
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath)

  return urlData.publicUrl
}
```

**RLS Policies:**
```sql
-- Avatars: Public read, user can upload only their own
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );
```

### 5.2 Migration to Cloudflare R2

**R2 Architecture:**

1. **Create R2 Buckets:**
```bash
# Using Wrangler CLI
wrangler r2 bucket create jobmatch-avatars
wrangler r2 bucket create jobmatch-resumes
wrangler r2 bucket create jobmatch-exports
```

2. **Upload Files (Workers API):**
```typescript
// workers/api/routes/storage.ts
export async function uploadToR2(
  request: Request,
  env: Env,
  bucket: 'avatars' | 'resumes' | 'exports'
) {
  // Authenticate user
  const userId = await authenticateRequest(request, env)
  if (!userId) return new Response('Unauthorized', { status: 401 })

  // Get file from request
  const formData = await request.formData()
  const file = formData.get('file') as File

  // Generate path with user ID
  const path = `users/${userId}/${bucket}/${file.name}`

  // Upload to R2
  await env[bucket.toUpperCase()].put(path, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  })

  // Return public URL
  const url = `https://r2.jobmatch.ai/${bucket}/${path}`
  return new Response(JSON.stringify({ url }))
}
```

3. **Public URLs:**
```typescript
// Get public URL (for avatars)
const url = `https://r2.jobmatch.ai/avatars/users/${userId}/avatar.jpg`

// Generate signed URL (for private files)
const signedUrl = await env.RESUMES.createSignedUrl(path, {
  expiresIn: 3600, // 1 hour
})
```

4. **Replace Supabase Storage Calls:**
```typescript
// BEFORE
const { data } = await supabase.storage
  .from('avatars')
  .upload(path, file)

// AFTER
await fetch(`https://api.jobmatch.ai/storage/upload`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
})
```

**RLS Alternative:**
- R2 has **no built-in RLS**
- Must implement access control in Workers
- Check user_id matches path prefix: `users/${userId}/`

**Migration Steps:**
1. Create R2 buckets
2. Copy existing files from Supabase Storage → R2 (one-time script)
3. Update upload/download code to use R2 API
4. Update database URLs (avatar_url, resume_url, etc.)
5. Test file access with new URLs
6. Decommission Supabase Storage buckets

**Effort Estimate:** 1-2 weeks

**Cost Savings:**
- Supabase Storage: $0.125/GB (after 8GB free)
- R2 Storage: $0.015/GB (unlimited free, $0.015/GB if paid)
- **Savings:** ~90% on storage costs

**Sources:**
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [R2 API Documentation](https://developers.cloudflare.com/r2/)

---

## 6. Database Schema Migration

### 6.1 PostgreSQL → SQLite Conversion Challenges

#### 6.1.1 UUID → TEXT Conversion

**All 26 tables** use UUID primary keys:

```sql
-- PostgreSQL (current)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- D1/SQLite (target)
CREATE TABLE users (
  id TEXT PRIMARY KEY, -- UUID as TEXT
  email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Must generate UUIDs in application code
-- Workers: crypto.randomUUID()
```

**Migration Script:**
```typescript
// Convert UUIDs to TEXT
const users = await supabase.from('users').select('*')
for (const user of users.data) {
  await env.DB.prepare(
    'INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)'
  ).bind(
    user.id, // UUID already a string in JS
    user.email,
    user.created_at
  ).run()
}
```

**Impact:**
- ✅ UUIDs are already strings in JavaScript
- ✅ No data loss
- ⚠️ Lose type safety (can insert non-UUID strings)
- ⚠️ Must validate UUID format in application

#### 6.1.2 JSONB → TEXT Conversion

**Affected Tables:**
- `jobs.embedding` - 768-dimensional vector
- `users.resume_embedding` - User profile vector
- `applications.variants` - Cover letter variants
- `work_experience.accomplishments` - Structured data

```sql
-- PostgreSQL (current)
CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  embedding JSONB, -- 768-dimensional vector [0.1, 0.2, ...]
  metadata JSONB   -- Arbitrary data
);

CREATE INDEX idx_jobs_embedding ON jobs USING GIN(embedding);

-- Query
SELECT * FROM jobs WHERE embedding @> '{"source": "linkedin"}';

-- D1/SQLite (target)
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  embedding TEXT, -- JSON string
  metadata TEXT   -- JSON string
);

CREATE INDEX idx_jobs_metadata ON jobs(json_extract(metadata, '$.source'));

-- Query
SELECT * FROM jobs WHERE json_extract(metadata, '$.source') = 'linkedin';
```

**Migration Script:**
```typescript
// PostgreSQL JSONB is already serialized to JSON in JS
const jobs = await supabase.from('jobs').select('*')
for (const job of jobs.data) {
  await env.DB.prepare(
    'INSERT INTO jobs (id, embedding, metadata) VALUES (?, ?, ?)'
  ).bind(
    job.id,
    JSON.stringify(job.embedding), // Convert to JSON string
    JSON.stringify(job.metadata)
  ).run()
}
```

**Impact:**
- ✅ No data loss (JSONB serializes to JSON)
- ❌ Lose GIN indexes (slower queries)
- ❌ Lose JSONB operators (`@>`, `?`, `->>`)
- ⚠️ Must parse JSON in application code
- ⚠️ Semantic search requires fetching ALL embeddings and computing similarity in Workers

#### 6.1.3 Array → JSON Conversion

**Affected Tables:**
- `job_preferences` - All preference fields are arrays

```sql
-- PostgreSQL (current)
CREATE TABLE job_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  desired_titles TEXT[] NOT NULL DEFAULT '{}',
  desired_locations TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}'
);

-- Query with array operators
SELECT * FROM job_preferences WHERE 'Engineer' = ANY(desired_titles);

-- D1/SQLite (target)
CREATE TABLE job_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  desired_titles TEXT NOT NULL DEFAULT '[]', -- JSON array
  desired_locations TEXT DEFAULT '[]',
  keywords TEXT DEFAULT '[]'
);

-- Query with JSON functions
SELECT * FROM job_preferences
WHERE json_extract(desired_titles, '$') LIKE '%Engineer%';
```

**Migration Script:**
```typescript
const prefs = await supabase.from('job_preferences').select('*')
for (const pref of prefs.data) {
  await env.DB.prepare(`
    INSERT INTO job_preferences
    (id, user_id, desired_titles, desired_locations, keywords)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    pref.id,
    pref.user_id,
    JSON.stringify(pref.desired_titles || []),
    JSON.stringify(pref.desired_locations || []),
    JSON.stringify(pref.keywords || [])
  ).run()
}
```

**Impact:**
- ✅ No data loss
- ❌ Lose array operators (`ANY`, `@>`, `&&`)
- ❌ Slower queries (must parse JSON)
- ⚠️ Must parse/serialize arrays in ALL queries

#### 6.1.4 ENUM → TEXT Conversion

```sql
-- PostgreSQL (current)
CREATE TYPE application_status AS ENUM (
  'draft',
  'submitted',
  'interviewing',
  'offer',
  'rejected',
  'withdrawn'
);

CREATE TABLE applications (
  id UUID PRIMARY KEY,
  status application_status
);

-- D1/SQLite (target)
CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  status TEXT CHECK (
    status IN ('draft', 'submitted', 'interviewing', 'offer', 'rejected', 'withdrawn')
  )
);
```

**Impact:**
- ✅ CHECK constraint provides validation
- ⚠️ Lose type safety (can bypass with raw SQL)
- ✅ Migration straightforward

#### 6.1.5 Triggers Migration

**Current Triggers:**
```sql
-- PostgreSQL
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**D1/SQLite Equivalent:**
```sql
CREATE TRIGGER update_rate_limits_updated_at
  AFTER UPDATE ON rate_limits
  FOR EACH ROW
BEGIN
  UPDATE rate_limits
  SET updated_at = datetime('now')
  WHERE id = NEW.id;
END;
```

**Impact:**
- ✅ SQLite supports triggers
- ⚠️ Different syntax (must rewrite)
- ✅ Functionality preserved

### 6.2 PostgreSQL Extensions Migration

#### 6.2.1 pg_trgm (Fuzzy Matching)

**Current Usage:**
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram indexes
CREATE INDEX idx_jobs_title_trgm ON jobs USING GIN (title gin_trgm_ops);
CREATE INDEX idx_jobs_company_trgm ON jobs USING GIN (company gin_trgm_ops);

-- Find similar job titles
SELECT title, SIMILARITY(title, 'Software Engineer') AS sim
FROM jobs
WHERE SIMILARITY(title, 'Software Engineer') > 0.6
ORDER BY sim DESC
LIMIT 10;
```

**D1 Alternative:**
- ❌ No pg_trgm equivalent
- ⚠️ Use FTS5 for keyword matching (not fuzzy)
- ⚠️ Implement Levenshtein distance in Workers (slow)

**FTS5 Example:**
```sql
-- Create FTS5 virtual table
CREATE VIRTUAL TABLE jobs_fts USING fts5(title, company, content=jobs);

-- Populate FTS5 table
INSERT INTO jobs_fts SELECT rowid, title, company FROM jobs;

-- Search (keyword match, not fuzzy)
SELECT * FROM jobs_fts WHERE jobs_fts MATCH 'software engineer';
```

**Impact:**
- ❌ Lose fuzzy matching capability
- ⚠️ Job deduplication logic must be rewritten
- ⚠️ Worse search quality

#### 6.2.2 pgvector (Planned)

**Planned Usage:**
```sql
-- PostgreSQL with pgvector (future)
CREATE EXTENSION vector;

CREATE TABLE jobs (
  embedding vector(768)
);

CREATE INDEX ON jobs USING ivfflat (embedding vector_cosine_ops);

-- Similarity search (fast)
SELECT * FROM jobs
ORDER BY embedding <-> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```

**D1 Alternative:**
```sql
-- Store embeddings as JSON
CREATE TABLE jobs (
  embedding TEXT -- JSON array
);

-- Must compute cosine similarity in Workers
```

**Workers Code:**
```typescript
// Fetch ALL job embeddings
const jobs = await env.DB.prepare('SELECT id, embedding FROM jobs').all()

// Compute cosine similarity in JS
const userEmbedding = [0.1, 0.2, ...] // 768 dimensions

const results = jobs.results.map(job => {
  const jobEmbedding = JSON.parse(job.embedding)
  const similarity = cosineSimilarity(userEmbedding, jobEmbedding)
  return { ...job, similarity }
})

// Sort by similarity
results.sort((a, b) => b.similarity - a.similarity)
```

**Impact:**
- ❌ Extremely slow (must fetch ALL jobs, compute in JS)
- ❌ High memory usage (all embeddings in memory)
- ❌ Not scalable (thousands of jobs × 768 dimensions)
- ⚠️ Semantic search effectively impossible at scale

### 6.3 Row Level Security (RLS) Migration

**CRITICAL BLOCKER:**

**Current RLS Usage:**
- 184 uses of `auth.uid()` in policies
- 13 tables with RLS enabled
- All user data protected by database-level security

**Example RLS Policy:**
```sql
-- PostgreSQL (current)
CREATE POLICY "Users can manage their own applications"
  ON applications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Supabase automatically enforces this policy
-- Users can ONLY see/modify their own applications
```

**D1 Equivalent:**
- ❌ **No RLS support in SQLite/D1**
- ⚠️ Must filter by user_id in EVERY query (application-level)

**Manual Filtering Required:**
```typescript
// BEFORE (Supabase with RLS)
const { data } = await supabase
  .from('applications')
  .select('*')
// RLS automatically filters to current user

// AFTER (D1 without RLS)
const userId = await authenticateRequest(request, env)
if (!userId) return new Response('Unauthorized', { status: 401 })

const applications = await env.DB.prepare(`
  SELECT * FROM applications WHERE user_id = ?
`).bind(userId).all()
// Must MANUALLY add WHERE user_id = ? to EVERY query
```

**Risk Analysis:**

1. **Data Leakage Risk:**
   - If developer forgets `WHERE user_id = ?` clause, ALL users' data is exposed
   - No database-level enforcement
   - High risk of security vulnerabilities

2. **Query Complexity:**
   - Must add user_id filter to ALL queries (100+ queries in codebase)
   - Complex queries require careful WHERE clause composition
   - Join queries must filter ALL tables

3. **Maintenance Burden:**
   - Every new query must remember to filter
   - Code reviews must catch missing filters
   - No automated enforcement

**Example Complex Query:**
```sql
-- PostgreSQL (current) - RLS enforced automatically
SELECT
  a.*,
  j.title,
  j.company
FROM applications a
JOIN jobs j ON a.job_id = j.id;

-- D1 (target) - Must filter BOTH tables
SELECT
  a.*,
  j.title,
  j.company
FROM applications a
JOIN jobs j ON a.job_id = j.id
WHERE a.user_id = ? AND j.user_id = ?;
-- ^ Easy to forget one of these filters!
```

**Mitigation Strategies:**

1. **ORM with Built-in Filtering:**
   - Use Drizzle ORM with custom RLS middleware
   - Automatically inject user_id filters
   - Still risk of bypassing ORM

2. **Database Views:**
   - Create per-user views (not scalable)
   - Requires dynamic view creation

3. **Query Wrapper Functions:**
   - Wrap all queries in functions that add filters
   - Enforce via code review

**Recommendation:**
- ❌ **RLS migration is too risky**
- ⚠️ High probability of data leakage bugs
- 🔴 **This alone is a blocker for migration**

### 6.4 Migration Scripts

**Conceptual Migration Flow:**

```typescript
// 1. Export data from Supabase
const tables = [
  'users', 'jobs', 'applications', 'work_experience', 'education',
  'skills', 'resumes', 'job_preferences', 'sessions', 'rate_limits',
  // ... all 26 tables
]

for (const table of tables) {
  const { data } = await supabase.from(table).select('*')

  // 2. Transform data
  const transformed = data.map(row => ({
    ...row,
    // Convert UUIDs to TEXT (already strings in JS)
    id: row.id,
    // Convert JSONB to JSON strings
    embedding: row.embedding ? JSON.stringify(row.embedding) : null,
    // Convert arrays to JSON strings
    desired_titles: row.desired_titles ? JSON.stringify(row.desired_titles) : null,
  }))

  // 3. Insert into D1
  for (const row of transformed) {
    await env.DB.prepare(`
      INSERT INTO ${table} (${Object.keys(row).join(', ')})
      VALUES (${Object.keys(row).map(() => '?').join(', ')})
    `).bind(...Object.values(row)).run()
  }
}
```

**Effort Estimate:** 2-3 weeks (including testing)

---

## 7. Code Changes Required

### 7.1 Frontend Changes

**Current Supabase Client Usage:**

```typescript
// src/lib/supabase.ts (current)
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Usage throughout app
const { data, error } = await supabase
  .from('jobs')
  .select('*')
  .eq('status', 'active')
```

**After D1 Migration:**

```typescript
// src/lib/api.ts (new)
export async function fetchJobs() {
  const response = await fetch('https://api.jobmatch.ai/jobs', {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  })
  return response.json()
}

// All database queries must go through Workers API
// No more direct database access from frontend
```

**Affected Files:**
- `src/hooks/useJobs.ts` - Job fetching
- `src/hooks/useApplications.ts` - Application management
- `src/hooks/useProfile.ts` - User profile
- `src/hooks/useWorkExperience.ts` - Work experience
- `src/hooks/useEducation.ts` - Education
- `src/hooks/useSkills.ts` - Skills
- `src/hooks/useResumes.ts` - Resume management
- `src/hooks/useFileUpload.ts` - File upload (Supabase Storage → R2)
- `src/contexts/AuthContext.tsx` - Authentication

**Total Files to Modify:** ~50 files

### 7.2 Backend Changes (Workers)

**Convert Express Routes to Hono:**

```typescript
// backend/src/routes/jobs.ts (current - Express)
import express from 'express'
const router = express.Router()

router.get('/jobs', authenticateUser, async (req, res) => {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', req.userId)

  res.json({ data })
})

// workers/api/routes/jobs.ts (target - Hono)
import { Hono } from 'hono'
const app = new Hono()

app.get('/jobs', async (c) => {
  const userId = await authenticateRequest(c.req, c.env)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)

  // Manual filtering (no RLS)
  const jobs = await c.env.DB.prepare(
    'SELECT * FROM jobs WHERE user_id = ?'
  ).bind(userId).all()

  return c.json({ data: jobs.results })
})
```

**Affected Routes:**
- `backend/src/routes/jobs.ts` - Job CRUD
- `backend/src/routes/applications.ts` - Application CRUD + AI generation
- `backend/src/routes/auth.ts` - Authentication (complete rewrite)
- `backend/src/routes/profile.ts` - User profile
- `backend/src/routes/resume.ts` - Resume upload/parsing
- `backend/src/routes/exports.ts` - PDF/DOCX export
- `backend/src/routes/emails.ts` - Email sending

**Total Routes:** 18 endpoints (per API_MIGRATION_CHECKLIST.md)

### 7.3 Database Query Changes

**EVERY query must be rewritten:**

```typescript
// BEFORE (PostgreSQL with RLS)
const { data, error } = await supabase
  .from('applications')
  .select('*, jobs(*)')
  .eq('status', 'submitted')
  .order('created_at', { ascending: false })
  .limit(10)

// AFTER (D1 with manual filtering)
const userId = await authenticateRequest(request, env)

const applications = await env.DB.prepare(`
  SELECT
    a.*,
    j.title AS job_title,
    j.company AS job_company
  FROM applications a
  JOIN jobs j ON a.job_id = j.id
  WHERE a.user_id = ? AND a.status = 'submitted'
  ORDER BY a.created_at DESC
  LIMIT 10
`).bind(userId).all()
```

**Impact:**
- ⚠️ Must manually filter by user_id in EVERY query
- ⚠️ Must rewrite 100+ queries across codebase
- ⚠️ JOIN queries are more complex
- ⚠️ High risk of forgetting user_id filter

### 7.4 Type Safety Changes

**Current Supabase Types:**

```typescript
// src/types/supabase.ts (auto-generated from database)
export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string
          user_id: string
          title: string
          embedding: number[] // JSONB array
          desired_titles: string[] // PostgreSQL array
        }
      }
    }
  }
}
```

**After D1 Migration:**

```typescript
// Must manually define types (no auto-generation)
export type Job = {
  id: string
  user_id: string
  title: string
  embedding: string // JSON string, must parse
  desired_titles: string // JSON string, must parse
}

// Manual parsing required
const job: Job = result.results[0]
const embedding: number[] = JSON.parse(job.embedding)
const titles: string[] = JSON.parse(job.desired_titles)
```

**Impact:**
- ❌ Lose auto-generated types
- ⚠️ Must manually maintain type definitions
- ⚠️ More runtime parsing (slower, error-prone)

### 7.5 Estimated Code Changes

| Component | Files to Modify | Effort (Weeks) |
|-----------|-----------------|----------------|
| **Frontend Hooks** | 20 files | 2-3 weeks |
| **Backend Routes** | 18 endpoints | 3-4 weeks |
| **Authentication** | 5 files | 4-6 weeks |
| **Storage (R2)** | 8 files | 1-2 weeks |
| **Database Queries** | 100+ queries | 4-5 weeks |
| **Types** | 10 files | 1 week |
| **Testing** | All tests | 2-3 weeks |
| **Total** | ~150-200 files | **12-16 weeks** |

---

## 8. Migration Timeline & Phases

### 8.1 Phased Migration Approach

**Phase 1: Preparation (2 weeks)**
- Set up Cloudflare Workers environment
- Create D1 database
- Create R2 buckets
- Build custom auth system OR set up third-party auth
- Design RLS workarounds

**Phase 2: Schema Migration (2 weeks)**
- Convert PostgreSQL schema to SQLite
- Write migration scripts
- Test schema in staging
- Migrate data (one-time copy)

**Phase 3: Backend Migration (4-6 weeks)**
- Convert Express routes to Hono
- Rewrite all queries with manual filtering
- Implement auth middleware
- Test all endpoints

**Phase 4: Frontend Migration (2-3 weeks)**
- Update all data fetching hooks
- Replace Supabase client calls with API calls
- Update file upload to R2
- Test all user flows

**Phase 5: Testing & QA (2-3 weeks)**
- Unit tests
- Integration tests
- Security testing (RLS bypass attempts)
- Load testing
- User acceptance testing

**Phase 6: Deployment & Monitoring (1 week)**
- Deploy to production
- Monitor for errors
- Rollback plan
- Gradual traffic shift

**Total Timeline:** **12-16 weeks** (3-4 months)

### 8.2 Rollback Plan

**Critical:** Must have Supabase as fallback during migration

1. **Keep Supabase active** during migration
2. **Dual-write** to both Supabase and D1 for 2 weeks
3. **Feature flag** to switch between backends
4. **Monitor** for data consistency issues
5. **Rollback** to Supabase if critical bugs found

---

## 9. Risk Analysis

### 9.1 Security Risks

| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|------------|
| **Data leakage** (missing user_id filter) | High | Critical | Code review, automated tests, ORM |
| **Authentication bypass** | Medium | Critical | Third-party auth, extensive testing |
| **SQL injection** | Medium | High | Parameterized queries, validation |
| **Broken access control** | High | Critical | Manual RLS enforcement in code |
| **Session hijacking** | Low | High | Secure JWT implementation |

### 9.2 Data Risks

| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|------------|
| **Data loss during migration** | Medium | Critical | Backup, dual-write, validation |
| **Data corruption** (type conversion) | Medium | High | Migration scripts, checksums |
| **Inconsistent data** (dual-write) | Medium | Medium | Sync jobs, conflict resolution |
| **Embedding degradation** | High | Medium | Validate vector dimensions |

### 9.3 Performance Risks

| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|------------|
| **Slow queries** (no GIN indexes) | High | Medium | Optimize queries, caching |
| **Semantic search fails** (no pgvector) | High | High | Fetch all, compute in Workers (slow) |
| **Concurrency bottleneck** | Medium | Medium | Rate limiting, queues |
| **Cold starts** | Low | Low | Workers have <50ms cold starts |

### 9.4 Development Risks

| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|------------|
| **Timeline overrun** | High | Medium | Add 50% buffer, phased approach |
| **Developer churn** | Medium | High | Documentation, pair programming |
| **Scope creep** | Medium | Medium | Strict scope, change control |
| **Integration issues** | High | High | Prototype early, incremental testing |

### 9.5 Overall Risk Assessment

**Risk Level: VERY HIGH**

**Reasons:**
1. **No native RLS** - Must manually filter ALL queries
2. **Authentication rebuild** - 4-6 weeks of custom auth development
3. **Data model compromises** - JSONB → TEXT, arrays → JSON
4. **100+ query rewrites** - High probability of bugs
5. **Semantic search degradation** - No pgvector equivalent

**Recommendation:** **DO NOT PROCEED** with migration unless:
- Absolutely required by business (e.g., Supabase shutting down)
- 3-4 months of development time available
- Willing to accept degraded features (semantic search, fuzzy matching)

---

## 10. Cost Analysis

### 10.1 Current Supabase Costs

**Supabase Free Tier:**
- 8GB database storage
- 8GB file storage
- 50GB bandwidth
- 500MB database size (our current usage)

**Supabase Pro Tier ($25/month):**
- Required if we exceed free tier limits
- Unlimited API requests
- Daily backups

**Current Cost:** $0/month (within free tier)
**Future Cost:** $25-80/month (if we grow beyond free tier)

### 10.2 Cloudflare D1 + R2 Costs

**D1 Pricing:**
- Free: 5GB storage, 5M rows read/day, 100K rows write/day
- Paid: $0.75/GB storage, rows read/written pricing

**R2 Pricing:**
- Storage: $0.015/GB/month
- Operations: $4.50/million Class A, $0.36/million Class B
- Egress: $0 (free)

**Workers Pricing:**
- $5/month base (Paid plan)
- 10M requests/month included

**Estimated Monthly Cost:**
- D1: $5.50/month (within free tier for storage, minimal operations)
- R2: $1/month (66GB at $0.015/GB)
- Workers: $5/month
- **Total:** $11.50/month

**Potential Savings:** $13.50/month (if Supabase is $25/month)
OR $69.50/month (if Supabase grows to $81/month)

**Source:** [COST_ANALYSIS.md](../cloudflare-migration/COST_ANALYSIS.md)

### 10.3 Development Cost

**Migration Effort:** 12-16 weeks
**Developer Time:** 480-640 hours
**Cost (at $100/hour):** $48,000-64,000

**Amortization:**
- Savings: $13.50-69.50/month
- Payback period: 691-4,741 months (58-395 years)

**Conclusion:** **Migration is NOT financially justified**

### 10.4 Hidden Costs

1. **Ongoing Maintenance:**
   - Manual RLS enforcement (code reviews)
   - Type conversion bugs (parsing JSON)
   - Performance optimization (no native indexes)
   - Estimated: 20-40 hours/month = $2,000-4,000/month

2. **Opportunity Cost:**
   - 3-4 months NOT building features
   - Lost revenue/growth

3. **Risk Costs:**
   - Security incidents (data leakage)
   - Downtime during migration
   - Customer churn

---

## 11. Alternative Solutions

### 11.1 Stay with Supabase (RECOMMENDED)

**Pros:**
- ✅ No migration cost
- ✅ Keep all features (RLS, JSONB, arrays, pgvector)
- ✅ Integrated auth
- ✅ Lower risk
- ✅ Faster time to market

**Cons:**
- ⚠️ Costs may increase if we exceed free tier ($25-80/month)
- ⚠️ Vendor lock-in (but PostgreSQL is standard)

**Cost:** $0-80/month

### 11.2 Hybrid: Cloudflare Workers + Supabase

**Architecture:**
- Migrate backend from Railway → Cloudflare Workers
- Keep Supabase for database, auth, storage
- Use Supabase client in Workers

**Pros:**
- ✅ Cost savings on backend ($75/month vs Railway)
- ✅ Keep Supabase features (RLS, auth, storage)
- ✅ Lower migration effort (8-10 weeks vs 12-16 weeks)
- ✅ Proven integration pattern

**Cons:**
- ⚠️ Still dependent on Supabase

**Cost:** $5.50/month (Workers) + $0-25/month (Supabase) = **$5.50-30.50/month**

**This is the current plan per COST_ANALYSIS.md** ✅

**Sources:**
- [Cloudflare Workers + Supabase Integration](https://supabase.com/partners/integrations/cloudflare-workers)
- [Using Supabase with Workers](https://developers.cloudflare.com/workers/databases/third-party-integrations/supabase/)

### 11.3 Neon (Serverless PostgreSQL)

**Alternative to Supabase:**
- Serverless PostgreSQL (same as Supabase's database)
- Cheaper than Supabase Pro
- No built-in auth or storage (must use third-party)

**Pros:**
- ✅ Keep PostgreSQL (no schema migration)
- ✅ Cheaper than Supabase ($0-20/month)
- ✅ Compatible with existing queries

**Cons:**
- ⚠️ Must replace auth (Supabase Auth → Auth0/Clerk)
- ⚠️ Must replace storage (Supabase Storage → R2)

**Cost:** $0-20/month (Neon) + $25/month (Auth0) + $1/month (R2) = **$26-46/month**

### 11.4 PlanetScale (MySQL)

**Alternative:**
- Serverless MySQL
- Generous free tier

**Pros:**
- ✅ Cheaper than Supabase
- ✅ Serverless scaling

**Cons:**
- ❌ MySQL, not PostgreSQL (schema rewrite)
- ❌ No JSONB, limited array support
- ❌ No built-in auth

**Not recommended** (similar migration effort as D1)

---

## 12. Final Recommendation

### 12.1 Executive Summary

**DO NOT migrate to Cloudflare D1.**

**Reasons:**
1. **No Row Level Security** - Critical blocker, high security risk
2. **Limited data types** - JSONB → TEXT, arrays → JSON
3. **No native auth** - Must rebuild authentication (4-6 weeks)
4. **Semantic search degradation** - No pgvector equivalent
5. **High migration cost** - 12-16 weeks = $48,000-64,000
6. **Low ROI** - Payback period: 58-395 years

### 12.2 Recommended Approach

**Option: Hybrid (Cloudflare Workers + Supabase)**

**What:**
- Migrate backend: Railway → Cloudflare Workers (Hono framework)
- Keep database: Supabase PostgreSQL (no migration)
- Keep auth: Supabase Auth (no changes)
- Keep storage: Supabase Storage (or optionally migrate to R2)

**Why:**
- ✅ Cost savings: $75/month (Railway eliminated)
- ✅ Better performance: Edge computing, global distribution
- ✅ Lower risk: No database migration, proven pattern
- ✅ Faster timeline: 8-10 weeks vs 12-16 weeks
- ✅ Keep all features: RLS, JSONB, arrays, pgvector, auth

**Cost:**
- Workers: $5.50/month
- Supabase: $0-25/month (free tier, then Pro if needed)
- **Total:** $5.50-30.50/month
- **Savings:** $50-75/month vs current Railway setup

**Timeline:** 8-10 weeks (already in progress per COST_ANALYSIS.md)

**This is the current migration plan** - continue with Workers migration, skip D1 migration.

### 12.3 When to Reconsider D1

**Only migrate to D1 if:**
1. Supabase announces shutdown or unsustainable price increases
2. You have 3-4 months of dedicated development time
3. You're willing to accept degraded features:
   - No native RLS (manual filtering in all queries)
   - Slower semantic search (no pgvector)
   - Worse fuzzy matching (no pg_trgm)
4. You have extensive security testing capacity
5. You can afford $50,000+ in development costs

**Otherwise:** Stay with Supabase, migrate backend to Workers.

---

## Sources & References

### Cloudflare D1 Documentation
- [D1 Overview](https://developers.cloudflare.com/d1/)
- [D1 Limits](https://developers.cloudflare.com/d1/platform/limits/)
- [D1 Pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [D1 SQL Statements](https://developers.cloudflare.com/d1/sql-api/sql-statements/)
- [D1 Query JSON](https://developers.cloudflare.com/d1/sql-api/query-json/)
- [D1 Data Security](https://developers.cloudflare.com/d1/reference/data-security/)
- [D1 GA Announcement](https://blog.cloudflare.com/making-full-stack-easier-d1-ga-hyperdrive-queues/)
- [D1 Read Replication](https://developers.cloudflare.com/changelog/2025-04-10-d1-read-replication-beta/)

### Cloudflare R2 Documentation
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [R2 Calculator](https://r2-calculator.cloudflare.com/)
- [R2 vs S3 Comparison](https://www.cloudflare.com/pg-cloudflare-r2-vs-aws-s3/)

### Cloudflare Workers Documentation
- [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [JWT Validation in Workers](https://developers.cloudflare.com/api-shield/security/jwt-validation/jwt-worker/)
- [Workers + Supabase Integration](https://developers.cloudflare.com/workers/databases/third-party-integrations/supabase/)

### Migration Guides
- [PostgreSQL to SQLite Conversion](https://gist.github.com/fiftin/18221054c7777e1f1207)
- [Supabase JWT Token Exchange](https://queen.raae.codes/2025-05-01-supabase-exchange/)
- [Turso RLS Demo](https://github.com/nileshtrivedi/turso-row-level-security-demo)

### Cost Comparisons
- [D1 vs Supabase Pricing](https://x.com/daniel_nguyenx/status/1860650757755937140)
- [Cloudflare vs Supabase Comparison](https://getdeploying.com/cloudflare-vs-supabase)
- [Cloud Platforms for AI Comparison](https://medium.com/@liuxiong332/top-5-cloud-platforms-for-ai-unveiling-the-best-deals-and-features-for-developers-4f6f96e31fb0)

### Internal Documentation
- [Cloudflare Workers Cost Analysis](../cloudflare-migration/COST_ANALYSIS.md)
- [Cloudflare Workers Migration Strategy](../cloudflare-migration/MIGRATION_STRATEGY.md)
- [Cloudflare Workers Setup](../cloudflare-migration/CLOUDFLARE_WORKERS_SETUP.md)
- [API Migration Checklist](../cloudflare-migration/API_MIGRATION_CHECKLIST.md)

---

**Document Version:** 1.0
**Last Updated:** 2025-12-31
**Next Review:** Only if Supabase viability changes
**Status:** Migration NOT recommended - proceed with Workers + Supabase hybrid approach
