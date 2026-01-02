# Railway Environment Variables Setup Guide

Railway detected all environment variables. Here's how to configure them for each service.

## Backend Service Variables

Configure these in Railway Dashboard → Backend Service → Variables:

### ✅ Keep Railway's Detected Values (Auto-Generated Secrets)
```bash
# LinkedIn OAuth - Keep Railway's generated secrets
LINKEDIN_CLIENT_SECRET=${{ secret(27, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?") }}
LINKEDIN_CLIENT_ID=${{ secret(23, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?") }}
JWT_SECRET=${{ secret(38, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/") }}
```

### 🔧 Update These Values

#### Supabase Configuration
Get from your Supabase dashboard (https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/settings/api):

```bash
SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
SUPABASE_ANON_KEY=<your-anon-key-from-supabase>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key-from-supabase>
```

#### OpenAI API Key
Get from: https://platform.openai.com/api-keys

```bash
OPENAI_API_KEY=sk-proj-YOUR_ACTUAL_OPENAI_KEY
```

#### SendGrid Configuration
Get from: https://app.sendgrid.com/settings/api_keys

```bash
SENDGRID_API_KEY=SG.YOUR_ACTUAL_SENDGRID_KEY
SENDGRID_FROM_EMAIL=noreply@jobmatch-ai.com  # Or your verified sender
```

#### Apify Job Scraping
Get from: https://console.apify.com/account/integrations

```bash
APIFY_API_TOKEN=YOUR_ACTUAL_APIFY_TOKEN
```

#### LinkedIn OAuth Redirect
**IMPORTANT**: Update after backend is deployed

```bash
# Change this to your actual backend URL after deployment
LINKEDIN_REDIRECT_URI=https://[YOUR-BACKEND-URL].up.railway.app/api/auth/linkedin/callback
```

### ✅ Keep Default Values

```bash
# Rate limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# Storage bucket name
STORAGE_BUCKET=exports

# App URL (will be updated to production URL later)
APP_URL=http://localhost:5173
```

---

## Frontend Service Variables

Configure these in Railway Dashboard → Frontend Service → Variables:

### 🔧 Update These Values

```bash
# Backend URL - UPDATE after backend is deployed
VITE_BACKEND_URL=https://[YOUR-BACKEND-URL].up.railway.app

# Supabase configuration (same as backend)
VITE_SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key-from-supabase>

# LinkedIn OAuth - UPDATE after frontend is deployed
VITE_LINKEDIN_CLIENT_ID=<same-as-backend-LINKEDIN_CLIENT_ID>
VITE_LINKEDIN_REDIRECT_URI=https://[YOUR-FRONTEND-URL].up.railway.app/auth/callback/linkedin
```

### ✅ Keep Default Values

```bash
VITE_APP_NAME=JobMatch AI
VITE_ENV=production
```

---

## Step-by-Step Deployment Process

### Step 1: Create Backend Service

1. Go to Railway Dashboard → New → GitHub Repo
2. Select your `jobmatchAI` repository
3. Name: `jobmatch-backend`
4. Root Directory: `/backend`
5. Add all backend environment variables from above
6. Deploy

**After deployment completes:**
- Copy the backend URL (e.g., `https://jobmatch-backend-production-xxxx.up.railway.app`)
- Update these variables in **Backend Service**:
  - `LINKEDIN_REDIRECT_URI=https://[BACKEND-URL]/api/auth/linkedin/callback`
  - `APP_URL=https://[FRONTEND-URL]` (will update after frontend deploy)

### Step 2: Create Frontend Service

1. Railway Dashboard → New → GitHub Repo
2. Select your `jobmatchAI` repository
3. Name: `jobmatch-frontend`
4. Root Directory: `/` (root)
5. Add all frontend environment variables from above
6. **Important**: Update `VITE_BACKEND_URL` with the backend URL from Step 1
7. Deploy

**After deployment completes:**
- Copy the frontend URL (e.g., `https://jobmatch-frontend-production-xxxx.up.railway.app`)
- Update these variables:
  - **Backend Service**: `APP_URL=https://[FRONTEND-URL]`
  - **Frontend Service**: `VITE_LINKEDIN_REDIRECT_URI=https://[FRONTEND-URL]/auth/callback/linkedin`

### Step 3: Update LinkedIn OAuth Settings

1. Go to LinkedIn Developer Portal: https://www.linkedin.com/developers/apps
2. Select your app
3. Update Redirect URLs:
   - Add: `https://[BACKEND-URL]/api/auth/linkedin/callback`
   - Add: `https://[FRONTEND-URL]/auth/callback/linkedin`

### Step 4: Verify Deployment

Test these endpoints:

```bash
# Backend health check
curl https://[BACKEND-URL]/health

# Frontend
open https://[FRONTEND-URL]
```

---

## Quick Reference: Where to Get API Keys

| Variable | Where to Get It |
|----------|----------------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API (⚠️ Keep secret!) |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `SENDGRID_API_KEY` | https://app.sendgrid.com/settings/api_keys |
| `APIFY_API_TOKEN` | https://console.apify.com/account/integrations |
| `LINKEDIN_CLIENT_ID` | https://www.linkedin.com/developers/apps |
| `LINKEDIN_CLIENT_SECRET` | https://www.linkedin.com/developers/apps |

---

## Security Checklist

Before deploying:

- [ ] All placeholder values replaced with real keys
- [ ] Service role key is NOT in frontend variables
- [ ] JWT_SECRET is auto-generated by Railway
- [ ] LinkedIn redirect URIs match deployed URLs
- [ ] SendGrid sender email is verified
- [ ] All API keys are valid and active

---

## Cost Estimate

Railway charges based on usage:

- **Starter Plan**: $5/month base + usage
- **Estimated monthly cost**: $20-35 for both services
  - Backend: ~$12-20/month
  - Frontend: ~$3-5/month
  - Database: $0 (using Supabase)

Much cheaper than the previous Firebase setup ($55-90/month)!
