# D1 Schema Mapping Guide

**PostgreSQL → SQLite (D1) Conversion**

**Created:** 2025-12-31
**Migration File:** `migrations/d1/001_initial_schema.sql`
**Total Tables:** 26 PostgreSQL tables → 26 SQLite tables + 3 FTS5 virtual tables

---

## Table of Contents

1. [Data Type Conversions](#data-type-conversions)
2. [Table-by-Table Mapping](#table-by-table-mapping)
3. [Full-Text Search Strategy](#full-text-search-strategy)
4. [Removed Features](#removed-features)
5. [Application Changes Required](#application-changes-required)
6. [Query Examples](#query-examples)

---

## Data Type Conversions

### Core Type Mappings

| PostgreSQL Type | D1 (SQLite) Type | Notes | Example |
|-----------------|------------------|-------|---------|
| `UUID` | `TEXT` | Use `crypto.randomUUID()` in Workers | `'550e8400-e29b-41d4-a716-446655440000'` |
| `VARCHAR`, `TEXT` | `TEXT` | Direct mapping | `'Hello World'` |
| `INTEGER`, `BIGINT` | `INTEGER` | Direct mapping | `42` |
| `NUMERIC`, `DECIMAL`, `REAL`, `DOUBLE PRECISION` | `REAL` | Direct mapping | `3.14159` |
| `BOOLEAN` | `INTEGER` | 0 = false, 1 = true | `0`, `1` |
| `TIMESTAMP WITH TIME ZONE` | `TEXT` | ISO 8601 format | `'2025-12-31T10:30:00.000Z'` |
| `DATE` | `TEXT` | ISO 8601 date format | `'2025-12-31'` |
| `JSONB` | `TEXT` | Store as JSON string, parse with `JSON.parse()` | `'{"key":"value"}'` |
| `ARRAY[]` | `TEXT` | Store as JSON array string | `'["item1","item2"]'` |
| `INET` (IP address) | `TEXT` | IPv4 or IPv6 as string | `'192.168.1.1'`, `'2001:db8::1'` |
| `TSVECTOR` | **Removed** | Replaced with FTS5 virtual tables | See [FTS Strategy](#full-text-search-strategy) |
| `VECTOR` (pgvector) | **Removed** | Migrated to Vectorize (Phase 3) | N/A |

### Enum Mappings

All PostgreSQL ENUMs converted to `TEXT` with `CHECK` constraints:

```sql
-- PostgreSQL:
CREATE TYPE application_status AS ENUM ('draft', 'ready', 'submitted', ...);

-- D1 (SQLite):
status TEXT CHECK(status IN ('draft', 'ready', 'submitted', ...))
```

**Enum Types Converted:**
- `application_status` → TEXT with CHECK constraint
- `dedup_status` → TEXT with CHECK constraint
- `device_type` → TEXT with CHECK constraint
- `email_status` → TEXT with CHECK constraint
- `experience_level` → TEXT with CHECK constraint
- `job_feedback_type` → TEXT with CHECK constraint
- `job_type` → TEXT with CHECK constraint
- `resume_type` → TEXT with CHECK constraint
- `security_event_status` → TEXT with CHECK constraint
- `skill_proficiency` → TEXT with CHECK constraint
- `spam_status` → TEXT with CHECK constraint
- `tracked_application_status` → TEXT with CHECK constraint

---

## Table-by-Table Mapping

### 1. Users Table

**PostgreSQL → D1 Changes:**

| Column | PostgreSQL Type | D1 Type | Conversion |
|--------|----------------|---------|------------|
| `id` | UUID PRIMARY KEY | TEXT PRIMARY KEY | Use `crypto.randomUUID()` |
| `email` | VARCHAR NOT NULL UNIQUE | TEXT NOT NULL UNIQUE | Direct |
| `first_name` | VARCHAR | TEXT | Direct |
| `last_name` | VARCHAR | TEXT | Direct |
| `phone` | VARCHAR | TEXT | Direct |
| `current_title` | TEXT | TEXT | Direct |
| `professional_summary` | TEXT | TEXT | Direct |
| `location` | TEXT | TEXT | Direct |
| `linkedin_url` | TEXT | TEXT | Direct |
| `photo_url` | TEXT | TEXT | Direct |
| `years_of_experience` | INTEGER | INTEGER | Direct |
| `two_factor_enabled` | BOOLEAN DEFAULT false | INTEGER DEFAULT 0 | Boolean → Integer |
| `resume_embedding` | JSONB | **REMOVED** | Migrate to Vectorize (Phase 3) |
| `created_at` | TIMESTAMP WITH TIME ZONE | TEXT DEFAULT (datetime('now')) | ISO 8601 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | TEXT DEFAULT (datetime('now')) | ISO 8601 |

**Indexes Created:**
- `idx_users_email` on `email`
- `idx_users_created_at` on `created_at`

**FTS5 Virtual Table:** `users_fts` (searchable: first_name, last_name, email, current_title, professional_summary)

---

### 2. Work Experience Table

**PostgreSQL → D1 Changes:**

| Column | PostgreSQL Type | D1 Type | Conversion |
|--------|----------------|---------|------------|
| `id` | UUID PRIMARY KEY | TEXT PRIMARY KEY | Use `crypto.randomUUID()` |
| `user_id` | UUID NOT NULL REFERENCES users(id) | TEXT NOT NULL REFERENCES users(id) | Direct |
| `company` | TEXT NOT NULL | TEXT NOT NULL | Direct |
| `title` | TEXT NOT NULL | TEXT NOT NULL | Direct |
| `location` | TEXT | TEXT | Direct |
| `employment_type` | TEXT | TEXT | Direct |
| `start_date` | TEXT | TEXT | Direct (ISO 8601 date) |
| `end_date` | TEXT | TEXT | Direct (ISO 8601 date) |
| `is_current` | BOOLEAN DEFAULT false | INTEGER DEFAULT 0 | Boolean → Integer |
| `description` | TEXT | TEXT | Direct |
| `accomplishments` | TEXT[] | TEXT | Array → JSON array string |
| `created_at` | TIMESTAMP WITH TIME ZONE | TEXT DEFAULT (datetime('now')) | ISO 8601 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | TEXT DEFAULT (datetime('now')) | ISO 8601 |

**Array Conversion Example:**
```typescript
// PostgreSQL (Supabase client):
accomplishments: ["Achievement 1", "Achievement 2"]

// D1 (Workers):
accomplishments: JSON.stringify(["Achievement 1", "Achievement 2"])

// Reading from D1:
const parsed = JSON.parse(row.accomplishments) as string[];
```

**Indexes Created:**
- `idx_work_experience_user_id` on `user_id`
- `idx_work_experience_is_current` on `(user_id, is_current)`

**FTS5 Virtual Table:** `work_experience_fts` (searchable: company, title, description)

---

### 3. Education Table

**PostgreSQL → D1 Changes:** (mostly direct mappings)

| Column | PostgreSQL Type | D1 Type | Conversion |
|--------|----------------|---------|------------|
| `id` | UUID PRIMARY KEY | TEXT PRIMARY KEY | Use `crypto.randomUUID()` |
| `user_id` | UUID NOT NULL | TEXT NOT NULL | Direct |
| `institution` | TEXT NOT NULL | TEXT NOT NULL | Direct |
| `degree` | TEXT | TEXT | Direct |
| `field_of_study` | TEXT | TEXT | Direct |
| `grade` | TEXT | TEXT | Direct |
| `start_date` | TEXT | TEXT | Direct |
| `end_date` | TEXT | TEXT | Direct |
| `is_current` | BOOLEAN | INTEGER | Boolean → Integer |
| `description` | TEXT | TEXT | Direct |
| `created_at` | TIMESTAMP WITH TIME ZONE | TEXT DEFAULT (datetime('now')) | ISO 8601 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | TEXT DEFAULT (datetime('now')) | ISO 8601 |

**Indexes Created:**
- `idx_education_user_id` on `user_id`

---

### 4. Skills Table

**PostgreSQL → D1 Changes:**

| Column | PostgreSQL Type | D1 Type | Conversion |
|--------|----------------|---------|------------|
| `id` | UUID PRIMARY KEY | TEXT PRIMARY KEY | Use `crypto.randomUUID()` |
| `user_id` | UUID NOT NULL | TEXT NOT NULL | Direct |
| `name` | TEXT NOT NULL | TEXT NOT NULL | Direct |
| `proficiency_level` | skill_proficiency ENUM | TEXT CHECK(...) | Enum → TEXT with CHECK |
| `years_of_experience` | INTEGER | INTEGER | Direct |
| `endorsed_count` | INTEGER DEFAULT 0 | INTEGER DEFAULT 0 | Direct |
| `created_at` | TIMESTAMP WITH TIME ZONE | TEXT DEFAULT (datetime('now')) | ISO 8601 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | TEXT DEFAULT (datetime('now')) | ISO 8601 |

**Enum Values:** `'beginner'`, `'intermediate'`, `'advanced'`, `'expert'`

**Indexes Created:**
- `idx_skills_user_id` on `user_id`
- `idx_skills_name` on `name`

---

### 5. Resumes Table

**PostgreSQL → D1 Changes:**

| Column | PostgreSQL Type | D1 Type | Conversion |
|--------|----------------|---------|------------|
| `id` | UUID PRIMARY KEY | TEXT PRIMARY KEY | Use `crypto.randomUUID()` |
| `user_id` | UUID NOT NULL | TEXT NOT NULL | Direct |
| `title` | TEXT NOT NULL | TEXT NOT NULL | Direct |
| `type` | resume_type ENUM | TEXT CHECK(...) DEFAULT 'master' | Enum → TEXT |
| `sections` | JSONB NOT NULL | TEXT NOT NULL | JSONB → JSON string |
| `formats` | TEXT[] | TEXT | Array → JSON array string |
| `created_at` | TIMESTAMP WITH TIME ZONE | TEXT DEFAULT (datetime('now')) | ISO 8601 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | TEXT DEFAULT (datetime('now')) | ISO 8601 |

**Enum Values:** `'master'`, `'tailored'`

**JSON Conversion Example:**
```typescript
// Storing sections:
const sections = {
  summary: "Professional summary...",
  experience: [...],
  education: [...]
};
await env.DB.prepare(
  'INSERT INTO resumes (id, user_id, sections) VALUES (?, ?, ?)'
).bind(resumeId, userId, JSON.stringify(sections)).run();

// Reading sections:
const resume = await env.DB.prepare('SELECT * FROM resumes WHERE id = ?').bind(id).first();
const sections = JSON.parse(resume.sections);
```

**Indexes Created:**
- `idx_resumes_user_id` on `user_id`
- `idx_resumes_type` on `(user_id, type)`

---

### 6. Jobs Table (Complex - Full Mapping)

**PostgreSQL → D1 Changes:**

| Column | PostgreSQL Type | D1 Type | Conversion |
|--------|----------------|---------|------------|
| `id` | UUID PRIMARY KEY | TEXT PRIMARY KEY | Use `crypto.randomUUID()` |
| `user_id` | UUID NOT NULL | TEXT NOT NULL | Direct |
| `title` | TEXT NOT NULL | TEXT NOT NULL | Direct |
| `company` | TEXT NOT NULL | TEXT NOT NULL | Direct |
| `location` | TEXT | TEXT | Direct |
| `description` | TEXT | TEXT | Direct |
| `url` | TEXT | TEXT | Direct |
| `source` | TEXT | TEXT | Direct |
| `job_type` | job_type ENUM | TEXT CHECK(...) | Enum → TEXT |
| `experience_level` | experience_level ENUM | TEXT CHECK(...) | Enum → TEXT |
| `salary_min` | NUMERIC | REAL | Direct |
| `salary_max` | NUMERIC | REAL | Direct |
| `posted_at` | TIMESTAMP WITH TIME ZONE | TEXT | ISO 8601 |
| `expires_at` | TIMESTAMP WITH TIME ZONE | TEXT | ISO 8601 |
| `last_seen_at` | TIMESTAMP WITH TIME ZONE | TEXT | ISO 8601 |
| `added_at` | TIMESTAMP WITH TIME ZONE | TEXT DEFAULT (datetime('now')) | ISO 8601 |
| `match_score` | REAL | REAL | Direct |
| `match_explanation` | JSONB | TEXT | JSONB → JSON string |
| `match_algorithm_version` | TEXT | TEXT | Direct |
| `match_computed_at` | TIMESTAMP WITH TIME ZONE | TEXT | ISO 8601 |
| `quality_score` | REAL | REAL | Direct |
| `canonical_job_id` | UUID | TEXT | Direct |
| `canonical_hash` | TEXT | TEXT | Direct |
| `dedup_status` | dedup_status ENUM | TEXT CHECK(...) | Enum → TEXT |
| `dedup_confidence` | REAL | REAL | Direct |
| `all_sources` | JSONB | TEXT | JSONB → JSON string |
| `spam_status` | spam_status ENUM | TEXT CHECK(...) | Enum → TEXT |
| `spam_score` | REAL | REAL | Direct |
| `spam_probability` | REAL | REAL | Direct |
| `spam_detected` | BOOLEAN | INTEGER DEFAULT 0 | Boolean → Integer |
| `spam_categories` | TEXT[] | TEXT | Array → JSON string |
| `spam_flags` | JSONB | TEXT | JSONB → JSON string |
| `spam_metadata` | JSONB | TEXT | JSONB → JSON string |
| `spam_analyzed_at` | TIMESTAMP WITH TIME ZONE | TEXT | ISO 8601 |
| `saved` | BOOLEAN DEFAULT false | INTEGER DEFAULT 0 | Boolean → Integer |
| `archived` | BOOLEAN DEFAULT false | INTEGER DEFAULT 0 | Boolean → Integer |
| `is_closed` | BOOLEAN DEFAULT false | INTEGER DEFAULT 0 | Boolean → Integer |
| `title_tsv` | TSVECTOR | **REMOVED** | Replaced with FTS5 |
| `company_tsv` | TSVECTOR | **REMOVED** | Replaced with FTS5 |
| `description_tsv` | TSVECTOR | **REMOVED** | Replaced with FTS5 |
| `embedding` | JSONB (pgvector) | **REMOVED** | Migrate to Vectorize |
| `created_at` | TIMESTAMP WITH TIME ZONE | TEXT DEFAULT (datetime('now')) | ISO 8601 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | TEXT DEFAULT (datetime('now')) | ISO 8601 |

**Indexes Created:**
- `idx_jobs_user_id` on `user_id`
- `idx_jobs_title` on `title`
- `idx_jobs_company` on `company`
- `idx_jobs_match_score` on `(user_id, match_score DESC)`
- `idx_jobs_saved` on `(user_id, saved)`
- `idx_jobs_archived` on `(user_id, archived)`
- `idx_jobs_canonical_hash` on `canonical_hash`
- `idx_jobs_canonical_job_id` on `canonical_job_id`
- `idx_jobs_spam_status` on `spam_status`
- `idx_jobs_posted_at` on `posted_at DESC`

**FTS5 Virtual Table:** `jobs_fts` (searchable: title, company, description)

**Full-Text Search Example:**
```sql
-- PostgreSQL (old):
SELECT * FROM jobs WHERE title_tsv @@ to_tsquery('engineer');

-- D1 (new):
SELECT j.* FROM jobs j
JOIN jobs_fts fts ON j.rowid = fts.rowid
WHERE jobs_fts MATCH 'engineer'
ORDER BY rank;
```

---

### 7. Job Preferences Table

**PostgreSQL → D1 Changes:**

All array columns converted to JSON strings:

| Column | PostgreSQL Type | D1 Type | Conversion |
|--------|----------------|---------|------------|
| `id` | UUID PRIMARY KEY | TEXT PRIMARY KEY | Use `crypto.randomUUID()` |
| `user_id` | UUID NOT NULL UNIQUE | TEXT NOT NULL UNIQUE | Direct |
| `desired_titles` | TEXT[] NOT NULL | TEXT NOT NULL | Array → JSON |
| `desired_locations` | TEXT[] | TEXT | Array → JSON |
| `keywords` | TEXT[] | TEXT | Array → JSON |
| `exclude_keywords` | TEXT[] | TEXT | Array → JSON |
| `job_types` | TEXT[] | TEXT | Array → JSON |
| `experience_levels` | TEXT[] | TEXT | Array → JSON |
| `work_arrangement` | TEXT[] | TEXT | Array → JSON |
| `industries` | TEXT[] | TEXT | Array → JSON |
| `company_sizes` | TEXT[] | TEXT | Array → JSON |
| `benefits` | TEXT[] | TEXT | Array → JSON |
| `salary_min` | NUMERIC | REAL | Direct |
| `salary_max` | NUMERIC | REAL | Direct |
| `auto_search_enabled` | BOOLEAN | INTEGER DEFAULT 0 | Boolean → Integer |
| `notification_frequency` | TEXT | TEXT | Direct |
| `created_at` | TIMESTAMP WITH TIME ZONE | TEXT DEFAULT (datetime('now')) | ISO 8601 |
| `updated_at` | TIMESTAMP WITH TIME ZONE | TEXT DEFAULT (datetime('now')) | ISO 8601 |

**Indexes Created:**
- `idx_job_preferences_user_id` on `user_id`

---

### 8-26. Remaining Tables

All remaining tables follow similar conversion patterns. Key highlights:

**Job-Related Tables:**
- `job_compatibility_analyses` - JSONB analysis → TEXT
- `job_feedback` - TEXT[] reasons → TEXT (JSON)
- `job_duplicates` - TEXT[] matched_fields → TEXT (JSON)
- `canonical_job_metadata` - Booleans → Integers
- `spam_reports` - JSONB details → TEXT
- `match_quality_metrics` - All numeric types preserved

**Application Tables:**
- `applications` - JSONB variants → TEXT
- `tracked_applications` - Multiple JSONB fields (interviews, offer_details, etc.) → TEXT

**Auth & Security Tables:**
- `sessions` - inet → TEXT, device_type ENUM → TEXT with CHECK
- `failed_login_attempts` - inet → TEXT, JSONB metadata → TEXT
- `account_lockouts` - Direct mappings
- `security_events` - security_event_status ENUM → TEXT, JSONB metadata → TEXT

**Billing Tables:**
- `subscriptions` - Booleans → Integers
- `payment_methods` - Direct mappings
- `invoices` - Direct mappings
- `usage_limits` - Direct mappings

**Communication Tables:**
- `email_history` - email_status ENUM → TEXT
- `notifications` - Boolean read → Integer

---

## Full-Text Search Strategy

### PostgreSQL tsvector → D1 FTS5 Migration

**PostgreSQL Approach:**
```sql
-- Old: tsvector columns with GIN indexes
CREATE INDEX idx_jobs_title_tsv ON jobs USING GIN(title_tsv);

-- Queries used to_tsquery():
SELECT * FROM jobs WHERE title_tsv @@ to_tsquery('software & engineer');
```

**D1 FTS5 Approach:**
```sql
-- New: FTS5 virtual tables with automatic triggers
CREATE VIRTUAL TABLE jobs_fts USING fts5(
    job_id UNINDEXED,
    title,
    company,
    description,
    content=jobs,
    content_rowid=rowid
);

-- Queries use MATCH:
SELECT j.* FROM jobs j
JOIN jobs_fts fts ON j.rowid = fts.rowid
WHERE jobs_fts MATCH 'software engineer'
ORDER BY rank;
```

### FTS5 Virtual Tables Created

1. **`jobs_fts`** - Search job titles, companies, descriptions
   - Columns: `job_id`, `title`, `company`, `description`
   - Auto-synced with `jobs` table via triggers

2. **`users_fts`** - Search user profiles
   - Columns: `user_id`, `first_name`, `last_name`, `email`, `current_title`, `professional_summary`
   - Auto-synced with `users` table via triggers

3. **`work_experience_fts`** - Search work history
   - Columns: `work_id`, `user_id`, `company`, `title`, `description`
   - Auto-synced with `work_experience` table via triggers

### FTS5 Query Examples

**Simple search:**
```sql
SELECT j.* FROM jobs j
JOIN jobs_fts ON j.rowid = jobs_fts.rowid
WHERE jobs_fts MATCH 'react developer'
ORDER BY rank;
```

**Boolean operators:**
```sql
-- AND operator
WHERE jobs_fts MATCH 'react AND typescript'

-- OR operator
WHERE jobs_fts MATCH 'react OR vue OR angular'

-- NOT operator
WHERE jobs_fts MATCH 'developer NOT junior'

-- Phrase search
WHERE jobs_fts MATCH '"senior software engineer"'
```

**Column-specific search:**
```sql
-- Search only titles
WHERE jobs_fts MATCH 'title:engineer'

-- Search title AND company
WHERE jobs_fts MATCH 'title:engineer company:google'
```

**Prefix search (autocomplete):**
```sql
WHERE jobs_fts MATCH 'softw*'  -- Matches "software", "softwares", etc.
```

---

## Removed Features

### 1. PostgreSQL-Specific Extensions

**REMOVED:**
- `uuid-ossp` extension → Use `crypto.randomUUID()` in Workers
- `pgvector` extension → Migrate to Cloudflare Vectorize (Phase 3)
- `pg_trgm` (trigram similarity) → Implement in application if needed

### 2. Row Level Security (RLS)

**184 RLS policies removed** - All enforced `auth.uid() = user_id`

**Example PostgreSQL RLS:**
```sql
CREATE POLICY "Users can only view their own jobs"
ON jobs FOR SELECT
USING (auth.uid() = user_id);
```

**D1 Application-Layer Replacement (Phase 3, Task 3.2):**
```typescript
// Middleware to inject user_id into all queries
export async function enforceUserAccess(
  c: Context,
  query: string,
  userId: string
): Promise<D1Result> {
  // Ensure query includes WHERE user_id = ?
  if (!query.toLowerCase().includes('where user_id')) {
    throw new Error('Query must filter by user_id');
  }
  return c.env.DB.prepare(query).bind(userId).all();
}

// Usage:
const jobs = await enforceUserAccess(
  c,
  'SELECT * FROM jobs WHERE user_id = ? AND saved = 1',
  user.id
);
```

### 3. Database Functions

**PostgreSQL Functions Removed:**
- `calculate_job_canonical_hash()` → Implement in Workers
- `calculate_job_quality_score()` → Implement in Workers
- `cleanup_expired_lockouts()` → Implement as Cron Trigger
- `cleanup_expired_sessions()` → Implement as Cron Trigger
- `cleanup_old_failed_logins()` → Implement as Cron Trigger
- `clear_failed_login_attempts()` → Implement in Workers
- `find_job_duplicates()` → Implement in Workers
- `get_active_session_count()` → Simple COUNT query
- `get_canonical_jobs_only()` → Simple SELECT query
- `get_job_feedback_summary()` → Aggregate query in Workers
- `initialize_user_limits()` → INSERT query in Workers
- `is_account_locked()` → SELECT query in Workers
- `mark_as_canonical()` → UPDATE query in Workers
- `record_failed_login()` → INSERT query in Workers
- `unlock_account()` → UPDATE query in Workers

**Replacement Strategy:**
All business logic moved to Workers TypeScript code for better performance and maintainability.

---

## Application Changes Required

### 1. UUID Generation

**Before (Supabase):**
```typescript
const { data, error } = await supabase
  .from('users')
  .insert({ email, first_name }); // UUID auto-generated by PostgreSQL
```

**After (D1):**
```typescript
const userId = crypto.randomUUID();
await c.env.DB.prepare(
  'INSERT INTO users (id, email, first_name) VALUES (?, ?, ?)'
).bind(userId, email, firstName).run();
```

### 2. JSONB Handling

**Before (Supabase):**
```typescript
const { data } = await supabase
  .from('resumes')
  .select('sections')
  .single();

const sections = data.sections; // Already parsed object
```

**After (D1):**
```typescript
const resume = await c.env.DB.prepare(
  'SELECT sections FROM resumes WHERE id = ?'
).bind(resumeId).first();

const sections = JSON.parse(resume.sections); // Must parse
```

**Storing JSONB:**
```typescript
// Before
await supabase.from('resumes').insert({ sections: { summary: '...' } });

// After
await c.env.DB.prepare(
  'INSERT INTO resumes (sections) VALUES (?)'
).bind(JSON.stringify({ summary: '...' })).run();
```

### 3. Array Handling

**Before (Supabase):**
```typescript
const { data } = await supabase
  .from('work_experience')
  .select('accomplishments')
  .single();

const list = data.accomplishments; // Already array
```

**After (D1):**
```typescript
const work = await c.env.DB.prepare(
  'SELECT accomplishments FROM work_experience WHERE id = ?'
).bind(id).first();

const list = JSON.parse(work.accomplishments); // Must parse
```

### 4. Boolean Handling

**Before (Supabase):**
```typescript
const { data } = await supabase
  .from('jobs')
  .select('*')
  .eq('saved', true);
```

**After (D1):**
```typescript
const jobs = await c.env.DB.prepare(
  'SELECT * FROM jobs WHERE user_id = ? AND saved = 1'
).bind(userId).all();

// Convert back to boolean in response:
const jobsWithBooleans = jobs.results.map(job => ({
  ...job,
  saved: Boolean(job.saved),
  archived: Boolean(job.archived)
}));
```

### 5. Timestamp Handling

**Before (Supabase):**
```typescript
const { data } = await supabase
  .from('jobs')
  .select('created_at');

const date = new Date(data.created_at); // Already ISO string
```

**After (D1):**
```typescript
const job = await c.env.DB.prepare(
  'SELECT created_at FROM jobs WHERE id = ?'
).bind(jobId).first();

const date = new Date(job.created_at); // Still ISO string, works the same

// Inserting current timestamp:
await c.env.DB.prepare(
  'INSERT INTO jobs (created_at) VALUES (datetime("now"))'
).run();

// Or use JavaScript:
await c.env.DB.prepare(
  'INSERT INTO jobs (created_at) VALUES (?)'
).bind(new Date().toISOString()).run();
```

### 6. Full-Text Search

**Before (PostgreSQL):**
```typescript
const { data } = await supabase.rpc('search_jobs', { query: 'engineer' });
```

**After (D1 with FTS5):**
```typescript
const results = await c.env.DB.prepare(`
  SELECT j.* FROM jobs j
  JOIN jobs_fts ON j.rowid = jobs_fts.rowid
  WHERE jobs_fts MATCH ?
  ORDER BY rank
  LIMIT 20
`).bind(searchQuery).all();
```

### 7. User Access Control (RLS Replacement)

**Before (Supabase with RLS):**
```typescript
// RLS automatically filters by user_id
const { data } = await supabase.from('jobs').select('*');
```

**After (D1 - Manual user_id filter):**
```typescript
// MUST explicitly filter by user_id
const jobs = await c.env.DB.prepare(
  'SELECT * FROM jobs WHERE user_id = ?'
).bind(userId).all();

// Create middleware helper to enforce this:
async function getUserJobs(env: Env, userId: string) {
  return env.DB.prepare(
    'SELECT * FROM jobs WHERE user_id = ?'
  ).bind(userId).all();
}
```

---

## Query Examples

### Basic CRUD Operations

**Insert:**
```typescript
const userId = crypto.randomUUID();
const jobId = crypto.randomUUID();

await c.env.DB.prepare(`
  INSERT INTO jobs (
    id, user_id, title, company, description,
    match_explanation, spam_categories, saved, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`).bind(
  jobId,
  userId,
  'Software Engineer',
  'Google',
  'Job description...',
  JSON.stringify({ score: 85, reasons: ['Skills match'] }),
  JSON.stringify(['clean']),
  1 // saved = true
).run();
```

**Select with JSON parsing:**
```typescript
const job = await c.env.DB.prepare(
  'SELECT * FROM jobs WHERE id = ?'
).bind(jobId).first();

// Parse JSON fields:
const response = {
  ...job,
  saved: Boolean(job.saved),
  archived: Boolean(job.archived),
  match_explanation: JSON.parse(job.match_explanation),
  spam_categories: JSON.parse(job.spam_categories)
};
```

**Update:**
```typescript
await c.env.DB.prepare(`
  UPDATE jobs
  SET saved = ?, updated_at = datetime('now')
  WHERE id = ? AND user_id = ?
`).bind(1, jobId, userId).run();
```

**Delete:**
```typescript
await c.env.DB.prepare(
  'DELETE FROM jobs WHERE id = ? AND user_id = ?'
).bind(jobId, userId).run();
```

### Complex Queries

**Join with aggregation:**
```typescript
const stats = await c.env.DB.prepare(`
  SELECT
    u.id,
    u.email,
    COUNT(j.id) as total_jobs,
    SUM(CASE WHEN j.saved = 1 THEN 1 ELSE 0 END) as saved_jobs,
    AVG(j.match_score) as avg_match_score
  FROM users u
  LEFT JOIN jobs j ON u.id = j.user_id
  WHERE u.id = ?
  GROUP BY u.id
`).bind(userId).first();
```

**Full-text search with filters:**
```typescript
const results = await c.env.DB.prepare(`
  SELECT j.* FROM jobs j
  JOIN jobs_fts ON j.rowid = jobs_fts.rowid
  WHERE jobs_fts MATCH ?
    AND j.user_id = ?
    AND j.archived = 0
    AND j.match_score >= ?
  ORDER BY rank, j.match_score DESC
  LIMIT 20
`).bind(searchQuery, userId, 70).all();
```

**Date range queries:**
```typescript
const recentJobs = await c.env.DB.prepare(`
  SELECT * FROM jobs
  WHERE user_id = ?
    AND created_at >= datetime('now', '-7 days')
  ORDER BY created_at DESC
`).bind(userId).all();
```

---

## Migration Checklist

### Phase 2 (Database Migration) Tasks

- [x] **Task 2.1:** Create D1 schema migration script
  - [x] Convert all 26 tables
  - [x] Add FTS5 virtual tables (3)
  - [x] Create indexes (60+)
  - [x] Add triggers for FTS5 sync (9)

- [ ] **Task 2.2:** Apply schema to dev database
  ```bash
  wrangler d1 execute jobmatch-dev --file=migrations/d1/001_initial_schema.sql
  ```

- [ ] **Task 2.3:** Create seed data script
  - [ ] Test users
  - [ ] Sample jobs
  - [ ] Sample applications

- [ ] **Task 2.4:** Test migrations
  - [ ] Verify all tables created
  - [ ] Test FTS5 search
  - [ ] Test foreign key constraints
  - [ ] Verify indexes

### Phase 3 (Application Layer) Tasks

- [ ] **Task 3.1:** Update TypeScript types
  - [ ] Generate D1 types from schema
  - [ ] Update all model interfaces

- [ ] **Task 3.2:** Implement RLS in application
  - [ ] Create user access middleware
  - [ ] Add user_id to all queries
  - [ ] Test authorization

- [ ] **Task 3.3:** Migrate embeddings to Vectorize
  - [ ] Extract user resume embeddings
  - [ ] Extract job description embeddings
  - [ ] Insert into Vectorize indexes
  - [ ] Update matching queries

- [ ] **Task 3.4:** Update API routes
  - [ ] Replace Supabase client with D1 queries
  - [ ] Add JSON.parse() for JSONB fields
  - [ ] Add JSON.stringify() for inserts
  - [ ] Convert booleans

---

## Performance Considerations

### Indexes

**Critical indexes already created:**
- User lookups: `idx_users_email`
- Job queries: `idx_jobs_user_id`, `idx_jobs_match_score`, `idx_jobs_saved`
- Foreign key lookups: All `user_id` columns indexed
- Full-text search: FTS5 virtual tables

### Query Optimization Tips

1. **Always filter by user_id first** (replaces RLS)
2. **Use prepared statements** (D1 automatic query plan caching)
3. **Limit result sets** (add LIMIT clauses)
4. **Use covering indexes** where possible
5. **Avoid SELECT *** - specify columns needed

### D1 Limits (as of 2025-12-31)

- **Max database size:** 10 GB (Free tier: 5 GB)
- **Max rows per query:** 100,000
- **Max query execution time:** 30 seconds
- **Max queries per request:** 50 (batch operations)

---

## Next Steps

1. **Apply migration to dev database** (Task 2.2)
2. **Create seed data** (Task 2.3)
3. **Test all table operations** (Task 2.4)
4. **Update Workers types** (Phase 3)
5. **Implement application-layer RLS** (Phase 3, Task 3.2)
6. **Migrate embeddings to Vectorize** (Phase 3, Task 3.3)

---

## References

- **D1 Documentation:** https://developers.cloudflare.com/d1/
- **SQLite FTS5:** https://www.sqlite.org/fts5.html
- **Cloudflare Vectorize:** https://developers.cloudflare.com/vectorize/
- **Migration File:** `/migrations/d1/001_initial_schema.sql`
- **Progress Tracker:** `/docs/MIGRATION_PROGRESS.md`

---

**Document Version:** 1.0
**Last Updated:** 2025-12-31
**Author:** Database Architecture Agent (Claude Code)
