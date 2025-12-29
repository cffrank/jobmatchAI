# Action Plan: Resume Parse 400 Error

## Current Situation

**Problem:** Frontend receives 400 Bad Request from `POST /api/resume/parse`

**Status:**
- Enhanced logging deployed to `develop` branch (v1.0.10)
- GitHub Actions test suite in progress
- Railway deployment pending test completion
- Backend currently showing 404 (deployment in progress or failed)

## Immediate Next Steps (You Must Do These)

### Step 1: Verify Deployment Status ⏳

Wait for GitHub Actions to complete, then check Railway:

```bash
# Option A: Use Railway website
1. Go to railway.app
2. Navigate to jobmatch-ai-backend service
3. Check "Deployments" tab
4. Verify latest deployment from commit 6b10c0a is "Active"

# Option B: Check health endpoint
curl https://jobmatch-ai-backend-production.up.railway.app/health

# Should return (when deployment succeeds):
{
  "status": "healthy",
  "version": "1.0.10",
  ...
}
```

### Step 2: Reproduce the Error 🔄

Once deployment is confirmed:

1. Open your JobMatch AI app: https://jobmatch-ai-app.pages.dev
2. Navigate to Profile Import
3. Upload a resume file
4. Observe the 400 error (should still occur)

### Step 3: Check Railway Logs 🔍

**This is the critical step that will tell us the root cause!**

```bash
# Option A: Railway website
1. Go to railway.app
2. Select backend service
3. Click "Logs" tab
4. Filter for "POST /api/resume/parse"
5. Look for the detailed log messages added in v1.0.10

# Option B: If you login to Railway CLI
railway login
railway logs --service backend | grep "resume/parse"
```

### Step 4: Identify Root Cause 🎯

Based on what you see in logs:

#### Scenario A: No Logs At All
**Means:** CORS is blocking the request

**Look for in Railway logs:**
- Should see: `[timestamp] POST /api/resume/parse - Origin: ...`
- If missing: CORS rejection

**Fix:**
```bash
railway variables --service backend
# Check APP_URL = https://jobmatch-ai-app.pages.dev

# If wrong, update:
railway variables --set APP_URL=https://jobmatch-ai-app.pages.dev
```

#### Scenario B: Auth Fails
**Means:** Authentication middleware rejecting request

**Look for:**
- ✅ Global request log appears
- ❌ No `[Auth] Authenticated user: ...` log
- ❌ May see auth error instead

**Fix:** Check Supabase configuration
```bash
railway variables | grep SUPABASE
# Verify: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

#### Scenario C: Empty Request Body
**Means:** Body parser failing or frontend sending wrong format

**Look for:**
```
[/api/resume/parse] Request body: {}
[/api/resume/parse] Validation failed
[/api/resume/parse] Validation errors: [{"path":"storagePath","message":"Storage path is required"}]
```

**Fix:** This would be very surprising since frontend code looks correct
- Check if Content-Type header is being sent
- Verify JSON.stringify is working
- Check browser network tab for actual request payload

#### Scenario D: Validation Passes, Then Fails
**Means:** Issue in parseResume() function

**Look for:**
```
[/api/resume/parse] Validation passed - starting parse...
[parseResume] Starting parse for path: ...
[parseResume] File not found at path: ...
```

**Fix:** File path mismatch between upload and parse
- Check exact path returned from Supabase upload
- Verify file exists in 'files' bucket
- Check folder/file permissions

### Step 5: Report Findings 📝

Once you've checked the logs, tell me what you found:

1. **What logs appeared?** (copy exact log lines)
2. **Which scenario (A/B/C/D) matches?**
3. **What error message did you see?**

Then I can provide the specific fix.

## Why We Need These Logs

The v1.0.10 deployment adds logging that will show us:

```
[Auth] Authenticated user: {userId} for POST /api/resume/parse
[/api/resume/parse] Request received from user {userId}
[/api/resume/parse] Request body: {"storagePath":"resumes/..."}
[/api/resume/parse] Content-Type: application/json
[/api/resume/parse] Origin: https://jobmatch-ai-app.pages.dev
```

This tells us:
- ✅ CORS allowed the request
- ✅ Auth succeeded
- ✅ Request body is correct
- ✅ Headers are correct

Then either:
```
[/api/resume/parse] Validation passed - starting parse...
```
Or:
```
[/api/resume/parse] Validation failed
[/api/resume/parse] Validation errors: [...]
[/api/resume/parse] Received body: {...}
```

This pinpoints exactly where it fails!

## What I've Done

1. ✅ Added comprehensive logging to auth middleware
2. ✅ Added detailed request logging to /api/resume/parse endpoint
3. ✅ Added validation error logging with full details
4. ✅ Committed changes to develop branch
5. ✅ Bumped version to 1.0.10
6. ✅ Triggered deployment via git push
7. ✅ Created debug documentation

## What You Need to Do

1. ⏳ Wait for deployment to complete (~5-10 minutes)
2. ✅ Verify health endpoint shows v1.0.10
3. 🔄 Reproduce the 400 error
4. 🔍 Check Railway logs for detailed output
5. 📝 Report findings so I can provide the fix

## Quick Links

- Railway Dashboard: https://railway.app
- App URL: https://jobmatch-ai-app.pages.dev
- Backend URL: https://jobmatch-ai-backend-production.up.railway.app
- GitHub Actions: https://github.com/cffrank/jobmatchAI/actions

## Files Created for Reference

- `/backend/RESUME_PARSE_400_DEBUG.md` - Detailed debug guide
- `/TEST_RESUME_PARSE_REQUEST.md` - Test procedures
- `/RESUME_PARSE_400_FIX.md` - Fix summary
- `/ACTION_PLAN_RESUME_400.md` - This file
- `/backend/test-resume-parse.js` - Test script

---

**Current Time:** ~03:43 UTC
**Deployment Started:** ~03:42 UTC
**Expected Ready:** ~03:50 UTC (in ~7 minutes)

**Next checkpoint:** Check deployment status in 5-10 minutes
