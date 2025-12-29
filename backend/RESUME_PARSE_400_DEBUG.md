# Resume Parse 400 Error - Debugging Guide

## Problem Summary

**Symptom:** Frontend receives 400 Bad Request when calling `POST /api/resume/parse`

**What We Know:**
1. File uploads to Supabase Storage successfully
2. Frontend receives file path: `resumes/{userId}/{timestamp}_{filename}`
3. Backend v1.0.9 is deployed and healthy (`/health` returns 200)
4. Frontend sends correct request structure to backend
5. Backend returns 400 (validation error or bad request)

## Investigation Steps

### 1. Verify Backend Deployment

```bash
# Check deployment status
railway status

# Get recent logs
railway logs
```

### 2. Check Logs After New Deployment (v1.0.10+)

The enhanced logging (commit de13129) now captures:

```
[Auth] Authenticated user: {userId} for POST /api/resume/parse
[/api/resume/parse] Request received from user {userId}
[/api/resume/parse] Request body: {...}
[/api/resume/parse] Content-Type: application/json
[/api/resume/parse] Origin: https://...
[/api/resume/parse] Validation passed - starting parse...
```

**OR if validation fails:**

```
[/api/resume/parse] Validation failed for user {userId}
[/api/resume/parse] Validation errors: [...]
[/api/resume/parse] Received body: {...}
```

### 3. Possible Root Causes

#### A. CORS Rejection
**Symptom:** Request never reaches endpoint
**Logs:** Only global request log, no auth or endpoint logs
**Fix:** Verify `APP_URL` environment variable matches frontend URL

```bash
railway variables | grep APP_URL
# Should be: https://jobmatch-ai-app.pages.dev
```

#### B. Authentication Failure
**Symptom:** No auth success log
**Logs:** Error in auth middleware
**Fix:** Verify Supabase config

```bash
railway variables | grep SUPABASE
# Verify SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

#### C. Validation Error
**Symptom:** Auth succeeds but validation fails
**Logs:** Detailed validation error with received body
**Potential issues:**
- Missing `storagePath` field
- Incorrect data type (not a string)
- Extra unexpected fields in request body

#### D. File Path Mismatch
**Symptom:** Validation passes but file not found
**Logs:** `[parseResume] File not found at path: ...`
**Cause:** Supabase upload returns different path than expected

### 4. Frontend Request Structure

From `src/hooks/useResumeParser.ts`:

```typescript
{
  storagePath: string  // e.g., "resumes/user-id/timestamp_filename.pdf"
}
```

Backend validation schema (correct):

```typescript
const parseResumeSchema = z.object({
  storagePath: z.string().min(1, 'Storage path is required'),
});
```

### 5. Debugging Checklist

- [ ] Verify Railway deployment completed (v1.0.10+)
- [ ] Check Railway logs for detailed request info
- [ ] Verify `APP_URL` matches Cloudflare Pages URL
- [ ] Verify Supabase environment variables are set
- [ ] Test auth by checking for `[Auth]` log line
- [ ] Check if validation passes by looking for "Validation passed" log
- [ ] Verify file exists in Supabase Storage bucket 'files'

### 6. Testing Manually

Use the test script:

```bash
# Get your Supabase auth token from browser dev tools
# Look for localStorage key: sb-{project-id}-auth-token

export TEST_TOKEN="your-token-here"
export TEST_PATH="resumes/{userId}/{filename}"

node backend/test-resume-parse.js
```

### 7. Expected vs Actual Behavior

**Expected:**
1. Auth middleware: ✅ Authenticate user
2. Rate limiter: ✅ Check rate limit
3. Endpoint handler: ✅ Validate storagePath
4. OpenAI service: ✅ Verify file exists
5. OpenAI service: ✅ Generate signed URL
6. OpenAI service: ✅ Call GPT-4o Vision
7. Endpoint handler: ✅ Return parsed data

**Actual (400 error):**
- Request reaches backend ✅
- One of steps 1-3 fails ❌
- Need logs to determine which step

## Next Actions

1. **Deploy v1.0.10 (with enhanced logging)** - DONE
2. **Wait for deployment to complete** - IN PROGRESS
3. **Attempt resume upload from frontend**
4. **Check Railway logs for detailed error**
5. **Identify root cause from logs**
6. **Apply targeted fix**

## Related Files

- `/home/carl/application-tracking/jobmatch-ai/backend/src/routes/resume.ts` - Endpoint
- `/home/carl/application-tracking/jobmatch-ai/backend/src/middleware/auth.ts` - Auth
- `/home/carl/application-tracking/jobmatch-ai/backend/src/services/openai.service.ts` - Parsing logic
- `/home/carl/application-tracking/jobmatch-ai/src/hooks/useResumeParser.ts` - Frontend
- `/home/carl/application-tracking/jobmatch-ai/backend/src/index.ts` - CORS config
