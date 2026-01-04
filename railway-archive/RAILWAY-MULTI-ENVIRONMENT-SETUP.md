# Railway Multi-Environment Setup Guide

**Last Updated:** December 24, 2025
**Status:** Production Ready
**Prerequisites:** Railway account with project linked to GitHub repository

---

## Overview

This guide walks you through setting up three Railway environments to support a proper development workflow:

- **development** (linked to `develop` branch)
- **staging** (linked to `staging` branch)
- **production** (linked to `main` branch)

## Current State vs Target State

### Current State
```
Railway Project: jobmatch-ai
├── production (main branch) ✓ EXISTS
└── pr-* (ephemeral preview environments) ✓ EXISTS
```

### Target State
```
Railway Project: jobmatch-ai
├── production (main branch) ✓ EXISTS
├── staging (staging branch) ← CREATE THIS
├── development (develop branch) ← CREATE THIS
└── pr-* (ephemeral preview environments) ✓ EXISTS
```

---

## Step-by-Step Setup

### Step 1: Access Railway Dashboard

1. Go to https://railway.app
2. Sign in with your account
3. Navigate to your **jobmatch-ai** project
4. Click on **Settings** in the left sidebar

### Step 2: Create Development Environment

1. In Settings, click on the **Environments** tab
2. Click **+ New Environment** button
3. Configure the environment:
   - **Environment Name:** `development`
   - **Branch Association:** Select `develop` from dropdown
   - **Auto-Deploy:** Enable (toggle ON)
   - **Source Environment:** Select `production` (to copy existing variables)

4. Click **Create Environment**

5. Railway will:
   - Create the new environment
   - Copy all environment variables from production
   - Link it to the `develop` branch
   - Set up auto-deploy on push

### Step 3: Create Staging Environment

1. Still in Settings → Environments tab
2. Click **+ New Environment** button again
3. Configure the environment:
   - **Environment Name:** `staging`
   - **Branch Association:** Select `staging` from dropdown
   - **Auto-Deploy:** Enable (toggle ON)
   - **Source Environment:** Select `production` (to copy existing variables)

4. Click **Create Environment**

5. Railway will:
   - Create the new environment
   - Copy all environment variables from production
   - Link it to the `staging` branch
   - Set up auto-deploy on push

### Step 4: Verify Environment Variables

After creating both environments, verify each has the required environment variables:

#### Required Variables for All Environments

**Backend Service Variables:**
```
NODE_ENV=production
PORT=3000
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
OPENAI_API_KEY=<your-openai-key>
APIFY_API_TOKEN=<your-apify-token>
SENDGRID_API_KEY=<your-sendgrid-key>
APP_URL=<frontend-url-for-this-environment>
CORS_ORIGIN=<frontend-url-for-this-environment>
```

#### Environment-Specific Considerations

**Development Environment:**
- Consider using separate Supabase project for development
- Consider using test/sandbox API keys where possible
- Use development frontend URL for `APP_URL` and `CORS_ORIGIN`

**Staging Environment:**
- Should mirror production configuration as closely as possible
- Use production-like data (anonymized if necessary)
- Use staging frontend URL for `APP_URL` and `CORS_ORIGIN`

**Production Environment:**
- Use production API keys and credentials
- No test/sandbox keys
- Production frontend URL for `APP_URL` and `CORS_ORIGIN`

### Step 5: Configure Each Environment

For each environment (development, staging, production):

1. Click on the environment name in Railway dashboard
2. Select the **backend** service
3. Go to **Variables** tab
4. Review and update environment-specific variables:

   **Update these per environment:**
   - `APP_URL` - Frontend URL for this environment
   - `CORS_ORIGIN` - Frontend URL for this environment (same as APP_URL)
   - (Optional) `NODE_ENV` - Keep as `production` for all, or use `development` for dev env

5. Save changes

### Step 6: Generate Domain Names

Each environment needs its own public URL:

1. Select **backend** service in each environment
2. Go to **Settings** tab
3. Scroll to **Domains** section
4. Click **Generate Domain** button
5. Railway will create a unique URL like:
   - `backend-production-abc123.up.railway.app`
   - `backend-staging-def456.up.railway.app`
   - `backend-development-ghi789.up.railway.app`

6. Copy each URL for later use in frontend configuration

---

## Verification

### Verify Environment Creation

In Railway dashboard, you should now see:

```
Environments (4):
├── production (main) - Auto-deploy: ON
├── staging (staging) - Auto-deploy: ON
├── development (develop) - Auto-deploy: ON
└── pr-* (ephemeral) - Auto-created on PR
```

### Verify Branch Mapping

1. In Railway Settings → Environments
2. Each environment should show its linked branch:
   - **production** → `main`
   - **staging** → `staging`
   - **development** → `develop`

### Verify Auto-Deploy

1. Make a small test commit to `develop` branch
2. Push to GitHub: `git push origin develop`
3. Watch Railway dashboard - should see new deployment in **development** environment
4. Repeat for `staging` branch

### Test Environment URLs

Each environment should have a unique backend URL:

```bash
# Production
curl https://backend-production-abc123.up.railway.app/health

# Staging
curl https://backend-staging-def456.up.railway.app/health

# Development
curl https://backend-development-ghi789.up.railway.app/health
```

All should return health check response.

---

## Environment Variables Reference

### Required Variables Matrix

| Variable | Development | Staging | Production | Notes |
|----------|------------|---------|------------|-------|
| `NODE_ENV` | production | production | production | Keep as production |
| `PORT` | 3000 | 3000 | 3000 | Railway sets this |
| `SUPABASE_URL` | dev-db | staging-db | prod-db | Separate DBs recommended |
| `SUPABASE_ANON_KEY` | dev-key | staging-key | prod-key | Match DB |
| `SUPABASE_SERVICE_ROLE_KEY` | dev-key | staging-key | prod-key | Match DB |
| `OPENAI_API_KEY` | shared-ok | shared-ok | prod-key | Can share or separate |
| `APIFY_API_TOKEN` | shared-ok | shared-ok | prod-token | Can share or separate |
| `SENDGRID_API_KEY` | test-key | test-key | prod-key | Use test keys for non-prod |
| `APP_URL` | dev-frontend | staging-frontend | prod-frontend | Environment-specific |
| `CORS_ORIGIN` | dev-frontend | staging-frontend | prod-frontend | Must match APP_URL |

### Optional: Separate Supabase Projects

**Option 1: Single Supabase Project (Simpler)**
```
All environments use same Supabase project
✓ Simpler setup
✓ Easier to manage
⚠️ Risk of dev/staging affecting production data
```

**Option 2: Separate Supabase Projects (Recommended)**
```
Development: supabase-project-dev
Staging: supabase-project-staging
Production: supabase-project-prod

✓ Complete data isolation
✓ Safer testing
✓ Production data never touched
⚠️ More Supabase projects to manage
⚠️ Need to sync schema changes across projects
```

For a money-making production app, **Option 2 is recommended**.

---

## Frontend Configuration

After Railway environments are set up, update frontend environment variables:

### Development Frontend
```env
# .env.development
VITE_API_URL=https://backend-development-ghi789.up.railway.app
VITE_SUPABASE_URL=<dev-supabase-url>
VITE_SUPABASE_ANON_KEY=<dev-supabase-anon-key>
```

### Staging Frontend
```env
# .env.staging
VITE_API_URL=https://backend-staging-def456.up.railway.app
VITE_SUPABASE_URL=<staging-supabase-url>
VITE_SUPABASE_ANON_KEY=<staging-supabase-anon-key>
```

### Production Frontend
```env
# .env.production
VITE_API_URL=https://backend-production-abc123.up.railway.app
VITE_SUPABASE_URL=<prod-supabase-url>
VITE_SUPABASE_ANON_KEY=<prod-supabase-anon-key>
```

---

## Cost Considerations

### Railway Pricing Impact

Each environment consumes Railway resources:

- **Development:** Active during business hours, can pause overnight
- **Staging:** Active during QA cycles, can pause between releases
- **Production:** Always active (never pause)
- **PR Previews:** Ephemeral, auto-cleanup (minimal cost)

**Cost Optimization Tips:**
1. Manually pause dev/staging when not in use
2. Use smaller instance sizes for non-production
3. Set up sleep schedules for dev environment
4. Monitor usage in Railway dashboard

**Estimated Additional Cost:**
- Development: ~$5-10/month (if paused when unused)
- Staging: ~$5-10/month (if paused when unused)
- **Total Added Cost:** ~$10-20/month

For a revenue-generating app, this cost is minimal insurance against production incidents.

---

## Deployment Flow After Setup

### How Code Flows Through Environments

```
Local Development
    ↓ git push origin feature/xyz
Feature Branch (create PR to develop)
    ↓ merge PR
Development Environment (auto-deploy)
    ↓ test integration, create PR to staging
Staging Environment (auto-deploy)
    ↓ QA approval, create PR to main
Production Environment (auto-deploy)
    ✓ Live to users
```

### Auto-Deploy Trigger Matrix

| Branch | Trigger | Deploys To | Auto-Deploy |
|--------|---------|------------|-------------|
| `feature/*` | PR opened | PR preview (pr-123) | Yes |
| `develop` | Push to develop | Development env | Yes |
| `staging` | Push to staging | Staging env | Yes |
| `main` | Push to main | Production env | Yes |

---

## Troubleshooting

### Environment Not Auto-Deploying

**Check:**
1. Railway Settings → Environments → Verify branch link
2. Railway Settings → Environments → Verify auto-deploy is ON
3. GitHub Actions → Check if workflows are passing
4. Railway dashboard → Check deployment logs

### Environment Variables Not Applied

**Fix:**
1. Go to environment in Railway
2. Click backend service
3. Variables tab → Verify all required variables present
4. If missing, add manually
5. Redeploy the service

### Wrong Branch Deploying to Environment

**Fix:**
1. Railway Settings → Environments
2. Click on the environment
3. Change "Branch" dropdown to correct branch
4. Save changes
5. Next push to correct branch will deploy properly

### Domain Not Generated

**Fix:**
1. Select service in environment
2. Settings → Domains
3. Click "Generate Domain"
4. Wait 30-60 seconds for DNS propagation

---

## Security Best Practices

### Environment Isolation

1. Use separate Supabase projects for each environment
2. Never share production credentials with dev/staging
3. Use test API keys for development environment
4. Restrict staging access to team members only

### Access Control

1. Set up Railway team with proper roles
2. Limit production access to senior team members
3. Require approvals for production changes
4. Enable Railway audit logs

### Secrets Management

1. Never commit `.env` files to git
2. Use Railway's built-in secret variables
3. Rotate API keys regularly
4. Document which keys are used where

---

## Next Steps

After completing Railway environment setup:

1. **Update GitHub Actions workflows** (see `docs/GITHUB-ACTIONS-MULTI-ENV.md`)
2. **Configure branch protection rules** (see `docs/BRANCH-PROTECTION-SETUP.md`)
3. **Update project documentation** (README, CONTRIBUTING)
4. **Test the deployment flow** (make test commits to each branch)
5. **Update frontend environment variables** (Vercel/Netlify/etc.)

---

## Quick Reference

### Environment URLs (Update After Setup)

```bash
# Development
export DEV_BACKEND_URL="https://backend-development-xyz.up.railway.app"

# Staging
export STAGING_BACKEND_URL="https://backend-staging-xyz.up.railway.app"

# Production
export PROD_BACKEND_URL="https://backend-production-xyz.up.railway.app"
```

### Useful Railway CLI Commands

```bash
# List environments
railway environment

# Switch to environment
railway environment development

# Check status in current environment
railway status

# View logs for current environment
railway logs

# Redeploy current environment
railway up --detach
```

---

## Support

- **Railway Docs:** https://docs.railway.app/reference/environments
- **Project Docs:** See `docs/` directory
- **Issues:** Create GitHub issue in repository

---

**Document Version:** 1.0
**Author:** Project Manager AI
**Related Docs:**
- `docs/DEPLOYMENT-WORKFLOW-EXPLAINED.md`
- `docs/GITHUB-ACTIONS-MULTI-ENV.md` (to be created)
- `docs/BRANCH-PROTECTION-SETUP.md` (to be created)
