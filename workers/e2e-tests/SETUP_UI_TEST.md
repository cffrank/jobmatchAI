# UI Tracking Test Setup - Final Steps

The UI tracking test worker has been deployed to:
**https://jobmatch-ai-ui-tracking-test.carl-f-frank.workers.dev**

## What's Already Done ✅

- Worker code created (`test-tracking-ui.ts`)
- Wrangler config created (`wrangler-ui-test.toml`)
- Worker deployed successfully
- Cloudflare account ID configured: `280c58ea17d9fe3235c33bd0a52a256b`

## What You Need to Do Now

### Step 1: Create API Token

The browser should already be open to https://dash.cloudflare.com/profile/api-tokens

1. Click **"Create Token"**
2. Click **"Get started"** next to "Custom token"
3. Configure the token:
   - **Token name**: `Browser Rendering E2E Tests`
   - **Permissions**:
     - Select **"Account"** from first dropdown
     - Select **"Browser Rendering"** from second dropdown
     - Select **"Edit"** from third dropdown
   - **Account Resources**:
     - Include: **"Carl.f.frank@gmail.com's Account"**
   - **TTL**: Keep default or set to "1 year"

4. Click **"Continue to summary"**
5. Click **"Create Token"**
6. **COPY THE TOKEN** - you won't see it again!

### Step 2: Set the Secret

Once you have the token, run this command:

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers/e2e-tests

# Set the API token secret
npx wrangler secret put CLOUDFLARE_API_TOKEN --config wrangler-ui-test.toml
# Paste your token when prompted
```

### Step 3: Run the Test

```bash
# Run the UI tracking test
curl -X POST https://jobmatch-ai-ui-tracking-test.carl-f-frank.workers.dev/test-ui-tracking -s | jq

# Or save results to file
curl -X POST https://jobmatch-ai-ui-tracking-test.carl-f-frank.workers.dev/test-ui-tracking -s | jq > test-results.json
```

## What the Test Does

The UI tracking test uses Cloudflare Browser Rendering REST API to:

1. **Homepage** - Loads https://jobmatch-ai-dev.pages.dev and verifies it contains "JobMatch"
2. **Signup Page** - Takes a screenshot of /signup to verify it's accessible
3. **Jobs Page** - Verifies /jobs page loads
4. **Applications Page** - Takes a screenshot of /applications
5. **Tracker Page** - Takes a full-page screenshot of /tracker

## Expected Output

```json
{
  "success": true,
  "message": "UI tracking test completed. 5 passed, 0 failed",
  "testCredentials": {
    "email": "test-1234567890@example.com"
  },
  "duration": 4500,
  "results": [
    {
      "step": "Homepage Loads",
      "status": "passed",
      "duration": 800,
      "details": {
        "urlTested": "https://jobmatch-ai-dev.pages.dev",
        "containsJobMatch": true
      }
    },
    {
      "step": "Signup Page Accessible",
      "status": "passed",
      "duration": 1200,
      "details": {
        "pageUrl": "https://jobmatch-ai-dev.pages.dev/signup"
      },
      "screenshot": "iVBORw0KGgoAAAANSUhEUgAAA..."
    },
    // ... more results
  ]
}
```

## Troubleshooting

### Test Fails with "API error: 400"
- The API token is missing or invalid
- Make sure you ran the `wrangler secret put` command
- Verify the token has Browser Rendering permissions

### Test Fails with "API error: 403"
- The API token doesn't have the right permissions
- Recreate the token with **Account > Browser Rendering > Edit** permissions

### Test Fails with "API error: 404"
- Browser Rendering might not be enabled on your account
- Check if it's available in your Cloudflare dashboard

## Next Steps After Testing

Once the UI test passes, you can:

1. **Add to CI/CD** - Integrate into GitHub Actions workflow
2. **Expand Tests** - Add more page checks, verify specific elements
3. **Screenshot Comparison** - Save screenshots and compare between deployments
4. **Performance Metrics** - Track page load times

## Alternative: Manual Testing

If you prefer to test manually without the API token:

1. Visit https://jobmatch-ai-dev.pages.dev
2. Sign up for an account
3. Create a job
4. Generate an application
5. Submit the application
6. Check /tracker to see if it appears

The automated test is doing the same checks, just programmatically.
