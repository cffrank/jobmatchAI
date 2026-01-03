# Cloudflare Infrastructure Migration Task Plan

## Executive Summary

This plan outlines the migration of all Supabase dependencies to Cloudflare infrastructure across three critical sections:

1. **D1 Database Migration**: Replace 60+ Supabase PostgreSQL queries with D1 SQLite queries across 10 route files
2. **R2 Storage Migration**: Replace Supabase Storage with R2 for avatars, resumes, and exports across 3 file types
3. **Vectorize Migration**: Replace pgvector embeddings with Cloudflare Vectorize for semantic job matching

**Current Status**: Infrastructure created ✅, code still uses Supabase ❌

**Timeline**: 3-4 weeks for complete migration
**Risk Level**: Medium (requires careful testing, rollback strategy needed)
**Developer Allocation**: 1-2 developers with database/API experience

---

## Section 1: D1 Database Migration

### 1.1 Migration Order & Complexity Analysis

#### 🟢 **EASY (Start Here)** - Simple CRUD, No Complex Queries

| Route File | LOC | Tables | Supabase Calls | Complexity | Est. Hours |
|------------|-----|--------|----------------|------------|------------|
| `analytics.ts` | 249 | None (read-only analytics) | 0 | 1/5 | 0.5 |
| `skills.ts` | 247 | `skills` | 5 | 1/5 | 2 |
| `auth.ts` | 339 | `users` | 2 | 2/5 | 3 |
| `emails.ts` | 594 | `email_history`, `users` | 4 | 2/5 | 3 |

**Subtotal**: 4 files, 14 hours

#### 🟡 **MEDIUM** - Joins, Multiple Tables, Business Logic

| Route File | LOC | Tables | Supabase Calls | Complexity | Est. Hours |
|------------|-----|--------|----------------|------------|------------|
| `files.ts` | 413 | R2 storage only | 0 | 2/5 | 1 |
| `exports.ts` | 412 | `users`, `applications`, `jobs` | 6 | 3/5 | 6 |
| `resume.ts` | 530 | `resumes`, `users`, R2 | 8 | 3/5 | 8 |

**Subtotal**: 3 files, 15 hours

#### 🔴 **HARD (Do Last)** - Complex Queries, Transactions, Critical Logic

| Route File | LOC | Tables | Supabase Calls | Complexity | Est. Hours |
|------------|-----|--------|----------------|------------|------------|
| `applications.ts` | 543 | `applications`, `jobs`, `users`, `work_experience`, `education`, `skills` | 13 | 4/5 | 12 |
| `jobs.ts` | 747 | `jobs`, `job_compatibility_analyses`, `users`, `work_experience`, `education`, `skills`, FTS5, Vectorize | 14 | 5/5 | 16 |
| `profile.ts` | 989 | `users`, `work_experience`, `education`, `skills`, R2 storage | 17 | 5/5 | 20 |

**Subtotal**: 3 files, 48 hours

**Total Section 1**: 10 files, **77 hours** (approx. 2 weeks with testing)

---

### 1.2 Detailed Migration Tasks by Route

#### 🟢 EASY Routes

##### `analytics.ts` (0.5 hours)
- **Current**: No database calls (analytics metadata only)
- **Migration**: No changes needed ✅
- **Testing**: Verify endpoints still return analytics metadata

##### `skills.ts` (2 hours)
- **Tables**: `skills`
- **Supabase Calls to Replace**:
  1. `GET /` - `.from('skills').select('*').eq('user_id', userId)`
  2. `POST /` - `.from('skills').insert({...}).select().single()`
  3. `PATCH /:id` - `.from('skills').update({...}).eq('id', skillId).eq('user_id', userId)`
  4. `DELETE /:id` - `.from('skills').delete().eq('id', skillId).eq('user_id', userId)`

- **D1 Replacement**:
  ```sql
  -- GET
  SELECT * FROM skills WHERE user_id = ? ORDER BY created_at DESC

  -- POST
  INSERT INTO skills (id, user_id, name, level, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?) RETURNING *

  -- PATCH
  UPDATE skills SET name = ?, level = ?, updated_at = ?
  WHERE id = ? AND user_id = ? RETURNING *

  -- DELETE
  DELETE FROM skills WHERE id = ? AND user_id = ?
  ```

- **Security**: `WHERE user_id = ?` filter on ALL queries ✅
- **Testing**: CRUD operations for authenticated user

---

##### `auth.ts` (3 hours)
- **Tables**: `users`
- **Supabase Calls to Replace**:
  1. LinkedIn profile import - `.from('users').update({...}).eq('id', userId)`

- **D1 Replacement**:
  ```sql
  UPDATE users
  SET first_name = ?, last_name = ?, email = ?,
      profile_image_url = ?, linkedin_url = ?,
      linkedin_imported = 1, linkedin_imported_at = ?,
      updated_at = ?
  WHERE id = ?
  ```

- **Security**: Update only user's own record ✅
- **Additional**: OAuth state storage already uses KV ✅
- **Testing**: LinkedIn OAuth flow, profile import

---

##### `emails.ts` (3 hours)
- **Tables**: `email_history`, `users`
- **Supabase Calls to Replace**:
  1. `POST /send` - Verify user exists
  2. Log email to `email_history`

- **D1 Replacement**:
  ```sql
  -- Verify user
  SELECT id FROM users WHERE id = ? LIMIT 1

  -- Log email
  INSERT INTO email_history
  (id, user_id, application_id, to_address, subject, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, 'sent', ?, ?)
  ```

- **Security**: User can only send emails for their own applications
- **Testing**: SendGrid integration, email logging

---

#### 🟡 MEDIUM Routes

##### `files.ts` (1 hour)
- **Tables**: None (R2 storage only)
- **Current State**: Already uses R2 service ✅
- **Migration**: No database changes needed
- **Note**: File metadata could be stored in D1 for faster lookups (optional enhancement)
- **Testing**: Upload/download/delete files in R2

---

##### `exports.ts` (6 hours)
- **Tables**: `users`, `applications`, `jobs`
- **Supabase Calls to Replace**:
  1. Fetch user profile
  2. Fetch application by ID
  3. Fetch job details
  4. Fetch work experience
  5. Fetch education
  6. Fetch skills

- **D1 Replacement**:
  ```sql
  -- User profile
  SELECT * FROM users WHERE id = ? LIMIT 1

  -- Application with job
  SELECT a.*, j.title, j.company, j.location
  FROM applications a
  LEFT JOIN jobs j ON a.job_id = j.id
  WHERE a.id = ? AND a.user_id = ?

  -- Work experience
  SELECT * FROM work_experience
  WHERE user_id = ? ORDER BY start_date DESC

  -- Education
  SELECT * FROM education
  WHERE user_id = ? ORDER BY end_date DESC

  -- Skills
  SELECT * FROM skills WHERE user_id = ? ORDER BY endorsed_count DESC
  ```

- **Security**: All queries filtered by `user_id`
- **R2 Integration**: Save generated exports (PDF/DOCX) to `EXPORTS` bucket
- **Testing**: Generate PDF/DOCX exports, verify R2 storage

---

##### `resume.ts` (8 hours)
- **Tables**: `resumes`, `users`
- **Supabase Calls to Replace**:
  1. `GET /` - List resumes
  2. `POST /parse` - Parse resume (uses OpenAI, minimal DB)
  3. Store parsed resume metadata

- **D1 Replacement**:
  ```sql
  -- List resumes
  SELECT * FROM resumes
  WHERE user_id = ? ORDER BY created_at DESC

  -- Store parsed resume
  INSERT INTO resumes
  (id, user_id, title, type, sections, created_at, updated_at)
  VALUES (?, ?, ?, 'master', ?, ?, ?)
  ```

- **R2 Integration**: Resume files already stored in `RESUMES` bucket ✅
- **Security**: User can only access own resumes
- **Testing**: Upload resume, parse with AI, verify storage

---

#### 🔴 HARD Routes

##### `applications.ts` (12 hours)
- **Tables**: `applications`, `jobs`, `users`, `work_experience`, `education`, `skills`
- **Supabase Calls to Replace**:
  1. `POST /generate` - Fetch job, profile, work exp, education, skills (6 queries)
  2. Save generated application variants
  3. `GET /` - List applications with pagination
  4. `GET /:id` - Get application by ID
  5. `PATCH /:id` - Update application status
  6. `DELETE /:id` - Delete application

- **D1 Replacement**:
  ```sql
  -- Generate: Fetch all data for AI
  SELECT * FROM jobs WHERE id = ? AND user_id = ?;
  SELECT * FROM users WHERE id = ?;
  SELECT * FROM work_experience WHERE user_id = ? ORDER BY start_date DESC;
  SELECT * FROM education WHERE user_id = ? ORDER BY end_date DESC;
  SELECT * FROM skills WHERE user_id = ?;

  -- Save application with variants (JSON)
  INSERT INTO applications
  (id, user_id, job_id, status, variants, created_at, updated_at)
  VALUES (?, ?, ?, 'draft', ?, ?, ?);

  -- List applications with pagination
  SELECT a.*, j.title, j.company, j.location
  FROM applications a
  LEFT JOIN jobs j ON a.job_id = j.id
  WHERE a.user_id = ?
  ORDER BY a.created_at DESC
  LIMIT ? OFFSET ?;

  -- Get application by ID
  SELECT a.*, j.*
  FROM applications a
  LEFT JOIN jobs j ON a.job_id = j.id
  WHERE a.id = ? AND a.user_id = ?;

  -- Update application
  UPDATE applications
  SET status = ?, updated_at = ?
  WHERE id = ? AND user_id = ?;

  -- Delete application
  DELETE FROM applications WHERE id = ? AND user_id = ?;
  ```

- **Security**: All queries filter by `user_id`
- **JSON Handling**: `variants` column stores JSON array (parse with `JSON.parse()`)
- **Testing**: Generate variants, save, list, update status, delete

---

##### `jobs.ts` (16 hours)
- **Tables**: `jobs`, `job_compatibility_analyses`, `users`, `work_experience`, `education`, `skills`, FTS5, Vectorize
- **Supabase Calls to Replace**:
  1. `GET /` - List jobs with filters, pagination, search
  2. `GET /:id` - Get job by ID
  3. `POST /scrape` - Save scraped jobs (TODO: Apify integration)
  4. `POST /:id/analyze` - Fetch job + user data, generate compatibility analysis
  5. `PATCH /:id` - Update job (save/archive)
  6. `DELETE /:id` - Delete job
  7. Search jobs (FTS5 + Vectorize hybrid search)

- **D1 Replacement**:
  ```sql
  -- List jobs with filters
  SELECT * FROM jobs
  WHERE user_id = ?
    AND archived = ?
    AND (saved IS NULL OR saved = ?)
    AND (source IS NULL OR source = ?)
    AND (match_score IS NULL OR match_score >= ?)
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?;

  -- Get job by ID
  SELECT * FROM jobs WHERE id = ? AND user_id = ?;

  -- Save scraped job
  INSERT INTO jobs
  (id, user_id, title, company, location, description, url, source,
   job_type, experience_level, salary_min, salary_max, posted_at,
   added_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

  -- Analyze job (fetch user data)
  SELECT * FROM jobs WHERE id = ? AND user_id = ?;
  SELECT * FROM users WHERE id = ?;
  SELECT * FROM work_experience WHERE user_id = ?;
  SELECT * FROM education WHERE user_id = ?;
  SELECT * FROM skills WHERE user_id = ?;

  -- Save compatibility analysis
  INSERT INTO job_compatibility_analyses
  (id, user_id, job_id, analysis, created_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(user_id, job_id) DO UPDATE SET
    analysis = excluded.analysis,
    updated_at = excluded.created_at;

  -- Update job
  UPDATE jobs
  SET saved = ?, archived = ?, updated_at = ?
  WHERE id = ? AND user_id = ?;

  -- Delete job
  DELETE FROM jobs WHERE id = ? AND user_id = ?;

  -- FTS5 keyword search
  SELECT j.id, rank as fts_score
  FROM jobs_fts fts
  INNER JOIN jobs j ON j.rowid = fts.rowid
  WHERE jobs_fts MATCH ?
    AND j.user_id = ?
  ORDER BY rank
  LIMIT ?;
  ```

- **Vectorize Integration**:
  - Generate job embeddings on create (background task)
  - Semantic search via `semanticSearchJobs(env, query, userId, topK)`
  - Hybrid search via `hybridSearchJobs(env, db, query, userId, options)`

- **Security**: All queries filter by `user_id`
- **Complexity**: Highest complexity due to FTS5 + Vectorize integration
- **Testing**: Job CRUD, search (keyword + semantic), compatibility analysis

---

##### `profile.ts` (20 hours)
- **Tables**: `users`, `work_experience`, `education`, `skills`, R2 storage
- **Supabase Calls to Replace**:
  1. `GET /` - Fetch user profile
  2. `PATCH /` - Update profile (headline, summary, contact)
  3. `GET /work-experience` - List work experience
  4. `POST /work-experience` - Add work experience
  5. `PATCH /work-experience/:id` - Update work experience
  6. `DELETE /work-experience/:id` - Delete work experience
  7. `GET /education` - List education
  8. `POST /education` - Add education
  9. `PATCH /education/:id` - Update education
  10. `DELETE /education/:id` - Delete education
  11. `POST /avatar` - Upload avatar to R2
  12. `DELETE /avatar` - Delete avatar from R2

- **D1 Replacement**:
  ```sql
  -- Get profile
  SELECT * FROM users WHERE id = ?;

  -- Update profile
  UPDATE users
  SET first_name = ?, last_name = ?, phone = ?, location = ?,
      linkedin_url = ?, current_title = ?, professional_summary = ?,
      updated_at = ?
  WHERE id = ?;

  -- Work Experience CRUD
  SELECT * FROM work_experience WHERE user_id = ? ORDER BY start_date DESC;

  INSERT INTO work_experience
  (id, user_id, company, title, location, employment_type,
   start_date, end_date, is_current, description, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

  UPDATE work_experience
  SET company = ?, title = ?, description = ?, updated_at = ?
  WHERE id = ? AND user_id = ?;

  DELETE FROM work_experience WHERE id = ? AND user_id = ?;

  -- Education CRUD (similar to work experience)
  SELECT * FROM education WHERE user_id = ? ORDER BY end_date DESC;
  -- ... (insert, update, delete similar pattern)
  ```

- **R2 Integration**:
  - Avatar upload to `AVATARS` bucket
  - Path: `users/{userId}/profile/avatar.{ext}`
  - Update `users.photo_url` with R2 key
  - Delete old avatar before uploading new one

- **Background Tasks**:
  - Update resume embedding after profile changes
  - Invalidate job compatibility cache

- **Security**: All queries filter by `user_id`
- **Testing**: Profile CRUD, work exp, education, avatar upload/delete

---

### 1.3 Application-Layer RLS Implementation

Since D1 doesn't have Row Level Security (RLS) like PostgreSQL, implement security checks in application layer:

**Pattern for ALL database queries**:

```typescript
// ✅ CORRECT - Always filter by user_id
const jobs = await env.DB.prepare(
  'SELECT * FROM jobs WHERE user_id = ? AND archived = 0'
).bind(userId).all();

// ❌ WRONG - Missing user_id filter (security vulnerability!)
const jobs = await env.DB.prepare(
  'SELECT * FROM jobs WHERE archived = 0'
).all();
```

**Enforcement Checklist**:
- [ ] Every SELECT query includes `WHERE user_id = ?`
- [ ] Every UPDATE query includes `AND user_id = ?`
- [ ] Every DELETE query includes `AND user_id = ?`
- [ ] INSERT queries set `user_id` from authenticated user
- [ ] Code review focuses on security filters
- [ ] Integration tests verify users can't access other users' data

---

### 1.4 D1 Migration Helper Functions

Create utility functions to simplify migration:

```typescript
// workers/api/lib/d1-helpers.ts

/**
 * Execute prepared statement with automatic error handling
 */
export async function executeQuery<T>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    const stmt = db.prepare(query);
    const result = await stmt.bind(...params).all();
    return result.results as T[];
  } catch (error) {
    console.error('[D1] Query failed:', query, params, error);
    throw new Error(`Database query failed: ${error.message}`);
  }
}

/**
 * Get single record with user_id security check
 */
export async function getRecordByIdForUser<T>(
  db: D1Database,
  table: string,
  id: string,
  userId: string
): Promise<T | null> {
  const results = await executeQuery<T>(
    db,
    `SELECT * FROM ${table} WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, userId]
  );
  return results[0] || null;
}

/**
 * List records with pagination and user_id security
 */
export async function listRecordsForUser<T>(
  db: D1Database,
  table: string,
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<T[]> {
  return executeQuery<T>(
    db,
    `SELECT * FROM ${table} WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
}

/**
 * Parse JSON column (handles null/undefined)
 */
export function parseJsonColumn<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('[D1] JSON parse failed:', value, error);
    return null;
  }
}
```

---

## Section 2: R2 Storage Migration

### 2.1 Current State Analysis

**R2 Service Status**: ✅ Implemented in `workers/api/services/storage.ts`

**R2 Buckets Created**:
- `AVATARS` - User profile photos
- `RESUMES` - Resume files (PDF, images)
- `EXPORTS` - Generated exports (PDF/DOCX)

**Files Using Supabase Storage**:
1. Frontend file upload hooks (React components)
2. Profile avatar handling (`profile.ts`)
3. Resume file handling (`resume.ts`)

### 2.2 Migration Tasks

#### Task 2.1: Replace Supabase Storage in `profile.ts` (4 hours)

**Current**: Supabase Storage for avatar upload
**Target**: R2 `AVATARS` bucket

**Changes**:
```typescript
// OLD: Supabase Storage
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file);

// NEW: R2 Storage
import { uploadFile, deleteFile, generateUserFileKey } from '../services/storage';

const key = generateUserFileKey(userId, 'profile', 'avatar.jpg');
const result = await uploadFile(
  c.env.AVATARS,
  key,
  await file.arrayBuffer(),
  { contentType: file.type }
);

// Update database with new avatar URL
await env.DB.prepare(
  'UPDATE users SET photo_url = ?, updated_at = ? WHERE id = ?'
).bind(key, new Date().toISOString(), userId).run();
```

**Testing**:
- Upload avatar (JPG, PNG, WebP)
- Replace existing avatar (delete old, upload new)
- Download avatar via `/api/files/avatar/:userId`
- Verify R2 storage in Cloudflare dashboard

---

#### Task 2.2: Replace Supabase Storage in `resume.ts` (4 hours)

**Current**: Supabase Storage for resume files
**Target**: R2 `RESUMES` bucket

**Changes**:
```typescript
// OLD: Supabase Storage
const { data, error } = await supabase.storage
  .from('resumes')
  .upload(`${userId}/${filename}`, file);

// NEW: R2 Storage
import { uploadFile, generateUserFileKey, generateUniqueFilename } from '../services/storage';

const filename = generateUniqueFilename(file.name);
const key = generateUserFileKey(userId, 'resumes', filename);
const result = await uploadFile(
  c.env.RESUMES,
  key,
  await file.arrayBuffer(),
  {
    contentType: file.type,
    metadata: { originalFilename: file.name }
  }
);

// Store resume metadata in D1
await env.DB.prepare(`
  INSERT INTO resumes (id, user_id, title, type, sections, created_at, updated_at)
  VALUES (?, ?, ?, 'master', '{}', ?, ?)
`).bind(
  crypto.randomUUID(),
  userId,
  file.name,
  new Date().toISOString(),
  new Date().toISOString()
).run();
```

**Testing**:
- Upload resume (PDF, PNG, JPG)
- Parse resume with AI
- Download resume via authenticated endpoint
- Delete resume (R2 + D1 metadata)

---

#### Task 2.3: Replace Supabase Storage in `exports.ts` (3 hours)

**Current**: Supabase Storage for exports
**Target**: R2 `EXPORTS` bucket

**Changes**:
```typescript
// OLD: Supabase Storage
const { data, error } = await supabase.storage
  .from('exports')
  .upload(`${userId}/${filename}`, pdfBuffer);

// NEW: R2 Storage
import { uploadFile, generateUserFileKey } from '../services/storage';

const filename = `application-${applicationId}-${Date.now()}.pdf`;
const key = generateUserFileKey(userId, 'exports', filename);
const result = await uploadFile(
  c.env.EXPORTS,
  key,
  pdfBuffer,
  { contentType: 'application/pdf' }
);

// Return download URL (short-lived)
return c.json({
  downloadUrl: `/api/files/download/${encodeURIComponent(key)}`,
  expiresIn: 3600 // 1 hour
});
```

**Testing**:
- Generate PDF export
- Generate DOCX export
- Download export via authenticated endpoint
- Verify expiry (1 hour)

---

#### Task 2.4: Frontend Integration (6 hours)

**Files to Update**:
- `src/lib/supabase.ts` - Remove storage client
- `src/hooks/useFileUpload.ts` - Replace Supabase upload with fetch to Workers API
- `src/sections/profile-resume-management/components/ProfilePhotoUpload.tsx`
- `src/sections/profile-resume-management/components/ResumeUpload.tsx`

**New Upload Pattern**:
```typescript
// OLD: Direct Supabase Storage upload
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(path, file);

// NEW: Upload to Workers API
const formData = new FormData();
formData.append('file', file);
formData.append('bucket', 'avatars');
formData.append('path', 'avatar.jpg');

const response = await fetch('/api/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { key, downloadURL } = await response.json();
```

**Testing**:
- Frontend upload flow (avatars, resumes)
- Progress indicators
- Error handling
- Download/preview functionality

---

### 2.3 R2 Storage Security

**Access Control**:
- All uploads require JWT authentication ✅
- User can only upload to their own folder (`users/{userId}/`)
- User can only download their own files (except public avatars)
- File size limits enforced (10MB max)
- File type validation (whitelist: JPG, PNG, PDF, DOCX)

**Path Security**:
```typescript
// ✅ SECURE - Validated user folder
const key = `users/${userId}/resumes/${filename}`;

// ❌ INSECURE - User-provided path (path traversal vulnerability!)
const key = `users/${userProvidedPath}/${filename}`;
```

---

## Section 3: Vectorize Migration

### 3.1 Current State Analysis

**Vectorize Service Status**: ✅ Implemented in `workers/api/services/vectorize.ts`

**Vectorize Indexes Created**:
- `jobmatch-jobs-dev` - Job embeddings (768-dimensional)
- `jobmatch-jobs-staging` - Staging environment
- `jobmatch-jobs-prod` - Production environment

**Files Using pgvector (Supabase)**:
- `jobs.ts` - Job matching with embeddings
- `embeddings.ts` - Embedding generation
- Frontend job matching UI

### 3.2 Migration Tasks

#### Task 3.1: Remove pgvector Dependencies (2 hours)

**Tables to Update**:
- D1 schema already has embeddings removed ✅
- No `embedding` column in `jobs` table ✅
- No `resume_embedding` column in `users` table ✅

**Code Cleanup**:
```typescript
// Remove references to embedding columns
// OLD:
const { data } = await supabase
  .from('jobs')
  .select('*, embedding')
  .eq('id', jobId);

// NEW:
const job = await env.DB.prepare(
  'SELECT * FROM jobs WHERE id = ? AND user_id = ?'
).bind(jobId, userId).first();
```

---

#### Task 3.2: Integrate Vectorize in `jobs.ts` (8 hours)

**Embedding Generation** (already implemented ✅):
```typescript
import { generateJobEmbedding } from '../services/embeddings';
import { storeJobEmbedding } from '../services/vectorize';

// Generate embedding (uses Workers AI with dual-layer caching)
const embedding = await generateJobEmbedding(env, job);

// Store in Vectorize index
await storeJobEmbedding(
  env,
  job.id,
  job.userId,
  job.title,
  job.company,
  embedding
);
```

**Semantic Search** (already implemented ✅):
```typescript
import { semanticSearchJobs } from '../services/vectorize';

// POST /api/jobs/search
const results = await semanticSearchJobs(
  env,
  query,
  userId,
  limit
);

// Returns: [{ id, score, metadata }]
```

**Hybrid Search** (already implemented ✅):
```typescript
import { hybridSearchJobs } from '../services/vectorize';

// Combines FTS5 (keyword) + Vectorize (semantic)
const results = await hybridSearchJobs(
  env,
  env.DB,
  query,
  userId,
  { topK: 20, keywordWeight: 0.3, semanticWeight: 0.7 }
);

// Returns: [{ jobId, keywordScore, semanticScore, combinedScore }]
```

**Integration Points**:
1. ✅ Job creation - Generate + store embedding (background task)
2. ✅ Job update - Regenerate embedding if title/description changed
3. ✅ Job delete - Delete embedding from Vectorize index
4. ✅ Job search - Use hybrid search (FTS5 + Vectorize)

**Testing**:
- Create job → embedding generated and stored
- Search jobs → semantic results returned
- Compare keyword vs semantic search quality
- Verify embedding cache hit rate (60-70% target)

---

#### Task 3.3: Frontend Job Matching Integration (4 hours)

**Update Job Search UI**:
```typescript
// src/sections/job-discovery-matching/components/JobSearch.tsx

// Add search mode toggle
const [searchMode, setSearchMode] = useState<'keyword' | 'semantic' | 'hybrid'>('hybrid');

// API call
const response = await fetch(`/api/jobs/search?searchType=${searchMode}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ query, limit: 20 })
});
```

**Display Semantic Scores**:
- Show match percentage (0-100%)
- Explain match (why this job matches)
- Highlight matched skills/keywords

**Testing**:
- Search for "React developer" → semantic results
- Search for specific company → keyword results
- Hybrid search → balanced results
- Compare search quality vs keyword-only

---

### 3.3 Vectorize Performance Optimization

**Caching Strategy**:
1. **Embedding Generation Cache** (KV, 30-day TTL)
   - Key: `embedding:${hash(text)}`
   - Value: 768-dimensional vector
   - Expected hit rate: 60-70%

2. **Job Analysis Cache** (KV, 7-day TTL)
   - Key: `analysis:${userId}:${jobId}`
   - Value: Compatibility analysis JSON
   - Expected hit rate: 80-90%

**Monitoring**:
- Track cache hit rates (Cloudflare Analytics)
- Monitor embedding generation latency
- Measure search query performance (FTS5 vs Vectorize)
- Compare semantic search quality vs keyword search

---

## Testing Strategy

### 4.1 D1 Migration Testing

**Unit Tests** (Vitest):
```typescript
// workers/tests/unit/d1-queries.test.ts

describe('D1 Queries', () => {
  it('should enforce user_id security filter', async () => {
    const userId = 'user-123';
    const otherUserId = 'user-456';

    // Create job for user-123
    await createJob(env.DB, userId, { title: 'Test Job' });

    // Try to fetch as user-456 (should fail)
    const job = await getJobByIdForUser(env.DB, jobId, otherUserId);
    expect(job).toBeNull();
  });

  it('should list jobs with pagination', async () => {
    // Create 25 jobs
    for (let i = 0; i < 25; i++) {
      await createJob(env.DB, userId, { title: `Job ${i}` });
    }

    // Page 1 (20 jobs)
    const page1 = await listJobsForUser(env.DB, userId, 20, 0);
    expect(page1).toHaveLength(20);

    // Page 2 (5 jobs)
    const page2 = await listJobsForUser(env.DB, userId, 20, 20);
    expect(page2).toHaveLength(5);
  });
});
```

**Integration Tests**:
```typescript
// workers/tests/integration/api-routes.test.ts

describe('API Routes', () => {
  it('POST /api/jobs - should create job with embedding', async () => {
    const response = await fetch(`${API_URL}/api/jobs`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Senior React Developer',
        company: 'Acme Inc',
        description: 'We are hiring...'
      })
    });

    expect(response.status).toBe(201);
    const { job } = await response.json();

    // Verify embedding generated (background task)
    await wait(2000); // Wait for embedding generation

    const embedding = await getJobEmbedding(env, job.id);
    expect(embedding).toHaveLength(768);
  });
});
```

**E2E Tests** (Playwright):
```typescript
// e2e-tests/job-search.spec.ts

test('should search jobs with semantic search', async ({ page }) => {
  await page.goto('/jobs');

  // Enter search query
  await page.fill('[data-testid="job-search-input"]', 'frontend engineer');
  await page.selectOption('[data-testid="search-mode"]', 'semantic');
  await page.click('[data-testid="search-button"]');

  // Verify results
  await expect(page.locator('[data-testid="job-card"]')).toHaveCount(20);
  await expect(page.locator('[data-testid="match-score"]').first()).toContainText('%');
});
```

---

### 4.2 R2 Storage Testing

**Unit Tests**:
```typescript
describe('R2 Storage Service', () => {
  it('should upload file to R2', async () => {
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

    const result = await uploadFile(
      env.AVATARS,
      'users/123/profile/avatar.jpg',
      await file.arrayBuffer(),
      { contentType: 'image/jpeg' }
    );

    expect(result.key).toBe('users/123/profile/avatar.jpg');
    expect(result.size).toBeGreaterThan(0);
  });

  it('should enforce user folder security', async () => {
    const maliciousKey = 'users/../../../etc/passwd';

    await expect(
      uploadFile(env.AVATARS, maliciousKey, Buffer.from('hack'))
    ).rejects.toThrow('Invalid file path');
  });
});
```

**Integration Tests**:
```typescript
describe('File Upload API', () => {
  it('POST /api/files/upload - should upload avatar', async () => {
    const formData = new FormData();
    formData.append('file', avatarFile);
    formData.append('bucket', 'avatars');

    const response = await fetch(`${API_URL}/api/files/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    expect(response.status).toBe(201);
    const { key, downloadURL } = await response.json();
    expect(key).toContain('users/');
  });
});
```

---

### 4.3 Vectorize Testing

**Unit Tests**:
```typescript
describe('Vectorize Service', () => {
  it('should generate and store job embedding', async () => {
    const job = {
      id: 'job-123',
      userId: 'user-123',
      title: 'Senior React Developer',
      company: 'Acme Inc',
      description: 'Build amazing UIs'
    };

    const embedding = await generateJobEmbedding(env, job);
    expect(embedding).toHaveLength(768);

    await storeJobEmbedding(env, job.id, job.userId, job.title, job.company, embedding);

    // Verify stored
    const results = await semanticSearchJobs(env, 'React developer', job.userId, 10);
    expect(results.some(r => r.metadata.jobId === job.id)).toBe(true);
  });
});
```

**Search Quality Tests**:
```typescript
describe('Semantic Search Quality', () => {
  it('should return semantically similar jobs', async () => {
    // Create jobs
    await createJob({ title: 'Frontend Engineer', skills: ['React', 'TypeScript'] });
    await createJob({ title: 'Backend Engineer', skills: ['Node.js', 'PostgreSQL'] });

    // Search for frontend
    const results = await semanticSearchJobs(env, 'React UI developer', userId, 10);

    // Frontend job should rank higher than backend
    expect(results[0].metadata.title).toContain('Frontend');
  });
});
```

---

### 4.4 Rollback Strategy

**Phase-based Rollback**:

1. **If D1 migration fails**: Keep Supabase as primary, D1 as shadow (write to both)
2. **If R2 migration fails**: Keep Supabase Storage, revert frontend changes
3. **If Vectorize migration fails**: Fallback to keyword-only search

**Feature Flags**:
```typescript
// workers/api/lib/featureFlags.ts

export const FEATURE_FLAGS = {
  USE_D1_DATABASE: true,
  USE_R2_STORAGE: true,
  USE_VECTORIZE_SEARCH: true,
  ENABLE_SEMANTIC_SEARCH: true
};

// Toggle features via environment variables
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS, env: Env): boolean {
  return env[`FEATURE_${feature}`] === 'true' || FEATURE_FLAGS[feature];
}
```

**Dual-write Pattern** (during migration):
```typescript
// Write to both Supabase and D1 during transition
async function createJob(job: Job) {
  // Write to D1 (new)
  await env.DB.prepare('INSERT INTO jobs (...) VALUES (...)').run();

  // Write to Supabase (old, for rollback)
  if (!isFeatureEnabled('USE_D1_DATABASE', env)) {
    await supabase.from('jobs').insert(job);
  }
}
```

---

## Risk Assessment

### 5.1 Critical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Data Loss During Migration** | Medium | Critical | Dual-write pattern, backups before migration |
| **RLS Bypass (Security)** | High | Critical | Code review ALL queries, integration tests for security |
| **Performance Regression** | Medium | High | Load testing, caching strategy, monitoring |
| **Embedding Quality Drop** | Low | Medium | A/B test semantic search quality |
| **File Upload Failures** | Medium | Medium | Comprehensive error handling, retry logic |

---

### 5.2 Dependencies & Blockers

**Sequential Dependencies**:
1. D1 schema migration **MUST** complete before code migration
2. R2 buckets **MUST** exist before file migration
3. Vectorize indexes **MUST** be created before embedding migration

**Parallel Opportunities**:
- D1 migration and R2 migration can proceed in parallel
- Vectorize migration can overlap with D1 (after job table migration)
- Frontend updates can start once backend APIs stabilized

**External Dependencies**:
- Cloudflare infrastructure stability
- Workers AI availability (for embeddings)
- SendGrid (emails), Apify (job scraping) remain unchanged

---

## Timeline Estimate

### Week 1: D1 Easy Routes + R2 Foundation
- **Days 1-2**: Analytics, Skills, Auth, Emails (14 hours)
- **Days 3-4**: Files, Exports (7 hours)
- **Day 5**: Testing, bug fixes

### Week 2: D1 Medium Routes + R2 Integration
- **Days 1-3**: Resume, Applications (20 hours)
- **Days 4-5**: R2 frontend integration, testing (10 hours)

### Week 3: D1 Hard Routes + Vectorize
- **Days 1-3**: Jobs, Profile (36 hours)
- **Days 4-5**: Vectorize integration, testing (12 hours)

### Week 4: Integration Testing + Production Deployment
- **Days 1-2**: Full integration testing, E2E tests
- **Day 3**: Load testing, performance optimization
- **Day 4**: Staging deployment, smoke tests
- **Day 5**: Production deployment, monitoring

**Total Estimated Time**:
- D1 Migration: 77 hours
- R2 Migration: 17 hours
- Vectorize Migration: 14 hours
- Testing & QA: 32 hours
- **TOTAL: 140 hours** (3.5 weeks @ 40 hours/week)

**Buffer**: Add 1 week for unexpected issues, code review, documentation

**Final Timeline**: **4-5 weeks** for complete migration

---

## Success Metrics

### Performance Metrics
- [ ] D1 query latency < 50ms (p95)
- [ ] R2 upload speed > 5MB/s
- [ ] Vectorize search latency < 200ms (p95)
- [ ] Embedding cache hit rate > 60%

### Reliability Metrics
- [ ] Zero data loss during migration
- [ ] API uptime > 99.9%
- [ ] Error rate < 0.1%

### Security Metrics
- [ ] All queries enforce user_id filter
- [ ] Zero RLS bypass vulnerabilities
- [ ] File access properly authenticated

### Cost Metrics
- [ ] Total Cloudflare cost < $10/month
- [ ] Supabase subscription cancelled (save $25-81/month)

---

## Appendix: File Modification Checklist

### D1 Database Migration
- [ ] `workers/api/routes/analytics.ts` - No changes needed
- [ ] `workers/api/routes/skills.ts` - 5 Supabase calls → D1
- [ ] `workers/api/routes/auth.ts` - 2 Supabase calls → D1
- [ ] `workers/api/routes/emails.ts` - 4 Supabase calls → D1
- [ ] `workers/api/routes/files.ts` - Already uses R2 ✅
- [ ] `workers/api/routes/exports.ts` - 6 Supabase calls → D1
- [ ] `workers/api/routes/resume.ts` - 8 Supabase calls → D1
- [ ] `workers/api/routes/applications.ts` - 13 Supabase calls → D1
- [ ] `workers/api/routes/jobs.ts` - 14 Supabase calls → D1
- [ ] `workers/api/routes/profile.ts` - 17 Supabase calls → D1

### R2 Storage Migration
- [ ] `workers/api/routes/profile.ts` - Avatar upload
- [ ] `workers/api/routes/resume.ts` - Resume file upload
- [ ] `workers/api/routes/exports.ts` - Export file storage
- [ ] `src/hooks/useFileUpload.ts` - Frontend upload hook
- [ ] `src/sections/profile-resume-management/components/ProfilePhotoUpload.tsx`
- [ ] `src/sections/profile-resume-management/components/ResumeUpload.tsx`

### Vectorize Migration
- [ ] `workers/api/routes/jobs.ts` - Semantic search integration
- [ ] `workers/api/services/embeddings.ts` - Remove Supabase embedding storage
- [ ] `src/sections/job-discovery-matching/components/JobSearch.tsx` - Add semantic search mode

### Testing Files
- [ ] `workers/tests/unit/d1-queries.test.ts` - D1 query tests
- [ ] `workers/tests/integration/api-routes.test.ts` - API integration tests
- [ ] `workers/tests/integration/r2-storage.test.ts` - R2 storage tests
- [ ] `workers/tests/integration/vectorize-search.test.ts` - Vectorize tests
- [ ] `e2e-tests/job-search.spec.ts` - E2E search tests
- [ ] `e2e-tests/file-upload.spec.ts` - E2E upload tests

---

**End of Migration Task Plan**

**Next Steps**:
1. Review plan with development team
2. Set up monitoring & logging infrastructure
3. Create feature flags for gradual rollout
4. Schedule kickoff meeting
5. Begin with Week 1 tasks (Easy routes)

**Questions? Concerns?**
Contact: AI Architecture Team
