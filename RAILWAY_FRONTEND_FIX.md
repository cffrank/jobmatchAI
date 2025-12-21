# Fix Frontend Google Sign-In Issue

## Problem
Frontend is using `placeholder.supabase.co` instead of your actual Supabase URL.

## Root Cause
Environment variables are not set in Railway for the **frontend service**.

---

## Solution: Set Frontend Environment Variables in Railway

### Go to Railway Dashboard

1. **Open Railway Dashboard**: https://railway.app/dashboard
2. **Select your FRONTEND service** (not backend)
3. **Click "Variables" tab**
4. **Add these 2 critical variables:**

```bash
VITE_SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemhwbnN5a2FzcXJvdXNnbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTkxMDcsImV4cCI6MjA4MTgzNTEwN30.aKqsPCJb-EwkYeuD1Zmv_FXQUyKLEEG5pXIKEiSX9ZE
```

5. **Click "Deploy"** to trigger rebuild

---

## Important: Build-Time Variables

⚠️ **Critical:** Vite environment variables (VITE_*) are **build-time** variables, not runtime variables.

This means:
- Setting them in Railway will NOT affect the **already-built** app
- You need to **redeploy/rebuild** the frontend after setting them
- They get baked into the JavaScript bundle during `npm run build`

### How to Force Rebuild

**Option 1: Trigger Redeploy in Railway**
1. Go to frontend service → Deployments
2. Click "Redeploy" on the latest deployment

**Option 2: Push a Commit**
```bash
cd /home/carl/application-tracking/jobmatch-ai
git commit --allow-empty -m "Trigger rebuild with env vars"
git push
```

---

## Additional Frontend Variables (Optional but Recommended)

If you have a backend deployed, also add:

```bash
VITE_BACKEND_URL=https://your-backend-url.railway.app
```

Replace with your actual backend Railway URL.

---

## Verification Steps

After setting variables and redeploying:

1. **Open your Railway frontend URL**
2. **Click "Sign in with Google"**
3. **URL should now be:** `https://lrzhpnsykasqrousgmdh.supabase.co/auth/v1/authorize?provider=google...`
   - **NOT** `placeholder.supabase.co`

4. **If still seeing placeholder:**
   - Check variables are set in the **frontend service** (not backend)
   - Make sure you triggered a **rebuild** (not just restart)
   - Clear browser cache and try again

---

## Enable Google OAuth in Supabase (Next Step)

Once the URL is correct, you'll need to enable Google OAuth:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/auth/providers
2. **Click "Google" provider**
3. **Enable it and configure:**
   - Client ID (from Google Cloud Console)
   - Client Secret (from Google Cloud Console)
4. **Add redirect URLs:**
   - `https://lrzhpnsykasqrousgmdh.supabase.co/auth/v1/callback`
   - `https://jobmatchai-production.up.railway.app/auth/callback`

Let me know if you need help setting up Google OAuth credentials!
