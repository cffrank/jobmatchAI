# Critical Environment Variable Checklist

⚠️ **IMPORTANT:** The following environment variable MUST be configured in Cloudflare Pages for the migration to work correctly.

---

## Required Configuration

### Cloudflare Pages Environment Variable

| Variable | Value (Development) | Value (Staging) | Value (Production) |
|----------|---------------------|-----------------|-------------------|
| `VITE_API_URL` | `https://jobmatch-ai-dev.carl-f-frank.workers.dev` | `https://jobmatch-ai-staging.carl-f-frank.workers.dev` | `https://jobmatch-ai-prod.carl-f-frank.workers.dev` |

---

## How to Configure

### Via Cloudflare Dashboard

1. Go to **Cloudflare Dashboard** → **Pages** → **jobmatch-ai-dev**
2. Click **Settings** → **Environment Variables**
3. Add variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://jobmatch-ai-dev.carl-f-frank.workers.dev`
   - **Environment:** Development (repeat for Staging/Production)
4. **Redeploy** the Pages site after adding the variable

### Via Wrangler CLI

```bash
# Development
wrangler pages env add VITE_API_URL \
  --value="https://jobmatch-ai-dev.carl-f-frank.workers.dev" \
  --project-name=jobmatch-ai-dev

# Staging
wrangler pages env add VITE_API_URL \
  --value="https://jobmatch-ai-staging.carl-f-frank.workers.dev" \
  --project-name=jobmatch-ai-staging

# Production
wrangler pages env add VITE_API_URL \
  --value="https://jobmatch-ai-prod.carl-f-frank.workers.dev" \
  --project-name=jobmatch-ai-production
```

---

## Why This Is Critical

### Without VITE_API_URL:
- ❌ Frontend calls fallback to `http://localhost:3000` or `http://localhost:8787`
- ❌ All API requests fail with CORS errors
- ❌ Migration endpoints unreachable
- ❌ Session creation fails → Login broken
- ❌ Security events not logged
- ❌ OAuth profile sync fails

### With VITE_API_URL:
- ✅ Frontend calls correct Workers backend
- ✅ Session management works (KV storage)
- ✅ Security events logged (D1 storage)
- ✅ OAuth profile sync functional (D1 storage)
- ✅ Zero Supabase DB violations

---

## Verification

After configuring the environment variable and redeploying:

### 1. Check Browser Console
Open https://jobmatch-ai-dev.pages.dev and look for:
```
[Security] Session created/updated: {sessionId: xxx, device: xxx, location: xxx}
[Security] Event logged: Login success
```

### 2. Check Network Tab
Filter by "workers.dev" and verify API calls go to:
```
https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/sessions
https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/security-events
https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/users/:userId/exists
```

### 3. Test Session Creation
1. Sign up for a new account
2. Check browser console for session logs
3. Verify no Supabase DB calls in Network tab (only Auth API allowed)

---

## Current Status

As of 2026-01-03:

| Environment | VITE_API_URL Configured? | Status |
|-------------|--------------------------|--------|
| Development | ⚠️ **NEEDS VERIFICATION** | Tests passing (may be using build-time var) |
| Staging | ⚠️ **NEEDS VERIFICATION** | Not tested |
| Production | ⚠️ **NEEDS VERIFICATION** | Not tested |

**Next Action:** Verify this environment variable is set in Cloudflare Pages dashboard for all three environments.

---

## Fallback Values in Code

If `VITE_API_URL` is not set, the following fallbacks are used:

| File | Fallback Value |
|------|---------------|
| `src/lib/config.ts` | `http://localhost:8787` |
| `src/lib/aiJobMatching.ts` | `http://localhost:3000` |
| `src/lib/jobQualityService.ts` | `http://localhost:3000` |
| `src/lib/securityService.ts` | `undefined` (will fail) |
| `src/lib/oauthProfileSync.ts` | `undefined` (will fail) |

⚠️ **Critical services (security, OAuth) will fail without VITE_API_URL configured!**

---

## Recommendation

**BEFORE deploying to production:**
1. Verify `VITE_API_URL` is configured in Cloudflare Pages for all environments
2. Redeploy Pages sites if variable was just added (environment vars are build-time)
3. Test login flow to confirm session creation works
4. Check Network tab to verify API calls go to Workers backend

**This is a deployment blocker!**
