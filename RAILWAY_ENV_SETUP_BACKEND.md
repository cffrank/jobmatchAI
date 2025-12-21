# Railway Backend Environment Variables Setup

## Critical Issue
Your backend is crashing because **SUPABASE_URL** and other environment variables are not set in Railway.

## Required Variables (Set These in Railway)

### 1. Supabase Configuration (CRITICAL - Server Won't Start Without These)

```bash
SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemhwbnN5a2FzcXJvdXNnbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTkxMDcsImV4cCI6MjA4MTgzNTEwN30.aKqsPCJb-EwkYeuD1Zmv_FXQUyKLEEG5pXIKEiSX9ZE
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SERVICE_ROLE_KEY>
```

**How to Get Service Role Key:**
1. Go to https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/settings/api
2. Copy the **service_role** key (labeled "secret" - DO NOT share publicly)
3. Paste it as `SUPABASE_SERVICE_ROLE_KEY` in Railway

### 2. OpenAI Configuration (CRITICAL - Needed for AI features)

```bash
OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>
```

Get from: https://platform.openai.com/api-keys

### 3. Application Configuration (CRITICAL)

```bash
NODE_ENV=production
PORT=3000
APP_URL=<YOUR_RAILWAY_FRONTEND_URL>
```

**APP_URL Example:** `https://jobmatch-frontend-production.railway.app`

### 4. SendGrid (Optional - Only if using email features)

```bash
SENDGRID_API_KEY=<YOUR_SENDGRID_API_KEY>
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

Get from: https://app.sendgrid.com/settings/api_keys

### 5. LinkedIn OAuth (Optional - Only if using LinkedIn integration)

```bash
LINKEDIN_CLIENT_ID=<YOUR_LINKEDIN_CLIENT_ID>
LINKEDIN_CLIENT_SECRET=<YOUR_LINKEDIN_CLIENT_SECRET>
LINKEDIN_REDIRECT_URI=<YOUR_RAILWAY_BACKEND_URL>/api/auth/linkedin/callback
```

Get from: https://www.linkedin.com/developers/apps

### 6. Apify (Optional - Only if using job scraping)

```bash
APIFY_API_TOKEN=<YOUR_APIFY_TOKEN>
```

Get from: https://console.apify.com/account/integrations

---

## How to Set Variables in Railway

### Option 1: Railway Dashboard (Recommended)

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Select your backend service** (should be named something like "jobmatch-backend")
3. **Click "Variables" tab**
4. **Add each variable**:
   - Click "New Variable"
   - Enter variable name (e.g., `SUPABASE_URL`)
   - Enter value
   - Repeat for all required variables
5. **Click "Deploy"** to restart with new variables

### Option 2: Railway CLI (Faster for bulk)

```bash
# From your terminal (not through Claude)
cd /home/carl/application-tracking/jobmatch-ai/backend

railway login
railway link  # Select your backend service

# Set variables one by one
railway variables --set SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
railway variables --set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemhwbnN5a2FzcXJvdXNnbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTkxMDcsImV4cCI6MjA4MTgzNTEwN30.aKqsPCJb-EwkYeuD1Zmv_FXQUyKLEEG5pXIKEiSX9ZE
railway variables --set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
railway variables --set OPENAI_API_KEY=<your-openai-key>
railway variables --set NODE_ENV=production
railway variables --set PORT=3000
railway variables --set APP_URL=<your-frontend-url>

# Trigger redeploy
railway up
```

---

## Minimal Setup (To Just Get It Running)

If you want to get the backend running ASAP, set **only these 4 variables**:

```bash
SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemhwbnN5a2FzcXJvdXNnbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTkxMDcsImV4cCI6MjA4MTgzNTEwN30.aKqsPCJb-EwkYeuD1Zmv_FXQUyKLEEG5pXIKEiSX9ZE
SUPABASE_SERVICE_ROLE_KEY=<from-supabase-dashboard>
NODE_ENV=production
```

The server will start but some features won't work without other keys.

---

## Verification Steps

After setting variables:

1. **Check Railway Logs**:
   - Go to your backend service in Railway
   - Click "Deployments" tab
   - Click latest deployment
   - Look for: `JobMatch AI Backend Server` and `Health check: http://...`

2. **Test Health Endpoint**:
   ```bash
   curl https://your-backend-url.railway.app/health
   ```

   Should return:
   ```json
   {
     "status": "healthy",
     "timestamp": "...",
     "version": "1.0.0",
     "environment": "production"
   }
   ```

3. **If Still Failing**:
   - Check logs for specific missing variables
   - Verify no typos in variable names (they're case-sensitive)
   - Make sure service role key is the "secret" one, not "public"

---

## Troubleshooting

### Error: "SUPABASE_URL environment variable is not set"
- Make sure you set the variable in the **correct service** (backend, not frontend)
- Variable names are **case-sensitive** (`SUPABASE_URL` not `supabase_url`)
- Click "Deploy" after adding variables to restart the service

### Error: "SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
- Get from: https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/settings/api
- Use the **service_role** key (not the anon key)
- It should start with `eyJ...`

### Server Still Crashing
- Check Railway logs for the specific missing variable
- Set that variable and redeploy

---

## Next Steps

Once backend is healthy:
1. ✅ Backend health check passes
2. Set `VITE_BACKEND_URL` in frontend service to your backend URL
3. Deploy frontend
4. Test full stack integration
