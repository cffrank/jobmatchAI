# E2E Testing with Cloudflare Browser Rendering

This worker provides automated end-to-end testing for the JobMatch AI application using Cloudflare's Browser Rendering API with Puppeteer.

## Features

- 🌐 **Global Testing**: Tests run on Cloudflare's edge network, close to your users
- 🚀 **Fast & Scalable**: Instant browser access with low cold-start times
- 🎯 **Critical Path Coverage**: Tests key user flows including application tracking
- 📊 **Detailed Reports**: JSON reports with test results, timings, and screenshots
- 💰 **Cost Effective**: Generous free tier, pay only for browser time used

## Test Coverage

The E2E suite covers these critical flows:

1. **Home Page Loads**: Verifies the landing page loads correctly
2. **Login Flow**: Tests authentication with test credentials
3. **Jobs Page**: Checks job listing displays properly
4. **Application Tracking**: Validates application submission workflow
5. **Tracker Page**: Ensures submitted applications appear in tracker

## Setup

### 1. Install Dependencies

```bash
cd workers/e2e-tests
npm install
```

### 2. Configure Test User (Optional)

To test authenticated flows, set up test credentials:

```bash
# Development
wrangler secret put TEST_USER_EMAIL
wrangler secret put TEST_USER_PASSWORD

# Production
wrangler secret put TEST_USER_EMAIL --env production
wrangler secret put TEST_USER_PASSWORD --env production
```

**Important**: Create a dedicated test user account in your application. Don't use real user credentials.

### 3. Deploy the Worker

```bash
# Deploy to development
npm run deploy

# Deploy to production
npm run deploy:production
```

## Usage

### Running Tests Manually

Once deployed, trigger tests via POST request:

```bash
# Test development environment
curl -X POST https://jobmatch-ai-e2e-tests.carl-f-frank.workers.dev/run-tests

# With pretty formatting
curl -X POST https://jobmatch-ai-e2e-tests.carl-f-frank.workers.dev/run-tests | jq
```

### Example Test Report

```json
{
  "timestamp": "2025-12-29T08:00:00.000Z",
  "appUrl": "https://jobmatch-ai-dev.pages.dev",
  "totalTests": 5,
  "passed": 5,
  "failed": 0,
  "skipped": 0,
  "duration": 12450,
  "results": [
    {
      "name": "Home Page Loads",
      "status": "passed",
      "duration": 2340
    },
    {
      "name": "Login Flow",
      "status": "passed",
      "duration": 3120
    },
    {
      "name": "Jobs Page Loads",
      "status": "passed",
      "duration": 1890
    },
    {
      "name": "Application Tracking",
      "status": "passed",
      "duration": 2450
    },
    {
      "name": "Tracker Page Shows Applications",
      "status": "passed",
      "duration": 2650
    }
  ]
}
```

### CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
# .github/workflows/deploy.yml
- name: Run E2E Tests
  run: |
    RESPONSE=$(curl -s -X POST https://jobmatch-ai-e2e-tests.carl-f-frank.workers.dev/run-tests)
    echo "$RESPONSE" | jq
    FAILED=$(echo "$RESPONSE" | jq -r '.failed')
    if [ "$FAILED" != "0" ]; then
      echo "E2E tests failed!"
      exit 1
    fi
```

## Local Development

Test locally before deploying:

```bash
# Start local worker
npm run dev

# In another terminal, trigger tests
npm run test

# Or manually with curl
curl -X POST http://localhost:8787/run-tests | jq
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  GitHub Actions / CI/CD Pipeline                    │
│  (POST request after deployment)                    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  E2E Test Worker (Cloudflare Workers)               │
│  - Receives test request                            │
│  - Launches browser instance                        │
│  - Runs test scenarios                              │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  Browser Rendering (Headless Chrome)                │
│  - Navigate to app                                  │
│  - Execute user interactions                        │
│  - Capture results/screenshots                      │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│  JobMatch AI App (Cloudflare Pages)                 │
│  - Development: jobmatch-ai-dev.pages.dev           │
│  - Production: jobmatch-ai.pages.dev                │
└─────────────────────────────────────────────────────┘
```

## Test Customization

### Adding New Tests

Add new test functions in `index.ts`:

```typescript
async function testNewFeature(page: any, appUrl: string): Promise<TestResult> {
  const testStart = Date.now();
  try {
    // Your test logic here
    await page.goto(`${appUrl}/new-feature`);
    await page.waitForSelector('[data-testid="feature"]');

    return {
      name: 'New Feature Test',
      status: 'passed',
      duration: Date.now() - testStart,
    };
  } catch (error) {
    return {
      name: 'New Feature Test',
      status: 'failed',
      duration: Date.now() - testStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

Then add it to the test suite in `runE2ETests()`:

```typescript
results.push(await testNewFeature(page, appUrl));
```

### Taking Screenshots

Add screenshot capture for debugging:

```typescript
const screenshot = await page.screenshot({ encoding: 'base64' });
return {
  name: 'Test Name',
  status: 'passed',
  duration: Date.now() - testStart,
  screenshots: [screenshot],
};
```

## Pricing

Browser Rendering pricing (as of Dec 2024):

- **Free Tier**: 5,000 browser seconds/month
- **Paid**: $0.50 per 1,000 browser seconds

**Example costs for this test suite**:
- Average test run: ~12 seconds
- 100 test runs/day = 1,200 seconds/day
- 36,000 seconds/month = **$18/month** (well within limits)

## Troubleshooting

### Tests Timeout

Increase timeout in test functions:

```typescript
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 }); // 60s
```

### Authentication Issues

1. Verify test user exists in database
2. Check credentials are set correctly:
   ```bash
   wrangler secret list
   ```
3. Ensure login flow matches current UI

### Selector Not Found

Use data-testid attributes in your components:

```tsx
<div data-testid="jobs-list">
  {jobs.map(job => (
    <div key={job.id} data-testid="job-card">
      {/* job content */}
    </div>
  ))}
</div>
```

Then in tests:

```typescript
await page.waitForSelector('[data-testid="jobs-list"]');
```

## Resources

- [Cloudflare Browser Rendering Docs](https://developers.cloudflare.com/browser-rendering/)
- [Puppeteer API Documentation](https://pptr.dev/)
- [Workers Pricing](https://developers.cloudflare.com/browser-rendering/pricing/)
- [Puppeteer Cloudflare Examples](https://developers.cloudflare.com/browser-rendering/puppeteer/)

## Support

For issues or questions:
- [Cloudflare Discord](https://discord.cloudflare.com)
- [GitHub Issues](https://github.com/cffrank/jobmatchAI/issues)
