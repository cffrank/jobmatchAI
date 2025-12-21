# Deploy Backend to Railway - Quick Guide

**Estimated time:** 15 minutes

---

## Prerequisites Check

✅ Railway CLI installed (version 4.16.1)
✅ Backend Railway config exists (`backend/railway.toml`)
✅ Backend code built (`backend/dist/` directory exists)

---

## Required API Keys

Before deploying, gather these API keys:

### 1. Supabase Keys (2 keys)
**Get from:** https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/settings/api

- ✅ **Project URL:** `https://lrzhpnsykasqrousgmdh.supabase.co` (you have this)
- ✅ **Anon Key:** `eyJhbG...` (you have this in `.env.local`)
- ❌ **Service Role Key:** Click "Reveal" next to `service_role` (KEEP SECRET!)

### 2. OpenAI API Key (required for AI features)
**Get from:** https://platform.openai.com/api-keys

- Click "Create new secret key"
- Name: `JobMatch AI Backend`
- Copy the key (starts with `sk-...`)
- **Cost:** ~$0.01-0.10 per application generated

### 3. SendGrid API Key (required for email features)
**Get from:** https://app.sendgrid.com/settings/api_keys

- Click "Create API Key"
- Name: `JobMatch AI Backend`
- Permissions: "Full Access" (or "Mail Send")
- Copy the key (starts with `SG.`)
- **Free tier:** 100 emails/day

**Also need:** Verified sender email
- Go to: https://app.sendgrid.com/settings/sender_auth
- Verify your email address (carl.f.frank@gmail.com or similar)

### 4. Optional Keys (can skip for now)

- **LinkedIn OAuth:** For LinkedIn sign-in (can configure later)
- **Apify:** For job scraping (can configure later)

---

## Step 1: Login to Railway (2 minutes)

```bash
railway login
```

This opens a browser - sign in with GitHub.

---

## Step 2: Navigate to Backend Directory

```bash
cd backend
```

---

## Step 3: Initialize Railway Project (1 minute)

```bash
railway init
```

Prompts:
- **Project name:** `jobmatch-ai-backend` (or your choice)
- **Create new project:** Yes

---

## Step 4: Set Environment Variables (5 minutes)

Copy and paste these commands, replacing the values with your actual keys:

```bash
# Supabase Configuration
railway variables set SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
railway variables set SUPABASE_ANON_KEY=your-anon-key-here
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# OpenAI Configuration
railway variables set OPENAI_API_KEY=sk-your-openai-key-here

# SendGrid Configuration
railway variables set SENDGRID_API_KEY=SG.your-sendgrid-key-here
railway variables set SENDGRID_FROM_EMAIL=your-verified-email@gmail.com

# Application Configuration
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set JWT_SECRET=$(openssl rand -base64 32)

# Frontend URL (temporary - update after frontend deployment)
railway variables set APP_URL=http://localhost:5173
```

**Optional (skip for now):**
```bash
# LinkedIn OAuth (configure later)
# railway variables set LINKEDIN_CLIENT_ID=your-client-id
# railway variables set LINKEDIN_CLIENT_SECRET=your-client-secret
# railway variables set LINKEDIN_REDIRECT_URI=https://your-backend.railway.app/api/auth/linkedin/callback

# Apify for job scraping (configure later)
# railway variables set APIFY_API_TOKEN=your-apify-token

# Storage bucket
railway variables set STORAGE_BUCKET=exports
```

---

## Step 5: Deploy Backend (3 minutes)

```bash
railway up
```

This will:
1. Upload your code
2. Run `npm install`
3. Run `npm run build` (compile TypeScript)
4. Start server with `npm start`
5. Health check at `/health`

**Deployment output:**
```
✓ Deployment successful
✓ Build completed
✓ Health check passed

Your backend is live at:
https://jobmatch-ai-backend-production-xxxx.up.railway.app
```

**COPY THIS URL!** You'll need it for:
- Frontend `VITE_BACKEND_URL` environment variable
- LinkedIn OAuth redirect URI configuration

---

## Step 6: Test Backend Deployment (2 minutes)

### Test Health Endpoint

```bash
# Get your backend URL
railway status

# Test health endpoint
curl https://your-backend-url.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-20T...",
  "uptime": 123.45
}
```

### View Logs

```bash
railway logs
```

Look for:
```
Server running on port 3000
Environment: production
Health check endpoint available at /health
```

---

## Step 7: Update Frontend URL (after frontend deployment)

Once frontend is deployed, update the CORS configuration:

```bash
# Update APP_URL to your actual frontend URL
railway variables set APP_URL=https://your-frontend-url.railway.app

# Redeploy to apply changes
railway up
```

---

## API Endpoints Available

Your backend provides these endpoints:

**Application Generation:**
- `POST /api/applications/generate` - Generate AI cover letters

**Job Management:**
- `GET /api/jobs` - List jobs
- `POST /api/jobs/scrape` - Scrape new jobs

**Email:**
- `POST /api/emails/send` - Send application emails

**Exports:**
- `POST /api/exports/pdf` - Export application as PDF
- `POST /api/exports/docx` - Export application as DOCX

**Auth:**
- `GET /api/auth/linkedin/callback` - LinkedIn OAuth callback

**Health:**
- `GET /health` - Health check

---

## Troubleshooting

### Build Fails

**Error:** TypeScript compilation errors
```bash
# Test build locally first
npm run build

# If successful, redeploy
railway up
```

### Environment Variables Missing

```bash
# Check current variables
railway variables

# Set missing variable
railway variables set KEY=value
```

### Health Check Fails

```bash
# View logs
railway logs

# Check if server is starting
railway logs --follow
```

### Port Issues

Railway automatically sets `$PORT` - your code should use:
```typescript
const PORT = process.env.PORT || 3000
```

---

## Cost Information

**Railway Pricing:**
- Free trial: $5 credit
- Developer plan: $5/month (includes $5 credit)
- Backend estimated cost: $3-5/month

**External Service Costs:**
- OpenAI: ~$0.01-0.10 per AI generation
- SendGrid: Free tier (100 emails/day)
- Supabase: Free tier (500 MB database, 1 GB file storage)

---

## Security Checklist

After deployment:

- [ ] All API keys set as environment variables (not in code)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` kept secret (don't share!)
- [ ] CORS configured to only allow your frontend domain
- [ ] Rate limiting enabled (100 requests/15min per user)
- [ ] Health check endpoint accessible

---

## Quick Reference Commands

```bash
# Navigate to backend
cd backend

# Check deployment status
railway status

# View logs
railway logs

# View environment variables
railway variables

# Set environment variable
railway variables set KEY=value

# Redeploy
railway up

# Open Railway dashboard
railway open

# Delete deployment
railway delete
```

---

## Next Steps After Backend Deployment

1. ✅ **Copy your backend URL** from `railway status`
2. **Update frontend environment variables:**
   - Set `VITE_BACKEND_URL=https://your-backend-url.railway.app`
3. **Complete frontend migration** (18 files remaining)
4. **Deploy frontend** to Railway
5. **Update backend APP_URL** to point to frontend
6. **Test end-to-end** - Create account, generate applications, send emails
7. **Configure LinkedIn OAuth** (optional)

---

**Ready to deploy?** Start with Step 1 above!
