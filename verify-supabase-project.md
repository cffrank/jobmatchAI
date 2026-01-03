# Supabase Project ID Mismatch - Root Cause Analysis

## Problem Summary

The deployed Cloudflare Workers were returning 401 Unauthorized errors for authenticated requests because **the frontend and backend were configured with different Supabase project IDs**.

## Root Cause

### Frontend Configuration (WRONG - Typo)
- **File:** `.env.development`
- **Project ID:** `vkstd**lb**hypprasywny` (typo: **lb** instead of **ib**)
- **URL:** `https://vkstdlbhypprasywny.supabase.co`

### Backend Configuration (CORRECT)
- **File:** `workers/.dev.vars`
- **Project ID:** `vkstd**ib**hypprasyiswny` (correct)
- **URL:** `https://vkstdibhypprasyiswny.supabase.co`

## Impact

1. Frontend authenticates users against **wrong Supabase project** (`...lb...`)
2. JWT tokens issued by wrong project contain incorrect `iss` (issuer) claim
3. Workers validate tokens against **correct project** (`...ib...`)
4. Validation fails → 401 Unauthorized errors
5. No sessions created in KV (authentication fails before session creation)

## Fix Applied

### Local Development
✅ **Updated `.env.development`**
- Changed: `vkstdlbhypprasywny` → `vkstdibhypprasyiswny`
- Updated anon key to match correct project

### Still Required

1. **Cloudflare Pages Environment Variables** (Development)
   - Update `VITE_SUPABASE_URL` to `https://vkstdibhypprasyiswny.supabase.co`
   - Update `VITE_SUPABASE_ANON_KEY` to correct key for `vkstdibhypprasyiswny` project

2. **Redeploy Frontend**
   - Cloudflare Pages will automatically redeploy on push to `develop` branch
   - Environment variables take effect immediately after update

3. **Verify Workers Secrets** (Already deployed but verify values)
   - `SUPABASE_URL` should be `https://vkstdibhypprasyiswny.supabase.co`
   - `SUPABASE_ANON_KEY` should match correct project
   - `SUPABASE_SERVICE_ROLE_KEY` should match correct project

## Verification Steps

After deploying fixes:

1. **Test Authentication**
   ```bash
   # User logs in via frontend
   # Frontend should authenticate against vkstdibhypprasyiswny.supabase.co
   ```

2. **Test API Calls**
   ```bash
   curl -H "Authorization: Bearer <JWT_TOKEN>" \
     https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/profile
   # Should return 200 OK with user profile
   ```

3. **Verify Session Creation**
   - Check SESSIONS KV namespace in Cloudflare dashboard
   - Should see session keys created after successful auth

## Prevention

1. **Add validation to CI/CD**
   - Verify Supabase project IDs match across frontend and backend env files
   - Extract project ID from URLs and compare

2. **Use environment variable references**
   - Define project ID once, reference in multiple places
   - Prevents copy-paste typos

3. **Add health check endpoint**
   - Workers endpoint that returns configured Supabase project ID (dev only)
   - Allows quick verification without checking secrets

## Related Files

- `/home/carl/application-tracking/jobmatch-ai/.env.development` - Frontend config (FIXED)
- `/home/carl/application-tracking/jobmatch-ai/workers/.dev.vars` - Workers config (CORRECT)
- `/home/carl/application-tracking/jobmatch-ai/workers/api/middleware/auth.ts` - JWT validation logic
- `/home/carl/application-tracking/jobmatch-ai/workers/api/services/supabase.ts` - Supabase client creation

## Correct Project Details

- **Project ID:** `vkstdibhypprasyiswny`
- **Project URL:** `https://vkstdibhypprasyiswny.supabase.co`
- **Region:** US East (Northern Virginia)
- **Environment:** Development
