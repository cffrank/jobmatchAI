# API Migration Checklist

## Overview

This document provides a comprehensive, endpoint-by-endpoint migration checklist for moving the JobMatch AI backend from Express.js on Railway to Hono on Cloudflare Workers.

**Total Endpoints:** 18 (across 6 route modules + system endpoints)

---

## Table of Contents

- [Migration Status Legend](#migration-status-legend)
- [System Endpoints](#system-endpoints)
- [Applications Routes (5 endpoints)](#applications-routes)
- [Jobs Routes (6 endpoints)](#jobs-routes)
- [Emails Routes (2 endpoints)](#emails-routes)
- [Auth Routes (2 endpoints)](#auth-routes)
- [Exports Routes (2 endpoints)](#exports-routes)
- [Resume Routes (1 endpoint)](#resume-routes)
- [External Service Compatibility](#external-service-compatibility)
- [Middleware Migration](#middleware-migration)
- [Database Query Migration](#database-query-migration)

---

## Migration Status Legend

- ⬜ Not Started
- 🔄 In Progress
- ✅ Completed & Tested
- ⚠️ Needs Special Attention
- ❌ Blocked/Incompatible

---

## System Endpoints

### 1. Health Check
**Endpoint:** `GET /health`
**Status:** ⬜

**Current Implementation (Express):**
```typescript
app.get('/health', cors(healthCorsOptions), (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: NODE_ENV,
  });
});
```

**Target Implementation (Hono):**
```typescript
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: c.env.NODE_ENV,
  });
});
```

**Migration Checklist:**
- ⬜ Remove Express-specific CORS handling (use Hono CORS middleware)
- ⬜ Replace `process.env` with `c.env`
- ⬜ Test from multiple edge locations
- ⬜ Verify monitoring tools can access endpoint

**Complexity:** ⭐ (Very Simple)
**Estimated Time:** 15 minutes
**Dependencies:** None
**External APIs:** None
**Database Queries:** None

---

### 2. API Documentation
**Endpoint:** `GET /api` (development only)
**Status:** ⬜

**Migration Checklist:**
- ⬜ Convert to Hono route
- ⬜ Add environment check for development mode
- ⬜ Update endpoint documentation to reflect Workers deployment

**Complexity:** ⭐ (Very Simple)
**Estimated Time:** 30 minutes

---

## Applications Routes

**File:** `backend/src/routes/applications.ts` → `workers/src/routes/applications.ts`
**Total Endpoints:** 5

### 1. Generate Application
**Endpoint:** `POST /api/applications/generate`
**Status:** ⬜
**Priority:** HIGH (Core Feature)

**Current Implementation:**
- Validates `jobId` with Zod
- Fetches job from Supabase
- Fetches user profile, work experience, education, skills from Supabase
- Calls OpenAI service to generate 3 variants (Impact-Focused, Keyword-Optimized, Concise)
- Saves application and variants to Supabase
- Returns generated variants

**Migration Checklist:**
- ⬜ Convert Express route to Hono
- ⬜ Replace `req.body` with `await c.req.json()`
- ⬜ Replace `req.userId` with `c.get('userId')`
- ⬜ Update error handling to Hono style
- ⬜ Verify OpenAI API calls work from Workers
- ⬜ Test with real job data
- ⬜ Verify rate limiting (20 per hour)
- ⬜ Performance test (should complete in <30s)

**External APIs:**
- ✅ OpenAI GPT-4 API (HTTP-based, fully compatible)

**Database Queries:**
- ✅ `jobs` table - SELECT by id
- ✅ `users` table - SELECT by id
- ✅ `work_experience` table - SELECT by user_id
- ✅ `education` table - SELECT by user_id
- ✅ `skills` table - SELECT by user_id
- ✅ `applications` table - INSERT
- ✅ `application_variants` table - INSERT

**Special Considerations:**
- ⚠️ CPU Time Limit: OpenAI calls can take 10-20 seconds
  - **Action:** Requires Workers Paid plan (30s limit vs 10ms free tier)
- ⚠️ Multiple database queries (5 SELECTs + 2 INSERTs)
  - **Action:** Consider batching or optimizing queries
  - **Action:** Test connection pooling performance

**Complexity:** ⭐⭐⭐⭐ (Complex)
**Estimated Time:** 4 hours
**Dependencies:** OpenAI service, authenticateUser middleware, rateLimiter middleware

---

### 2. List Applications
**Endpoint:** `GET /api/applications`
**Status:** ⬜
**Priority:** MEDIUM

**Current Implementation:**
- Validates query params: `page`, `limit`, `status`
- Queries Supabase with pagination and status filter
- Returns paginated results with `hasMore` flag

**Migration Checklist:**
- ⬜ Convert Express route to Hono
- ⬜ Replace `req.query` with `c.req.query()`
- ⬜ Update Zod validation to parse query params
- ⬜ Verify pagination logic
- ⬜ Test with various page sizes and filters

**Database Queries:**
- ✅ `applications` table - SELECT with filters, pagination, count

**Complexity:** ⭐⭐ (Moderate)
**Estimated Time:** 1 hour
**Dependencies:** authenticateUser middleware

---

### 3. Get Application by ID
**Endpoint:** `GET /api/applications/:id`
**Status:** ⬜
**Priority:** MEDIUM

**Current Implementation:**
- Fetches application by ID and user ID (RLS)
- Fetches associated variants
- Returns application with variants

**Migration Checklist:**
- ⬜ Convert Express route to Hono
- ⬜ Replace `req.params.id` with `c.req.param('id')`
- ⬜ Verify RLS policy enforcement from Workers
- ⬜ Test 404 handling for non-existent applications
- ⬜ Test unauthorized access (different user's application)

**Database Queries:**
- ✅ `applications` table - SELECT by id and user_id
- ✅ `application_variants` table - SELECT by application_id

**Complexity:** ⭐⭐ (Moderate)
**Estimated Time:** 1 hour
**Dependencies:** authenticateUser middleware

---

### 4. Update Application
**Endpoint:** `PATCH /api/applications/:id`
**Status:** ⬜
**Priority:** MEDIUM

**Current Implementation:**
- Validates update fields: `status`, `selectedVariantId`
- Updates application in Supabase
- Automatically sets `submitted_at` when status changes to "submitted"

**Migration Checklist:**
- ⬜ Convert Express route to Hono
- ⬜ Replace `req.params.id` with `c.req.param('id')`
- ⬜ Replace `req.body` with `await c.req.json()`
- ⬜ Verify ownership check before update
- ⬜ Test status transitions (draft → submitted → interviewing, etc.)
- ⬜ Verify `updated_at` timestamp is set

**Database Queries:**
- ✅ `applications` table - SELECT for ownership check
- ✅ `applications` table - UPDATE

**Complexity:** ⭐⭐ (Moderate)
**Estimated Time:** 1.5 hours
**Dependencies:** authenticateUser middleware

---

### 5. Delete Application
**Endpoint:** `DELETE /api/applications/:id`
**Status:** ⬜
**Priority:** LOW

**Current Implementation:**
- Deletes application by ID (with ownership check via RLS)
- Returns 204 No Content on success

**Migration Checklist:**
- ⬜ Convert Express route to Hono
- ⬜ Replace `req.params.id` with `c.req.param('id')`
- ⬜ Verify cascading delete of variants (database constraint)
- ⬜ Test 404 handling
- ⬜ Return `c.body(null, 204)` for empty response

**Database Queries:**
- ✅ `applications` table - DELETE by id and user_id

**Complexity:** ⭐ (Simple)
**Estimated Time:** 45 minutes
**Dependencies:** authenticateUser middleware

---

## Jobs Routes

**File:** `backend/src/routes/jobs.ts` → `workers/src/routes/jobs.ts`
**Total Endpoints:** 6

### 1. List Jobs
**Endpoint:** `GET /api/jobs`
**Status:** ⬜
**Priority:** HIGH

**Current Implementation:**
- Validates query params: `page`, `limit`, `archived`, `saved`, `source`, `minMatchScore`, `search`, `workArrangement`
- Complex Supabase query with multiple filters
- Full-text search on title and company
- Returns paginated results

**Migration Checklist:**
- ⬜ Convert Express route to Hono
- ⬜ Parse all query parameters with Zod
- ⬜ Test each filter independently
- ⬜ Test combined filters
- ⬜ Verify full-text search performance from Workers
- ⬜ Test pagination edge cases (first page, last page, empty results)

**Database Queries:**
- ✅ `jobs` table - Complex SELECT with filters, search, pagination

**Special Considerations:**
- Full-text search may have different performance characteristics from edge
- Test with large datasets (1000+ jobs)

**Complexity:** ⭐⭐⭐ (Moderate-Complex)
**Estimated Time:** 2 hours
**Dependencies:** authenticateUser middleware

---

### 2. Get Job by ID
**Endpoint:** `GET /api/jobs/:id`
**Status:** ⬜
**Priority:** MEDIUM

**Migration Checklist:**
- ⬜ Convert Express route to Hono
- ⬜ Replace `req.params.id` with `c.req.param('id')`
- ⬜ Test 404 handling
- ⬜ Verify RLS enforcement

**Database Queries:**
- ✅ `jobs` table - SELECT by id and user_id

**Complexity:** ⭐ (Simple)
**Estimated Time:** 30 minutes
**Dependencies:** authenticateUser middleware

---

### 3. Scrape Jobs
**Endpoint:** `POST /api/jobs/scrape`
**Status:** ⬜
**Priority:** HIGH (Core Feature)

**Current Implementation:**
- Validates request: `keywords`, `location`, `workArrangement`, `experienceLevel`, `salaryMin`, `salaryMax`, `maxResults`, `sources`
- Calls Apify API to scrape LinkedIn and Indeed
- Saves scraped jobs to Supabase
- Returns job count and job list

**Migration Checklist:**
- ⬜ Convert Express route to Hono
- ⬜ Verify Apify API calls work from Workers
- ⬜ Test with real scraping requests (use test mode to avoid charges)
- ⬜ Verify rate limiting (10 per hour)
- ⬜ Test timeout handling (Apify scraping can take 30-60s)
- ⬜ Verify job deduplication logic

**External APIs:**
- ✅ Apify API (HTTP-based, fully compatible)

**Database Queries:**
- ✅ `jobs` table - INSERT multiple rows

**Special Considerations:**
- ⚠️ CPU Time Limit: Apify scraping can take 30-60 seconds
  - **Action:** Requires Workers Paid plan (30s limit)
  - **Action:** Consider using Durable Objects for longer scraping jobs
  - **Alternative:** Trigger scraping asynchronously, poll for results

**Complexity:** ⭐⭐⭐⭐ (Complex)
**Estimated Time:** 4 hours
**Dependencies:** authenticateUser middleware, rateLimiter middleware, jobScraper service

---

### 4. Update Job
**Endpoint:** `PATCH /api/jobs/:id`
**Status:** ⬜
**Priority:** MEDIUM

**Current Implementation:**
- Validates update fields: `isSaved`, `isArchived`
- Updates job in Supabase

**Migration Checklist:**
- ⬜ Convert Express route to Hono
- ⬜ Replace `req.params.id` with `c.req.param('id')`
- ⬜ Replace `req.body` with `await c.req.json()`
- ⬜ Test save/unsave functionality
- ⬜ Test archive/unarchive functionality

**Database Queries:**
- ✅ `jobs` table - UPDATE

**Complexity:** ⭐⭐ (Moderate)
**Estimated Time:** 1 hour
**Dependencies:** authenticateUser middleware

---

### 5. Delete Job
**Endpoint:** `DELETE /api/jobs/:id`
**Status:** ⬜
**Priority:** LOW

**Migration Checklist:**
- ⬜ Convert Express route to Hono
- ⬜ Replace `req.params.id` with `c.req.param('id')`
- ⬜ Verify cascading delete (check if any applications reference this job)
- ⬜ Test 404 handling

**Database Queries:**
- ✅ `jobs` table - DELETE by id and user_id

**Complexity:** ⭐ (Simple)
**Estimated Time:** 30 minutes
**Dependencies:** authenticateUser middleware

---

### 6. Cleanup Old Jobs (Admin)
**Endpoint:** `POST /api/jobs/cleanup`
**Status:** ⬜
**Priority:** LOW (Admin only)

**Current Implementation:**
- Admin-only endpoint
- Archives jobs older than specified days (default 90)
- Returns count of archived jobs

**Migration Checklist:**
- ⬜ Convert Express route to Hono
- ⬜ Migrate `requireAdmin` middleware to Hono
- ⬜ Test with different `daysOld` values
- ⬜ Verify only admins can access

**Database Queries:**
- ✅ `jobs` table - UPDATE multiple rows with date filter

**Complexity:** ⭐⭐ (Moderate)
**Estimated Time:** 1 hour
**Dependencies:** authenticateUser middleware, requireAdmin middleware

---

## Emails Routes

**File:** `backend/src/routes/emails.ts` → `workers/src/routes/emails.ts`
**Total Endpoints:** 2

### 1. Send Email
**Endpoint:** `POST /api/emails/send`
**Status:** ⬜
**Priority:** HIGH

**Current Implementation:**
- Validates `applicationId` and optional `recipientEmail`
- Fetches application and variants from Supabase
- Calls SendGrid API to send email
- Saves email to history table
- Rate limited to 10 per hour

**Migration Checklist:**
- ⬜ Convert Express route to Hono
- ⬜ Verify SendGrid API calls work from Workers
- ⬜ Test email sending with real recipient (use test email)
- ⬜ Verify email history is saved
- ⬜ Test rate limiting (10 per hour)
- ⬜ Test with selected variant

**External APIs:**
- ✅ SendGrid API (HTTP-based, fully compatible)

**Database Queries:**
- ✅ `applications` table - SELECT by id
- ✅ `application_variants` table - SELECT by application_id
- ✅ `users` table - SELECT by id (for sender info)
- ✅ `email_history` table - INSERT

**Complexity:** ⭐⭐⭐ (Moderate-Complex)
**Estimated Time:** 2.5 hours
**Dependencies:** authenticateUser middleware, rateLimiter middleware, sendgrid service

---

### 2. Email History
**Endpoint:** `GET /api/emails/history`
**Status:** ⬜
**Priority:** MEDIUM

**Current Implementation:**
- Validates query params: `page`, `limit`, `applicationId`
- Queries email history with pagination
- Optional filter by application ID

**Migration Checklist:**
- ⬜ Convert Express route to Hono
- ⬜ Test pagination
- ⬜ Test filtering by application ID
- ⬜ Verify sorting (most recent first)

**Database Queries:**
- ✅ `email_history` table - SELECT with pagination and optional filter

**Complexity:** ⭐⭐ (Moderate)
**Estimated Time:** 1 hour
**Dependencies:** authenticateUser middleware

---

## Auth Routes

**File:** `backend/src/routes/auth.ts` → `workers/src/routes/auth.ts`
**Total Endpoints:** 2

### 1. LinkedIn OAuth Initiate
**Endpoint:** `GET /api/auth/linkedin/initiate`
**Status:** ⬜
**Priority:** MEDIUM

**Current Implementation:**
- Generates state token for CSRF protection
- Stores state in `oauth_states` table with expiration
- Returns LinkedIn authorization URL

**Migration Checklist:**
- ⬜ Convert Express route to Hono
- ⬜ Generate state token (use crypto.randomUUID() from Workers)
- ⬜ Test state storage in Supabase
- ⬜ Verify authorization URL generation
- ⬜ Test rate limiting (5 per 15 minutes)

**External APIs:**
- None (just generates URL)

**Database Queries:**
- ✅ `oauth_states` table - INSERT

**Complexity:** ⭐⭐ (Moderate)
**Estimated Time:** 1.5 hours
**Dependencies:** authenticateUser middleware, rateLimiter middleware

---

### 2. LinkedIn OAuth Callback
**Endpoint:** `GET /api/auth/linkedin/callback`
**Status:** ⬜
**Priority:** MEDIUM

**Current Implementation:**
- Validates callback params: `code`, `state`, `error`
- Verifies state token from database
- Exchanges code for access token (LinkedIn API)
- Fetches user profile from LinkedIn
- Updates user profile in Supabase
- Redirects to frontend with success/error

**Migration Checklist:**
- ⬜ Convert Express route to Hono
- ⬜ Parse query parameters with Zod
- ⬜ Verify state token from database
- ⬜ Test LinkedIn token exchange from Workers
- ⬜ Test profile import
- ⬜ Test redirect to frontend
- ⬜ Test error handling (invalid state, expired state, LinkedIn errors)

**External APIs:**
- ⚠️ LinkedIn OAuth API (HTTP-based, should be compatible)

**Database Queries:**
- ✅ `oauth_states` table - SELECT by state
- ✅ `oauth_states` table - DELETE by state
- ✅ `users` table - UPDATE

**Special Considerations:**
- Test OAuth flow end-to-end in staging
- Ensure redirect URLs are correct for Workers domain

**Complexity:** ⭐⭐⭐⭐ (Complex)
**Estimated Time:** 3 hours
**Dependencies:** rateLimiter middleware (IP-based)

---

## Exports Routes

**File:** `backend/src/routes/exports.ts` → `workers/src/routes/exports.ts`
**Total Endpoints:** 2

### 1. Export PDF
**Endpoint:** `POST /api/exports/pdf`
**Status:** ⬜
**Priority:** MEDIUM
**Risk:** ⚠️ HIGH (Node.js library compatibility)

**Current Implementation:**
- Uses PDFKit (Node.js streams)
- Fetches application and variant
- Generates PDF resume and cover letter
- Returns PDF buffer

**Migration Strategy Options:**

**Option A: Use Workers-Compatible PDF Library**
- Replace PDFKit with `pdf-lib` (works in Workers)
- Recreate PDF generation logic

**Option B: External Service**
- Use DocRaptor, CloudConvert, or similar API
- Send HTML/data, receive PDF

**Option C: Proxy to Railway (Temporary)**
- Keep Railway running for exports only
- Proxy PDF requests to Railway from Workers

**Recommendation:** Start with Option C for MVP, migrate to Option A or B post-launch.

**Migration Checklist (Option C - Proxy):**
- ⬜ Create proxy handler in Workers
- ⬜ Forward request to Railway with auth token
- ⬜ Return PDF response
- ⬜ Test with various resume formats
- ⬜ Monitor latency (should be <2s)

**Migration Checklist (Option A - pdf-lib):**
- ⬜ Research pdf-lib API
- ⬜ Create proof-of-concept resume PDF
- ⬜ Replicate current PDF layout
- ⬜ Test with real resume data
- ⬜ Verify fonts and styling

**Complexity:** ⭐⭐⭐⭐⭐ (Very Complex)
**Estimated Time:** 6-8 hours (Option A), 2 hours (Option C)
**Dependencies:** authenticateUser middleware, rateLimiter middleware

---

### 2. Export DOCX
**Endpoint:** `POST /api/exports/docx`
**Status:** ⬜
**Priority:** MEDIUM
**Risk:** ⚠️ HIGH (Node.js library compatibility)

**Current Implementation:**
- Uses `docx` library (Node.js buffers)
- Generates DOCX resume and cover letter
- Returns DOCX buffer

**Migration Strategy Options:**

**Option A: Client-Side Generation**
- Move DOCX generation to frontend (browser has docx support)
- Send data to frontend, generate client-side

**Option B: External Service**
- Use API service for DOCX generation

**Option C: Proxy to Railway (Temporary)**
- Same as PDF proxy strategy

**Recommendation:** Option A (client-side) is most cost-effective. Option C for MVP.

**Migration Checklist (Option C - Proxy):**
- ⬜ Create proxy handler in Workers
- ⬜ Forward request to Railway
- ⬜ Return DOCX response
- ⬜ Test with various resume formats

**Complexity:** ⭐⭐⭐⭐⭐ (Very Complex)
**Estimated Time:** 2 hours (Option C), 8 hours (Option A)
**Dependencies:** authenticateUser middleware, rateLimiter middleware

---

## Resume Routes

**File:** `backend/src/routes/resume.ts` → `workers/src/routes/resume.ts`
**Total Endpoints:** 1

### 1. Parse Resume
**Endpoint:** `POST /api/resume/parse`
**Status:** ⬜
**Priority:** HIGH

**Current Implementation:**
- Receives `storagePath` pointing to uploaded resume in Supabase Storage
- Downloads resume file from Supabase Storage
- If PDF: extracts text using pdf-parse
- Sends text to OpenAI GPT-4o with vision to extract structured data
- Returns parsed resume data (work experience, education, skills)

**Migration Checklist:**
- ⬜ Convert Express route to Hono
- ⬜ Verify Supabase Storage access from Workers
- ⬜ Replace pdf-parse with Workers-compatible alternative
  - **Option 1:** Use `pdf.js` (browser-compatible)
  - **Option 2:** Send PDF directly to OpenAI Vision API (skip text extraction)
- ⬜ Test OpenAI API calls from Workers
- ⬜ Test with various resume formats (PDF, DOCX)
- ⬜ Verify rate limiting

**External APIs:**
- ✅ OpenAI GPT-4o API (HTTP-based, fully compatible)
- ✅ Supabase Storage API (HTTP-based, fully compatible)

**Database Queries:**
- None (just returns parsed data, doesn't save)

**Special Considerations:**
- ⚠️ PDF parsing: pdf-parse uses Node.js streams
  - **Action:** Use pdf.js or send PDF to OpenAI Vision directly
- ⚠️ Large PDF files may exceed request size limits
  - **Action:** Limit PDF size to 10MB

**Complexity:** ⭐⭐⭐⭐ (Complex)
**Estimated Time:** 4 hours
**Dependencies:** authenticateUser middleware, rateLimiter middleware, openai service

---

## External Service Compatibility

### OpenAI API
**Status:** ✅ Fully Compatible
**Library:** `openai` package (HTTP-based)
**Usage:**
- Application generation (GPT-4)
- Resume parsing (GPT-4o with Vision)
- Job compatibility analysis

**Testing:**
- ⬜ Test application generation from Workers
- ⬜ Test resume parsing from Workers
- ⬜ Verify API key access
- ⬜ Test error handling (rate limits, API errors)

---

### Apify API
**Status:** ✅ Fully Compatible
**Library:** `apify-client` package (HTTP-based)
**Usage:**
- LinkedIn job scraping
- Indeed job scraping

**Testing:**
- ⬜ Test job scraping from Workers
- ⬜ Verify API token access
- ⬜ Test with various search queries
- ⬜ Test timeout handling (scraping takes 30-60s)

**Special Considerations:**
- Long-running scraping jobs may hit CPU time limit
- Consider asynchronous scraping with polling

---

### SendGrid API
**Status:** ✅ Fully Compatible
**Library:** `@sendgrid/mail` package (HTTP-based)
**Usage:**
- Application email sending

**Testing:**
- ⬜ Test email sending from Workers
- ⬜ Verify API key access
- ⬜ Test with real recipient
- ⬜ Verify email templates work

---

### Supabase (PostgreSQL)
**Status:** ✅ Fully Compatible
**Library:** `@supabase/supabase-js` (HTTP-based)
**Usage:**
- All database queries
- Authentication
- Storage

**Testing:**
- ⬜ Test all SELECT queries from Workers
- ⬜ Test all INSERT queries from Workers
- ⬜ Test all UPDATE queries from Workers
- ⬜ Test all DELETE queries from Workers
- ⬜ Verify RLS policies work from edge
- ⬜ Test connection pooling performance
- ⬜ Test with concurrent requests

**Performance Considerations:**
- Workers are distributed globally, Supabase has regional servers
- Test latency from different edge locations
- Consider Supabase Edge Functions for complex queries

---

## Middleware Migration

### 1. Authentication Middleware
**File:** `backend/src/middleware/auth.ts` → `workers/src/middleware/auth.ts`
**Status:** ⬜

**Migration Checklist:**
- ⬜ Convert to Hono middleware with `createMiddleware()`
- ⬜ Replace `req.headers` with `c.req.header()`
- ⬜ Replace `req.user` with `c.set('user')`
- ⬜ Replace `res.status().json()` with `c.json(data, status)`
- ⬜ Test JWT verification from Workers
- ⬜ Test token expiration handling
- ⬜ Test invalid token handling

---

### 2. Rate Limiter Middleware
**File:** `backend/src/middleware/rateLimiter.ts` → `workers/src/middleware/rateLimiter.ts`
**Status:** ⬜

**Current Implementation:**
- PostgreSQL-backed rate limiting (user-based)
- In-memory IP-based rate limiting (for unauthenticated requests)

**Migration Strategy:**
- PostgreSQL-backed rate limiting: Already compatible, just convert to Hono
- IP-based rate limiting: Replace in-memory Map with Workers KV

**Migration Checklist:**
- ⬜ Convert to Hono middleware
- ⬜ Keep PostgreSQL-backed rate limiting logic (already compatible)
- ⬜ Replace in-memory IP rate limiting with Workers KV
- ⬜ Test rate limit headers in response
- ⬜ Test rate limit enforcement
- ⬜ Test cleanup of expired rate limit records

**Workers KV IP Rate Limiter:**
```typescript
export const ipRateLimiter = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const key = `rate-limit:ip:${ip}`;

  const record = await c.env.RATE_LIMIT_KV.get(key, { type: 'json' });

  if (record && record.count >= maxRequests) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }

  // Update count
  const newCount = (record?.count || 0) + 1;
  await c.env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: newCount }), {
    expirationTtl: windowMs / 1000,
  });

  await next();
});
```

---

### 3. Error Handler Middleware
**File:** `backend/src/middleware/errorHandler.ts` → `workers/src/middleware/errorHandler.ts`
**Status:** ⬜

**Migration Checklist:**
- ⬜ Convert to Hono error handling with `app.onError()`
- ⬜ Keep `asyncHandler` utility (useful for catching async errors)
- ⬜ Test error responses
- ⬜ Test 404 handling with `app.notFound()`

---

### 4. Login Protection Middleware
**File:** `backend/src/middleware/loginProtection.ts`
**Status:** ⬜

**Migration Checklist:**
- ⬜ Convert to Hono middleware
- ⬜ Keep PostgreSQL-backed failed login tracking (already compatible)
- ⬜ Test account lockout logic
- ⬜ Test auto-unlock after timeout

---

## Database Query Migration

All Supabase queries are HTTP-based and fully compatible with Workers. No changes needed to query logic, only to how they're called in route handlers.

**General Checklist:**
- ⬜ Replace `supabaseAdmin` imports with environment-based client creation
- ⬜ Test all queries from Workers environment
- ⬜ Verify RLS policies work correctly from edge
- ⬜ Monitor query performance from different edge locations
- ⬜ Test connection pooling under load

**Example Migration:**

**Before (Express):**
```typescript
import { supabaseAdmin } from '../config/supabase';

const { data: jobs } = await supabaseAdmin
  .from('jobs')
  .select('*')
  .eq('user_id', userId);
```

**After (Hono + Workers):**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  c.env.SUPABASE_URL,
  c.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: jobs } = await supabase
  .from('jobs')
  .select('*')
  .eq('user_id', userId);
```

---

## Migration Priority Matrix

| Priority | Endpoints | Reason |
|----------|-----------|--------|
| **P0 (Critical)** | Health check, Jobs list, Application generation | Core functionality |
| **P1 (High)** | Job scraping, Email sending, Resume parsing, Applications CRUD | Key features |
| **P2 (Medium)** | Jobs CRUD, Auth (LinkedIn), Exports (with proxy) | Important but not blocking |
| **P3 (Low)** | Admin endpoints, Email history | Nice to have |

---

## Testing Checklist

After each endpoint migration:

- ⬜ Unit tests pass
- ⬜ Integration tests pass
- ⬜ Manual testing with Postman/Thunder Client
- ⬜ Test from Workers dev environment (`wrangler dev`)
- ⬜ Test from Workers staging deployment
- ⬜ Performance testing (latency, throughput)
- ⬜ Error handling tested (invalid inputs, auth errors, database errors)
- ⬜ Rate limiting tested
- ⬜ Documentation updated

---

## Completion Tracking

**Total Progress:** 0/18 endpoints (0%)

**By Category:**
- System: 0/2 (0%)
- Applications: 0/5 (0%)
- Jobs: 0/6 (0%)
- Emails: 0/2 (0%)
- Auth: 0/2 (0%)
- Exports: 0/2 (0%)
- Resume: 0/1 (0%)

---

**Last Updated:** 2025-12-27
**Next Review:** Start of Phase 3 (Route Migration)
