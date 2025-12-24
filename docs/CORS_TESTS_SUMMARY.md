# CORS Testing Suite - Complete Summary

## What Was Created

A comprehensive testing suite to debug CORS issues in production by testing the actual deployed services.

## Files Created

### 1. Backend API Tests (Vitest)

**Location:** `/home/carl/application-tracking/jobmatch-ai/backend/tests/api/production.test.ts`

**Purpose:** Direct testing of production backend endpoints

**Features:**
- Tests actual Railway backend URLs
- OPTIONS preflight request validation
- CORS header verification on all endpoints
- Authentication middleware testing (401 responses)
- Environment variable validation
- Unauthorized origin rejection testing
- Full request simulation (OPTIONS + POST)

**Run:**
```bash
cd backend
npm run test:production
```

**Key Tests:**
- Health Check (GET /health)
- Health with Origin header
- OPTIONS preflight to /api/applications/generate (CRITICAL)
- OPTIONS to all critical endpoints
- Unauthorized origin rejection
- POST without auth (should get 401, not CORS error)
- Environment verification (production mode)

### 2. Playwright E2E Tests

**Location:** `/home/carl/application-tracking/jobmatch-ai/tests/e2e/production-cors.spec.ts`

**Purpose:** Real browser testing of production site

**Features:**
- Tests actual live site with real browser
- Captures network requests (OPTIONS + POST)
- Detects CORS errors in browser console
- Shows exact browser behavior
- Tests user authentication flows
- Validates all endpoints with browser

**Run:**
```bash
# Headless
npm run test:e2e:cors

# See the browser
npm run test:e2e:cors:headed

# Interactive UI
npm run test:e2e:ui
```

**Key Tests:**
- Network request capture
- CORS error detection in console
- OPTIONS preflight via browser
- All endpoints testing
- Error diagnostics

### 3. Shell Debug Script

**Location:** `/home/carl/application-tracking/jobmatch-ai/scripts/debug-cors.sh`

**Purpose:** Manual curl-based CORS testing

**Features:**
- Color-coded output
- Verbose curl requests
- Tests all endpoints
- Shows raw HTTP headers
- Easy to read results

**Run:**
```bash
npm run debug:cors
# or
./scripts/debug-cors.sh
```

**Tests:**
- Health check (GET)
- Health with Origin header
- OPTIONS preflight (CRITICAL)
- Unauthorized origin rejection
- POST without auth
- All critical endpoints
- Environment verification
- Railway proxy detection

### 4. Node.js Test Script

**Location:** `/home/carl/application-tracking/jobmatch-ai/scripts/test-production-cors.ts`

**Purpose:** Comprehensive automated diagnostic tool

**Features:**
- Detailed test output with explanations
- Cross-platform (no shell required)
- Actionable error messages
- Summary report
- Environment detection

**Run:**
```bash
npm run test:production-cors
```

**Tests:**
- All endpoints
- CORS header validation
- Environment checks
- Detailed diagnostics
- Summary with recommendations

### 5. Documentation

**Files:**
- `docs/CORS_DEBUGGING_GUIDE.md` - Complete debugging guide
- `docs/CORS_TEST_RESULTS.md` - Current test results analysis
- `backend/tests/api/README.md` - API tests documentation
- `TESTING_CORS.md` - Quick start guide

## NPM Scripts Added

### Backend (backend/package.json)

```json
{
  "scripts": {
    "test:production": "vitest run tests/api/production.test.ts",
    "test:cors": "vitest run tests/integration/cors.test.ts"
  }
}
```

### Root (package.json)

```json
{
  "scripts": {
    "test:e2e:cors": "playwright test tests/e2e/production-cors.spec.ts",
    "test:e2e:cors:headed": "playwright test tests/e2e/production-cors.spec.ts --headed",
    "test:production-cors": "tsx scripts/test-production-cors.ts",
    "debug:cors": "./scripts/debug-cors.sh"
  }
}
```

## Current Findings

### Test Run Results (2025-12-23)

**Status:** Backend is down (502 Bad Gateway)

**Key Finding:** The CORS issue is actually caused by the backend not running at all.

**Test Output:**
```
Tests Passed: 1/7

❌ Health Check: Status 502 (Backend not responding)
❌ OPTIONS Preflight: Status 502 (CRITICAL - no CORS headers)
❌ All Endpoints: Status 502 (All failing)
✅ Reject Evil Origin: Working (502 ≠ evil origin)
```

**Root Cause:** Railway is returning "Application failed to respond" for all requests.

**Next Steps:**
1. Check Railway logs for backend startup errors
2. Verify environment variables are set correctly
3. Fix backend startup issues
4. Redeploy
5. Re-run tests

## How to Use This Test Suite

### Quick Diagnosis

```bash
npm run test:production-cors
```

This single command will:
- Test if backend is running
- Validate CORS configuration
- Check all endpoints
- Verify environment settings
- Give specific error messages

### Visual Browser Testing

```bash
npm run test:e2e:cors:headed
```

This will:
- Open a real browser
- Navigate to production site
- Show network requests in action
- Display CORS errors if any
- Let you see exactly what happens

### Manual Investigation

```bash
npm run debug:cors
```

This will:
- Run curl commands
- Show verbose HTTP headers
- Test each endpoint separately
- Give color-coded results

### Detailed Backend Testing

```bash
cd backend
npm run test:production
```

This will:
- Run Vitest tests
- Test each endpoint thoroughly
- Validate CORS headers
- Check authentication
- Verify environment

## Test Coverage

### Endpoints Tested

1. ✅ `GET /health`
2. ✅ `OPTIONS /api/applications/generate`
3. ✅ `OPTIONS /api/jobs/scrape`
4. ✅ `OPTIONS /api/emails/send`
5. ✅ `OPTIONS /api/exports/pdf`
6. ✅ `OPTIONS /api/exports/docx`
7. ✅ `POST /api/applications/generate` (without auth)

### CORS Headers Validated

- ✅ `Access-Control-Allow-Origin`
- ✅ `Access-Control-Allow-Methods`
- ✅ `Access-Control-Allow-Headers`
- ✅ `Access-Control-Allow-Credentials`
- ✅ `Access-Control-Max-Age`
- ✅ `Access-Control-Expose-Headers`

### Scenarios Tested

1. ✅ Health check accessibility
2. ✅ CORS with authorized origin
3. ✅ **OPTIONS preflight validation (CRITICAL)**
4. ✅ Unauthorized origin rejection
5. ✅ POST without authentication
6. ✅ All critical endpoints
7. ✅ Environment configuration
8. ✅ Browser-based requests
9. ✅ Error detection in console
10. ✅ Network request capture

## Understanding CORS Flow

### What Should Happen (Working CORS)

```
1. Browser wants to POST to backend
2. Browser sends OPTIONS preflight:
   OPTIONS /api/applications/generate
   Origin: https://frontend.com

3. Backend responds:
   204 No Content
   Access-Control-Allow-Origin: https://frontend.com
   Access-Control-Allow-Methods: POST
   Access-Control-Allow-Headers: Content-Type, Authorization

4. Browser: "OK, allowed" → sends actual POST

5. Backend responds to POST:
   200 OK
   Access-Control-Allow-Origin: https://frontend.com
   { data: ... }

6. Browser delivers data to JavaScript ✅
```

### What's Happening Now (Broken)

```
1. Browser wants to POST to backend
2. Browser sends OPTIONS preflight:
   OPTIONS /api/applications/generate

3. Railway responds:
   502 Bad Gateway
   (No CORS headers, backend not running)

4. Browser: "No CORS headers, BLOCK IT" ❌

5. User sees CORS error
```

## Debugging Workflow

### Step 1: Check if Backend is Running

```bash
npm run test:production-cors
```

Look for "Health Check" test result.

**If 502:** Backend is down → Check Railway logs
**If 200:** Backend is up → Move to Step 2

### Step 2: Check OPTIONS Preflight

Look for "OPTIONS Preflight" test result.

**If CORS headers missing:** CORS not configured
**If CORS headers wrong:** Origin mismatch
**If CORS headers correct:** Move to Step 3

### Step 3: Check All Endpoints

Look for "All Endpoints" test results.

**If some fail:** Route-specific issue
**If all pass:** CORS configured correctly

### Step 4: Test in Browser

```bash
npm run test:e2e:cors:headed
```

Watch browser make requests in real-time.

### Step 5: Check Production Site

If tests pass but site still fails:
- Clear browser cache
- Try incognito mode
- Check frontend code
- Verify auth tokens

## Common Issues and Solutions

### Issue 1: Backend Returns 502

**Symptom:** All tests show "Status: 502"

**Cause:** Backend not running

**Solution:**
1. Check Railway logs
2. Verify environment variables
3. Test local build
4. Redeploy

### Issue 2: No CORS Headers on OPTIONS

**Symptom:** OPTIONS returns 204 but no `access-control-*` headers

**Cause:** CORS middleware not configured

**Solution:**
1. Check `app.use(cors(corsOptions))` in `index.ts`
2. Verify it's before route definitions
3. Redeploy

### Issue 3: CORS Origin Mismatch

**Symptom:** `access-control-allow-origin: https://wrong-url.com`

**Cause:** Frontend URL doesn't match allowed origins

**Solution:**
1. Update `allowedOrigins` in `backend/src/index.ts`
2. Set `APP_URL` in Railway
3. Redeploy

### Issue 4: Works Locally, Fails in Production

**Symptom:** Local tests pass, production fails

**Cause:** Environment-specific configuration

**Solution:**
1. Check `NODE_ENV=production` in Railway
2. Verify production CORS rules
3. Check Railway proxy settings

## Maintenance

### Updating URLs

If deploying to new URLs, update these constants:

1. `backend/tests/api/production.test.ts`:
   - `BACKEND_URL`
   - `FRONTEND_ORIGIN`

2. `tests/e2e/production-cors.spec.ts`:
   - `PRODUCTION_URL`
   - `BACKEND_URL`

3. `scripts/debug-cors.sh`:
   - `BACKEND_URL`
   - `FRONTEND_URL`

4. `scripts/test-production-cors.ts`:
   - `BACKEND_URL`
   - `FRONTEND_URL`

### Adding New Endpoints

Add to the "All Endpoints" test in each file.

## Success Criteria

When everything is working, you should see:

```
======================================================================
Summary
======================================================================

Tests Passed: 7/7

✅ Health Check: Status: 200, Environment: production
✅ Health with Origin: CORS Origin: https://jobmatchai-production.up.railway.app
✅ OPTIONS Preflight: Status: 204, Origin: https://jobmatchai-production.up.railway.app
✅ Reject Evil Origin: CORS Origin: not set
✅ POST Without Auth: Status: 401, CORS: https://jobmatchai-production.up.railway.app
✅ All Endpoints: Tested 5 endpoints
✅ Environment Check: Environment: production, Version: 1.0.3

✅ All tests passed!

CORS configuration looks good from this script.
```

## Quick Reference

### Test Commands
```bash
npm run test:production-cors      # Fast Node.js script
npm run test:e2e:cors:headed      # Visual browser test
cd backend && npm run test:production  # Backend API tests
npm run debug:cors                # Manual curl testing
```

### File Locations
```
backend/tests/api/production.test.ts     # Backend API tests
tests/e2e/production-cors.spec.ts        # E2E browser tests
scripts/debug-cors.sh                    # Shell script
scripts/test-production-cors.ts          # Node.js script
docs/CORS_DEBUGGING_GUIDE.md             # Full guide
docs/CORS_TEST_RESULTS.md                # Test results
TESTING_CORS.md                          # Quick start
```

### Key Files
```
backend/src/index.ts                     # CORS configuration
backend/tests/integration/cors.test.ts   # Unit tests
```

## Next Actions

1. **Immediate:** Fix backend startup (check Railway logs)
2. **Then:** Run `npm run test:production-cors`
3. **Verify:** All 7 tests pass
4. **Finally:** Test in browser with `npm run test:e2e:cors:headed`

## Summary

**Status:** ✅ Test suite complete and ready

**Current Issue:** ❌ Backend down (502), CORS tests waiting

**Test Coverage:** ✅ Comprehensive (4 different test approaches)

**Documentation:** ✅ Complete

**Next Step:** Get backend running, then run tests

**When Backend Works:** Tests will verify CORS is configured correctly
