# CORS Fix Deployment Guide - December 22, 2025

## Problem Summary

**Issue:** Production Railway application unable to access Supabase Edge Function `generate-application`

**Error:**
```
Access to fetch at 'https://lrzhpnsykasqrousgmdh.supabase.co/functions/v1/generate-application'
from origin 'https://jobmatchai-production.up.railway.app' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
```

**Root Cause:**
- Missing `Access-Control-Allow-Methods` header in CORS configuration
- OPTIONS preflight response returning 200 status with body instead of 204 No Content

## Solution Implemented

### Code Changes

Fixed CORS headers in all Supabase Edge Functions:

**Files Modified:**
1. `/supabase/functions/generate-application/index.ts`
2. `/supabase/functions/send-email/index.ts`
3. `/supabase/functions/scrape-jobs/index.ts`
4. `/supabase/functions/rate-limit/index.ts`
5. `/supabase/functions/linkedin-oauth/index.ts`

**Changes Applied:**

Before:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  // ...
})
```

After:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // or 'GET, POST, OPTIONS' for linkedin-oauth
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }
  // ...
})
```

### Key Improvements

1. **Added `Access-Control-Allow-Methods` header** - Required for CORS preflight requests
2. **Changed OPTIONS response to HTTP 204** - Standard no-content response for preflight
3. **Changed response body to `null`** - Proper preflight response has no body
4. **Maintained wildcard origin (`*`)** - Supports both localhost and Railway production

### Git Commits

```bash
commit 62137eb - fix: add proper CORS headers to all Edge Functions
commit 53fe60e - fix: add proper CORS headers to generate-application Edge Function
```

## Deployment Instructions

### Step 1: Verify Code is in GitHub

✅ **COMPLETED** - All changes have been committed and pushed to GitHub main branch

### Step 2: Deploy Edge Functions to Supabase

You need to deploy the updated Edge Functions to Supabase. There are two methods:

#### Option A: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link to your project**:
   ```bash
   supabase link --project-ref lrzhpnsykasqrousgmdh
   ```

4. **Deploy all Edge Functions**:
   ```bash
   supabase functions deploy
   ```

   Or deploy individual functions:
   ```bash
   supabase functions deploy generate-application
   supabase functions deploy send-email
   supabase functions deploy scrape-jobs
   supabase functions deploy rate-limit
   supabase functions deploy linkedin-oauth
   ```

#### Option B: Using Supabase Dashboard

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh
2. Navigate to **Edge Functions** in the sidebar
3. For each function (`generate-application`, `send-email`, `scrape-jobs`, `rate-limit`, `linkedin-oauth`):
   - Click on the function name
   - Click "Deploy new version"
   - Upload or paste the updated code from `/supabase/functions/[function-name]/index.ts`
   - Click "Deploy"

#### Option C: Using GitHub Integration (if configured)

If you have Supabase GitHub integration set up:
1. Go to Supabase Dashboard
2. Navigate to **Settings** > **Integrations** > **GitHub**
3. Trigger a deployment from the main branch
4. Supabase will automatically deploy the updated functions

### Step 3: Verify Deployment

After deployment, verify the fix works:

1. **Check Edge Function Version**:
   ```bash
   supabase functions list
   ```

2. **Test from Production**:
   - Visit https://jobmatchai-production.up.railway.app
   - Navigate to a job listing
   - Try to generate an application
   - Verify no CORS error appears in browser console

3. **Manual CORS Test**:
   ```bash
   # Test OPTIONS preflight request
   curl -X OPTIONS \
     -H "Origin: https://jobmatchai-production.up.railway.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: authorization, content-type" \
     -i \
     https://lrzhpnsykasqrousgmdh.supabase.co/functions/v1/generate-application
   ```

   **Expected Response:**
   ```
   HTTP/2 204
   access-control-allow-origin: *
   access-control-allow-headers: authorization, x-client-info, apikey, content-type
   access-control-allow-methods: POST, OPTIONS
   ```

## Testing Checklist

After deployment, test the following:

- [ ] OPTIONS preflight request returns 204 status
- [ ] CORS headers present in preflight response
- [ ] Production app can call `generate-application` function
- [ ] No CORS errors in browser console
- [ ] Application generation works end-to-end
- [ ] Test from Railway production domain
- [ ] Test from localhost (development)

## Rollback Plan

If the deployment causes issues:

1. **Rollback using Supabase CLI**:
   ```bash
   # List recent deployments
   supabase functions list --version

   # Rollback to previous version
   supabase functions deploy generate-application --version [previous-version]
   ```

2. **Rollback via Dashboard**:
   - Navigate to Edge Function in Supabase Dashboard
   - Click "Versions" tab
   - Select previous version and click "Restore"

## Monitoring

After deployment, monitor:

1. **Supabase Edge Function Logs**:
   ```bash
   supabase functions logs generate-application
   ```

2. **Railway Application Logs**:
   - Check Railway dashboard for any errors

3. **Browser Console**:
   - Verify no CORS errors when generating applications

## Technical Details

### Why This Fix Works

1. **`Access-Control-Allow-Methods` Header**:
   - Required by CORS specification for preflight requests
   - Tells browser which HTTP methods are allowed
   - Missing this header causes preflight to fail

2. **HTTP 204 Status**:
   - Standard status code for OPTIONS preflight responses
   - Indicates "No Content" - preflight has no response body
   - Previous 200 status with body was non-standard

3. **Null Response Body**:
   - Preflight responses should have no body
   - Previous implementation returned 'ok' string
   - Null body is correct according to CORS spec

### CORS Preflight Flow

1. Browser detects cross-origin request with custom headers
2. Browser sends OPTIONS preflight request
3. Server responds with CORS headers (including allowed methods)
4. Browser validates response
5. If valid, browser sends actual POST request
6. Server responds with data + CORS headers

### Why Wildcard Origin Works

The wildcard origin (`*`) allows requests from any domain:
- Development: `http://localhost:5173`
- Production: `https://jobmatchai-production.up.railway.app`
- Future domains: Any additional deployments

**Security Note:** This is acceptable because authentication is handled via JWT tokens in the `Authorization` header, not via cookies or credentials.

## Related Documentation

- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- CORS Specification: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- Railway Deployment: https://docs.railway.app/

## Support

If issues persist after deployment:

1. Check Supabase Edge Function logs for errors
2. Verify Edge Function version deployed correctly
3. Test CORS headers with curl command above
4. Contact Supabase support if Edge Function deployment fails

## Next Steps

After successful deployment:

1. ✅ Verify CORS fix works in production
2. ✅ Test application generation end-to-end
3. ✅ Monitor Edge Function performance and errors
4. 🔄 Consider setting up CI/CD for automatic Edge Function deployment
5. 🔄 Document Edge Function deployment in main deployment runbook
