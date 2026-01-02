# Supabase Branch Switch Summary

**Date:** January 2, 2026

## Problem
The application was configured to use the wrong Supabase development branch:
- **Incorrect branch:** "develop" (`reydhyovetjupyxhfayo`) - Created Jan 2, 2026 - **0 users**
- **Correct branch:** "development" (`vkstdibhypprasyiswny`) - Created Dec 31, 2025 - **101 users**

## Investigation Results

Queried `auth.users` table in both branches:
- `reydhyovetjupyxhfayo` (develop): **0 users** ❌
- `vkstdibhypprasyiswny` (development): **101 users** ✅

## Changes Made

### 1. GitHub Secrets Updated
Updated repository secrets to point to the correct "development" branch:

```bash
SUPABASE_URL: https://vkstdibhypprasyiswny.supabase.co
SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Updated at: 2026-01-02T05:28:29Z

### 2. Local Environment Files Updated

**Frontend (`/home/carl/application-tracking/jobmatch-ai/.env.local`):**
```env
VITE_SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Backend (`/home/carl/application-tracking/jobmatch-ai/backend/.env`):**
```env
SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=NEEDS_UPDATE_FROM_SUPABASE_DASHBOARD
```

### 3. Deployment Status

A deployment is already in progress (triggered at 2026-01-02T05:26:06Z):
- ✅ Cloudflare deployment: Success
- 🔄 Post-Deployment E2E Tests: In progress

## Action Required

**Manual step needed:** Update the `SUPABASE_SERVICE_ROLE_KEY` in:
1. GitHub repository secret
2. Local backend `.env` file

**How to get the service role key:**
1. Visit Supabase Dashboard: https://supabase.com/dashboard/project/vkstdibhypprasyiswny/settings/api
2. Copy the "service_role" secret key (starts with `sb_secret_...`)
3. Update both locations

**Update GitHub secret:**
```bash
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "YOUR_SERVICE_ROLE_KEY" --repo cffrank/jobmatchAI
```

**Update local file:**
```bash
# Edit backend/.env and replace NEEDS_UPDATE_FROM_SUPABASE_DASHBOARD with actual key
```

## Branch Details

### Development Branch (vkstdibhypprasyiswny) - NOW ACTIVE
- **Project Ref:** vkstdibhypprasyiswny
- **URL:** https://vkstdibhypprasyiswny.supabase.co
- **Users:** 101
- **Created:** 2025-12-31T15:33:47Z
- **Status:** ACTIVE_HEALTHY
- **Migrations:** MIGRATIONS_FAILED (needs investigation)

### Develop Branch (reydhyovetjupyxhfayo) - DEPRECATED
- **Project Ref:** reydhyovetjupyxhfayo
- **URL:** https://reydhyovetjupyxhfayo.supabase.co
- **Users:** 0
- **Created:** 2026-01-02T00:23:58Z
- **Status:** ACTIVE_HEALTHY
- **Migrations:** MIGRATIONS_FAILED
- **Note:** This branch can potentially be deleted since it has no data

### Main Branch (lrzhpnsykasqrousgmdh) - PRODUCTION
- **Project Ref:** lrzhpnsykasqrousgmdh
- **URL:** https://lrzhpnsykasqrousgmdh.supabase.co
- **Status:** ACTIVE_HEALTHY
- **Migrations:** FUNCTIONS_DEPLOYED

### Staging Branch (xxnimtkqdfnvppdqmmuc)
- **Project Ref:** xxnimtkqdfnvppdqmmuc
- **Status:** ACTIVE_HEALTHY
- **Migrations:** MIGRATIONS_FAILED

## Next Steps

1. ✅ **Completed:** Switch to development branch with 101 users
2. ✅ **Completed:** Update GitHub secrets
3. ✅ **Completed:** Update local environment files
4. ⏳ **In Progress:** Deployment and E2E tests
5. ⚠️ **Action Required:** Update SUPABASE_SERVICE_ROLE_KEY manually
6. 🔍 **Recommended:** Investigate "MIGRATIONS_FAILED" status on development branch
7. 🧹 **Optional:** Delete the empty "develop" branch (reydhyovetjupyxhfayo) to avoid confusion

## Verification

After deployment completes, verify the switch was successful:
1. Check login functionality with existing users
2. Verify user count is 101 (not 0)
3. Test creating new applications and jobs
4. Confirm profile data is accessible

## References

- Development branch dashboard: https://supabase.com/dashboard/project/vkstdibhypprasyiswny
- GitHub repository: https://github.com/cffrank/jobmatchAI
- Deployment workflows: https://github.com/cffrank/jobmatchAI/actions
