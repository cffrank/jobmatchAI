# Railway Deployment Guide - JobMatch AI

This guide walks you through deploying the JobMatch AI application to Railway. The application consists of two services:

1. **Backend API** (Express.js) - `/backend` directory
2. **Frontend** (Vite React) - Root directory

## Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
  - [Option A: Railway CLI (Recommended)](#option-a-railway-cli-recommended)
  - [Option B: GitHub Integration (Easier)](#option-b-github-integration-easier)
- [Post-Deployment Configuration](#post-deployment-configuration)
- [Environment Variables Reference](#environment-variables-reference)
- [Troubleshooting](#troubleshooting)
- [Cost Information](#cost-information)

---

## Prerequisites

Before deploying to Railway, ensure you have:

- [x] PostgreSQL database deployed to Supabase
- [x] Supabase URL and API keys (from Supabase Dashboard)
- [x] GitHub repository with your code
- [x] OpenAI API key (for AI-powered resume generation)
- [x] SendGrid API key (for email sending)
- [x] LinkedIn OAuth credentials (optional, for LinkedIn integration)
- [x] Apify API token (optional, for job scraping)

---

## Deployment Options

Choose one of the following deployment methods:

### Option A: Railway CLI (Recommended)

The Railway CLI provides more control and better debugging capabilities.

#### Step 1: Install Railway CLI

```bash
# Install globally via npm
npm install -g @railway/cli

# Verify installation
railway --version
```

#### Step 2: Login to Railway

```bash
# Login via browser
railway login
```

This will open your browser to authenticate with Railway.

#### Step 3: Deploy Backend Service

```bash
# Navigate to backend directory
cd backend

# Create new Railway project or link existing one
railway init

# Follow prompts:
# - Create new project: "jobmatch-ai-backend"
# - Select team/personal account

# Set environment variables (see Environment Variables section below)
railway variables set SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
railway variables set SUPABASE_ANON_KEY=your-anon-key
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
railway variables set OPENAI_API_KEY=your-openai-key
railway variables set SENDGRID_API_KEY=your-sendgrid-key
railway variables set SENDGRID_FROM_EMAIL=noreply@jobmatch-ai.com
railway variables set LINKEDIN_CLIENT_ID=your-linkedin-client-id
railway variables set LINKEDIN_CLIENT_SECRET=your-linkedin-secret
railway variables set APIFY_API_TOKEN=your-apify-token
railway variables set PORT=3000
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Deploy the service
railway up

# Get the deployment URL
railway status
# Look for "Domain" - something like: https://backend-production-xxxx.up.railway.app
```

**Save the backend URL** - you'll need it for frontend configuration.

#### Step 4: Configure Backend Domain (Optional)

```bash
# Generate a Railway domain (if not automatically created)
railway domain

# Or add a custom domain
railway domain add yourdomain.com
```

#### Step 5: Deploy Frontend Service

```bash
# Navigate back to root directory
cd ..

# Create separate Railway project for frontend
railway init

# Follow prompts:
# - Create new project: "jobmatch-ai-frontend"
# - Select team/personal account

# Set frontend environment variables
railway variables set VITE_SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
railway variables set VITE_SUPABASE_ANON_KEY=your-anon-key
railway variables set VITE_BACKEND_URL=https://backend-production-xxxx.up.railway.app
railway variables set VITE_LINKEDIN_CLIENT_ID=your-linkedin-client-id
railway variables set VITE_APP_NAME="JobMatch AI"

# Deploy the frontend
railway up

# Get the deployment URL
railway status
# Look for "Domain" - something like: https://frontend-production-xxxx.up.railway.app
```

#### Step 6: Update LinkedIn Redirect URI

Now that you have both URLs, update the backend to include the frontend redirect URI:

```bash
cd backend
railway variables set LINKEDIN_REDIRECT_URI=https://backend-production-xxxx.up.railway.app/api/auth/linkedin/callback
railway variables set APP_URL=https://frontend-production-xxxx.up.railway.app

# Also update frontend redirect URI
cd ..
railway variables set VITE_LINKEDIN_REDIRECT_URI=https://frontend-production-xxxx.up.railway.app/auth/callback/linkedin
```

---

### Option B: GitHub Integration (Easier)

This method automatically deploys from your GitHub repository.

#### Step 1: Push Code to GitHub

```bash
# Ensure your code is committed and pushed
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

#### Step 2: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Authorize Railway to access your repositories

#### Step 3: Deploy Backend Service

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your `jobmatch-ai` repository
4. Click **"Add variables"** and configure environment variables:

**Backend Environment Variables:**

```
SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@jobmatch-ai.com
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-secret
APIFY_API_TOKEN=your-apify-token
PORT=3000
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
APP_URL=https://your-frontend-url.railway.app
```

5. In **Settings** > **Root Directory**, set to: `/backend`
6. Click **"Deploy"**
7. Once deployed, go to **Settings** > **Domains** to get your backend URL
   - Example: `https://backend-production-xxxx.up.railway.app`

#### Step 4: Deploy Frontend Service

1. Create **another new project** (Railway requires separate projects for each service)
2. Select **"Deploy from GitHub repo"**
3. Choose your `jobmatch-ai` repository again
4. Click **"Add variables"** and configure:

**Frontend Environment Variables:**

```
VITE_SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_BACKEND_URL=https://backend-production-xxxx.up.railway.app
VITE_LINKEDIN_CLIENT_ID=your-linkedin-client-id
VITE_LINKEDIN_REDIRECT_URI=https://frontend-production-xxxx.up.railway.app/auth/callback/linkedin
VITE_APP_NAME=JobMatch AI
```

5. **Important:** Leave Root Directory as `/` (root)
6. Click **"Deploy"**
7. Once deployed, go to **Settings** > **Domains** to get your frontend URL
   - Example: `https://frontend-production-xxxx.up.railway.app`

#### Step 5: Update Cross-References

Now that both services are deployed:

1. Go to **Backend** project > **Variables**
2. Update `APP_URL` to your frontend Railway URL
3. Update `LINKEDIN_REDIRECT_URI` if using LinkedIn OAuth

4. Go to **Frontend** project > **Variables**
5. Update `VITE_BACKEND_URL` to your backend Railway URL
6. Update `VITE_LINKEDIN_REDIRECT_URI` to your frontend Railway URL

#### Step 6: Redeploy Both Services

After updating variables, redeploy:

1. Backend project: Click **"Deploy"** > **"Redeploy"**
2. Frontend project: Click **"Deploy"** > **"Redeploy"**

---

## Post-Deployment Configuration

### 1. Update LinkedIn OAuth Settings

If using LinkedIn integration:

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Select your app
3. Go to **OAuth 2.0 settings**
4. Update **Redirect URLs**:
   ```
   https://backend-production-xxxx.up.railway.app/api/auth/linkedin/callback
   https://frontend-production-xxxx.up.railway.app/auth/callback/linkedin
   ```
5. Save changes

### 2. Test Backend Health Check

```bash
curl https://backend-production-xxxx.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-20T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

### 3. Test Frontend

Open your frontend URL in a browser:
```
https://frontend-production-xxxx.up.railway.app
```

You should see the JobMatch AI login/signup page.

### 4. Monitor Logs

#### CLI Method:
```bash
# Backend logs
cd backend
railway logs

# Frontend logs
cd ..
railway logs
```

#### Dashboard Method:
1. Go to Railway dashboard
2. Click on your project
3. Click on **"Deployments"** tab
4. Click **"View Logs"**

### 5. Set Up Custom Domains (Optional)

If you have a custom domain:

#### Backend (api.yourdomain.com):
```bash
cd backend
railway domain add api.yourdomain.com
```

Then add a CNAME record in your DNS:
```
CNAME api -> target-from-railway
```

#### Frontend (app.yourdomain.com):
```bash
cd ..
railway domain add app.yourdomain.com
```

Then add a CNAME record:
```
CNAME app -> target-from-railway
```

---

## Environment Variables Reference

### Backend Variables (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGci...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-proj-...` |
| `SENDGRID_API_KEY` | SendGrid API key | `SG.xxx` |
| `SENDGRID_FROM_EMAIL` | Verified sender email | `noreply@yourdomain.com` |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | Random string |
| `APP_URL` | Frontend URL for CORS | Railway frontend URL |

### Backend Variables (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth client ID | From LinkedIn Developer |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth secret | From LinkedIn Developer |
| `LINKEDIN_REDIRECT_URI` | OAuth callback URL | `https://api.../api/auth/linkedin/callback` |
| `APIFY_API_TOKEN` | Apify token for job scraping | From Apify Console |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` (15 min) |
| `STORAGE_BUCKET` | Supabase storage bucket | `exports` |

### Frontend Variables (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGci...` |
| `VITE_BACKEND_URL` | Backend API URL | Railway backend URL |

### Frontend Variables (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_LINKEDIN_CLIENT_ID` | LinkedIn OAuth client ID | From LinkedIn Developer |
| `VITE_LINKEDIN_REDIRECT_URI` | OAuth callback URL | `https://app.../auth/callback/linkedin` |
| `VITE_APP_NAME` | Application name | `JobMatch AI` |
| `VITE_ENV` | Environment | `production` |

---

## Troubleshooting

### Backend Issues

#### Build Fails

**Problem:** TypeScript compilation errors

**Solution:**
1. Check logs: `railway logs`
2. Verify all TypeScript files are error-free
3. Run locally: `npm run build`
4. Check `tsconfig.json` is correct

#### Health Check Fails

**Problem:** `/health` endpoint returns 503 or times out

**Solution:**
1. Check if server is starting: `railway logs`
2. Verify `PORT` environment variable is set
3. Ensure server listens on `process.env.PORT`
4. Check for startup errors in logs

#### CORS Errors

**Problem:** Frontend can't connect to backend

**Solution:**
1. Verify `APP_URL` in backend matches frontend Railway URL
2. Check CORS configuration in `backend/src/index.ts`
3. Add frontend URL to `allowedOrigins` array
4. Redeploy backend after updating

#### Database Connection Fails

**Problem:** Can't connect to Supabase

**Solution:**
1. Verify `SUPABASE_URL` is correct
2. Check `SUPABASE_SERVICE_ROLE_KEY` is set (not anon key)
3. Verify Supabase project is active
4. Check Supabase connection pooling settings

### Frontend Issues

#### Build Fails

**Problem:** Vite build errors

**Solution:**
1. Check logs: `railway logs`
2. Verify all environment variables have `VITE_` prefix
3. Run locally: `npm run build`
4. Check for TypeScript/ESLint errors

#### Blank Page After Deployment

**Problem:** Frontend loads but shows blank page

**Solution:**
1. Check browser console for errors
2. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. Verify `VITE_BACKEND_URL` points to correct backend
4. Check Network tab for failed API requests

#### 404 on Routes

**Problem:** React Router routes return 404

**Solution:**
1. Verify `npx serve dist -s` is used (with `-s` flag for SPA)
2. Check `railway.toml` has correct `startCommand`
3. Ensure Vite build output is in `dist/`

#### Environment Variables Not Working

**Problem:** `import.meta.env.VITE_*` is undefined

**Solution:**
1. Ensure variable names start with `VITE_`
2. Rebuild after adding variables (Railway auto-redeploys)
3. Check Railway dashboard > Variables tab
4. Clear browser cache

### General Issues

#### Deployment Hangs

**Problem:** Deployment stuck at "Building..." or "Deploying..."

**Solution:**
1. Cancel deployment and retry
2. Check Railway status page: [status.railway.app](https://status.railway.app)
3. Try deploying from CLI instead of GitHub
4. Contact Railway support if persists

#### High Memory Usage

**Problem:** Service crashes with out-of-memory errors

**Solution:**
1. Check Railway plan limits (Hobby: 512MB RAM)
2. Optimize Node.js memory: `NODE_OPTIONS=--max-old-space-size=460`
3. Review code for memory leaks
4. Consider upgrading Railway plan

#### Slow Cold Starts

**Problem:** First request after inactivity is slow

**Solution:**
1. Railway has sleep mode on free tier
2. Upgrade to paid plan for always-on services
3. Implement health check pinging service (cron-job.org)
4. Optimize startup time (lazy-load dependencies)

---

## Cost Information

### Railway Pricing (as of Dec 2024)

**Free Trial:**
- $5 credit to start
- Good for testing deployment

**Developer Plan:**
- $5/month per user
- Includes:
  - $5 usage credit
  - Up to 512MB RAM per service
  - 1GB disk per service
  - Custom domains
  - Always-on services

**Pro Plan:**
- $20/month per user
- Includes:
  - $20 usage credit
  - Up to 8GB RAM per service
  - 100GB disk per service
  - Priority support

**Usage-Based Costs (beyond included credit):**
- **Compute:** ~$0.000463 per GB-minute
- **RAM:** ~$0.000231 per GB-minute
- **Disk:** ~$0.25 per GB-month
- **Bandwidth:** ~$0.10 per GB

### Estimated Monthly Costs

**Minimal Usage (Developer Plan):**
- 2 services (backend + frontend)
- Low traffic (<1000 users/month)
- **Cost:** ~$5-10/month

**Moderate Usage:**
- 2 services with higher uptime
- Medium traffic (5000-10000 users/month)
- **Cost:** ~$15-25/month

**High Usage:**
- 2 services always-on
- High traffic (50000+ users/month)
- **Cost:** $30-50+/month (consider Pro plan)

### Cost Optimization Tips

1. **Use Railway for backend only** - Deploy frontend to Vercel/Netlify (free tier)
2. **Optimize memory usage** - Reduce RAM footprint
3. **Enable sleep mode** - If using free tier, let services sleep during inactivity
4. **Monitor usage** - Check Railway dashboard regularly
5. **Set up alerts** - Get notified when approaching credit limit

---

## Next Steps

After successful deployment:

1. **Test All Features:**
   - [ ] User signup/login
   - [ ] Profile editing
   - [ ] Job search and scraping
   - [ ] Application generation (AI)
   - [ ] Email sending
   - [ ] LinkedIn OAuth
   - [ ] PDF/DOCX export

2. **Set Up Monitoring:**
   - Configure error tracking (Sentry, LogRocket)
   - Set up uptime monitoring (UptimeRobot, Pingdom)
   - Enable Railway metrics and alerts

3. **Configure Backups:**
   - Set up Supabase automated backups
   - Export critical data regularly
   - Document recovery procedures

4. **Security Hardening:**
   - Rotate all secrets (JWT_SECRET, API keys)
   - Enable 2FA on Railway account
   - Review CORS settings
   - Set up rate limiting alerts

5. **Performance Optimization:**
   - Enable Supabase connection pooling
   - Add Redis caching (Railway add-on)
   - Optimize database queries
   - Implement CDN for static assets

---

## Support

- **Railway Documentation:** [docs.railway.app](https://docs.railway.app)
- **Railway Discord:** [discord.gg/railway](https://discord.gg/railway)
- **Railway Status:** [status.railway.app](https://status.railway.app)
- **JobMatch AI Issues:** [GitHub Issues](https://github.com/yourusername/jobmatch-ai/issues)

---

## Appendix: Quick Commands Reference

### Railway CLI Commands

```bash
# Login
railway login

# Initialize project
railway init

# Deploy current directory
railway up

# Set environment variable
railway variables set KEY=value

# View logs
railway logs

# Check status
railway status

# Add domain
railway domain

# Open in browser
railway open

# Link to existing project
railway link

# Unlink project
railway unlink

# List projects
railway list
```

### Useful Scripts

#### Generate Secure JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Test Backend Health
```bash
curl https://your-backend.railway.app/health | jq
```

#### View All Environment Variables
```bash
railway variables
```

#### Export Environment Variables
```bash
railway variables > .env.railway
```

---

**Last Updated:** December 20, 2024
**Version:** 1.0.0
