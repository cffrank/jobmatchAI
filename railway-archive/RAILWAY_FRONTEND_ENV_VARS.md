# Railway Frontend Environment Variables Setup

## Required Environment Variables

The frontend service requires these environment variables to be set in Railway:

### Supabase Configuration

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**How to get these values:**
1. Go to your Supabase project dashboard
2. Click on "Project Settings" (gear icon)
3. Navigate to "API" section
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

### Backend API Configuration

```bash
VITE_BACKEND_URL=https://your-backend-service.up.railway.app
```

**How to get this value:**
1. Go to your Railway dashboard
2. Select your **backend** service (not frontend)
3. Go to "Settings" tab
4. Find "Domains" section
5. Copy the public domain (format: `https://xxx.up.railway.app`)
6. Set this as `VITE_BACKEND_URL` in your **frontend** service

## Setting Environment Variables in Railway

### Option 1: Railway Dashboard (Recommended)

1. Open your Railway project
2. Click on your **frontend** service
3. Go to "Variables" tab
4. Click "+ New Variable"
5. Add each variable:
   - Name: `VITE_SUPABASE_URL`
   - Value: `https://your-project.supabase.co`
6. Repeat for all variables
7. Click "Deploy" to rebuild with new variables

### Option 2: Railway CLI

```bash
# Set variables one by one
railway variables set VITE_SUPABASE_URL=https://your-project.supabase.co
railway variables set VITE_SUPABASE_ANON_KEY=your-anon-key-here
railway variables set VITE_BACKEND_URL=https://your-backend.up.railway.app

# Redeploy
railway up
```

## Important Notes

### VITE_ Prefix is Required

Vite only exposes environment variables that start with `VITE_` to the browser bundle. Variables without this prefix will not be available in the frontend code.

✅ Correct: `VITE_SUPABASE_URL`
❌ Incorrect: `SUPABASE_URL`

### Build-Time vs Runtime

**VITE_ variables are embedded at BUILD time**, not runtime. This means:

1. These values are **baked into** the JavaScript bundle during `npm run build`
2. Changing them requires a **rebuild**, not just a restart
3. They are **publicly visible** in the browser (never put secrets here!)

### Security Note

Only put **public/client-safe** values in `VITE_` variables:
- ✅ Supabase anon key (designed for browser use)
- ✅ API URLs
- ❌ Private API keys
- ❌ Database passwords
- ❌ Service secrets

## Verification

After setting variables and redeploying, verify they're working:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `import.meta.env.VITE_SUPABASE_URL`
4. Should show your Supabase URL

If it shows `undefined`, the variable wasn't set correctly during build.

## Troubleshooting

### "Missing Supabase environment variables" in console

**Cause**: VITE_ variables not set during Railway build
**Fix**: Add variables in Railway dashboard → redeploy

### "Failed to fetch" errors

**Cause**: `VITE_BACKEND_URL` incorrect or backend not running
**Fix**: Verify backend service is deployed and URL is correct

### Changes not taking effect

**Cause**: Railway caching old build
**Fix**:
1. Go to Railway dashboard
2. Click "Settings" → "Redeploy"
3. Or push a new commit to trigger rebuild
