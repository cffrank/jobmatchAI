# Production API Testing

These tests are designed to debug CORS issues in production by testing the **actual deployed backend** directly.

## Important

**DO NOT RUN THESE IN CI/CD** - These tests hit production services and are meant for manual debugging only.

## Quick Start

### 1. Run Backend API Tests (Vitest)

```bash
cd backend
npm test -- tests/api/production.test.ts
```

This will:
- Test OPTIONS preflight requests directly to production backend
- Verify CORS headers are present and correct
- Test health endpoint accessibility
- Check authentication middleware (401 responses)
- Validate all critical endpoints

### 2. Run E2E Tests with Playwright

```bash
# From project root
npm run test:e2e -- tests/e2e/production-cors.spec.ts

# To see the browser
npm run test:e2e:headed -- tests/e2e/production-cors.spec.ts

# With Playwright UI
npm run test:e2e:ui -- tests/e2e/production-cors.spec.ts
```

This will:
- Test the actual frontend making requests to backend
- Capture browser network requests (including preflight)
- Detect CORS errors in console
- Simulate real user flows

### 3. Run Shell Script (Manual Testing)

```bash
# From project root
./scripts/debug-cors.sh
```

Uses curl to test CORS configuration with verbose output.

### 4. Run Node.js Test Script

```bash
# From project root
tsx scripts/test-production-cors.ts
```

Comprehensive CORS testing with detailed output.

## What These Tests Check

### Critical Test: OPTIONS Preflight

The most important test is the OPTIONS preflight request. Browsers automatically send this before POST requests to check CORS permissions.

**What should happen:**

```
Request:
  OPTIONS /api/applications/generate
  Origin: https://jobmatchai-production.up.railway.app
  Access-Control-Request-Method: POST
  Access-Control-Request-Headers: Content-Type,Authorization

Response:
  Status: 204 No Content (or 200 OK)
  Access-Control-Allow-Origin: https://jobmatchai-production.up.railway.app
  Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
  Access-Control-Allow-Credentials: true
  Access-Control-Max-Age: 86400
```

**If preflight fails:**

The browser will show:
```
Access to fetch at 'https://backend.com/api/endpoint' from origin 'https://frontend.com'
has been blocked by CORS policy: Response to preflight request doesn't pass access control
check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Understanding Test Results

### ✅ All tests pass

If all tests pass but you're still seeing CORS errors:
1. Check Railway environment variables (`NODE_ENV`, `APP_URL`)
2. Verify frontend URL exactly matches (no trailing slashes)
3. Check Railway logs for CORS middleware output
4. Clear browser cache and try incognito mode

### ❌ OPTIONS Preflight fails

**Missing CORS headers:**
- CORS middleware not configured in `backend/src/index.ts`
- Railway environment not set to production
- Railway proxy interfering with headers

**Wrong CORS origin:**
- `APP_URL` environment variable incorrect
- Frontend origin doesn't match allowed origins list
- Case sensitivity issue (https vs HTTPS)

### ❌ Health check fails

Backend is not accessible:
- Railway deployment failed
- Backend not running
- DNS/networking issue

## Debugging Steps

### Step 1: Run production.test.ts

```bash
cd backend
npm test -- tests/api/production.test.ts
```

Look for:
- "OPTIONS Preflight" test status
- CORS headers in console output
- Status codes (should be 204 or 200 for OPTIONS)

### Step 2: Check Railway Environment

In Railway dashboard:
1. Go to backend service
2. Check Variables tab
3. Verify:
   - `NODE_ENV=production`
   - `APP_URL=https://jobmatchai-production.up.railway.app`

### Step 3: Check Railway Logs

In Railway dashboard:
1. Go to backend service
2. Click "Deployments"
3. View logs
4. Look for:
   - CORS middleware initialization
   - "CORS blocked origin" warnings
   - Request logs showing OPTIONS requests

### Step 4: Run Playwright Tests

```bash
npm run test:e2e:headed -- tests/e2e/production-cors.spec.ts
```

Watch the browser:
- Network tab shows OPTIONS preflight
- Console shows CORS errors
- Response headers visible in DevTools

## Common Issues and Fixes

### Issue 1: "No 'Access-Control-Allow-Origin' header present"

**Cause:** OPTIONS preflight not returning CORS headers

**Fix:**
1. Verify CORS middleware is in `backend/src/index.ts`
2. Check middleware is called BEFORE routes
3. Ensure `cors()` middleware is properly configured

### Issue 2: "CORS origin mismatch"

**Cause:** Frontend origin doesn't match allowed origins

**Fix:**
1. Check exact frontend URL (with/without trailing slash)
2. Update `allowedOrigins` in `backend/src/index.ts`
3. Set `APP_URL` in Railway environment variables

### Issue 3: "Works locally, fails in production"

**Cause:** Environment-specific configuration

**Fix:**
1. Check `NODE_ENV` is set to 'production' in Railway
2. Verify development-only CORS rules not interfering
3. Check Railway proxy configuration

### Issue 4: "401 Unauthorized instead of CORS error"

**This is actually GOOD!** It means:
- OPTIONS preflight succeeded
- Request made it to the backend
- Auth middleware rejected it (expected without token)
- CORS is working correctly

## Test Maintenance

### When deploying to a new URL

Update these constants:
- `backend/tests/api/production.test.ts`: `BACKEND_URL`, `FRONTEND_ORIGIN`
- `tests/e2e/production-cors.spec.ts`: `PRODUCTION_URL`, `BACKEND_URL`
- `scripts/debug-cors.sh`: `BACKEND_URL`, `FRONTEND_URL`
- `scripts/test-production-cors.ts`: `BACKEND_URL`, `FRONTEND_URL`

### Adding new endpoints

Add to the "All Endpoints" test in each test file.

## Additional Resources

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Express CORS middleware](https://expressjs.com/en/resources/middleware/cors.html)
- [Railway Docs](https://docs.railway.app/)
- [Playwright Testing](https://playwright.dev/)

## Getting Help

If tests fail and you can't determine the cause:

1. Capture full test output:
   ```bash
   npm test -- tests/api/production.test.ts > cors-debug.log 2>&1
   ```

2. Check Railway logs:
   - Railway Dashboard > Backend Service > Deployments > View Logs

3. Run with verbose Playwright:
   ```bash
   DEBUG=pw:api npm run test:e2e -- tests/e2e/production-cors.spec.ts
   ```

4. Test with curl for raw output:
   ```bash
   ./scripts/debug-cors.sh > cors-curl.log 2>&1
   ```
