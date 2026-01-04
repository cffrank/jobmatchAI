# Cloudflare Pages - Development Environment Update

## Overview

This document provides step-by-step instructions for updating the Cloudflare Pages environment variables to point to the correct Supabase "development" branch.

**Branch Details:**
- Supabase Branch: `development` (created Dec 31, 2025)
- Project Ref: `vkstdibhypprasyiswny`
- Git Branch: `develop` (triggers deployment to "development" environment)

## Environment Variables to Update

The following environment variables need to be updated in the Cloudflare Pages dashboard:

### For Production Deployment (Preview & Production)

| Variable Name | Current Value | New Value |
|--------------|---------------|-----------|
| `VITE_SUPABASE_URL` | `https://vkstdibhypprasyiswny.supabase.co` | `https://vkstdibhypprasyiswny.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (old key) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrc3RkaWJoeXBwcmFzeWlzd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTE4NDAsImV4cCI6MjA4MjcyNzg0MH0.hPn1GVfmNAuHk3-VcqSw1khJChhSYZ5TRwePTUl553E` |
| `VITE_API_URL` | (unchanged) | Keep existing value |

**Note:** The Supabase URL remains the same (both "develop" and "development" branches used the same project ref). Only the anon key needs to be verified/updated.

## Step-by-Step Instructions

### 1. Access Cloudflare Pages Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account
3. Navigate to **Workers & Pages** in the left sidebar
4. Click on your **jobmatch-ai** project

### 2. Navigate to Environment Variables

1. In your project dashboard, click on the **Settings** tab
2. Scroll down to **Environment variables** section

### 3. Update Environment Variables

For each variable that needs updating:

1. **Locate the variable** in the list (e.g., `VITE_SUPABASE_ANON_KEY`)
2. Click the **Edit** button (pencil icon) next to the variable
3. **Update the value** with the new value from the table above
4. Select which environments to apply to:
   - ✅ **Production** (main branch deployments)
   - ✅ **Preview** (PR and branch deployments)
5. Click **Save**

### 4. Specific Variables to Update

#### VITE_SUPABASE_ANON_KEY

**New Value:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrc3RkaWJoeXBwcmFzeWlzd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTE4NDAsImV4cCI6MjA4MjcyNzg0MH0.hPn1GVfmNAuHk3-VcqSw1khJChhSYZ5TRwePTUl553E
```

**Apply to:** Production ✅, Preview ✅

#### VITE_SUPABASE_URL

**Verify it matches:**
```
https://vkstdibhypprasyiswny.supabase.co
```

**Apply to:** Production ✅, Preview ✅

### 5. Verify Other Required Variables

Ensure these variables are also set (do not change if already correct):

- `VITE_API_URL` - Should point to your Railway backend
- Any other custom environment variables your app requires

### 6. Trigger a New Deployment

After updating the environment variables:

1. **Option A - Automatic:** Push a commit to your `develop` branch
2. **Option B - Manual:** In Cloudflare Pages dashboard:
   - Go to the **Deployments** tab
   - Click **Create deployment**
   - Select branch and deploy

## Verification

After deployment completes:

1. Visit your Cloudflare Pages URL
2. Open browser DevTools → Network tab
3. Verify API calls are going to the correct Supabase URL
4. Test login functionality to ensure authentication works
5. Check that user data loads correctly

## Troubleshooting

### If login fails:
- Verify `VITE_SUPABASE_ANON_KEY` matches exactly (no extra spaces)
- Check browser console for CORS errors
- Verify Supabase "development" branch is active and healthy

### If data doesn't load:
- Verify `VITE_SUPABASE_URL` is correct
- Check Supabase dashboard → "development" branch → Database
- Verify RLS policies are properly configured

### If API calls fail:
- Check `VITE_API_URL` points to correct Railway backend
- Verify Railway backend has matching Supabase credentials
- Check Network tab for specific error messages

## Related Documentation

- **GitHub Secrets:** Already updated via `gh secret set` commands
- **Railway Backend:** Environment variables need separate update
- **Supabase Branch:** "development" branch is now the source of truth

## Important Notes

- The "develop" Supabase branch is being deleted (it was created in error)
- The "development" branch has existing user data from Dec 31, 2025
- Git branch `develop` → Supabase branch `development` (naming mismatch is intentional)
- Both GitHub Actions and Cloudflare Pages need environment variables updated
- **Manual update required** - Cloudflare Pages does not sync with GitHub secrets

---

**Last Updated:** January 2, 2026
**Supabase Project:** vkstdibhypprasyiswny
**Supabase Branch:** development
**Git Branch:** develop
