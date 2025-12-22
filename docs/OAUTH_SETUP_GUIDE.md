# OAuth Setup Guide - Google & LinkedIn

## Overview

Your app already has Google and LinkedIn login buttons in the UI (`src/pages/LoginPage.tsx`) and the authentication logic is implemented (`src/contexts/AuthContext.tsx`). You just need to configure the OAuth providers in Supabase.

## Current Implementation Status

✅ **Frontend UI**: Google and LinkedIn buttons exist
✅ **Auth Logic**: `signInWithGoogle()` and `signInWithLinkedIn()` implemented
✅ **OAuth Callback**: `/auth/callback` route configured
❌ **Supabase Configuration**: Not yet configured (needs setup)

---

## Part 1: Google OAuth Setup

### Step 1: Create Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable **Google+ API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: "JobMatch AI"

5. Configure **Authorized redirect URIs**:
   ```
   https://lrzhpnsykasqrousgmdh.supabase.co/auth/v1/callback
   ```

6. Copy your credentials:
   - **Client ID**: `xxxxxx.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-xxxxxxxxxxxxx`

### Step 2: Configure in Supabase

1. Go to: https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/auth/providers
2. Find **Google** in the list
3. Enable Google provider
4. Paste your **Client ID**
5. Paste your **Client Secret**
6. Click **Save**

### Step 3: Test Google Login

1. Go to: https://jobmatchai-production.up.railway.app/login
2. Click "Continue with Google"
3. Should redirect to Google login
4. After login, should redirect back to your app

---

## Part 2: LinkedIn OAuth Setup

### Step 1: Create LinkedIn App

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Click "Create app"
3. Fill in app details:
   - **App name**: JobMatch AI
   - **LinkedIn Page**: (Select or create company page)
   - **App logo**: Upload logo
   - **Legal agreement**: Check the box

4. Go to "Auth" tab
5. Note your credentials:
   - **Client ID**: `xxxxxxxxxx`
   - **Client Secret**: `xxxxxxxxxxx`

6. Add **Authorized redirect URLs for your app**:
   ```
   https://lrzhpnsykasqrousgmdh.supabase.co/auth/v1/callback
   ```

7. Go to "Products" tab
8. Request access to "Sign In with LinkedIn using OpenID Connect"
   - Click "Request access"
   - Fill out the form
   - Wait for approval (usually instant for basic access)

### Step 2: Configure in Supabase

1. Go to: https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/auth/providers
2. Find **LinkedIn (OIDC)** in the list
3. Enable LinkedIn provider
4. Paste your **Client ID**
5. Paste your **Client Secret**
6. Click **Save**

### Step 3: Test LinkedIn Login

1. Go to: https://jobmatchai-production.up.railway.app/login
2. Click "Continue with LinkedIn"
3. Should redirect to LinkedIn login
4. After login, should redirect back to your app

---

## Important Notes

### Redirect URLs

Both providers MUST use this exact redirect URL:
```
https://lrzhpnsykasqrousgmdh.supabase.co/auth/v1/callback
```

**Not** your app URL! Supabase handles the OAuth callback and then redirects to your app.

### Email Verification

OAuth providers (Google, LinkedIn) auto-verify emails. Users who sign in via OAuth:
- ✅ Email is automatically verified
- ✅ No email confirmation required
- ✅ Skip email verification banner

This is handled in `src/components/ProtectedRoute.tsx`:
```typescript
const isOAuthUser = user.app_metadata?.provider === 'google' ||
                    user.app_metadata?.provider === 'linkedin_oidc' ||
                    user.app_metadata?.provider === 'linkedin'
```

### Site URL Configuration

Make sure your Supabase Site URL is set correctly:

1. Go to: https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/auth/url-configuration
2. Set **Site URL** to:
   ```
   https://jobmatchai-production.up.railway.app
   ```
3. Add **Redirect URLs**:
   ```
   https://jobmatchai-production.up.railway.app/**
   http://localhost:5173/**
   ```

### Testing Locally

For local development, also add these redirect URLs to Google/LinkedIn:
```
http://localhost:54321/auth/v1/callback
```

And update Supabase redirect URLs to include:
```
http://localhost:5173/**
```

---

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Check that the redirect URL in Google/LinkedIn exactly matches:
  `https://lrzhpnsykasqrousgmdh.supabase.co/auth/v1/callback`

### Error: "OAuth configuration error"
- Verify Client ID and Secret are correct in Supabase dashboard
- Make sure Google+ API is enabled
- Make sure LinkedIn "Sign In with LinkedIn using OpenID Connect" is approved

### User sees placeholder.supabase.co
- This should be fixed after the Dockerfile changes we made earlier
- Verify Railway environment variables are set
- Check that new deployment has correct bundle hash

### OAuth login succeeds but doesn't redirect
- Check Supabase Site URL is set to your Railway app URL
- Check that `/auth/callback` route exists and works

---

## Verification Checklist

After setup, verify these work:

- [ ] Google login button redirects to Google
- [ ] After Google auth, redirects back to app
- [ ] User is logged in after Google OAuth
- [ ] LinkedIn login button redirects to LinkedIn
- [ ] After LinkedIn auth, redirects back to app
- [ ] User is logged in after LinkedIn OAuth
- [ ] OAuth users don't see email verification banner
- [ ] User profile shows correct OAuth provider in database

---

## Database Check

After a user logs in with OAuth, verify in Supabase SQL Editor:

```sql
-- Check user was created with OAuth provider
SELECT
  id,
  email,
  raw_app_meta_data->>'provider' as provider,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE raw_app_meta_data->>'provider' IN ('google', 'linkedin_oidc')
ORDER BY created_at DESC
LIMIT 5;

-- Check public.users record was created
SELECT
  u.id,
  u.email,
  pu.display_name,
  pu.profile_image_url
FROM auth.users u
LEFT JOIN public.users pu ON u.id = pu.id
WHERE u.raw_app_meta_data->>'provider' IN ('google', 'linkedin_oidc')
ORDER BY u.created_at DESC
LIMIT 5;
```
