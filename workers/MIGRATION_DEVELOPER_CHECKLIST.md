# Cloudflare Migration Developer Checklist

Quick reference for developers working on the migration.

---

## Before You Start

- [ ] Read `MIGRATION_EXECUTIVE_SUMMARY.md`
- [ ] Read `CLOUDFLARE_MIGRATION_TASK_PLAN.md` (your assigned section)
- [ ] Set up local development environment
  - [ ] `wrangler d1 execute jobmatch-dev --file=migrations/0001_initial_schema.sql`
  - [ ] `wrangler kv:namespace create "OAUTH_STATES"`
  - [ ] `wrangler vectorize create jobmatch-jobs-dev --dimensions=768 --metric=cosine`
- [ ] Verify R2 buckets exist (`AVATARS`, `RESUMES`, `EXPORTS`)
- [ ] Run existing tests to establish baseline (`npm test`)

---

## D1 Migration Checklist (Per Route)

### Step 1: Analyze Current Code
- [ ] Identify all Supabase calls (`.from()`, `.select()`, `.insert()`, `.update()`, `.delete()`)
- [ ] List all tables accessed
- [ ] Note any complex queries (joins, aggregations, transactions)
- [ ] Check for RLS dependencies

### Step 2: Write D1 Queries
- [ ] Convert Supabase queries to SQL
- [ ] Add `WHERE user_id = ?` to **EVERY** query (security!)
- [ ] Handle JSON columns (parse with `JSON.parse()`)
- [ ] Handle boolean columns (0/1 instead of true/false)
- [ ] Handle timestamps (ISO 8601 strings)

### Step 3: Update Route Code
- [ ] Import `env.DB` (D1 database binding)
- [ ] Replace Supabase client with D1 prepared statements
- [ ] Use `.bind()` for parameterized queries
- [ ] Use `.first()` for single records, `.all()` for multiple
- [ ] Parse JSON columns before returning to client
- [ ] Update error handling (D1 errors different from Supabase)

### Step 4: Test Changes
- [ ] Write unit tests for D1 queries
- [ ] Write integration tests for route endpoints
- [ ] Test security (user can't access other users' data)
- [ ] Test pagination, filtering, sorting
- [ ] Test error cases (invalid IDs, missing data)

### Step 5: Code Review
- [ ] All queries have `WHERE user_id = ?` filter
- [ ] No SQL injection vulnerabilities (use `.bind()`)
- [ ] Error messages don't leak sensitive data
- [ ] Performance is acceptable (< 50ms p95)

---

## Security Checklist (CRITICAL!)

### ✅ ALWAYS Do This:
```typescript
// Correct - user_id filter enforced
const jobs = await env.DB.prepare(
  'SELECT * FROM jobs WHERE user_id = ? AND archived = 0'
).bind(userId).all();
```

### ❌ NEVER Do This:
```typescript
// WRONG - security vulnerability! Any user can access all jobs!
const jobs = await env.DB.prepare(
  'SELECT * FROM jobs WHERE archived = 0'
).all();
```

### Security Verification:
- [ ] Every SELECT has `WHERE user_id = ?`
- [ ] Every UPDATE has `AND user_id = ?`
- [ ] Every DELETE has `AND user_id = ?`
- [ ] INSERT sets `user_id` from authenticated user
- [ ] Integration test verifies security (user A can't access user B's data)

---

## R2 Migration Checklist

### Step 1: Identify File Upload Code
- [ ] Find Supabase Storage calls (`.storage.from()`, `.upload()`)
- [ ] Identify bucket name (`avatars`, `resumes`, `exports`)
- [ ] Note file types accepted (PDF, JPG, PNG, etc.)
- [ ] Check file size limits

### Step 2: Replace with R2
- [ ] Import R2 service (`uploadFile`, `deleteFile`, `getFile`)
- [ ] Generate file key (`generateUserFileKey(userId, folder, filename)`)
- [ ] Upload to R2 bucket (`uploadFile(bucket, key, file, options)`)
- [ ] Update database with file metadata (if needed)
- [ ] Return download URL (`/api/files/download/${key}`)

### Step 3: Update Frontend
- [ ] Replace Supabase upload with `fetch('/api/files/upload')`
- [ ] Use `FormData` for file uploads
- [ ] Update download URLs (point to Workers API)
- [ ] Test upload progress indicators

### Step 4: Test
- [ ] Upload files (various types, sizes)
- [ ] Download files (verify authentication)
- [ ] Delete files (verify cleanup)
- [ ] Test file size limits (10MB max)
- [ ] Test invalid file types (should reject)

---

## Vectorize Migration Checklist

### Step 1: Remove pgvector References
- [ ] Remove `embedding` column from queries
- [ ] Remove `resume_embedding` column from queries
- [ ] Clean up old embedding generation code

### Step 2: Add Vectorize Integration
- [ ] Generate embeddings with `generateJobEmbedding(env, job)`
- [ ] Store embeddings with `storeJobEmbedding(env, jobId, userId, title, company, embedding)`
- [ ] Delete embeddings with `deleteJobEmbedding(env, jobId)` when job deleted

### Step 3: Implement Search
- [ ] Semantic search: `semanticSearchJobs(env, query, userId, limit)`
- [ ] Hybrid search: `hybridSearchJobs(env, db, query, userId, options)`
- [ ] Update frontend search UI (add semantic mode toggle)

### Step 4: Test
- [ ] Create job → embedding generated
- [ ] Search jobs → semantic results returned
- [ ] Compare keyword vs semantic search quality
- [ ] Verify embedding cache hit rate (> 60%)

---

## Testing Checklist

### Unit Tests (`workers/tests/unit/`)
- [ ] D1 query security (user_id filters)
- [ ] D1 pagination, filtering, sorting
- [ ] R2 upload, download, delete
- [ ] Vectorize embedding generation, storage, search

### Integration Tests (`workers/tests/integration/`)
- [ ] API endpoints (all CRUD operations)
- [ ] Authentication (JWT verification)
- [ ] Authorization (user can't access other users' data)
- [ ] File uploads (multipart form data)
- [ ] Search (keyword, semantic, hybrid)

### E2E Tests (`e2e-tests/`)
- [ ] User registration/login
- [ ] Profile management
- [ ] Job search and matching
- [ ] Application generation
- [ ] File uploads (avatar, resume)

### Load Tests
- [ ] 100 concurrent users
- [ ] 1000 requests/minute
- [ ] Database query performance (< 50ms p95)
- [ ] File upload speed (> 5MB/s)

---

## Common Patterns

### Pattern 1: Simple CRUD
```typescript
// GET - List records
const results = await env.DB.prepare(
  'SELECT * FROM table WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
).bind(userId, limit, offset).all();

// POST - Create record
const id = crypto.randomUUID();
await env.DB.prepare(
  'INSERT INTO table (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
).bind(id, userId, name, timestamp, timestamp).run();

// PATCH - Update record
await env.DB.prepare(
  'UPDATE table SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?'
).bind(name, timestamp, id, userId).run();

// DELETE - Delete record
await env.DB.prepare(
  'DELETE FROM table WHERE id = ? AND user_id = ?'
).bind(id, userId).run();
```

### Pattern 2: Join Queries
```typescript
const results = await env.DB.prepare(`
  SELECT
    a.*,
    j.title as job_title,
    j.company
  FROM applications a
  LEFT JOIN jobs j ON a.job_id = j.id
  WHERE a.user_id = ?
  ORDER BY a.created_at DESC
  LIMIT ?
`).bind(userId, limit).all();
```

### Pattern 3: JSON Columns
```typescript
// Store JSON
const variantsJson = JSON.stringify(variants);
await env.DB.prepare(
  'INSERT INTO applications (id, variants) VALUES (?, ?)'
).bind(id, variantsJson).run();

// Parse JSON
const result = await env.DB.prepare(
  'SELECT variants FROM applications WHERE id = ?'
).bind(id).first();

const variants = JSON.parse(result.variants);
```

### Pattern 4: File Upload (R2)
```typescript
import { uploadFile, generateUserFileKey } from '../services/storage';

// Generate key
const key = generateUserFileKey(userId, 'profile', 'avatar.jpg');

// Upload to R2
const result = await uploadFile(
  c.env.AVATARS,
  key,
  await file.arrayBuffer(),
  { contentType: file.type }
);

// Update database
await env.DB.prepare(
  'UPDATE users SET photo_url = ? WHERE id = ?'
).bind(key, userId).run();
```

### Pattern 5: Semantic Search (Vectorize)
```typescript
import { semanticSearchJobs } from '../services/vectorize';

// Search jobs semantically
const results = await semanticSearchJobs(
  env,
  'React developer with TypeScript experience',
  userId,
  20 // limit
);

// Results: [{ id, score, metadata: { jobId, title, company } }]
```

---

## Debugging Tips

### D1 Query Errors
```typescript
// Enable query logging
console.log('[D1 Query]', query, params);

// Check error details
try {
  const result = await env.DB.prepare(query).bind(...params).all();
} catch (error) {
  console.error('[D1 Error]', error.message, error.cause);
  throw error;
}
```

### R2 Upload Errors
```typescript
// Check bucket bindings
console.log('R2 Buckets:', {
  AVATARS: !!c.env.AVATARS,
  RESUMES: !!c.env.RESUMES,
  EXPORTS: !!c.env.EXPORTS
});

// Verify file size
if (file.size > 10 * 1024 * 1024) {
  throw new Error('File too large (max 10MB)');
}
```

### Vectorize Search Errors
```typescript
// Check index exists
console.log('Vectorize index:', c.env.VECTORIZE);

// Verify embedding dimensions
if (embedding.length !== 768) {
  throw new Error(`Invalid embedding dimensions: ${embedding.length}`);
}
```

---

## Code Review Checklist

### Security
- [ ] All queries have `WHERE user_id = ?` filter
- [ ] No SQL injection (parameterized queries only)
- [ ] File paths validated (no path traversal)
- [ ] Authentication required on all protected routes

### Performance
- [ ] Queries use indexes (check EXPLAIN QUERY PLAN)
- [ ] Pagination implemented (LIMIT/OFFSET)
- [ ] Caching used where appropriate (KV)
- [ ] No N+1 queries (use JOINs)

### Error Handling
- [ ] All errors caught and logged
- [ ] User-friendly error messages
- [ ] No sensitive data in error responses
- [ ] HTTP status codes correct (200, 201, 400, 401, 403, 404, 500)

### Testing
- [ ] Unit tests cover all edge cases
- [ ] Integration tests verify security
- [ ] E2E tests cover user workflows
- [ ] Load tests verify performance

---

## Rollback Instructions

If migration fails, rollback immediately:

```bash
# 1. Disable feature flags
wrangler secret put FEATURE_USE_D1_DATABASE
# Enter: false

wrangler secret put FEATURE_USE_R2_STORAGE
# Enter: false

wrangler secret put FEATURE_USE_VECTORIZE_SEARCH
# Enter: false

# 2. Redeploy previous version
git checkout <previous-commit>
wrangler deploy

# 3. Verify rollback
curl https://api.example.com/health

# 4. Monitor logs
wrangler tail
```

---

## Questions?

**Technical Questions**: Check `CLOUDFLARE_MIGRATION_TASK_PLAN.md`
**Security Questions**: Review security checklist above
**Testing Questions**: See testing strategy section
**Deployment Questions**: Follow deployment guide

**Need Help?**: Contact AI Architecture Team
