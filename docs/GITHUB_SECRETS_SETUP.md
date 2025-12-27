# GitHub Secrets Setup for Supabase Migration

**Date:** 2025-12-24
**Status:** Action Required - Missing Supabase Secrets

---

## Problem

GitHub Actions workflows are using **Firebase secrets** but the app has migrated to **Supabase**. Tests are falling back to mock/local values because production Supabase secrets are missing.

## Current State

### ✅ Secrets Already Configured
- `RAILWAY_TOKEN` - Railway deployment (just added)
- `FIREBASE_SERVICE_ACCOUNT` - Legacy, still used by cost-monitoring
- `VITE_FIREBASE_*` (6 secrets) - Legacy, no longer needed

### ❌ Missing Secrets (Required)
- `SUPABASE_URL` - Production Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key for client-side
- `SUPABASE_SERVICE_ROLE_KEY` - Admin key for backend operations

---

## Step-by-Step Fix

### Option 1: Use GitHub CLI (Fastest)

```bash
# Navigate to project root
cd /home/carl/application-tracking/jobmatch-ai

# Add Supabase URL
gh secret set SUPABASE_URL --body "https://lrzhpnsykasqrousgmdh.supabase.co"

# Add Supabase Anon Key (public key - safe for frontend)
gh secret set SUPABASE_ANON_KEY --body "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemhwbnN5a2FzcXJvdXNnbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTkxMDcsImV4cCI6MjA4MTgzNTEwN30.aKqsPCJb-EwkYeuD1Zmv_FXQUyKLEEG5pXIKEiSX9ZE"

# Add Supabase Service Role Key (⚠️ ADMIN KEY - keep secret!)
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "sb_secret_gg4QrTYInH96FqySfouuKA_1bH0Fj6u"

# Verify secrets were added
gh secret list
```

### Option 2: Use GitHub Web UI

1. Go to: https://github.com/cffrank/jobmatchAI/settings/secrets/actions

2. Click **"New repository secret"**

3. Add each secret:

   **Secret 1: SUPABASE_URL**
   ```
   Name: SUPABASE_URL
   Value: https://lrzhpnsykasqrousgmdh.supabase.co
   ```

   **Secret 2: SUPABASE_ANON_KEY**
   ```
   Name: SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemhwbnN5a2FzcXJvdXNnbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTkxMDcsImV4cCI6MjA4MTgzNTEwN30.aKqsPCJb-EwkYeuD1Zmv_FXQUyKLEEG5pXIKEiSX9ZE
   ```

   **Secret 3: SUPABASE_SERVICE_ROLE_KEY**
   ```
   Name: SUPABASE_SERVICE_ROLE_KEY
   Value: sb_secret_gg4QrTYInH96FqySfouuKA_1bH0Fj6u
   ```

---

## Verification

After adding secrets:

```bash
# 1. Check secrets were added
gh secret list

# Expected output:
# FIREBASE_SERVICE_ACCOUNT
# RAILWAY_TOKEN
# SUPABASE_ANON_KEY          <- NEW
# SUPABASE_SERVICE_ROLE_KEY  <- NEW
# SUPABASE_URL               <- NEW
# VITE_FIREBASE_API_KEY
# VITE_FIREBASE_APP_ID
# VITE_FIREBASE_AUTH_DOMAIN
# VITE_FIREBASE_MESSAGING_SENDER_ID
# VITE_FIREBASE_PROJECT_ID
# VITE_FIREBASE_STORAGE_BUCKET

# 2. Trigger GitHub Actions to test
git commit --allow-empty -m "test: verify Supabase secrets configuration"
git push origin develop

# 3. Watch the test run
gh run watch
```

---

## What Each Secret Does

### SUPABASE_URL
- **Used by:** Backend tests, frontend build, E2E tests
- **Purpose:** Points to your production Supabase instance
- **Security:** Public (safe to expose in frontend)
- **Workflow usage:**
  ```yaml
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  ```

### SUPABASE_ANON_KEY
- **Used by:** Frontend builds, backend tests, E2E tests
- **Purpose:** Public API key for client-side Supabase operations
- **Security:** Public (safe to expose, respects RLS policies)
- **Workflow usage:**
  ```yaml
  env:
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  ```

### SUPABASE_SERVICE_ROLE_KEY
- **Used by:** Backend tests only (admin operations)
- **Purpose:** Bypasses Row Level Security for admin tasks
- **Security:** ⚠️ **SECRET** - Full admin access, never expose in frontend!
- **Workflow usage:**
  ```yaml
  env:
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  ```

---

## Cleanup (Optional - After Verification)

Once Supabase secrets are working, you can remove Firebase secrets:

```bash
# Delete Firebase frontend secrets (no longer used)
gh secret delete VITE_FIREBASE_API_KEY
gh secret delete VITE_FIREBASE_APP_ID
gh secret delete VITE_FIREBASE_AUTH_DOMAIN
gh secret delete VITE_FIREBASE_MESSAGING_SENDER_ID
gh secret delete VITE_FIREBASE_PROJECT_ID
gh secret delete VITE_FIREBASE_STORAGE_BUCKET

# Note: Keep FIREBASE_SERVICE_ACCOUNT until cost-monitoring is migrated
```

---

## Impact After Adding Secrets

### Before (Current)
- ❌ Tests use mock Supabase (`http://localhost:54321`)
- ❌ Frontend builds use fallback test values
- ❌ Cannot test against production Supabase from CI/CD
- ⚠️ E2E tests may fail due to missing auth

### After (With Secrets)
- ✅ Tests use production Supabase instance
- ✅ Frontend builds with real configuration
- ✅ E2E tests can authenticate properly
- ✅ Full integration testing against real backend

---

## Troubleshooting

### Issue: "gh: command not found"
**Solution:** Use the GitHub Web UI (Option 2 above)

### Issue: Secrets not showing up
**Solution:** Secrets are write-only via API. Use `gh secret list` to verify names.

### Issue: Tests still failing after adding secrets
**Solution:**
1. Check secret names match exactly (case-sensitive)
2. Verify Supabase project is accessible
3. Check RLS policies allow test operations
4. Review GitHub Actions logs for specific errors

---

## Related Documentation

- Supabase Dashboard: https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh
- Railway Dashboard: https://railway.app/dashboard
- GitHub Secrets: https://github.com/cffrank/jobmatchAI/settings/secrets/actions
- Test Workflow: `.github/workflows/test.yml`

---

## Next Steps

1. ✅ Add RAILWAY_TOKEN (already done)
2. ⏳ Add SUPABASE_URL (follow Option 1 or 2 above)
3. ⏳ Add SUPABASE_ANON_KEY
4. ⏳ Add SUPABASE_SERVICE_ROLE_KEY
5. ⏳ Verify with test run
6. ⏳ Clean up Firebase secrets (optional)
