# Backend URL Configuration Fix

**Date**: 2025-12-28
**Issue**: Staging frontend connecting to `localhost:3000` instead of Cloudflare Workers backend
**Status**: ✅ Fixed and Redeployed

---

## Problem

The staging frontend was trying to connect to `http://localhost:3000` for the backend API instead of the deployed Cloudflare Workers URL (`https://jobmatch-ai-staging.carl-f-frank.workers.dev`).

### Error Message
```
POST http://localhost:3000/api/resume/parse net::ERR_CONNECTION_REFUSED
```

---

## Root Cause

**Vite Environment Variable Priority Issue**

Vite has a specific priority order for environment files during production builds:

1. `.env.production.local` (highest priority)
2. **`.env.local`** ← This was the culprit!
3. `.env.production`
4. `.env` (lowest priority)

The `.env.local` file contained:
```env
VITE_BACKEND_URL=http://localhost:3000
```

Even though we copied `.env.staging` to `.env` before building, the `.env.local` file had higher priority and overrode it during the production build (`npm run build`).

---

## Solution

### Steps Taken

1. **Identified the Override**:
   - Discovered `.env.local` was overriding the staging/production configs
   - Verified by checking the built JavaScript files

2. **Temporarily Disabled `.env.local`**:
   ```bash
   mv .env.local .env.local.backup
   ```

3. **Rebuilt Both Environments**:

   **Staging**:
   ```bash
   cp .env.staging .env
   rm -rf dist
   npm run build
   # Verified staging URL in build: ✅
   ```

   **Production**:
   ```bash
   cp .env.production.pages .env
   rm -rf dist
   npm run build
   # Verified production URL in build: ✅
   ```

4. **Redeployed to Cloudflare Pages**:
   - Staging: https://24e21d69.jobmatch-ai-staging.pages.dev
   - Production: https://17dcb509.jobmatch-ai-production.pages.dev

5. **Restored Local Dev Environment**:
   ```bash
   mv .env.local.backup .env.local
   ```

---

## Updated URLs

### Staging
- **Frontend**: https://jobmatch-ai-staging.pages.dev
- **New Deployment**: https://24e21d69.jobmatch-ai-staging.pages.dev
- **Backend API**: https://jobmatch-ai-staging.carl-f-frank.workers.dev
- **Status**: ✅ 200 OK

### Production
- **Frontend**: https://jobmatch-ai-production.pages.dev
- **New Deployment**: https://17dcb509.jobmatch-ai-production.pages.dev
- **Backend API**: https://jobmatch-ai-prod.carl-f-frank.workers.dev
- **Status**: ✅ 200 OK

---

## Prevention Strategy

### For Future Builds

To avoid this issue when building for deployment, always:

1. **Option A: Rename `.env.local` temporarily**:
   ```bash
   mv .env.local .env.local.backup
   cp .env.staging .env
   npm run build
   mv .env.local.backup .env.local
   ```

2. **Option B: Use explicit environment mode**:
   ```bash
   # For staging
   vite build --mode staging

   # For production
   vite build --mode production
   ```
   This requires creating `.env.staging` and `.env.production` files.

3. **Option C: Use `.env.production` instead of `.env.local`**:
   - Keep `.env.local` for local development only
   - Use `.env.production` for production builds (higher priority)

### Recommended Approach

**Keep the current structure** with these files:
- `.env.local` - Local development (localhost:3000)
- `.env.staging` - Staging builds
- `.env.production.pages` - Production builds

**Always rename `.env.local` before building for deployment**.

---

## Environment File Structure

```
.env.local              # Local dev (localhost:3000) - HIGHEST PRIORITY during builds
.env.staging            # Staging config (Workers staging backend)
.env.production.pages   # Production config (Workers production backend)
.env.cloudflare         # Template file
.env.example            # Template file
```

---

## Verification

### Check Build Output

After building, verify the correct backend URL is in the bundle:

```bash
# Staging
grep "jobmatch-ai-staging.carl-f-frank.workers.dev" dist/assets/index-*.js

# Production
grep "jobmatch-ai-prod.carl-f-frank.workers.dev" dist/assets/index-*.js
```

If the URL is NOT found, the wrong environment file was used.

---

## Testing

### Manual Test After Deployment

1. Open browser DevTools (F12)
2. Navigate to staging/production URL
3. Try uploading a resume
4. Check Network tab - should see requests to Workers backend (NOT localhost)

### Expected Behavior

**Staging**:
```
POST https://jobmatch-ai-staging.carl-f-frank.workers.dev/api/resume/parse
```

**Production**:
```
POST https://jobmatch-ai-prod.carl-f-frank.workers.dev/api/resume/parse
```

---

## Impact

- ✅ Staging frontend now correctly connects to staging Workers backend
- ✅ Production frontend now correctly connects to production Workers backend
- ✅ Resume upload and parsing features now functional
- ✅ All API endpoints working as expected
- ✅ Local development environment preserved (`.env.local` restored)

---

## Related Files

- `/home/carl/application-tracking/jobmatch-ai/.env.staging`
- `/home/carl/application-tracking/jobmatch-ai/.env.production.pages`
- `/home/carl/application-tracking/jobmatch-ai/.env.local` (local dev only)
- `/home/carl/application-tracking/jobmatch-ai/src/hooks/useResumeParser.ts` (where backend URL is used)

---

## Key Takeaway

**Vite's `.env.local` file ALWAYS takes precedence during production builds, even if you copy a different `.env` file.** Always rename or remove `.env.local` when building for deployment to ensure the correct environment variables are used.
