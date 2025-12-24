# CORS Testing Documentation - Index

## Quick Links

### 🚀 Get Started
- **[Quick Start Guide](../TESTING_CORS.md)** - Start here! Run your first test in 30 seconds
- **[Full Debugging Guide](CORS_DEBUGGING_GUIDE.md)** - Complete guide to debugging CORS issues

### 📊 Test Results
- **[Current Test Results](CORS_TEST_RESULTS.md)** - Latest test run analysis
- **[Test Suite Summary](CORS_TESTS_SUMMARY.md)** - Complete overview of all tests

### 📝 Technical Documentation
- **[API Tests README](../backend/tests/api/README.md)** - Backend API testing guide

## One-Command Quick Start

```bash
npm run test:production-cors
```

This will tell you exactly what's wrong in about 10 seconds.

## Test Files Location

```
jobmatch-ai/
├── backend/
│   └── tests/
│       └── api/
│           ├── production.test.ts     ← Backend API tests (Vitest)
│           └── README.md              ← API tests documentation
│
├── tests/
│   └── e2e/
│       └── production-cors.spec.ts    ← E2E browser tests (Playwright)
│
├── scripts/
│   ├── debug-cors.sh                  ← Shell script (curl)
│   └── test-production-cors.ts        ← Node.js script (automated)
│
└── docs/
    ├── CORS_DEBUGGING_GUIDE.md        ← Complete debugging guide
    ├── CORS_TEST_RESULTS.md           ← Test results analysis
    ├── CORS_TESTS_SUMMARY.md          ← Test suite summary
    └── CORS_TESTING_INDEX.md          ← This file
```

## Test Approaches

### 1. Node.js Script (Fastest)
**Run:** `npm run test:production-cors`
- ✅ Fastest way to diagnose issues
- ✅ Detailed explanations
- ✅ Works on any platform
- ✅ No dependencies needed

### 2. Playwright E2E (Most Visual)
**Run:** `npm run test:e2e:cors:headed`
- ✅ See exactly what users see
- ✅ Real browser behavior
- ✅ Network tab visible
- ✅ Perfect for debugging

### 3. Backend API Tests (Most Comprehensive)
**Run:** `cd backend && npm run test:production`
- ✅ Tests all endpoints thoroughly
- ✅ Validates all CORS headers
- ✅ Part of test suite
- ✅ Can run in CI

### 4. Shell Script (Most Manual)
**Run:** `npm run debug:cors`
- ✅ Manual control
- ✅ Verbose output
- ✅ Easy to modify
- ✅ curl-based

## Current Status

**Last Test Run:** 2025-12-23

**Result:** Backend is down (502 Bad Gateway)

**Root Cause:** Railway backend not responding

**Next Action:** Check Railway logs and fix backend startup

**Once Backend Works:** Run `npm run test:production-cors` to verify CORS

## What Each Test Checks

### ✅ Backend Health
- Is backend running?
- Is it accessible?
- What environment is it in?

### ✅ CORS Configuration
- Are CORS headers present?
- Is origin correct?
- Are methods allowed?
- Are headers allowed?

### ✅ OPTIONS Preflight (CRITICAL)
- Does OPTIONS return 204/200?
- Are CORS headers in OPTIONS response?
- This is the #1 cause of CORS errors

### ✅ All Endpoints
- Do all API endpoints work?
- Are CORS headers on all responses?

### ✅ Security
- Are unauthorized origins rejected?
- Is evil.com blocked?

### ✅ Authentication
- Does auth middleware work?
- Does 401 response include CORS headers?

### ✅ Environment
- Is NODE_ENV=production?
- Are all env vars set?

## How CORS Works

### Normal Flow
```
Browser → OPTIONS /api/endpoint
          Origin: frontend.com

Backend → 204 No Content
          Access-Control-Allow-Origin: frontend.com
          Access-Control-Allow-Methods: POST

Browser → "OK, allowed!" → POST /api/endpoint

Backend → 200 OK
          Access-Control-Allow-Origin: frontend.com
          Data: {...}

Browser → "Success!" → Deliver data to JavaScript ✅
```

### Broken Flow (Current Issue)
```
Browser → OPTIONS /api/endpoint
          Origin: frontend.com

Railway → 502 Bad Gateway
          (Backend not running)

Browser → "No CORS headers! BLOCK!" ❌

User sees CORS error
```

## Common Commands

### Test Commands
```bash
# Quick test
npm run test:production-cors

# Visual test
npm run test:e2e:cors:headed

# Backend test
cd backend && npm run test:production

# Manual test
npm run debug:cors

# Interactive
npm run test:e2e:ui
```

### Debug Commands
```bash
# Check if backend is up
curl https://intelligent-celebration-production-57e4.up.railway.app/health

# Test OPTIONS manually
curl -v -X OPTIONS \
  -H "Origin: https://jobmatchai-production.up.railway.app" \
  https://intelligent-celebration-production-57e4.up.railway.app/api/applications/generate

# Check CORS headers
curl -v \
  -H "Origin: https://jobmatchai-production.up.railway.app" \
  https://intelligent-celebration-production-57e4.up.railway.app/health \
  2>&1 | grep -i access-control
```

## Documentation Structure

### Quick Start
- **TESTING_CORS.md** - Quick start guide
- Start here if you just want to run tests

### Debugging
- **docs/CORS_DEBUGGING_GUIDE.md** - Complete debugging guide
- Read this if tests are failing

### Results
- **docs/CORS_TEST_RESULTS.md** - Latest test results
- Shows what's currently wrong

### Summary
- **docs/CORS_TESTS_SUMMARY.md** - Complete overview
- Technical details of test suite

### API Tests
- **backend/tests/api/README.md** - Backend test docs
- Details on backend API tests

## Debugging Workflow

### 1. Quick Check
```bash
npm run test:production-cors
```
Takes 10 seconds, tells you what's wrong.

### 2. Is Backend Up?
Look for "Health Check" result:
- **502** → Backend down, check Railway
- **200** → Backend up, move to step 3

### 3. Is CORS Configured?
Look for "OPTIONS Preflight" result:
- **No CORS headers** → CORS not configured
- **Wrong origin** → Origin mismatch
- **All correct** → CORS working

### 4. Test in Browser
```bash
npm run test:e2e:cors:headed
```
See exactly what users see.

### 5. Fix Issues
- **502** → Fix backend startup
- **No CORS** → Configure CORS middleware
- **Wrong origin** → Update allowed origins
- **All pass** → Check frontend code

## Getting Help

If tests fail and you can't fix it:

### 1. Capture Test Output
```bash
npm run test:production-cors > cors-debug.log 2>&1
```

### 2. Capture Railway Logs
Railway Dashboard → Backend → Deployments → View Logs

### 3. Capture Browser Info
- Network tab (OPTIONS request)
- Console (CORS errors)
- Environment variables (redact secrets)

### 4. Share
All the above information for debugging.

## Test Suite Features

### ✅ Complete Coverage
- All endpoints tested
- All CORS headers validated
- Security verified
- Environment checked

### ✅ Multiple Approaches
- Vitest (backend API)
- Playwright (browser E2E)
- Shell script (manual)
- Node.js script (automated)

### ✅ Detailed Output
- Specific error messages
- Actionable recommendations
- Summary reports
- Visual indicators

### ✅ Production-Ready
- Tests actual deployed services
- No mocking, real requests
- Validates security
- Environment-aware

## Success Criteria

When everything works, you'll see:

```
======================================================================
Summary
======================================================================

Tests Passed: 7/7

✅ Health Check
✅ Health with Origin
✅ OPTIONS Preflight
✅ Reject Evil Origin
✅ POST Without Auth
✅ All Endpoints
✅ Environment Check

✅ All tests passed!
CORS configuration looks good.
```

## Next Steps

1. **Get backend running** (check Railway logs)
2. **Run tests** (`npm run test:production-cors`)
3. **Fix any issues** (follow debugging guide)
4. **Verify in browser** (`npm run test:e2e:cors:headed`)
5. **Test on live site** (try actual user flow)

## Summary

**Test Suite:** ✅ Complete and ready

**Documentation:** ✅ Comprehensive

**Current Issue:** ❌ Backend down (502)

**Next Action:** Fix backend, then run tests

**When Backend Works:** Tests will verify CORS configuration

---

**Start here:** [Quick Start Guide](../TESTING_CORS.md)

**Need help?** [Debugging Guide](CORS_DEBUGGING_GUIDE.md)

**See results:** [Test Results](CORS_TEST_RESULTS.md)
