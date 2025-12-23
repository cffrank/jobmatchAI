# JobMatch AI Testing Strategy

Comprehensive automated testing framework to prevent deployment issues like CORS errors, missing environment variables, and authentication failures.

## Overview

This testing strategy implements multiple layers of testing following the Test Pyramid approach:

1. **Unit Tests** - Fast, isolated tests for individual functions and middleware
2. **Integration Tests** - Tests for API endpoints and database interactions
3. **E2E Tests** - Full user flow tests with Playwright
4. **Deployment Verification** - Post-deployment smoke tests

## Test Coverage

### Backend Tests (`/backend/tests/`)

#### Unit Tests (`/backend/tests/unit/`)

**Authentication Middleware** (`middleware.test.ts`)
- OPTIONS request bypass for CORS preflight
- Missing/invalid authorization headers
- Token expiration handling
- Valid token authentication
- Optional authentication scenarios

**Coverage**: 100% of authentication middleware code paths

#### Integration Tests (`/backend/tests/integration/`)

**CORS Configuration** (`cors.test.ts`)
- Production CORS headers for Railway frontend
- Development CORS for localhost ports (5173, 3000, 4173)
- Preflight OPTIONS requests for all critical endpoints
- Credentials flag verification
- Rate limit header exposure
- Unauthorized origin blocking

**Health Check** (`health.test.ts`)
- HTTP 200 status
- JSON response format
- Timestamp, version, environment fields
- Response time < 1 second
- No authentication required

**Environment Variables** (`environment.test.ts`)
- Required Supabase variables (URL, anon key, service role key)
- API keys (OpenAI, Apify, SendGrid)
- Configuration variables (NODE_ENV, PORT, APP_URL)
- Format validation for API keys
- Railway-specific environment detection

### E2E Tests (`/tests/e2e/`)

**Critical User Flows** (`critical-flows.spec.ts`)
- Backend health check accessibility
- CORS headers on API responses
- OPTIONS preflight requests
- Login page loads
- Authentication requirement enforcement
- AI application generation flow (requires test credentials)
- Unauthenticated request rejection
- Rate limiting headers

**CORS Validation** (`cors-validation.spec.ts`)
- Live backend allows frontend origin
- Preflight for POST /api/applications/generate
- Preflight for POST /api/jobs/scrape
- Credentials flag set correctly
- Exposed rate limit headers
- Unauthorized origin blocking
- Max-Age header for preflight caching
- Production-specific CORS tests
- HTTPS enforcement in production

## Running Tests

### Local Development

```bash
# Backend tests
cd backend

# Run all tests
npm test

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only

# Watch mode for TDD
npm run test:watch

# Coverage report
npm run test:coverage

# Interactive UI
npm run test:ui
```

### Frontend tests

```bash
# From project root
npm run build:check    # TypeScript compilation
npm run lint           # ESLint

# E2E tests
npm run test:e2e
npm run test:e2e:ui       # Interactive UI
npm run test:e2e:headed   # Show browser
```

### Deployment Verification

```bash
# Verify Railway deployment
./scripts/verify-railway-deployment.sh

# With custom URLs
BACKEND_URL=https://your-backend.railway.app \
FRONTEND_URL=https://your-frontend.railway.app \
./scripts/verify-railway-deployment.sh
```

## CI/CD Integration

### GitHub Actions Workflows

**Test Suite** (`.github/workflows/test.yml`)
- Runs on every push and PR
- Jobs:
  - `backend-tests` - Unit & integration tests
  - `frontend-tests` - TypeScript & linting
  - `e2e-tests` - Full E2E test suite
  - `env-validation` - Environment variable checks

**Railway Deployment Verification** (`.github/workflows/railway-deploy-verify.yml`)
- Manual trigger or post-deployment hook
- Verifies:
  - Backend health check
  - CORS configuration
  - Environment variables
  - Frontend accessibility
  - E2E smoke tests

### Running in CI

Tests automatically run on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

## Test Configuration

### Backend Vitest Config (`backend/vitest.config.ts`)

```typescript
{
  environment: 'node',
  coverage: {
    provider: 'c8',
    reporter: ['text', 'json', 'html', 'lcov'],
  },
  testTimeout: 30000,
}
```

### Playwright Config (`playwright.config.ts`)

```typescript
{
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2 (in CI),
  workers: 1 (in CI),
}
```

## Environment Setup for Tests

### Required Environment Variables

Create `.env.test` in `/backend/`:

```bash
NODE_ENV=test
SUPABASE_URL=your-test-supabase-url
SUPABASE_ANON_KEY=your-test-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-test-service-key
OPENAI_API_KEY=test-key-mock
APIFY_API_TOKEN=test-token-mock
SENDGRID_API_KEY=test-key-mock
```

### Optional Test User Credentials

For E2E tests that require authentication:

```bash
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=test-password
```

## Test Helpers

### Backend Test Helpers (`backend/tests/helpers/testHelpers.ts`)

```typescript
// Create mock tokens
createMockToken(userId)

// Create test users in Supabase
createTestUser(email, password)

// Get auth token
getTestAuthToken(email, password)

// Cleanup test data
cleanupTestData(userId)

// Mock data generators
createMockJob(overrides)
createMockApplication(overrides)
mockOpenAIResponse()
```

## Critical Test Cases

### CORS Error Prevention

**Issue**: OPTIONS requests blocked by auth middleware
**Test**: `cors.test.ts` - OPTIONS request bypass
**Verification**: `verify-railway-deployment.sh` - Preflight test

### Missing Environment Variables

**Issue**: Backend crashes on startup
**Test**: `environment.test.ts` - Required variable validation
**Verification**: GitHub Actions environment validation job

### Authentication Failures

**Issue**: Invalid token handling
**Test**: `middleware.test.ts` - Token validation
**Verification**: E2E tests for unauthenticated requests

### Deployment Issues

**Issue**: Service unreachable after deployment
**Test**: `health.test.ts` - Health check endpoint
**Verification**: Railway deployment verification script

## Test Data Management

### Mock Data

- Unit tests use in-memory mocks
- Integration tests use test database
- E2E tests use dedicated test user accounts

### Cleanup Strategy

```typescript
afterEach(async () => {
  await cleanupTestData(testUserId);
});
```

## Continuous Improvement

### Adding New Tests

1. **Identify the issue** - What broke in production?
2. **Write failing test** - TDD approach
3. **Fix the code** - Implement solution
4. **Verify test passes** - Confirm fix
5. **Add to CI** - Ensure continuous verification

### Test Maintenance

- Review test coverage monthly
- Update tests when features change
- Remove obsolete tests
- Refactor for better readability

## Metrics and Reporting

### Coverage Goals

- Backend unit tests: >80%
- Backend integration tests: >70%
- Critical paths: 100%

### Test Execution Time

- Unit tests: <30 seconds
- Integration tests: <2 minutes
- E2E tests: <5 minutes
- Total CI pipeline: <15 minutes

## Troubleshooting

### Tests Failing Locally

```bash
# Clear node_modules and reinstall
rm -rf node_modules backend/node_modules
npm install
cd backend && npm install

# Rebuild backend
cd backend && npm run build

# Check environment variables
cat backend/.env.test
```

### Tests Failing in CI

1. Check GitHub Actions logs
2. Verify GitHub Secrets are set
3. Ensure dependencies are cached correctly
4. Check for flaky tests (timing issues)

### E2E Tests Timeout

```bash
# Increase timeout in playwright.config.ts
timeout: 60000  # 60 seconds

# Run in headed mode to debug
npm run test:e2e:headed
```

## Security Testing

### Automated Security Checks

```bash
# Dependency vulnerabilities
npm audit
cd backend && npm audit

# Run security tests
npm run test:security
```

### Manual Security Testing

Refer to `/docs/SECURITY_TESTING_GUIDE.md`

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Playwright Documentation](https://playwright.dev)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Contact

For questions about the testing strategy, consult:
- Test coverage reports in CI artifacts
- `TESTING_STRATEGY.md` (this document)
- Team lead or senior engineer
