# Resume Parse 400 Error - Fix Summary

## Problem

Frontend successfully uploads resume to Supabase Storage, but receives **400 Bad Request** when calling `POST /api/resume/parse` endpoint.

## Investigation Results

### What Works ✅
1. File upload to Supabase Storage (`files` bucket)
2. Backend health check (`/health` returns 200)
3. Frontend correctly constructs request with storagePath
4. Frontend sends proper Authorization header

### What Fails ❌
1. Backend `/api/resume/parse` returns 400
2. No detailed error logs available (Railway CLI not logged in)
3. Unable to determine which middleware/validation step fails

## Root Cause Analysis

The 400 error can occur at several points:

1. **CORS Rejection** - Frontend origin not allowed
2. **Body Parsing Error** - Content-Type or body format issue
3. **Validation Error** - Request body doesn't match Zod schema
4. **Authentication Error** - Should be 401, but could be misconfigured

Without access to production logs, we cannot definitively identify the root cause.

## Solution Implemented

### Phase 1: Enhanced Logging (v1.0.10)

**Commit:** `de13129` + `6b10c0a`

Added comprehensive logging to capture:

1. **Authentication Success/Failure**
   ```typescript
   console.log(`[Auth] Authenticated user: ${userId} for ${method} ${path}`);
   ```

2. **Request Details**
   ```typescript
   console.log(`[/api/resume/parse] Request body:`, JSON.stringify(req.body));
   console.log(`[/api/resume/parse] Content-Type:`, req.headers['content-type']);
   console.log(`[/api/resume/parse] Origin:`, req.headers.origin);
   ```

3. **Validation Errors**
   ```typescript
   console.error(`[/api/resume/parse] Validation errors:`, JSON.stringify(parseResult.error.errors));
   console.error(`[/api/resume/parse] Received body:`, JSON.stringify(req.body));
   ```

4. **Success Flow**
   ```typescript
   console.log(`[/api/resume/parse] Validation passed - starting parse...`);
   ```

### Files Modified

1. `/backend/src/routes/resume.ts`
   - Added request logging before validation
   - Enhanced validation error logging
   - Added content-type and origin logging

2. `/backend/src/middleware/auth.ts`
   - Enabled auth success logging in production
   - Changed from development-only to always-on

3. `/backend/package.json`
   - Bumped version to 1.0.10

## Next Steps

### Immediate (After Deployment)

1. **Wait for Railway Deployment**
   - Monitor GitHub Actions
   - Verify Railway deployment completes
   - Check `/health` endpoint shows v1.0.10

2. **Reproduce the Error**
   - Upload a resume from frontend
   - Observe 400 error
   - Immediately check Railway logs

3. **Analyze Logs**

   **If you see:**
   ```
   [timestamp] POST /api/resume/parse - Origin: ...
   [Auth] Authenticated user: {userId} for POST /api/resume/parse
   [/api/resume/parse] Request received from user {userId}
   [/api/resume/parse] Request body: {"storagePath":"..."}
   [/api/resume/parse] Validation passed - starting parse...
   ```
   **Then:** Issue is in `parseResume()` function, not validation

   **If you see:**
   ```
   [/api/resume/parse] Validation failed for user {userId}
   [/api/resume/parse] Validation errors: [...]
   [/api/resume/parse] Received body: {}
   ```
   **Then:** Request body is empty - likely Content-Type issue

   **If you see only:**
   ```
   [timestamp] POST /api/resume/parse - Origin: ...
   ```
   **Then:** Auth middleware failing (should be 401, not 400)

   **If you see nothing:**
   **Then:** CORS blocking request before it reaches server

### Phase 2: Apply Targeted Fix

Based on log analysis, apply one of these fixes:

#### Fix A: CORS Configuration
**If:** No logs appear
**Solution:** Verify APP_URL environment variable
```bash
railway variables --service backend
# Check APP_URL matches: https://jobmatch-ai-app.pages.dev
```

#### Fix B: Body Parsing
**If:** Body is empty in logs
**Solution:** Check Express middleware order
```typescript
// Ensure body parsers come before routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/resume', resumeRouter);
```

#### Fix C: Validation Schema
**If:** Body present but validation fails
**Solution:** Check frontend vs backend schema mismatch
```typescript
// Frontend should send:
{ storagePath: "resumes/userId/timestamp_filename.pdf" }

// Backend expects:
const parseResumeSchema = z.object({
  storagePath: z.string().min(1, 'Storage path is required'),
});
```

#### Fix D: File Access
**If:** Validation passes but parsing fails
**Solution:** Verify file exists in correct bucket
```typescript
// Check bucket name matches
supabaseAdmin.storage.from('files').list(folderPath)
```

## Testing

### Manual Test with curl

```bash
# Get token from browser localStorage
export TOKEN="your-supabase-access-token"
export BACKEND="https://jobmatch-ai-backend-production.up.railway.app"

curl -X POST "$BACKEND/api/resume/parse" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"storagePath":"resumes/user-id/file.pdf"}' \
  -v
```

### Test Script

```bash
node backend/test-resume-parse.js
```

## Expected Resolution Timeline

1. **Deploy v1.0.10**: ~5 minutes (in progress)
2. **Reproduce error**: ~1 minute
3. **Check logs**: ~2 minutes
4. **Identify root cause**: ~5 minutes
5. **Apply fix**: ~10 minutes
6. **Deploy fix**: ~5 minutes
7. **Verify fix**: ~2 minutes

**Total:** ~30 minutes from deployment completion

## Prevention

After fix is deployed, add:

1. **Integration Tests**
   - Test resume parse endpoint with valid/invalid inputs
   - Test authentication flow
   - Test file upload + parse workflow

2. **Better Error Messages**
   - Return detailed validation errors to frontend
   - Add error codes for each failure type
   - Improve error messages for debugging

3. **Monitoring**
   - Add error rate tracking
   - Monitor 400 error frequency
   - Alert on authentication failures

## Related Files

**Backend:**
- `/backend/src/routes/resume.ts` - Endpoint implementation
- `/backend/src/middleware/auth.ts` - Authentication
- `/backend/src/services/openai.service.ts` - Parse logic
- `/backend/src/index.ts` - CORS configuration
- `/backend/src/middleware/errorHandler.ts` - Error responses

**Frontend:**
- `/src/hooks/useResumeParser.ts` - Upload and parse hook
- `/src/hooks/useFileUpload.ts` - Supabase Storage upload

**Documentation:**
- `/backend/RESUME_PARSE_400_DEBUG.md` - Debug guide
- `/TEST_RESUME_PARSE_REQUEST.md` - Test procedures
- `/backend/test-resume-parse.js` - Test script

## Status

- [x] Enhanced logging deployed (v1.0.10)
- [ ] Deployment complete
- [ ] Error reproduced with new logs
- [ ] Root cause identified
- [ ] Fix applied
- [ ] Fix verified
- [ ] Documentation updated

---

**Version:** v1.0.10
**Date:** 2025-12-25
**Author:** Claude Code
**Status:** Awaiting deployment completion
