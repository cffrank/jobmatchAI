# Test Resume Parse Request

## Hypothesis

The 400 error is caused by either:
1. CORS blocking the request
2. Request body being empty/malformed
3. Authentication failing (but that should be 401)
4. Validation failing due to unexpected body structure

## Test Request with curl

```bash
# Get your Supabase token
# In browser console: localStorage.getItem('sb-{project-id}-auth-token')
# Extract the access_token from the JSON

export TOKEN="your-access-token-here"
export BACKEND_URL="https://jobmatch-ai-backend-production.up.railway.app"
export STORAGE_PATH="resumes/4ce126d2-93e9-41b0-8152-a53f37b92bc6/1766720095115_Carl_Frank_Resume.md.pdf"

# Test request
curl -X POST "$BACKEND_URL/api/resume/parse" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Origin: https://jobmatch-ai-app.pages.dev" \
  -d '{"storagePath":"'$STORAGE_PATH'"}' \
  -v
```

## Expected Responses

### Success (200)
```json
{
  "profile": {
    "firstName": "Carl",
    "lastName": "Frank",
    ...
  },
  "workExperience": [...],
  "education": [...],
  "skills": [...]
}
```

### Auth Failure (401)
```json
{
  "code": "MISSING_AUTH_HEADER" | "INVALID_AUTH_FORMAT" | "TOKEN_EXPIRED" | "INVALID_TOKEN",
  "message": "...",
  "statusCode": 401
}
```

### Validation Error (400)
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Invalid request body",
  "statusCode": 400,
  "details": {
    "fields": {
      "storagePath": "Storage path is required"
    }
  }
}
```

### CORS Error
- Preflight (OPTIONS) fails
- No response body, blocked by browser
- Network tab shows CORS error

### File Not Found (from parseResume)
```json
{
  "code": "INTERNAL_ERROR",
  "message": "Resume file not found at path: ...",
  "statusCode": 500
}
```

## Debug Steps

1. **Check if request reaches backend**
   - Look for global request log: `[timestamp] POST /api/resume/parse - Origin: ...`
   - If missing: CORS or network issue

2. **Check if auth succeeds**
   - Look for: `[Auth] Authenticated user: {userId} for POST /api/resume/parse`
   - If missing: Auth failure (should be 401, not 400)

3. **Check request details**
   - Look for: `[/api/resume/parse] Request body: {...}`
   - Verify storagePath is present and correct

4. **Check validation**
   - If validation fails, should see: `[/api/resume/parse] Validation failed`
   - And: `[/api/resume/parse] Validation errors: [...]`
   - And: `[/api/resume/parse] Received body: {...}`

5. **Check file access**
   - If validation passes: `[parseResume] Starting parse for path: ...`
   - If file not found: `[parseResume] File not found at path: ...`

## Most Likely Issues

### Issue 1: CORS Rejection
**Symptoms:**
- No backend logs at all
- Browser console shows CORS error
- OPTIONS request fails in Network tab

**Fix:** Verify APP_URL environment variable
```bash
railway variables --service backend | grep APP_URL
# Should be: https://jobmatch-ai-app.pages.dev
```

### Issue 2: Request Body Empty
**Symptoms:**
- Auth succeeds
- Validation fails with "storagePath" required
- Received body shows `{}` or `undefined`

**Causes:**
- Content-Type header missing
- Body not JSON stringified
- Express body parser not working

**Fix:** Already correct in frontend code

### Issue 3: File Not Found
**Symptoms:**
- Validation passes
- Error during file verification in parseResume()

**Causes:**
- File path from Supabase upload doesn't match
- File was uploaded to wrong bucket
- File doesn't exist in storage

**Fix:** Check Supabase Storage console

## Action Plan

1. Deploy v1.0.10 with enhanced logging ✅
2. Wait for Railway deployment to complete
3. Test resume upload from frontend
4. Check Railway logs (new deployment has detailed logging)
5. Identify which step fails based on log output
6. Apply targeted fix based on root cause
