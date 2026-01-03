# Cloudflare Workers Backend - Manual Testing Guide

This guide provides step-by-step instructions for testing all Workers functionality.

## Prerequisites

1. **Environment Setup:**
   ```bash
   cd workers
   npm install
   wrangler login
   ```

2. **Environment Variables (.dev.vars.development):**
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   OPENAI_API_KEY=your-openai-key
   SENDGRID_API_KEY=your-sendgrid-key
   APIFY_API_TOKEN=your-apify-token
   APP_URL=http://localhost:5173
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

   Server will run on: `http://localhost:8787`

---

## Test 1: Authentication Flow ✓

**Objective:** Verify Supabase Auth + Workers JWT validation + D1 profile storage

### Step 1.1: Create Test User via Supabase Auth

**Method:** Use Supabase Dashboard or CLI

```bash
# Via Supabase CLI (if available)
supabase auth users create test@example.com --password Test123456!

# OR use Supabase Dashboard:
# 1. Go to Authentication > Users
# 2. Click "Add User"
# 3. Enter email: test@example.com
# 4. Enter password: Test123456!
```

**Expected:** User created successfully, receives confirmation email

### Step 1.2: Get JWT Token

**Method:** Login via Supabase Auth

```bash
curl -X POST https://your-project.supabase.co/auth/v1/token \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "gotrue_meta_security": {}
  }'
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": { "id": "uuid-here", "email": "test@example.com" }
}
```

Save the `access_token` for subsequent tests.

### Step 1.3: Validate JWT via Workers

**Method:** Call Workers with JWT token

```bash
export TOKEN="eyJhbGci..." # Use token from Step 1.2

curl http://localhost:8787/api/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "id": "uuid-here",
  "email": "test@example.com",
  "firstName": "Test",
  "lastName": "User",
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### Step 1.4: Verify Profile in D1

**Method:** Query D1 database

```bash
wrangler d1 execute jobmatch-dev \
  --command "SELECT id, email, first_name, last_name FROM users WHERE email='test@example.com'"
```

**Expected:** User profile exists in D1 with correct data

### Test 1 Results:
- [ ] User created via Supabase Auth
- [ ] JWT token issued by Supabase
- [ ] Workers middleware validates token
- [ ] User profile stored in D1
- [ ] Profile endpoint returns user data

---

## Test 2: File Uploads to R2 ✓

**Objective:** Verify R2 storage + metadata in D1 + authenticated downloads

### Step 2.1: Upload Avatar to R2

**Method:** POST multipart/form-data

```bash
curl http://localhost:8787/api/profile/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@/path/to/avatar.png"
```

**Expected Response:**
```json
{
  "url": "https://r2-url/avatars/user-id/avatar.png",
  "key": "avatars/user-id/avatar.png"
}
```

### Step 2.2: Verify Avatar in R2

```bash
wrangler r2 object get jobmatch-ai-dev-avatars/avatars/user-id/avatar.png
```

**Expected:** File downloaded successfully

### Step 2.3: Upload Resume to R2

```bash
curl http://localhost:8787/api/resume/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "resume=@/path/to/resume.pdf"
```

**Expected Response:**
```json
{
  "id": "resume-uuid",
  "filename": "resume.pdf",
  "url": "https://r2-url/resumes/user-id/resume.pdf",
  "parsedData": { ... }
}
```

### Step 2.4: Verify Resume Metadata in D1

```bash
wrangler d1 execute jobmatch-dev \
  --command "SELECT id, user_id, filename, file_size FROM resumes WHERE user_id='user-id'"
```

**Expected:** Resume record with correct metadata

### Step 2.5: Test File Size Validation

```bash
# Create 11MB file (exceeds 10MB limit)
dd if=/dev/zero of=/tmp/large.pdf bs=1M count=11

curl http://localhost:8787/api/resume/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "resume=@/tmp/large.pdf"
```

**Expected Response:** 400 Bad Request with "File size exceeds limit" message

### Test 2 Results:
- [ ] Avatar uploaded to R2 AVATARS bucket
- [ ] Resume uploaded to R2 RESUMES bucket
- [ ] Metadata saved in D1
- [ ] File size validation works
- [ ] File type validation works
- [ ] Download URLs generated

---

## Test 3: Job Search with Vectorize ✓

**Objective:** Verify Workers AI embeddings + Vectorize semantic search + FTS5 hybrid search

### Step 3.1: Create Test Jobs

**Method:** Create 10 jobs via API

```bash
# Create Frontend Engineer job
curl http://localhost:8787/api/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Frontend Engineer",
    "company": "Tech Corp",
    "description": "React, TypeScript, Tailwind CSS expert needed",
    "location": "Remote",
    "workArrangement": "Remote",
    "salaryMin": 100000,
    "salaryMax": 150000,
    "source": "manual"
  }'

# Repeat for 9 more jobs with different roles:
# - Backend Developer - Node.js
# - Full Stack Software Engineer
# - DevOps Engineer - AWS
# - Machine Learning Engineer
# - Data Scientist - Python
# - Product Manager - Tech
# - UI/UX Designer
# - Technical Writer
# - Solutions Architect
```

**Expected Response (for each):**
```json
{
  "id": "job-uuid",
  "title": "Senior Frontend Engineer",
  "embedding_vector": [0.123, 0.456, ...], // 768 dimensions
  ...
}
```

### Step 3.2: Verify Embeddings in D1

```bash
wrangler d1 execute jobmatch-dev \
  --command "SELECT id, title, LENGTH(embedding_vector) as vec_length FROM jobs LIMIT 10"
```

**Expected:** All jobs have 768-dimensional embedding vectors

### Step 3.3: Test Semantic Search

```bash
curl http://localhost:8787/api/jobs/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "software engineer with frontend experience",
    "searchType": "semantic",
    "limit": 5
  }'
```

**Expected Response:**
```json
{
  "jobs": [
    {
      "id": "job-uuid",
      "title": "Senior Frontend Engineer",
      "matchScore": 0.95,
      ...
    },
    {
      "id": "job-uuid-2",
      "title": "Full Stack Software Engineer",
      "matchScore": 0.87,
      ...
    }
  ],
  "searchType": "semantic",
  "resultCount": 5
}
```

**Verify:** Frontend Engineer is ranked higher than Backend Developer

### Step 3.4: Test Hybrid Search (FTS5 + Vectorize)

```bash
curl http://localhost:8787/api/jobs/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "backend node.js developer",
    "searchType": "hybrid",
    "limit": 5
  }'
```

**Expected:** Results combine keyword matching + semantic similarity

### Step 3.5: Verify Embeddings Cached in KV

```bash
wrangler kv:key list --namespace-id=YOUR_EMBEDDINGS_CACHE_ID --prefix="job-embedding:"
```

**Expected:** Embeddings cached for performance

### Test 3 Results:
- [ ] 10 test jobs created in D1
- [ ] Embeddings generated (768 dimensions)
- [ ] Embeddings cached in KV
- [ ] Embeddings indexed in Vectorize
- [ ] Semantic search works
- [ ] Hybrid search works
- [ ] Results ranked by relevance

---

## Test 4: Email Service ✓

**Objective:** Verify SendGrid integration + D1 email history + rate limiting

### Step 4.1: Send Test Email

```bash
curl http://localhost:8787/api/emails/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Test Email from Workers",
    "html": "<h1>Hello from JobMatch AI!</h1><p>This is a test email.</p>"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "messageId": "sendgrid-message-id"
}
```

### Step 4.2: Verify Email History in D1

```bash
wrangler d1 execute jobmatch-dev \
  --command "SELECT id, user_id, recipient, subject, status FROM email_logs WHERE user_id='user-id' ORDER BY created_at DESC LIMIT 5"
```

**Expected:** Email record with status='sent'

### Step 4.3: Test Rate Limiting

```bash
# Send 10 emails rapidly (exceeds limit)
for i in {1..10}; do
  curl http://localhost:8787/api/emails/send \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"to\": \"test$i@example.com\",
      \"subject\": \"Test $i\",
      \"html\": \"<p>Test email $i</p>\"
    }"
done
```

**Expected:** First 5 succeed, rest return 429 Too Many Requests

### Step 4.4: Verify Rate Limit in KV

```bash
wrangler kv:key get "rate-limit:email:user-id" --namespace-id=YOUR_RATE_LIMITS_ID
```

**Expected:** Shows current usage count

### Test 4 Results:
- [ ] Email sent via SendGrid
- [ ] Email history saved in D1
- [ ] Rate limiting enforced (5 emails/hour)
- [ ] Rate limit stored in KV
- [ ] Email templates render correctly

---

## Test 5: PDF/DOCX Exports ✓

**Objective:** Verify export generation + R2 storage + download URLs

### Step 5.1: Create Test Resume Data

```bash
curl http://localhost:8787/api/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X PATCH \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "location": "San Francisco, CA",
    "headline": "Senior Software Engineer",
    "summary": "Experienced developer with 10 years in full-stack development"
  }'
```

### Step 5.2: Generate PDF Export

```bash
curl http://localhost:8787/api/exports/resume/pdf \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resumeId": "resume-uuid"
  }'
```

**Expected Response:**
```json
{
  "url": "https://r2-url/exports/user-id/resume-2025-01-01.pdf",
  "expiresAt": "2025-01-01T01:00:00Z"
}
```

### Step 5.3: Download and Verify PDF

```bash
curl -o resume.pdf "https://r2-url/exports/user-id/resume-2025-01-01.pdf"
file resume.pdf
```

**Expected:** Valid PDF file

### Step 5.4: Generate DOCX Export

```bash
curl http://localhost:8787/api/exports/resume/docx \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resumeId": "resume-uuid"
  }'
```

**Expected:** DOCX file generated and downloadable

### Step 5.5: Verify Export in R2

```bash
wrangler r2 object list jobmatch-ai-dev-exports --prefix="exports/user-id/"
```

**Expected:** Both PDF and DOCX files listed

### Test 5 Results:
- [ ] PDF export generated
- [ ] DOCX export generated
- [ ] Files stored in R2 EXPORTS bucket
- [ ] Download URLs work
- [ ] Files expire after 1 hour

---

## Test 6: Job Scraping ✓

**Objective:** Verify Apify integration + D1 storage + deduplication

### Step 6.1: Scrape LinkedIn Jobs

```bash
curl http://localhost:8787/api/jobs/scrape \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["software engineer", "frontend"],
    "location": "Remote",
    "workArrangement": "Remote",
    "maxResults": 10,
    "sources": ["linkedin"]
  }'
```

**Expected Response:**
```json
{
  "jobCount": 10,
  "newJobs": 8,
  "duplicates": 2,
  "sources": {
    "linkedin": 10
  }
}
```

### Step 6.2: Verify Jobs in D1

```bash
wrangler d1 execute jobmatch-dev \
  --command "SELECT id, title, company, source FROM jobs WHERE source='linkedin' ORDER BY created_at DESC LIMIT 10"
```

**Expected:** 10 LinkedIn jobs with unique titles

### Step 6.3: Test Deduplication

**Method:** Re-run same scrape query

```bash
curl http://localhost:8787/api/jobs/scrape \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["software engineer", "frontend"],
    "location": "Remote",
    "workArrangement": "Remote",
    "maxResults": 10,
    "sources": ["linkedin"]
  }'
```

**Expected Response:**
```json
{
  "jobCount": 10,
  "newJobs": 0,
  "duplicates": 10,
  "sources": {
    "linkedin": 10
  }
}
```

### Step 6.4: Verify Canonical Job Metadata

```bash
wrangler d1 execute jobmatch-dev \
  --command "SELECT COUNT(DISTINCT canonical_job_id) as unique_jobs FROM canonical_job_metadata"
```

**Expected:** Each unique job has one canonical entry

### Step 6.5: Scrape Indeed Jobs

```bash
curl http://localhost:8787/api/jobs/scrape \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["backend developer"],
    "location": "San Francisco",
    "maxResults": 5,
    "sources": ["indeed"]
  }'
```

**Expected:** Indeed jobs scraped successfully

### Test 6 Results:
- [ ] LinkedIn scraping works
- [ ] Indeed scraping works
- [ ] Jobs saved to D1
- [ ] Embeddings generated for scraped jobs
- [ ] Deduplication prevents duplicates
- [ ] Canonical job metadata created

---

## Summary Checklist

### Test 1: Authentication Flow
- [ ] User created via Supabase Auth
- [ ] JWT validation works
- [ ] User profile in D1

### Test 2: R2 File Uploads
- [ ] Avatar upload
- [ ] Resume upload
- [ ] File validation
- [ ] Download URLs

### Test 3: Job Search
- [ ] Embeddings generated
- [ ] Semantic search
- [ ] Hybrid search
- [ ] Vectorize indexing

### Test 4: Email Service
- [ ] SendGrid integration
- [ ] Email history
- [ ] Rate limiting

### Test 5: Exports
- [ ] PDF generation
- [ ] DOCX generation
- [ ] R2 storage

### Test 6: Job Scraping
- [ ] LinkedIn scraping
- [ ] Indeed scraping
- [ ] Deduplication
- [ ] Embeddings

---

## Troubleshooting

### Common Issues

**1. "SUPABASE_URL is not defined"**
- Check `.dev.vars.development` file exists
- Verify environment variables are set

**2. "DNS lookup failed" (in tests)**
- This is expected in isolated Workers test environment
- Use manual testing guide instead

**3. "401 Unauthorized"**
- Verify JWT token is not expired
- Check Authorization header format: `Bearer <token>`

**4. "R2 bucket not found"**
- Create buckets: `wrangler r2 bucket create jobmatch-ai-dev-avatars`
- Verify bucket names in wrangler.toml

**5. "D1 database not found"**
- Create database: `wrangler d1 create jobmatch-dev`
- Run migrations: `wrangler d1 migrations apply jobmatch-dev`

---

## Next Steps

After completing all tests:

1. **Deploy to Staging:**
   ```bash
   npm run deploy:staging
   ```

2. **Run tests against staging:**
   Replace `http://localhost:8787` with staging URL

3. **Deploy to Production:**
   ```bash
   npm run deploy:production
   ```

4. **Update Frontend:**
   - Point frontend to Workers API
   - Test end-to-end flows
   - Deploy frontend to Cloudflare Pages

---

## Test Results Documentation

**Date:** ___________
**Tester:** ___________
**Environment:** Development / Staging / Production

| Test | Status | Notes |
|------|--------|-------|
| Test 1: Auth | ⬜ Pass ⬜ Fail | |
| Test 2: R2 | ⬜ Pass ⬜ Fail | |
| Test 3: Jobs | ⬜ Pass ⬜ Fail | |
| Test 4: Email | ⬜ Pass ⬜ Fail | |
| Test 5: Exports | ⬜ Pass ⬜ Fail | |
| Test 6: Scraping | ⬜ Pass ⬜ Fail | |

**Overall Status:** ⬜ All Tests Pass ⬜ Some Failures ⬜ Not Started

**Blockers/Issues:**

**Next Actions:**
