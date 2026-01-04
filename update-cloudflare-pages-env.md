# Update Cloudflare Pages Environment Variables

## Current Issue

Cloudflare Pages deployment has **wrong Supabase project ID** in environment variables:
- **Wrong:** `vkstdlbhypprasywny` (typo: `lb`)
- **Correct:** `vkstdibhypprasyiswny` (correct: `ib`)

## Steps to Fix

### Option 1: Cloudflare Dashboard (Recommended)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **jobmatch-ai-dev**
3. Go to **Settings** → **Environment Variables**
4. Update the following variables for **development** environment:

   ```
   VITE_SUPABASE_URL = https://vkstdibhypprasyiswny.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrc3RkaWJoeXBwcmFzeWlzd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTE4NDAsImV4cCI6MjA4MjcyNzg0MH0.hPn1GVfmNAuHk3-VcqSw1khJChhSYZ5TRwePTUl553E
   ```

5. Click **Save**
6. Trigger a new deployment:
   - Option A: Push to `develop` branch (automatic)
   - Option B: Go to **Deployments** → **Retry deployment**

### Option 2: Wrangler CLI

```bash
# Update environment variable for production deployment
wrangler pages project update jobmatch-ai-dev \
  --production-env VITE_SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co

# Note: Wrangler CLI may have limited support for Pages env vars
# Dashboard is more reliable for this operation
```

## Verification

After updating environment variables and redeploying:

1. **Check deployed frontend**
   ```bash
   # Open browser console on https://jobmatch-ai-dev.pages.dev
   # Check: localStorage or network requests should show vkstdibhypprasyiswny
   ```

2. **Test authentication flow**
   - Sign in via frontend
   - Verify JWT token works with Workers API
   - Check network tab for /api/profile request (should be 200 OK)

3. **Verify KV sessions**
   - Cloudflare Dashboard → KV → SESSIONS namespace (dev)
   - Should see session keys after successful login

## Related Documentation

- Local fix: `.env.development` (already updated)
- Workers secrets: Already correct (`vkstdibhypprasyiswny`)
- Root cause analysis: `verify-supabase-project.md`
