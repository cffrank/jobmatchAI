# E2E Testing Setup with Cloudflare Browser Rendering

This guide explains how to set up automated end-to-end testing for JobMatch AI using Cloudflare's Browser Rendering service.

## Overview

We've created two E2E testing implementations:

1. **REST API Version** (Recommended) - Uses Cloudflare's Browser Rendering REST API
2. **Workers Binding Version** - Uses Puppeteer with Workers bindings (more complex setup)

The REST API version is simpler to set up and more reliable for basic testing needs.

## Quick Start (REST API Version)

### 1. Get Your Cloudflare Account ID

```bash
# Login to Cloudflare
npx wrangler login

# Get your account ID
npx wrangler whoami
```

Your account ID will be shown in the output.

### 2. Create an API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use the "Custom token" template
4. Give it a name like "Browser Rendering E2E Tests"
5. Add permissions:
   - **Account** → **Browser Rendering** → **Edit**
6. Click "Continue to summary" and "Create Token"
7. **Save the token** - you won't be able to see it again!

### 3. Configure Secrets

```bash
cd workers/e2e-tests

# Set your account ID
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --config wrangler-rest-api.toml
# Paste your account ID when prompted

# Set your API token
npx wrangler secret put CLOUDFLARE_API_TOKEN --config wrangler-rest-api.toml
# Paste your API token when prompted
```

### 4. Deploy the Worker

```bash
npx wrangler deploy --config wrangler-rest-api.toml
```

### 5. Run Tests

```bash
# Run tests against development environment
curl -X POST https://jobmatch-ai-e2e-tests-rest.carl-f-frank.workers.dev/run-tests | jq

# Check for failures
curl -X POST https://jobmatch-ai-e2e-tests-rest.carl-f-frank.workers.dev/run-tests -s | jq '.failed'
```

## Test Coverage

The REST API version includes these tests:

1. **Home Page Loads** - Verifies the landing page loads and contains expected content
2. **Screenshot Generation** - Captures a screenshot of the home page
3. **Jobs Page Accessible** - Checks that the /jobs route is accessible

## Example Test Output

```json
{
  "timestamp": "2025-12-29T08:00:00.000Z",
  "appUrl": "https://jobmatch-ai-dev.pages.dev",
  "totalTests": 3,
  "passed": 3,
  "failed": 0,
  "skipped": 0,
  "duration": 4500,
  "results": [
    {
      "name": "Home Page Loads",
      "status": "passed",
      "duration": 1500
    },
    {
      "name": "Screenshot Generation",
      "status": "passed",
      "duration": 1800,
      "screenshot": "iVBORw0KGgoAAAANSUhEUgAABQAAAALQ..."
    },
    {
      "name": "Jobs Page Accessible",
      "status": "passed",
      "duration": 1200
    }
  ]
}
```

## CI/CD Integration

The E2E tests automatically run after each successful deployment via GitHub Actions.

### Manual Trigger

You can also manually trigger the tests:

1. Go to **Actions** tab in GitHub
2. Select **E2E Tests** workflow
3. Click **Run workflow**
4. Choose environment (development/production)
5. Click **Run workflow**

### Adding to Your Workflow

```yaml
# .github/workflows/deploy.yml
- name: Run E2E Tests
  run: |
    RESPONSE=$(curl -s -X POST https://jobmatch-ai-e2e-tests-rest.carl-f-frank.workers.dev/run-tests)
    echo "$RESPONSE" | jq
    FAILED=$(echo "$RESPONSE" | jq -r '.failed')
    if [ "$FAILED" != "0" ]; then
      echo "E2E tests failed!"
      exit 1
    fi
```

## Advanced: Puppeteer Workers Binding

If you need more complex browser automation (clicking buttons, filling forms, etc.), use the Puppeteer version:

### Prerequisites

- Browser Rendering must be enabled on your Cloudflare account
- May require a paid plan depending on usage

### Setup

```bash
cd workers/e2e-tests

# Deploy with browser binding
npx wrangler deploy
```

### Code Example

```typescript
import puppeteer from '@cloudflare/puppeteer';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();

    // Navigate to page
    await page.goto('https://jobmatch-ai-dev.pages.dev/login');

    // Fill in form
    await page.type('input[type="email"]', 'test@example.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForNavigation();

    // Take screenshot
    const screenshot = await page.screenshot();

    await browser.close();

    return new Response(screenshot, {
      headers: { 'Content-Type': 'image/png' },
    });
  },
};
```

## Troubleshooting

### Test Fails with "API error: 403"

Your API token doesn't have the correct permissions. Make sure it has:
- **Account** → **Browser Rendering** → **Edit**

### Test Fails with "API error: 404"

Browser Rendering might not be available on your account. Check:
1. Go to https://dash.cloudflare.com/
2. Select your account
3. Look for "Browser Rendering" in the sidebar
4. If not visible, it may not be enabled for your account

### "Invalid URL: /v1/acquire" Error

This error occurs with the Workers binding version when the browser binding isn't properly configured. Use the REST API version instead for simpler setup.

### Tests Timeout

Increase the timeout in your curl command:

```bash
curl --max-time 60 -X POST https://jobmatch-ai-e2e-tests-rest.carl-f-frank.workers.dev/run-tests
```

## Pricing

Browser Rendering pricing (as of Dec 2024):

- **Free Tier**: 5,000 browser seconds/month
- **Paid**: $0.50 per 1,000 browser seconds

**Example costs**:
- Each REST API test uses ~1-2 seconds of browser time
- 100 test runs/day = ~200 seconds/day = 6,000 seconds/month
- **Cost**: ~$3/month (first 5,000 seconds free)

## Next Steps

1. **Add More Tests**: Extend `index-rest-api.ts` with additional test cases
2. **Screenshot Comparison**: Store screenshots and compare between deployments
3. **Performance Testing**: Use the Browser Rendering API to measure page load times
4. **Accessibility Testing**: Extract and validate accessibility metadata

## Resources

- [Cloudflare Browser Rendering Docs](https://developers.cloudflare.com/browser-rendering/)
- [REST API Reference](https://developers.cloudflare.com/browser-rendering/rest-api/)
- [Pricing Details](https://developers.cloudflare.com/browser-rendering/pricing/)
- [Workers Documentation](https://developers.cloudflare.com/workers/)
