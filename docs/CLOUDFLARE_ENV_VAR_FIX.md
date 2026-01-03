# Cloudflare Pages Environment Variable Fix

**Issue**: Frontend is connecting to `localhost:8787` instead of deployed Workers URL
**Root Cause**: Environment variable name mismatch
**Status**: ⚠️ Requires manual action in Cloudflare dashboard

---

## Problem Summary

The codebase was migrated from Railway to Cloudflare Workers, which included updating the environment variable name:
- **Old name**: `VITE_BACKEND_URL` (Railway era)
- **New name**: `VITE_API_URL` (Cloudflare era)

**What's happening**:
1. ✅ Code looks for `VITE_API_URL`
2. ✅ GitHub Actions sets `VITE_API_URL` during build
3. ❌ Cloudflare Pages still has `VITE_BACKEND_URL` configured
4. ❌ When `VITE_API_URL` is undefined, code falls back to `localhost:8787`

**Error symptoms**:
```javascript
localhost:8787/api/profile/work-experience:1  Failed to load resource: net::ERR_CONNECTION_REFUSED
localhost:8787/api/profile/education:1  Failed to load resource: net::ERR_CONNECTION_REFUSED
localhost:8787/api/skills:1  Failed to load resource: net::ERR_CONNECTION_REFUSED
```

---

## Solution: Update Cloudflare Pages Environment Variable

### Option 1: Cloudflare Dashboard (Recommended)

**Step 1**: Navigate to Cloudflare Pages
- Go to: https://dash.cloudflare.com/
- Navigate to: **Workers & Pages** → **jobmatch-ai**

**Step 2**: Open Environment Variables
- Click: **Settings** → **Environment Variables**

**Step 3**: Update Production Environment
1. Find the variable: `VITE_BACKEND_URL`
2. Click the **Edit** button (pencil icon)
3. Change **Variable name** from `VITE_BACKEND_URL` to `VITE_API_URL`
4. Keep **Value** as: `https://jobmatch-ai-dev.carl-f-frank.workers.dev`
5. Click **Save**

**Step 4**: Update Preview Environment (if exists)
1. Switch to **Preview** tab
2. Repeat the same steps
3. Change name to: `VITE_API_URL`
4. Click **Save**

**Step 5**: Redeploy
- Push any commit to trigger a new deployment
- OR manually trigger: **Deployments** → **View build** → **Retry deployment**

### Option 2: Quick Reference Script

Run the helper script for instructions:
```bash
./scripts/fix-cloudflare-env-vars.sh
```

---

## Environment Variable Values

Ensure these values are set for each environment:

### Development (develop branch)
```
VITE_API_URL=https://jobmatch-ai-dev.carl-f-frank.workers.dev
VITE_SUPABASE_URL=https://wpupbucinufbaiphwogc.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_h6erYLL-Ye6oD7pNyWLGBw_GYbxQ4OA
VITE_USE_WORKERS_API=true
VITE_CLOUDFLARE_PAGES=true
```

### Staging (staging branch)
```
VITE_API_URL=https://jobmatch-ai-staging.carl-f-frank.workers.dev
VITE_SUPABASE_URL=https://wpupbucinufbaiphwogc.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_h6erYLL-Ye6oD7pNyWLGBw_GYbxQ4OA
VITE_USE_WORKERS_API=true
VITE_CLOUDFLARE_PAGES=true
```

### Production (main branch)
```
VITE_API_URL=https://jobmatch-ai-prod.carl-f-frank.workers.dev
VITE_SUPABASE_URL=https://wpupbucinufbaiphwogc.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_h6erYLL-Ye6oD7pNyWLGBw_GYbxQ4OA
VITE_USE_WORKERS_API=true
VITE_CLOUDFLARE_PAGES=true
```

---

## Verification

### Before Fix
```javascript
// Browser console shows:
import.meta.env.VITE_API_URL // undefined
import.meta.env.VITE_BACKEND_URL // https://jobmatch-ai-dev.carl-f-frank.workers.dev
// Result: Falls back to localhost:8787
```

### After Fix
```javascript
// Browser console shows:
import.meta.env.VITE_API_URL // https://jobmatch-ai-dev.carl-f-frank.workers.dev
import.meta.env.VITE_BACKEND_URL // undefined (no longer used)
// Result: Connects to deployed Workers URL ✅
```

### Testing Steps

1. **Deploy with updated env var**
   ```bash
   git commit --allow-empty -m "test: trigger deployment"
   git push origin develop
   ```

2. **Wait for deployment** (~2 minutes)
   - Monitor: https://github.com/cffrank/jobmatchAI/actions

3. **Open deployed site**
   - URL: https://jobmatch-ai-dev.pages.dev

4. **Open browser console** (F12)
   - Check Network tab
   - Login to the application
   - Verify API calls go to `jobmatch-ai-dev.carl-f-frank.workers.dev`
   - Should see **NO** calls to `localhost:8787`

5. **Check profile page loads**
   - Navigate to profile/settings
   - Verify work experience, education, skills load
   - Should see **NO** 404 errors

---

## Why This Happened

### Timeline

1. **Dec 31, 2025**: Railway migration began
   - Code used `VITE_BACKEND_URL` to connect to Railway backend

2. **Jan 1, 2026**: Migrated to Cloudflare Workers
   - Updated code to use `VITE_API_URL` (commit b8f8f10)
   - Updated GitHub Actions to set `VITE_API_URL` (commit b0c5d37)
   - ❌ **Forgot to update Cloudflare Pages dashboard env vars**

3. **Jan 2, 2026**: Issue discovered
   - Frontend falling back to localhost in production
   - This document created to fix the issue

### Cloudflare Pages Environment Variables

Cloudflare Pages has **two sources** of environment variables:

1. **Build-time** (GitHub Actions): Set via `wrangler pages deploy --env`
   - ✅ Already fixed in workflow

2. **Project-level** (Cloudflare Dashboard): Set in Pages project settings
   - ⚠️ **Needs manual update** (this fix)

**Why manual?**
- Cloudflare Pages doesn't expose API for renaming env vars
- Must use dashboard UI to rename existing variables
- This is by design for security and audit trail

---

## Alternative: Add Both Variables (Not Recommended)

You could set both `VITE_API_URL` AND keep `VITE_BACKEND_URL`:

**Pros**:
- Quick fix, no renaming needed
- Backward compatible

**Cons**:
- ❌ Confusing to have two variables for same thing
- ❌ Risk of them getting out of sync
- ❌ Leaves technical debt

**Recommendation**: Just rename the variable. It's cleaner and prevents future confusion.

---

## Related Documentation

- `docs/DEPLOYMENT_FIX_SUMMARY.md` - Complete deployment fix details
- `.github/workflows/cloudflare-deploy.yml` - Build-time env var configuration
- `src/lib/aiGenerator.ts` - Example of VITE_API_URL usage
- `src/lib/exportApplication.ts` - Example of VITE_API_URL usage

---

## Troubleshooting

### "I updated the env var but it's still using localhost"

**Cause**: Old build is cached

**Fix**: Trigger a fresh deployment
```bash
git commit --allow-empty -m "chore: trigger fresh deployment"
git push origin develop
```

### "I don't see VITE_BACKEND_URL in my dashboard"

**Check**: You might be looking at the wrong project or environment
- Verify project name: `jobmatch-ai`
- Check both Production and Preview tabs
- Look under Settings → Environment Variables

### "The edit button is greyed out"

**Cause**: You don't have edit permissions

**Fix**: Contact the Cloudflare account owner to:
- Grant you editor access
- OR ask them to make the change

---

## Summary

**What to do**:
1. Go to Cloudflare Dashboard → jobmatch-ai → Settings → Environment Variables
2. Rename `VITE_BACKEND_URL` to `VITE_API_URL` (keep same value)
3. Save and redeploy
4. Test at https://jobmatch-ai-dev.pages.dev

**Expected result**:
- ✅ No more localhost connections
- ✅ No more 404 errors
- ✅ Profile page loads correctly
- ✅ All API calls go to deployed Workers URL

**Time required**: 2 minutes to update + 2 minutes to deploy = 4 minutes total

---

**Status**: Ready to implement
**Priority**: High (blocks development deployment)
**Effort**: Low (simple rename in dashboard)
