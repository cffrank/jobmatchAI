# Backend Testing Guide

Quick reference for running and writing backend tests.

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode (TDD)
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Test Structure

```
backend/tests/
├── setup.ts                    # Test environment configuration
├── helpers/
│   └── testHelpers.ts         # Shared test utilities
├── unit/
│   └── middleware.test.ts     # Authentication middleware tests
└── integration/
    ├── cors.test.ts           # CORS configuration tests
    ├── health.test.ts         # Health endpoint tests
    └── environment.test.ts    # Environment validation tests
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateUser } from '../../src/middleware/auth';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = { method: 'POST', headers: {} };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    nextFunction = vi.fn();
    vi.clearAllMocks();
  });

  it('should bypass authentication for OPTIONS requests', async () => {
    mockRequest.method = 'OPTIONS';

    await authenticateUser(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('Health Check', () => {
  it('should return 200 OK', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
  });
});
```

## Test Environment

### Environment Variables

Tests use `.env.test` (falls back to `.env`):

```bash
NODE_ENV=test
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=test-key
SUPABASE_SERVICE_ROLE_KEY=test-key
OPENAI_API_KEY=test-key-mock
APIFY_API_TOKEN=test-token-mock
SENDGRID_API_KEY=test-key-mock
```

### Mocking External Services

```typescript
// In tests/setup.ts
if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'test-key-mock';
}
```

## Test Helpers

### Available Helpers

```typescript
import {
  createMockToken,
  createTestUser,
  getTestAuthToken,
  cleanupTestData,
  createMockJob,
  createMockApplication,
  mockOpenAIResponse,
} from '../helpers/testHelpers';

// Create mock JWT token
const token = createMockToken('user-123');

// Create test user (integration tests)
const { user } = await createTestUser('test@example.com', 'password');

// Get auth token
const authToken = await getTestAuthToken('test@example.com', 'password');

// Generate mock data
const job = createMockJob({ title: 'Custom Title' });
const app = createMockApplication({ status: 'submitted' });
```

## Running Specific Tests

```bash
# Run single test file
npm test -- middleware.test.ts

# Run tests matching pattern
npm test -- --grep "CORS"

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with UI
npm run test:ui
```

## Coverage Reports

```bash
# Generate coverage
npm run test:coverage

# View HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

## Debugging Tests

### VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:watch"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Console Logging

```typescript
it('should do something', () => {
  console.log('Debug output:', someVariable);
  expect(someVariable).toBe(expectedValue);
});
```

### Isolate Failing Tests

```typescript
// Run only this test
it.only('should focus on this test', () => {
  // ...
});

// Skip this test
it.skip('should skip this test', () => {
  // ...
});
```

## Common Issues

### Test Timeouts

```typescript
// Increase timeout for specific test
it('slow test', async () => {
  // ...
}, 10000); // 10 seconds
```

### Supabase Connection Errors

Ensure Supabase is running or use mock credentials:

```bash
# Start local Supabase
npx supabase start

# Or use mocked environment
NODE_ENV=test npm test
```

### Mock Not Working

Clear all mocks between tests:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

## CI/CD Integration

Tests run automatically in GitHub Actions:

- On push to main/develop
- On pull requests
- Manual workflow dispatch

View results in GitHub Actions tab.

## Best Practices

1. **Test naming**: Use descriptive names
   ```typescript
   it('should return 401 when authorization header is missing', () => {
     // ...
   });
   ```

2. **Arrange-Act-Assert**: Structure tests clearly
   ```typescript
   it('should authenticate valid token', async () => {
     // Arrange
     const token = 'valid-token';
     mockRequest.headers = { authorization: `Bearer ${token}` };

     // Act
     await authenticateUser(mockRequest, mockResponse, nextFunction);

     // Assert
     expect(nextFunction).toHaveBeenCalled();
   });
   ```

3. **Cleanup**: Always clean up test data
   ```typescript
   afterEach(async () => {
     await cleanupTestData(testUserId);
   });
   ```

4. **Isolation**: Tests should not depend on each other
   ```typescript
   beforeEach(() => {
     // Reset state before each test
     vi.clearAllMocks();
   });
   ```

5. **Mock external calls**: Don't hit real APIs in tests
   ```typescript
   vi.mock('openai', () => ({
     OpenAI: vi.fn(() => ({
       chat: {
         completions: {
           create: vi.fn(() => mockOpenAIResponse()),
         },
       },
     })),
   }));
   ```

## Contributing

When adding new features:

1. Write tests first (TDD)
2. Ensure tests pass: `npm test`
3. Check coverage: `npm run test:coverage`
4. Update this README if needed

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Project Testing Strategy](/docs/TESTING_STRATEGY.md)
