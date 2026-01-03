# Cloudflare Pages CORS Fix - Environment Variable Update Required

## Problem
Cloudflare Pages preview deployments use dynamic subdomains (e.g., `https://5802a4d3.jobmatch-ai-dev.pages.dev`) which were being blocked by CORS because the backend only allowed the main domain.

## Solution Implemented
Updated backend CORS configuration in `/backend/src/index.ts` to support wildcard pattern matching for origins.

**Commit:** `01a6f3f` - fix: support wildcard CORS origins for Cloudflare Pages preview deployments

## Required Railway Environment Variable Update

### Development Environment (backend1-development)

1. Go to Railway Dashboard: https://railway.app/
2. Navigate to the `backend1-development` service
3. Click on "Variables" tab
4. Update the `ALLOWED_ORIGINS` variable:

**Current value:**
```
https://jobmatch-ai-dev.pages.dev
```

**New value (add wildcard pattern):**
```
https://jobmatch-ai-dev.pages.dev,https://*.jobmatch-ai-dev.pages.dev
```

### Staging Environment (if applicable)

Repeat the same process for staging environment:
```
https://jobmatch-ai-staging.pages.dev,https://*.jobmatch-ai-staging.pages.dev
```

### Production Environment

For production, you may want to keep strict origin validation and only allow the main domain:
```
https://jobmatchai.com
```

Or if you want to support production preview deployments:
```
https://jobmatchai.com,https://*.jobmatch-ai.pages.dev
```

## How It Works

The backend CORS middleware now:
1. First checks for exact origin matches (existing behavior)
2. Then checks if any allowed origins contain wildcards (e.g., `https://*.example.com`)
3. Converts wildcard patterns to regex and tests the incoming origin
4. Allows the request if either exact match or wildcard pattern matches

**Example wildcard pattern matching:**
- Pattern: `https://*.jobmatch-ai-dev.pages.dev`
- Matches: `https://5802a4d3.jobmatch-ai-dev.pages.dev`
- Matches: `https://abc123.jobmatch-ai-dev.pages.dev`
- Does NOT match: `https://evil.com`
- Does NOT match: `https://jobmatch-ai-dev.pages.dev.evil.com` (must end with exact domain)

## Security Considerations

- Wildcard only works for subdomains, not for different domains
- The regex pattern ensures the origin ends with the exact domain
- All other CORS security measures remain in place
- No changes needed to other CORS settings (credentials, methods, headers)

## Testing

After updating Railway environment variables:

1. Railway will auto-redeploy the backend
2. Wait for deployment to complete (~2-3 minutes)
3. Test with a Cloudflare Pages preview URL:
   ```bash
   curl -v -X OPTIONS \
     -H "Origin: https://5802a4d3.jobmatch-ai-dev.pages.dev" \
     -H "Access-Control-Request-Method: POST" \
     https://backend1-development.up.railway.app/api/applications/generate \
     2>&1 | grep -i "access-control"
   ```

4. Should see:
   ```
   < access-control-allow-origin: https://5802a4d3.jobmatch-ai-dev.pages.dev
   < access-control-allow-methods: GET, POST, PATCH, PUT, DELETE, OPTIONS
   ```

5. Test in browser by visiting the Cloudflare Pages preview URL and trying to generate an application

## Rollback Plan

If issues occur, revert the environment variable to:
```
https://jobmatch-ai-dev.pages.dev
```

And redeploy the previous backend version from Railway dashboard.

## Documentation References

- Backend CORS configuration: `/backend/src/index.ts` (lines 97-151)
- CLAUDE.md environment variables section
- CORS debugging guide: `/docs/CORS_DEBUGGING_GUIDE.md`
