# Testing Quick Start Guide

Get up and running with tests in 5 minutes.

## Initial Setup (One-time)

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Create test environment file
cp .env.test.example .env.test

# 3. Edit .env.test with your test credentials (optional for unit tests)
nano .env.test

# 4. Go back to root
cd ..

# 5. Ensure Playwright is installed (already in package.json)
npm install
```

## Run Tests

### Backend Tests (Fast - 15 seconds)

```bash
cd backend
npm test
```

Expected output:
```
✓ tests/unit/middleware.test.ts (11 tests)
✓ tests/integration/cors.test.ts (18 tests)
✓ tests/integration/health.test.ts (8 tests)
✓ tests/integration/environment.test.ts (25 tests)

Test Files: 4 passed (4)
Tests: 62 passed (62)
Time: 12.34s
```

### E2E Tests (Slower - 3 minutes)

```bash
# From project root
npm run test:e2e
```

### Single Test File

```bash
cd backend
npm test -- middleware.test.ts
```

## Test-Driven Development (TDD)

```bash
cd backend
npm run test:watch
```

Now edit test files - tests re-run automatically!

## Verify Deployment

```bash
./scripts/verify-railway-deployment.sh
```

Expected output:
```
==========================================
Railway Deployment Verification
==========================================
Backend URL: https://intelligent-celebration-production-57e4.up.railway.app
Frontend URL: https://jobmatchai-production.up.railway.app

Test 1: Backend Health Check
✓ Backend health endpoint returns 200
✓ Response contains 'healthy' status

Test 2: CORS Headers on Health Endpoint
✓ CORS headers present on health endpoint

Test 3: OPTIONS Preflight for /api/applications/generate
✓ CORS allow-origin header present
✓ POST method allowed via CORS
✓ Authorization header allowed via CORS

...

==========================================
Verification Summary
==========================================
Passed: 10
Failed: 0

✓ All critical tests passed!

Deployment is ready for use.
```

## Common Commands

```bash
# Backend
cd backend
npm test                    # All tests
npm run test:watch         # Watch mode (TDD)
npm run test:coverage      # With coverage
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:ui            # Interactive UI

# E2E
npm run test:e2e           # All E2E tests
npm run test:e2e:ui        # Interactive UI
npm run test:e2e:headed    # Show browser

# Frontend
npm run build:check        # TypeScript check
npm run lint               # ESLint

# Deployment
./scripts/verify-railway-deployment.sh
```

## Troubleshooting

### Tests fail with "Missing environment variables"

**Solution 1** - Run in test mode (uses mocks):
```bash
NODE_ENV=test npm test
```

**Solution 2** - Add real test credentials to `/backend/.env.test`:
```bash
SUPABASE_URL=your-test-supabase-url
SUPABASE_ANON_KEY=your-test-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key
```

### Playwright not installed

```bash
npx playwright install --with-deps chromium
```

### Tests timeout

Increase timeout in vitest.config.ts:
```typescript
testTimeout: 60000  // 60 seconds
```

## CI/CD

Tests run automatically on:
- Push to `main` or `develop`
- Pull requests

View results: **GitHub → Actions tab**

## Documentation

- **Full Strategy**: `/docs/TESTING_STRATEGY.md`
- **Deployment Testing**: `/docs/DEPLOYMENT_TESTING.md`
- **Backend Guide**: `/backend/README_TESTING.md`
- **Implementation Summary**: `/docs/TESTING_IMPLEMENTATION_SUMMARY.md`
- **Full Deliverables**: `/TESTING_DELIVERABLES.md`

## Need Help?

1. Check `/backend/README_TESTING.md` → Common Issues
2. Check `/docs/DEPLOYMENT_TESTING.md` → Troubleshooting
3. Review test output for specific error messages
4. Ensure all dependencies installed: `npm install`

---

**Quick Test**: Run `cd backend && npm test` - should complete in <30 seconds!
