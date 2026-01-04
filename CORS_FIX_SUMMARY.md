# CORS Fix for Cloudflare Pages Preview Deployments

## Problem

The E2E test `"CORS headers allow Cloudflare Pages preview deployments"` in `tests/e2e/apply-now-button.spec.ts:265` was failing because the backend CORS configuration only allowed exact-match origins.

Cloudflare Pages creates dynamic preview deployment URLs for every commit/PR:
- `https://5802a4d3.jobmatch-ai-dev.pages.dev`
- `https://abc123.jobmatch-ai-dev.pages.dev`
- `https://test-preview.jobmatch-ai-dev.pages.dev`

The previous CORS implementation couldn't handle these dynamic subdomain URLs.

## Root Cause

The CORS middleware in `/home/carl/application-tracking/jobmatch-ai/workers/api/index.ts` (lines 66-101) used an array-based exact-match approach:

```typescript
const allowedOrigins: string[] = [appUrl];
// ...
const isAllowed = !origin || allowedOrigins.includes(origin);
```

This approach required pre-knowing all allowed origins, which is impossible for dynamic preview URLs.

## Solution

Replaced the exact-match CORS logic with a regex pattern-based approach that:

1. **Allows Cloudflare Pages preview deployments** using regex pattern matching:
   ```typescript
   const cloudflarePagesPreviews = /^https:\/\/[a-z0-9-]+\.jobmatch-ai-dev\.pages\.dev$/i;
   ```

2. **Maintains security** by blocking malicious lookalike domains:
   - ✅ Allows: `https://abc123.jobmatch-ai-dev.pages.dev`
   - ❌ Blocks: `https://jobmatch-ai-dev.pages.dev.evil.com`
   - ❌ Blocks: `https://fakejobmatch-ai-dev.pages.dev`

3. **Preserves existing functionality**:
   - Exact match for configured `APP_URL`
   - Localhost origins in development mode
   - Production Cloudflare Pages URLs

## Code Changes

**File:** `/home/carl/application-tracking/jobmatch-ai/workers/api/index.ts`

**Lines:** 66-126

**Key changes:**
- Refactored CORS origin checking into `isAllowedOrigin()` function
- Added regex pattern for Cloudflare Pages preview subdomain matching
- Added explicit checks for production URLs
- Improved security documentation

## Security Considerations

### What the fix allows:
- ✅ `https://{any-subdomain}.jobmatch-ai-dev.pages.dev` (preview deployments)
- ✅ `https://jobmatch-ai-dev.pages.dev` (main deployment)
- ✅ `https://jobmatch-ai.pages.dev` (production)
- ✅ `http://localhost:*` (development only)

### What the fix blocks:
- ❌ `https://jobmatch-ai-dev.pages.dev.evil.com` (subdomain hijacking)
- ❌ `https://fakejobmatch-ai-dev.pages.dev` (typosquatting)
- ❌ Any other domain not matching the pattern

### Regex pattern explanation:
```typescript
/^https:\/\/[a-z0-9-]+\.jobmatch-ai-dev\.pages\.dev$/i
```

- `^https:\/\/` - Must start with https://
- `[a-z0-9-]+` - Preview ID (alphanumeric + hyphens)
- `\.jobmatch-ai-dev\.pages\.dev` - Exact domain match
- `$` - Must end here (prevents evil.com suffix)
- `i` - Case-insensitive

## Testing

Verified the fix handles all test cases correctly:

```bash
✅ PASS - https://5802a4d3.jobmatch-ai-dev.pages.dev (preview)
✅ PASS - https://abc123.jobmatch-ai-dev.pages.dev (preview)
✅ PASS - https://test-preview.jobmatch-ai-dev.pages.dev (preview)
✅ PASS - https://jobmatch-ai-dev.pages.dev (main)
✅ PASS - https://jobmatch-ai.pages.dev (production)
✅ PASS - http://localhost:5173 (dev)
✅ PASS - BLOCKS https://jobmatch-ai-dev.pages.dev.evil.com
✅ PASS - BLOCKS https://evil.com
✅ PASS - BLOCKS https://fakejobmatch-ai-dev.pages.dev
```

## Deployment

To deploy this fix:

1. **Commit and push** to `develop` branch
2. **Cloudflare Workers** will auto-deploy via GitHub Actions
3. **E2E test** `tests/e2e/apply-now-button.spec.ts:265` should now pass

## Expected Test Behavior

After deploying this fix, the failing test should pass:

```typescript
test('CORS headers allow Cloudflare Pages preview deployments', async ({ request }) => {
  const previewOrigins = [
    'https://5802a4d3.jobmatch-ai-dev.pages.dev',
    'https://abc123.jobmatch-ai-dev.pages.dev',
    'https://test-preview.jobmatch-ai-dev.pages.dev',
  ];

  for (const origin of previewOrigins) {
    const response = await request.fetch(`${BACKEND_URL}/api/applications/generate`, {
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Authorization,Content-Type',
      },
    });

    const headers = response.headers();

    // ✅ Should now have CORS headers
    expect(headers['access-control-allow-origin']).toBeTruthy();
    expect(headers['access-control-allow-methods']).toContain('POST');
  }
});
```

The test verifies:
1. ✅ CORS headers are present in OPTIONS response
2. ✅ `Access-Control-Allow-Origin` header is returned
3. ✅ `Access-Control-Allow-Methods` includes POST

## Related Files

- **CORS Configuration:** `/home/carl/application-tracking/jobmatch-ai/workers/api/index.ts:66-126`
- **Failing Test:** `/home/carl/application-tracking/jobmatch-ai/tests/e2e/apply-now-button.spec.ts:265-291`
- **CI/CD Workflow:** `/home/carl/application-tracking/jobmatch-ai/.github/workflows/post-deployment-e2e.yml`

## Additional Notes

- The fix maintains backward compatibility with all existing allowed origins
- No breaking changes to API behavior
- Development localhost origins remain allowed only in dev mode (`ENVIRONMENT=development`)
- Production deployment will require same pattern for production preview URLs
