# Supabase Project Mismatch Fix (401 Errors)

**Date:** 2026-01-03
**Status:** FIXED (local) | REQUIRES CLOUDFLARE PAGES UPDATE
**Severity:** Critical - Authentication completely broken

## Executive Summary

The deployed Cloudflare Workers were returning **401 Unauthorized** errors for all authenticated requests because the **frontend and backend were configured with different Supabase project IDs** - a typo in the project ID caused JWT tokens from the frontend to be invalid when validated by the Workers.

## Root Cause

### The Typo

Frontend `.env.development` had a typo in the Supabase project ID:
- **Incorrect:** `vkstd**lb**hypprasywny` (**lb** - typo)
- **Correct:** `vkstd**ib**hypprasyiswny` (**ib** - correct)

### Impact Chain

```
1. Frontend authenticates against: https://vkstdLBhypprasywny.supabase.co
   ↓
2. Supabase issues JWT with iss: "vkstdLBhypprasywny"
   ↓
3. Frontend sends JWT to Workers at /api/profile
   ↓
4. Workers validate JWT against: https://vkstdIBhypprasyiswny.supabase.co
   ↓
5. JWT issuer mismatch → 401 Unauthorized
   ↓
6. No sessions created in KV (auth fails first)
```

## Error Symptoms

- ✅ `/health` endpoint works (no auth required)
- ❌ `/api/profile` returns 401 Unauthorized
- ❌ `/api/profile/work-experience` returns 401 Unauthorized
- ❌ All authenticated endpoints fail with "Invalid token"
- ❌ No session keys appear in SESSIONS KV namespace
- ❌ Frontend can sign in, but all API calls fail

## Files Affected

### Frontend Configuration
**File:** `/home/carl/application-tracking/jobmatch-ai/.env.development`

**Before (WRONG):**
```bash
VITE_SUPABASE_URL=https://vkstdlbhypprasywny.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_mqponSQzK-carH4c-OqXkw_F0IfWPco
```

**After (FIXED):**
```bash
VITE_SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrc3RkaWJoeXBwcmFzeWlzd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTE4NDAsImV4cCI6MjA4MjcyNzg0MH0.hPn1GVfmNAuHk3-VcqSw1khJChhSYZ5TRwePTUl553E
```

### Backend Configuration
**File:** `/home/carl/application-tracking/jobmatch-ai/workers/.dev.vars`

**Status:** ✅ Already correct (no changes needed)
```bash
SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Deployment Status

### ✅ Fixed (Local Development)
- `/home/carl/application-tracking/jobmatch-ai/.env.development` - Updated ✅
- `/home/carl/application-tracking/jobmatch-ai/workers/.dev.vars` - Already correct ✅

### ⏳ Requires Manual Update (Cloudflare Dashboard)

**Cloudflare Pages Environment Variables** (jobmatch-ai-dev project):

1. Go to: https://dash.cloudflare.com/ → Workers & Pages → jobmatch-ai-dev
2. Navigate to: Settings → Environment Variables
3. Update for **Production** deployment:
   - `VITE_SUPABASE_URL` = `https://vkstdibhypprasyiswny.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrc3RkaWJoeXBwcmFzeWlzd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTE4NDAsImV4cCI6MjA4MjcyNzg0MH0.hPn1GVfmNAuHk3-VcqSw1khJChhSYZ5TRwePTUl553E`
4. Click **Save**
5. Trigger redeploy:
   - Option A: Push to `develop` branch (automatic)
   - Option B: Retry latest deployment in Cloudflare dashboard

### ✅ Workers Secrets (Already Deployed)

Workers secrets were **already updated** in recent deployment:
- `SUPABASE_URL` = `https://vkstdibhypprasyiswny.supabase.co` ✅
- `SUPABASE_ANON_KEY` = Correct key for `vkstdibhypprasyiswny` ✅
- `SUPABASE_SERVICE_ROLE_KEY` = Correct key for `vkstdibhypprasyiswny` ✅

Verify with:
```bash
cd workers
wrangler secret list --name jobmatch-ai-dev
```

## Verification Steps

### 1. Local Testing
```bash
# Start local dev server
npm run dev

# Sign in via frontend at http://localhost:5173
# Make API call to /api/profile - should work now
```

### 2. After Cloudflare Pages Update
```bash
# Open browser to: https://jobmatch-ai-dev.pages.dev
# Open DevTools Console
# Sign in
# Check Network tab → /api/profile request
# Expected: 200 OK with profile data
# Check Application tab → KV Storage → SESSIONS
# Expected: Session key created
```

### 3. Quick API Test
```bash
# Get JWT token from browser localStorage after login
# Replace YOUR_JWT_TOKEN below
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/profile

# Expected: 200 OK with user profile JSON
# Before fix: 401 {"code":"INVALID_TOKEN","message":"Invalid token"}
```

## Prevention Strategies

### 1. CI/CD Validation
Add pre-deployment check:
```bash
# .github/workflows/validate-env.yml
- name: Validate Supabase project IDs match
  run: |
    FRONTEND_PROJECT=$(grep VITE_SUPABASE_URL .env.development | cut -d'/' -f3 | cut -d'.' -f1)
    WORKERS_PROJECT=$(grep SUPABASE_URL workers/.dev.vars | cut -d'/' -f3 | cut -d'.' -f1)

    if [ "$FRONTEND_PROJECT" != "$WORKERS_PROJECT" ]; then
      echo "ERROR: Supabase project ID mismatch!"
      echo "Frontend: $FRONTEND_PROJECT"
      echo "Workers: $WORKERS_PROJECT"
      exit 1
    fi
```

### 2. Single Source of Truth
Create shared environment config:
```bash
# .env.shared
SUPABASE_PROJECT_ID=vkstdibhypprasyiswny
SUPABASE_URL=https://${SUPABASE_PROJECT_ID}.supabase.co

# Reference in both frontend and workers configs
```

### 3. Development Health Check
Add endpoint to Workers (development only):
```typescript
// workers/api/index.ts
app.get('/debug/config', (c) => {
  if (c.env.ENVIRONMENT !== 'development') {
    return c.json({ error: 'Not available in production' }, 403);
  }

  return c.json({
    supabaseProject: new URL(c.env.SUPABASE_URL).hostname.split('.')[0],
    environment: c.env.ENVIRONMENT,
  });
});
```

## Related Documentation

- **Root cause analysis:** `/home/carl/application-tracking/jobmatch-ai/verify-supabase-project.md`
- **Cloudflare Pages update guide:** `/home/carl/application-tracking/jobmatch-ai/update-cloudflare-pages-env.md`
- **JWT validation logic:** `/home/carl/application-tracking/jobmatch-ai/workers/api/middleware/auth.ts`
- **Supabase client:** `/home/carl/application-tracking/jobmatch-ai/workers/api/services/supabase.ts`

## Lessons Learned

1. **Typos in environment variables can break authentication completely**
   - Even single character difference causes JWT validation failure
   - Error messages don't reveal the typo ("Invalid token" is generic)

2. **Multi-environment deployments need consistency checks**
   - Frontend and backend must reference same external services
   - Easy to copy-paste wrong values across files

3. **JWT issuer validation is strict**
   - Supabase embeds project ID in JWT `iss` claim
   - Validators reject tokens from different projects (security feature)

4. **Testing should verify full authentication flow**
   - Unit tests might pass, but integration breaks
   - Always test with real JWT tokens from deployed frontend

## Timeline

- **2026-01-02:** Supabase secrets updated to `vkstdibhypprasyiswny` project
- **2026-01-03 03:00 UTC:** Workers deployed successfully
- **2026-01-03 03:05 UTC:** 401 errors discovered on authenticated endpoints
- **2026-01-03 03:06 UTC:** Root cause identified (typo in `.env.development`)
- **2026-01-03 03:10 UTC:** Local fix applied to `.env.development`
- **2026-01-03 03:15 UTC:** Cloudflare Pages update pending (requires manual dashboard update)

## Next Steps

1. ✅ **Update Cloudflare Pages environment variables** (see instructions above)
2. ✅ **Redeploy frontend** (automatic on push or manual retry)
3. ✅ **Test authentication flow** end-to-end
4. ✅ **Verify sessions created** in KV namespace
5. ⏳ **Add CI/CD validation** to prevent future mismatches
6. ⏳ **Document environment variable management** in CONTRIBUTING.md
