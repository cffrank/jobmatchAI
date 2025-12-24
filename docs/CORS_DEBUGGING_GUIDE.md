# CORS Debugging Guide

## The Problem

After deploying v1.0.3 with CORS fixes, the production site still shows:

```
Access to fetch at 'https://intelligent-celebration-production-57e4.up.railway.app/api/applications/generate'
from origin 'https://jobmatchai-production.up.railway.app' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## What This Means

1. **Browser sends OPTIONS preflight** before POST request
2. **Backend must respond** with CORS headers
3. **If CORS headers are missing**, browser blocks the actual request
4. **User sees CORS error**, even though backend code is correct

## Testing Strategy

We've created comprehensive tests to diagnose CORS issues in production:

### 1. Backend API Direct Tests (Vitest)

**File:** `/home/carl/application-tracking/jobmatch-ai/backend/tests/api/production.test.ts`

**Run:**
```bash
cd backend
npm run test:production
```

**What it does:**
- Directly tests production backend endpoints
- Sends OPTIONS preflight requests
- Verifies CORS headers are present
- Tests authentication middleware
- Checks environment configuration

**Key tests:**
- ✅ Health check accessible
- ✅ CORS headers on GET requests
- ✅ **OPTIONS preflight returns CORS headers** (CRITICAL)
- ✅ Unauthorized origins rejected
- ✅ POST without auth returns 401 (not CORS error)

### 2. Playwright E2E Tests

**File:** `/home/carl/application-tracking/jobmatch-ai/tests/e2e/production-cors.spec.ts`

**Run:**
```bash
# Headless
npm run test:e2e:cors

# See the browser
npm run test:e2e:cors:headed

# Interactive UI
npm run test:e2e:ui
```

**What it does:**
- Tests actual production site in real browser
- Captures network requests (OPTIONS + POST)
- Detects CORS errors in console
- Shows exact browser behavior

**Key tests:**
- ✅ Capture all network requests to backend
- ✅ Detect CORS errors in browser console
- ✅ Verify OPTIONS preflight sent by browser
- ✅ Test all critical endpoints

### 3. Shell Script (curl)

**File:** `/home/carl/application-tracking/jobmatch-ai/scripts/debug-cors.sh`

**Run:**
```bash
npm run debug:cors
```

**What it does:**
- Manual testing with curl
- Verbose output showing all headers
- Tests all critical endpoints
- Color-coded results

**Tests:**
- Health check
- OPTIONS preflight
- Evil origin rejection
- All critical endpoints
- Environment verification

### 4. Node.js Test Script

**File:** `/home/carl/application-tracking/jobmatch-ai/scripts/test-production-cors.ts`

**Run:**
```bash
npm run test:production-cors
```

**What it does:**
- Comprehensive CORS testing
- Detailed output with explanations
- Summary of all test results
- Actionable error messages

## Quick Diagnosis

### Run This First

```bash
npm run test:production-cors
```

Look for the **"Test 3: OPTIONS Preflight"** section.

### If OPTIONS Preflight FAILS ❌

**Symptom:** No `Access-Control-Allow-Origin` header in OPTIONS response

**This is the problem!** The browser is sending OPTIONS but not getting CORS headers back.

**Possible causes:**

1. **CORS middleware not configured**
   - Check `backend/src/index.ts` has `app.use(cors(corsOptions))`
   - Verify it's BEFORE route definitions

2. **Railway environment variables missing**
   - Go to Railway dashboard → Backend service → Variables
   - Check: `NODE_ENV=production`
   - Check: `APP_URL=https://jobmatchai-production.up.railway.app`

3. **Railway proxy stripping headers**
   - Railway might be intercepting OPTIONS requests
   - Check Railway logs for middleware output

4. **Backend not handling OPTIONS**
   - CORS middleware should handle OPTIONS automatically
   - Check if custom OPTIONS handlers are interfering

### If OPTIONS Preflight PASSES ✅

**But you still see CORS errors:**

1. **Frontend URL mismatch**
   - Check exact URL (trailing slash matters)
   - Case sensitivity: `https` vs `HTTPS`
   - `www.` prefix or not

2. **Browser cache**
   - Clear browser cache
   - Try incognito mode
   - Hard refresh (Ctrl+Shift+R)

3. **Environment mismatch**
   - Verify `NODE_ENV=production` in Railway
   - Check backend is using production CORS rules

## Debugging Workflow

### Step 1: Run automated tests

```bash
# Quick check
npm run test:production-cors

# Full backend tests
cd backend && npm run test:production

# Full E2E tests
npm run test:e2e:cors:headed
```

### Step 2: Check Railway environment

1. Open Railway dashboard
2. Go to backend service
3. Click "Variables" tab
4. Verify:
   - `NODE_ENV=production`
   - `APP_URL=https://jobmatchai-production.up.railway.app`
   - All other required env vars

### Step 3: Check Railway logs

1. Railway dashboard → Backend service
2. Click "Deployments"
3. Select latest deployment
4. View logs
5. Look for:
   - "JobMatch AI Backend Server" startup message
   - CORS middleware warnings
   - OPTIONS request logs

### Step 4: Test with browser DevTools

1. Open production site
2. Open DevTools (F12)
3. Go to Network tab
4. Try to trigger an API call
5. Look for:
   - OPTIONS request (preflight)
   - Response headers
   - CORS errors in console

### Step 5: Manual curl test

```bash
curl -v -X OPTIONS \
  -H "Origin: https://jobmatchai-production.up.railway.app" \
  -H "Access-Control-Request-Method: POST" \
  https://intelligent-celebration-production-57e4.up.railway.app/api/applications/generate \
  2>&1 | grep -i "access-control"
```

Should show:
```
< access-control-allow-origin: https://jobmatchai-production.up.railway.app
< access-control-allow-methods: GET, POST, PATCH, PUT, DELETE, OPTIONS
< access-control-allow-headers: Content-Type, Authorization, X-Requested-With
```

## Common Issues and Solutions

### Issue 1: No CORS headers at all

**Symptom:** OPTIONS returns 200/204 but no `access-control-*` headers

**Solution:**
1. Check CORS middleware is installed: `npm list cors`
2. Verify `app.use(cors(corsOptions))` is in `index.ts`
3. Check it's BEFORE route definitions
4. Redeploy backend

### Issue 2: CORS headers on GET but not OPTIONS

**Symptom:** `GET /health` has CORS headers, but `OPTIONS /api/*` doesn't

**Solution:**
1. CORS middleware handles OPTIONS automatically
2. Check for custom OPTIONS handlers in routes
3. Remove any `app.options()` handlers that might override CORS

### Issue 3: Works locally, fails in production

**Symptom:** Tests pass locally but fail in production

**Solution:**
1. Check `NODE_ENV=production` in Railway
2. Verify development CORS rules not active
3. Check Railway proxy configuration
4. Compare local env vars to production

### Issue 4: Incorrect CORS origin

**Symptom:** `access-control-allow-origin: https://wrong-url.com`

**Solution:**
1. Update `APP_URL` in Railway env vars
2. Update `allowedOrigins` array in `backend/src/index.ts`
3. Redeploy backend

### Issue 5: Railway proxy interference

**Symptom:** Backend logs show correct headers, but browser doesn't receive them

**Solution:**
1. Check Railway docs for proxy configuration
2. Verify Railway isn't stripping CORS headers
3. Check if Railway health checks are interfering
4. Contact Railway support

## Understanding CORS Flow

### Normal Flow (Working)

```
1. Browser: "I want to POST to /api/applications/generate from frontend.com"
2. Browser sends OPTIONS preflight:
   OPTIONS /api/applications/generate
   Origin: https://frontend.com
   Access-Control-Request-Method: POST

3. Backend responds:
   204 No Content
   Access-Control-Allow-Origin: https://frontend.com
   Access-Control-Allow-Methods: POST
   Access-Control-Allow-Headers: Content-Type, Authorization

4. Browser: "OK, CORS is allowed, sending actual request"
5. Browser sends POST:
   POST /api/applications/generate
   Origin: https://frontend.com
   Authorization: Bearer token123

6. Backend responds:
   200 OK
   Access-Control-Allow-Origin: https://frontend.com
   { "data": "..." }

7. Browser: "Success! Deliver data to JavaScript"
```

### Broken Flow (CORS Error)

```
1. Browser: "I want to POST to /api/applications/generate from frontend.com"
2. Browser sends OPTIONS preflight:
   OPTIONS /api/applications/generate
   Origin: https://frontend.com
   Access-Control-Request-Method: POST

3. Backend responds:
   204 No Content
   (NO CORS HEADERS!)

4. Browser: "No access-control-allow-origin header! BLOCK IT!"
5. Browser shows CORS error in console
6. JavaScript fetch() promise rejects
7. User sees error message
```

## What Each Test File Does

### `/backend/tests/api/production.test.ts`

Direct API testing with fetch():
- Tests actual production backend URLs
- No browser, just HTTP requests
- Validates response headers
- Fast and reliable

**Best for:** Verifying backend configuration

### `/tests/e2e/production-cors.spec.ts`

Browser-based testing with Playwright:
- Real browser making requests
- Captures actual CORS errors
- Shows network tab data
- Tests user flows

**Best for:** Seeing what users experience

### `/scripts/debug-cors.sh`

Manual testing with curl:
- Command-line HTTP client
- Verbose output
- No dependencies needed
- Quick spot checks

**Best for:** Quick manual verification

### `/scripts/test-production-cors.ts`

Node.js testing script:
- Comprehensive test suite
- Detailed explanations
- Cross-platform (no shell required)
- Summary reports

**Best for:** Automated diagnosis

## Next Steps

### If all tests pass ✅

1. CORS is configured correctly
2. Check for frontend issues:
   - Verify frontend is making requests correctly
   - Check Authorization header format
   - Verify request body format
3. Clear browser cache and retry
4. Check Railway logs for other errors

### If OPTIONS test fails ❌

1. **This is the problem**
2. Follow debugging workflow above
3. Check Railway environment variables
4. Verify CORS middleware in `index.ts`
5. Check Railway logs for errors
6. Redeploy if configuration was changed

## Getting Help

If tests fail and you can't fix it:

1. **Capture test output:**
   ```bash
   npm run test:production-cors > cors-debug.log 2>&1
   ```

2. **Capture Railway logs:**
   - Railway Dashboard → Backend → Deployments → View Logs
   - Copy last 100 lines

3. **Capture browser DevTools:**
   - Network tab showing OPTIONS request
   - Console showing CORS error
   - Response headers

4. **Share:**
   - Test output
   - Railway logs
   - Browser screenshots
   - Environment variables (redact secrets)

## Summary

The CORS issue is most likely caused by **OPTIONS preflight not returning CORS headers**.

**To verify:**
```bash
npm run test:production-cors
```

**Look for:**
- Test 3: OPTIONS Preflight
- Should have `access-control-allow-origin` header
- Should return status 200 or 204

**If missing:**
- Check Railway env vars
- Check CORS middleware in code
- Check Railway logs
- Redeploy

**Test files created:**
- `backend/tests/api/production.test.ts` (Vitest)
- `tests/e2e/production-cors.spec.ts` (Playwright)
- `scripts/debug-cors.sh` (Bash)
- `scripts/test-production-cors.ts` (Node.js)
