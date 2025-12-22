# Code Quality & QA Review - Task List

**Review Date**: December 21, 2025
**Reviewer**: Code Quality Specialist Agent
**Scope**: Code smells, testing, documentation, consistency

---

## Summary

**Code Quality Score**: 6.5/10
- Good: TypeScript usage, clear file organization
- Concerns: No tests, inconsistent error handling, missing documentation
- Issues: Code duplication, inconsistent naming, no CI/CD quality gates

---

## Phase 1: Testing Infrastructure (CRITICAL)

### QA-001: Establish Frontend Testing Framework
**Priority**: Critical
**Category**: Testing
**Estimated Effort**: Large

**Description**:
Zero test coverage. Need complete testing infrastructure.

**Recommended Setup**:
```bash
# Install dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event @vitest/ui msw

# vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      threshold: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70
      }
    }
  }
});
```

**Target Coverage**:
- Hooks: >80%
- Utilities: >90%
- Components: >60%

**Files Affected**:
- Create `/src/tests/` directory structure
- Add `vitest.config.ts`
- Update `package.json` scripts

**Dependencies**: None

---

### QA-002: Add Backend Unit Tests
**Priority**: Critical
**Category**: Testing
**Estimated Effort**: Large

**Description**:
Backend has 0% test coverage. Critical paths must be tested.

**Priority Test Areas**:
1. **Middleware**:
   - Authentication (token verification, expiration)
   - Rate limiting (window calculations, limit enforcement)
   - Error handling (error code mapping, status codes)

2. **Services**:
   - OpenAI service (prompt generation, fallback logic)
   - Job scraper (data parsing, error recovery)
   - Email service (template rendering, SendGrid integration)

3. **Routes**:
   - Request validation (Zod schemas)
   - Response formatting
   - Error scenarios

**Recommended Framework**:
```bash
npm install -D jest @types/jest ts-jest supertest @types/supertest

# jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

**Files Affected**:
- Create `/backend/src/tests/` directory
- Add `jest.config.js`

**Dependencies**: None

---

### QA-003: Implement E2E Testing with Playwright
**Priority**: High
**Category**: Testing
**Estimated Effort**: Large

**Description**:
Playwright is in package.json but no tests exist. E2E tests critical for user workflows.

**Critical User Flows to Test**:
1. **Authentication**:
   - Sign up → email verification → login
   - OAuth login (Google, LinkedIn)
   - Password reset

2. **Profile Management**:
   - Create profile
   - Add work experience
   - Upload resume

3. **Job Application**:
   - Search jobs
   - Generate application
   - Send email

4. **Application Tracking**:
   - View applications
   - Update status
   - View analytics

**Files Affected**:
- Create `/tests/e2e/` directory
- Configure `playwright.config.ts`

**Dependencies**: QA-001, QA-002 (foundation)

---

### QA-004: Add Integration Tests for Database Operations
**Priority**: High
**Category**: Testing
**Estimated Effort**: Medium

**Description**:
Test database operations in isolated environment.

**Test Approach**:
```typescript
// Use Supabase local development
// Or test database with migrations applied
beforeAll(async () => {
  // Apply migrations to test DB
  await applyMigrations(testDbUrl);
});

beforeEach(async () => {
  // Clean test data
  await cleanDatabase();
});

test('creates user profile', async () => {
  const profile = await createProfile(testUserId, profileData);
  expect(profile.id).toBeDefined();
  // Verify RLS policy enforcement
  await expect(
    fetchProfileAsOtherUser(profile.id)
  ).rejects.toThrow();
});
```

**Files Affected**:
- Create `/src/tests/integration/` directory
- Add test database configuration

**Dependencies**: QA-001

---

## Phase 2: Code Quality Standards

### QA-005: Implement Pre-commit Hooks with Husky
**Priority**: High
**Category**: Code Quality
**Estimated Effort**: Small

**Description**:
No automated code quality checks before commit.

**Recommended Setup**:
```bash
npm install -D husky lint-staged

# .husky/pre-commit
#!/bin/sh
npx lint-staged

# .lintstagedrc.js
module.exports = {
  '*.{ts,tsx}': [
    'eslint --fix',
    'prettier --write',
  ],
  '*.{ts,tsx,css,md}': 'prettier --write',
};
```

**Files Affected**:
- Create `.husky/` directory
- Create `.lintstagedrc.js`

**Dependencies**: None

---

### QA-006: Add Prettier for Code Formatting
**Priority**: Medium
**Category**: Code Quality
**Estimated Effort**: Small

**Description**:
Inconsistent code formatting across codebase.

**Recommended Configuration**:
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

**Files Affected**:
- Create `.prettierrc`
- Format all files: `npx prettier --write "**/*.{ts,tsx,css,md}"`

**Dependencies**: None

---

### QA-007: Enhance ESLint Configuration
**Priority**: Medium
**Category**: Code Quality
**Estimated Effort**: Small

**Description**:
Current ESLint config is basic. Add stricter rules.

**Recommended Rules**:
```javascript
// eslint.config.js additions
{
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'complexity': ['warn', 15],
    'max-lines-per-function': ['warn', 150],
  }
}
```

**Files Affected**:
- `/eslint.config.js`

**Dependencies**: None

---

### QA-008: Add TypeScript Strict Mode
**Priority**: Medium
**Category**: Type Safety
**Estimated Effort**: Large

**Description**:
TypeScript not in strict mode. Enable for better type safety.

**Current tsconfig.json**:
```json
{
  "compilerOptions": {
    "strict": false  // Should be true
  }
}
```

**Required Fixes After Enabling**:
- Add explicit return types
- Fix null/undefined handling
- Remove any types
- Add proper type guards

**Files Affected**:
- `/tsconfig.json`
- `/backend/tsconfig.json`
- Fix type errors across codebase (50+ files)

**Dependencies**: Large refactoring effort

---

## Phase 3: Documentation

### QA-009: Add Comprehensive JSDoc Comments
**Priority**: Medium
**Category**: Documentation
**Estimated Effort**: Large

**Description**:
Many functions lack documentation.

**Documentation Standards**:
```typescript
/**
 * Generates AI-powered application variants for a job posting.
 *
 * @param context - Generation context containing job and user profile data
 * @param context.job - Job posting details
 * @param context.profile - User profile information
 * @returns Array of application variants (Impact-Focused, Keyword-Optimized, Concise)
 * @throws {ApiError} When OpenAI API fails
 * @throws {ValidationError} When job or profile data is invalid
 *
 * @example
 * const variants = await generateApplicationVariants({
 *   job: jobData,
 *   profile: userProfile,
 *   workExperience: experiences
 * });
 */
export async function generateApplicationVariants(
  context: GenerationContext
): Promise<ApplicationVariant[]> {
  // ...
}
```

**Files Affected**:
- All hooks
- All services
- All utilities

**Dependencies**: None

---

### QA-010: Create API Documentation
**Priority**: Medium
**Category**: Documentation
**Estimated Effort**: Medium

**Description**:
Backend API lacks comprehensive documentation.

**Recommended Approach**:
- Use Swagger/OpenAPI (see BA-011)
- Document request/response schemas
- Add example requests
- Document error codes

**Files Affected**:
- Create `/backend/docs/API.md`
- Or implement Swagger UI

**Dependencies**: BA-011 (OpenAPI)

---

### QA-011: Add Architecture Decision Records (ADRs)
**Priority**: Low
**Category**: Documentation
**Estimated Effort**: Small

**Description**:
No documentation of architecture decisions.

**Recommended Format**:
```markdown
# ADR-001: Use Supabase for Database and Auth

## Status
Accepted

## Context
Need database, auth, and storage solution...

## Decision
Use Supabase instead of Firebase because...

## Consequences
Positive:
- Better PostgreSQL support
- Cheaper at scale
Negative:
- Less mature than Firebase
- Smaller ecosystem
```

**Files Affected**:
- Create `/docs/architecture/decisions/` directory

**Dependencies**: None

---

## Phase 4: Error Handling Consistency

### QA-012: Standardize Error Handling Patterns
**Priority**: High
**Category**: Code Quality
**Estimated Effort**: Medium

**Description**:
Inconsistent error handling across frontend:
- Some components use try/catch with toast
- Some use error states
- Some don't handle errors

**Recommended Pattern**:
```typescript
// Standardized hook pattern
export function useDataFetching() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getData();
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      toast.error(error.message);
      // Optionally log to error tracking service
      logError(error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, retry: fetchData };
}
```

**Files Affected**:
- All hooks
- Create error handling utility

**Dependencies**: None

---

### QA-013: Add Error Tracking Service Integration
**Priority**: Medium
**Category**: Observability
**Estimated Effort**: Small

**Description**:
No error tracking service (Sentry, Rollbar, etc.).

**Recommended Setup**:
```typescript
// Sentry integration
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
  beforeSend(event, hint) {
    // Don't send certain errors
    if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
      return null;
    }
    return event;
  }
});
```

**Files Affected**:
- `/src/main.tsx`
- `/backend/src/index.ts`
- Add Sentry to package.json

**Dependencies**: Sentry account

---

## Phase 5: Performance Monitoring

### QA-014: Add Performance Monitoring
**Priority**: Medium
**Category**: Performance
**Estimated Effort**: Medium

**Description**:
No performance monitoring. Should track:
- Page load times
- API response times
- React component render times
- Core Web Vitals

**Recommended Tools**:
- Web Vitals library
- React DevTools Profiler
- Lighthouse CI

**Implementation**:
```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to analytics service
  const body = JSON.stringify(metric);
  fetch('/api/analytics', { method: 'POST', body });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

**Files Affected**:
- `/src/main.tsx`
- Create analytics endpoint

**Dependencies**: None

---

## Phase 6: Code Duplication

### QA-015: Identify and Eliminate Code Duplication
**Priority**: Medium
**Category**: Maintainability
**Estimated Effort**: Large

**Description**:
Code duplication observed:
- Database query patterns in hooks
- Form validation logic
- Error handling
- Loading states

**Tools to Use**:
- jscpd (copy-paste detector)
- SonarQube

**Approach**:
1. Run: `npx jscpd src backend/src`
2. Identify duplicated blocks > 10 lines
3. Extract to shared utilities
4. Document extracted patterns

**Files Affected**:
- Most hooks and services
- Create shared utility modules

**Dependencies**: None

---

## Phase 7: Naming Consistency

### QA-016: Standardize Naming Conventions
**Priority**: Low
**Category**: Code Quality
**Estimated Effort**: Medium

**Description**:
Inconsistent naming across codebase:
- Database: snake_case
- Frontend: camelCase
- Some inconsistency in boolean naming (is vs has vs can)

**Recommended Standards**:
```typescript
// Boolean variables
const isLoading = true;      // State
const hasError = false;      // Condition
const canEdit = true;        // Permission
const shouldRender = false;  // Decision

// Event handlers
const handleClick = () => {};
const handleSubmit = () => {};

// Async functions
const fetchData = async () => {};
const createUser = async () => {};

// Database mapping functions
const mapDbToApp = (dbRecord) => {};
const mapAppToDb = (appRecord) => {};
```

**Files Affected**:
- Review all files for naming consistency

**Dependencies**: None

---

## Phase 8: CI/CD Quality Gates

### QA-017: Implement GitHub Actions CI Pipeline
**Priority**: High
**Category**: CI/CD
**Estimated Effort**: Medium

**Description**:
No CI pipeline to enforce quality.

**Recommended Pipeline**:
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage
      - run: npm run build
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  backend-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --coverage
```

**Files Affected**:
- Create `/.github/workflows/ci.yml`

**Dependencies**: QA-001, QA-002 (tests must exist)

---

### QA-018: Add Code Coverage Reporting
**Priority**: Medium
**Category**: Testing
**Estimated Effort**: Small

**Description**:
No code coverage tracking.

**Recommended Setup**:
- Codecov or Coveralls integration
- Coverage badge in README
- Enforce minimum coverage (70%)
- Block PRs if coverage drops

**Files Affected**:
- Update CI pipeline
- Add badge to README.md

**Dependencies**: QA-017 (CI pipeline)

---

## Summary Statistics

**Total Tasks**: 18
**Critical Priority**: 2 tasks
**High Priority**: 5 tasks
**Medium Priority**: 10 tasks
**Low Priority**: 1 task

**Categories**:
- Testing: 5 tasks (most critical)
- Code Quality: 6 tasks
- Documentation: 3 tasks
- Monitoring: 2 tasks
- CI/CD: 2 tasks

**Recommended Execution Order**:
1. QA-001, QA-002 (Critical - establish testing)
2. QA-005 (Pre-commit hooks)
3. QA-017 (CI pipeline)
4. QA-012 (Error handling standardization)
5. QA-003, QA-004 (E2E and integration tests)
6. QA-006, QA-007 (Code formatting & linting)
7. QA-013, QA-014 (Monitoring)
8. QA-009, QA-010 (Documentation)
9. QA-015 (Code duplication)
10. Remaining tasks

**Estimated Total Effort**: 6-8 weeks for complete implementation

