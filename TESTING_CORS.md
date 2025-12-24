# CORS Testing Suite - Quick Start Guide

## TL;DR - Run This First

```bash
npm run test:production-cors
```

This will test the production backend and tell you exactly what's wrong.

## What We Built

Comprehensive CORS debugging tools to diagnose the production CORS issue:

1. **Backend API Tests** - Direct testing of production backend
2. **Playwright E2E Tests** - Real browser testing of the live site
3. **Shell Script** - Manual curl-based testing
4. **Node.js Script** - Automated diagnostic tool

## Quick Commands

### Test Production Backend (Fast)

```bash
npm run test:production-cors
```

Shows:
- ✅ Backend health status
- ✅ CORS headers on all endpoints
- ✅ OPTIONS preflight validation
- ✅ Environment configuration
- ❌ Specific errors with explanations

### Test with Real Browser (Visual)

```bash
npm run test:e2e:cors:headed
```

Shows:
- Actual browser making requests
- Network tab with OPTIONS requests
- CORS errors in console
- Full request/response cycle

### Test Backend API Only

```bash
cd backend
npm run test:production
```

Vitest tests hitting production endpoints directly.

### Manual Debug with curl

```bash
npm run debug:cors
```

Color-coded shell script output.

## Current Issue

**Backend is returning 502 Bad Gateway** - not running at all.

Test output shows:
```
❌ Health Check: Status 502
❌ OPTIONS Preflight: Status 502
```

This means Railway can't reach the backend. CORS errors are a symptom, not the cause.

## Fix the Backend First

### 1. Check Railway Logs

```
Railway Dashboard → Backend Service → Deployments → View Logs
```

Look for startup errors.

### 2. Verify Environment Variables

In Railway, check these are set:
- `NODE_ENV=production`
- `APP_URL=https://jobmatchai-production.up.railway.app`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `SENDGRID_API_KEY`

### 3. Test Backend Locally

```bash
cd backend
npm install
npm run build
NODE_ENV=production PORT=3000 npm start
```

Then test:
```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "healthy",
  "environment": "production",
  "version": "1.0.3"
}
```

### 4. Redeploy to Railway

Once local build works, push to Railway.

## After Backend is Running

### Step 1: Verify Health

```bash
curl https://intelligent-celebration-production-57e4.up.railway.app/health
```

Should return 200 OK with JSON.

### Step 2: Test CORS

```bash
npm run test:production-cors
```

All tests should pass ✅

### Step 3: Test in Browser

```bash
npm run test:e2e:cors:headed
```

Watch browser make requests successfully.

## Test Files Created

### 1. Backend API Tests (Vitest)

**File:** `backend/tests/api/production.test.ts`

**Run:** `cd backend && npm run test:production`

Tests:
- OPTIONS preflight requests
- CORS header validation
- All critical endpoints
- Authentication middleware
- Environment configuration

### 2. E2E Browser Tests (Playwright)

**File:** `tests/e2e/production-cors.spec.ts`

**Run:** `npm run test:e2e:cors:headed`

Tests:
- Real browser requests
- Network capture (OPTIONS + POST)
- Console error detection
- Full user flows
- All endpoints

### 3. Shell Debug Script

**File:** `scripts/debug-cors.sh`

**Run:** `npm run debug:cors`

Manual testing:
- curl-based requests
- Verbose header output
- Color-coded results
- All endpoints

### 4. Node.js Test Script

**File:** `scripts/test-production-cors.ts`

**Run:** `npm run test:production-cors`

Comprehensive testing:
- All endpoints
- Detailed explanations
- Actionable error messages
- Summary report

## Understanding the Tests

### What OPTIONS Preflight Tests

Before sending POST request, browser sends OPTIONS:

```http
OPTIONS /api/applications/generate HTTP/1.1
Host: backend.railway.app
Origin: https://frontend.railway.app
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization
```

Backend must respond:

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://frontend.railway.app
Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

If missing, browser blocks the actual POST request.

### What Tests Verify

✅ **Backend is running** (health check returns 200)
✅ **OPTIONS returns CORS headers** (not 502/404)
✅ **CORS origin matches** (exact URL, no trailing slash)
✅ **All methods allowed** (POST, GET, etc.)
✅ **All headers allowed** (Content-Type, Authorization)
✅ **Credentials enabled** (for cookies/auth)
✅ **Unauthorized origins rejected** (security)
✅ **Environment is production** (not development)

## Troubleshooting

### Test shows "Status: 502"

**Problem:** Backend not running

**Fix:**
1. Check Railway logs
2. Verify environment variables
3. Test local build
4. Redeploy

### Test shows "CORS headers missing"

**Problem:** CORS middleware not configured

**Fix:**
1. Check `backend/src/index.ts` has `app.use(cors(corsOptions))`
2. Verify it's before route definitions
3. Check `corsOptions` configuration
4. Redeploy

### Test shows "Origin mismatch"

**Problem:** Frontend URL doesn't match allowed origins

**Fix:**
1. Check exact URL (case-sensitive, no trailing slash)
2. Update `allowedOrigins` in `backend/src/index.ts`
3. Set `APP_URL` in Railway
4. Redeploy

### All tests pass but browser still shows CORS error

**Problem:** Browser cache or frontend issue

**Fix:**
1. Clear browser cache
2. Try incognito mode
3. Hard refresh (Ctrl+Shift+R)
4. Check frontend is using correct backend URL
5. Check Authorization header format

## Documentation

- **Full Debugging Guide:** `docs/CORS_DEBUGGING_GUIDE.md`
- **Test Results:** `docs/CORS_TEST_RESULTS.md`
- **API Tests README:** `backend/tests/api/README.md`

## Quick Reference

### All Test Commands

```bash
# Fastest - Node.js script
npm run test:production-cors

# Visual - Browser testing
npm run test:e2e:cors:headed

# Backend - API tests
cd backend && npm run test:production

# Manual - Shell script
npm run debug:cors

# Interactive - Playwright UI
npm run test:e2e:ui
```

### Expected Results When Working

```
Tests Passed: 7/7

✅ Health Check: Status 200
✅ Health with Origin: CORS Origin: https://jobmatchai-production.up.railway.app
✅ OPTIONS Preflight: Status 204, Origin: https://jobmatchai-production.up.railway.app
✅ Reject Evil Origin: CORS Origin: not set
✅ POST Without Auth: Status 401, CORS: https://jobmatchai-production.up.railway.app
✅ All Endpoints: Tested 5 endpoints
✅ Environment Check: Environment: production
```

### Current Results

```
Tests Passed: 1/7

❌ Backend is down (502 Bad Gateway)
❌ CORS tests can't run until backend is up
```

## Next Steps

1. **Fix backend startup** (check Railway logs)
2. **Verify environment variables** (Railway dashboard)
3. **Test locally** (`npm run build && npm start`)
4. **Redeploy** (Railway)
5. **Run tests again** (`npm run test:production-cors`)
6. **Verify in browser** (`npm run test:e2e:cors:headed`)

## Summary

**Status:** Test suite complete and ready to use

**Current Issue:** Backend returning 502 (not running)

**Priority:** Get backend running, then run tests

**Once Backend Works:** Tests will verify CORS is configured correctly

**Test Files:**
- ✅ `backend/tests/api/production.test.ts` (Vitest)
- ✅ `tests/e2e/production-cors.spec.ts` (Playwright)
- ✅ `scripts/debug-cors.sh` (Bash)
- ✅ `scripts/test-production-cors.ts` (Node.js)
- ✅ Documentation complete

**Run this when backend is up:**
```bash
npm run test:production-cors
```
