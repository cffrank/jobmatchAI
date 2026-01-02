# Railway Environment Variables Debug Checklist

## Problem
Frontend still showing `placeholder.supabase.co` even after setting environment variables.

## Root Cause Analysis

### Why This Happens
Vite environment variables (VITE_*) are **build-time only**. They are:
1. Read during `npm run build`
2. Baked into the JavaScript bundle
3. **NOT** read at runtime

If the build runs **before** you set the variables, the bundle has placeholder values.

---

## Verification Steps

### Step 1: Verify Variables Are Actually Set in Railway

1. **Go to Railway Dashboard**
2. **Select FRONTEND service** (not backend!)
3. **Click "Variables" tab**
4. **Verify these EXACT names:**
   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   ```

### Step 2: Check Variable Values

**VITE_SUPABASE_URL should be:**
```
https://lrzhpnsykasqrousgmdh.supabase.co
```

**VITE_SUPABASE_ANON_KEY should be:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemhwbnN5a2FzcXJvdXNnbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTkxMDcsImV4cCI6MjA4MTgzNTEwN30.aKqsPCJb-EwkYeuD1Zmv_FXQUyKLEEG5pXIKEiSX9ZE
```

### Step 3: Check Deployment Logs

1. **Go to Deployments tab** in Railway
2. **Click on latest deployment**
3. **Look for build logs**
4. **Search for:** `Building for production`
5. **Verify it runs AFTER you set the variables**

---

## Common Issues

### Issue 1: Variables Set in Wrong Service
❌ **Wrong:** Setting VITE_* variables in **backend** service
✅ **Correct:** Setting VITE_* variables in **frontend** service

### Issue 2: Typo in Variable Names
❌ **Wrong:** `VITE_SUPABASE_URl` (lowercase L)
✅ **Correct:** `VITE_SUPABASE_URL` (uppercase L)

### Issue 3: Variables Set But Not Deployed
- Setting variables **doesn't auto-redeploy**
- You must manually trigger redeploy

### Issue 4: Browser Cache
Even after correct build, browser may cache old JavaScript files.

---

## Solution: Force Complete Rebuild

### Option 1: Delete and Re-add Variables

1. **Go to Railway → Frontend → Variables**
2. **Delete** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. **Wait 5 seconds**
4. **Add them back** with correct values:
   ```bash
   VITE_SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemhwbnN5a2FzcXJvdXNnbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTkxMDcsImV4cCI6MjA4MTgzNTEwN30.aKqsPCJb-EwkYeuD1Zmv_FXQUyKLEEG5pXIKEiSX9ZE
   ```
5. **This should auto-trigger a redeploy**

### Option 2: Manual Redeploy

1. **Go to Railway → Frontend → Deployments**
2. **Click ⋮ on latest deployment**
3. **Click "Redeploy"**
4. **Watch build logs** to verify it completes

### Option 3: Git Push (If connected to GitHub)

```bash
cd /home/carl/application-tracking/jobmatch-ai
git commit --allow-empty -m "Force rebuild with env vars"
git push
```

---

## Verification After Rebuild

### Test 1: Check Build Logs

Look for these lines in Railway deployment logs:
```
vite v7.x.x building for production...
transforming...
✓ xxxx modules transformed.
rendering chunks...
dist/index.html  x.xx kB
dist/assets/index-xxxxxxxx.js  xxx.xx kB
✓ built in xxxs
```

### Test 2: Browser DevTools

1. **Clear all browser cache:**
   - Chrome: Ctrl+Shift+Delete → "Cached images and files" → Clear data
   - Firefox: Ctrl+Shift+Delete → "Cache" → Clear Now

2. **Open your Railway frontend URL**

3. **Open DevTools Console (F12)**

4. **Look for error:**
   - ❌ **Still broken:** `❌ Missing Supabase environment variables!`
   - ✅ **Fixed:** No error message about missing variables

5. **Check Network tab:**
   - Filter: `supabase`
   - Try to sign up
   - ❌ **Still broken:** POST to `placeholder.supabase.co`
   - ✅ **Fixed:** POST to `lrzhpnsykasqrousgmdh.supabase.co`

### Test 3: View Bundle Source

1. **In DevTools, go to Sources tab**
2. **Find:** `index-xxxxxxxx.js` (the main bundle)
3. **Search for:** `placeholder.supabase.co`
   - ❌ **Still broken:** Found in code
   - ✅ **Fixed:** Not found (should see real URL instead)

---

## Nuclear Option: Rebuild from Scratch

If nothing works, redeploy the service from scratch:

1. **In Railway Dashboard → Frontend service**
2. **Settings tab → Scroll to bottom**
3. **"Remove Service from Project"** (⚠️ This deletes the service)
4. **Create new service:**
   - Click "New" → "GitHub Repo"
   - Select your repository
   - Set **Root Directory** to `/` (or leave blank for project root)
   - Add environment variables **BEFORE first deployment:**
     ```bash
     VITE_SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemhwbnN5a2FzcXJvdXNnbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTkxMDcsImV4cCI6MjA4MTgzNTEwN30.aKqsPCJb-EwkYeuD1Zmv_FXQUyKLEEG5pXIKEiSX9ZE
     ```
5. **Deploy**

---

## Screenshot Your Railway Variables

Take a screenshot of your Railway frontend service variables page and share it. This will help verify:
1. Correct service (frontend vs backend)
2. Correct variable names (VITE_ prefix)
3. Correct values (no typos)

---

## Expected Result

After correct rebuild, the console should show **ZERO errors** about missing environment variables, and signup should POST to `https://lrzhpnsykasqrousgmdh.supabase.co/auth/v1/signup`.
