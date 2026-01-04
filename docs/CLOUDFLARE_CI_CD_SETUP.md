# Cloudflare CI/CD Setup Guide

**Created:** 2025-12-29
**Purpose:** Configure automated testing and deployment to Cloudflare Pages and Workers via GitHub Actions

---

## Overview

This guide establishes proper CI/CD for Cloudflare deployments:
- ✅ **Tests run BEFORE deployment** (type checks, linting, unit tests, integration tests)
- ✅ **Deployment only happens if all tests pass**
- ✅ **Branch-to-environment mapping** (develop → dev, staging → staging, main → production)
- ✅ **GitHub repo is the source of truth** (no manual deployments)

---

## Architecture

### Workflow: `.github/workflows/cloudflare-deploy.yml`

```
Push to branch (develop/staging/main)
    ↓
Run Tests Job
  ├─ Frontend type check
  ├─ Frontend linter
  ├─ Backend type check
  ├─ Backend linter
  ├─ Backend unit tests
  └─ Backend integration tests
    ↓
  PASS ✓
    ↓
Deploy Frontend Job (Cloudflare Pages)
    ↓
Deploy Backend Job (Cloudflare Workers)
    ↓
Done 🎉
```

### Branch-to-Environment Mapping

| Branch    | Frontend Project       | Backend Worker           | Purpose       |
|-----------|------------------------|--------------------------|---------------|
| `develop` | jobmatch-ai-dev        | jobmatch-ai-dev          | Development   |
| `staging` | jobmatch-ai-staging    | jobmatch-ai-staging      | Pre-production|
| `main`    | jobmatch-ai-production | jobmatch-ai-prod         | Production    |

---

## Required GitHub Secrets

### 1. Navigate to GitHub Secrets
Go to: **Repository → Settings → Secrets and variables → Actions**

### 2. Add Required Secrets

#### Cloudflare Secrets

**`CLOUDFLARE_API_TOKEN`** - API token with Cloudflare Workers/Pages permissions
- Go to: https://dash.cloudflare.com/profile/api-tokens
- Click "Create Token"
- Use template: "Edit Cloudflare Workers"
- Add permissions:
  - Account → Cloudflare Pages → Edit
  - Account → Workers Scripts → Edit
- Copy token and add to GitHub secrets

**`CLOUDFLARE_ACCOUNT_ID`** - Your Cloudflare account ID
- Go to: https://dash.cloudflare.com/
- Click on any domain
- Look in the URL or right sidebar for "Account ID"
- Copy and add to GitHub secrets

#### Supabase Secrets (for build-time and tests)

**`SUPABASE_URL`**
```
https://lrzhpnsykasqrousgmdh.supabase.co
```

**`SUPABASE_ANON_KEY`**
- Get from: Supabase Dashboard → Project Settings → API → anon public key
- This is safe to expose in frontend builds

**`SUPABASE_SERVICE_ROLE_KEY`**
- Get from: Supabase Dashboard → Project Settings → API → service_role secret key
- ⚠️ **NEVER expose in frontend builds** - only used in backend tests

---

## Cloudflare Secrets Setup

The workflow deploys to Cloudflare, but the Workers themselves need secrets configured separately.

### Configure Workers Secrets (One-Time Setup)

```bash
cd workers

# Login to Cloudflare
npx wrangler login

# Set secrets for EACH environment (development, staging, production)
# Development
npx wrangler secret put SUPABASE_URL --env development
npx wrangler secret put SUPABASE_ANON_KEY --env development
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env development
npx wrangler secret put OPENAI_API_KEY --env development
npx wrangler secret put APIFY_API_TOKEN --env development
npx wrangler secret put APP_URL --env development
# Enter: https://jobmatch-ai-dev.pages.dev

# Staging
npx wrangler secret put SUPABASE_URL --env staging
npx wrangler secret put SUPABASE_ANON_KEY --env staging
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging
npx wrangler secret put OPENAI_API_KEY --env staging
npx wrangler secret put APIFY_API_TOKEN --env staging
npx wrangler secret put APP_URL --env staging
# Enter: https://jobmatch-ai-staging.pages.dev

# Production
npx wrangler secret put SUPABASE_URL --env production
npx wrangler secret put SUPABASE_ANON_KEY --env production
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
npx wrangler secret put OPENAI_API_KEY --env production
npx wrangler secret put APIFY_API_TOKEN --env production
npx wrangler secret put APP_URL --env production
# Enter: https://jobmatch-ai-production.pages.dev

# Optional (if using email/LinkedIn features)
npx wrangler secret put SENDGRID_API_KEY --env production
npx wrangler secret put SENDGRID_FROM_EMAIL --env production
npx wrangler secret put LINKEDIN_CLIENT_ID --env production
npx wrangler secret put LINKEDIN_CLIENT_SECRET --env production
npx wrangler secret put LINKEDIN_REDIRECT_URI --env production
```

---

## How It Works

### Automatic Deployments

When you push to a protected branch:

1. **Push to `develop`**
   ```bash
   git push origin develop
   ```
   - Runs all tests
   - Deploys to development environment
   - Frontend: https://jobmatch-ai-dev.pages.dev
   - Backend: https://jobmatch-ai-dev.carl-f-frank.workers.dev

2. **Push to `staging`**
   ```bash
   git push origin staging
   ```
   - Runs all tests
   - Deploys to staging environment
   - Frontend: https://jobmatch-ai-staging.pages.dev
   - Backend: https://jobmatch-ai-staging.carl-f-frank.workers.dev

3. **Push to `main`**
   ```bash
   git push origin main
   ```
   - Runs all tests
   - Deploys to production environment
   - Frontend: https://jobmatch-ai-production.pages.dev
   - Backend: https://jobmatch-ai-prod.carl-f-frank.workers.dev

### Manual Deployments

You can also trigger deployments manually:

1. Go to: **GitHub → Actions → Deploy to Cloudflare Pages**
2. Click "Run workflow"
3. Select environment (development/staging/production)
4. Click "Run workflow"

---

## Testing Before Deployment

All tests run automatically before deployment:

### Frontend Tests
- TypeScript type checking (`npm run build:check`)
- ESLint linting (`npm run lint`)

### Backend Tests
- TypeScript type checking (`npm run typecheck`)
- ESLint linting (`npm run lint`)
- Unit tests (`npm run test:unit`)
- Integration tests (`npm run test:integration`)

**If any test fails, deployment is blocked.**

---

## Workflow Features

### ✅ Test-Driven Deployment
- All tests must pass before deployment
- No manual deployments bypass testing
- Consistent quality across all environments

### ✅ Environment Isolation
- Each environment has separate Cloudflare projects
- Secrets configured independently per environment
- Development → Staging → Production progression

### ✅ Branch Protection
- `develop`, `staging`, and `main` should be protected
- Require PR reviews before merging
- Require status checks (tests) to pass

### ✅ Deployment Visibility
- GitHub Actions shows deployment status
- Step summaries show URLs and environment info
- Failed tests prevent deployment with clear errors

---

## Verifying Deployment

After pushing to a branch:

1. **Check GitHub Actions**
   - Go to: **Repository → Actions**
   - Find your workflow run
   - Verify all tests passed (green checkmarks)
   - Verify deployment jobs succeeded

2. **Test Frontend**
   ```bash
   # Development
   curl https://jobmatch-ai-dev.pages.dev

   # Staging
   curl https://jobmatch-ai-staging.pages.dev

   # Production
   curl https://jobmatch-ai-production.pages.dev
   ```

3. **Test Backend**
   ```bash
   # Development
   curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health

   # Staging
   curl https://jobmatch-ai-staging.carl-f-frank.workers.dev/health

   # Production
   curl https://jobmatch-ai-prod.carl-f-frank.workers.dev/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-12-29T...",
     "environment": "development"
   }
   ```

---

## Troubleshooting

### Issue: "Tests passed but deployment failed"

**Possible causes:**
1. Missing GitHub secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)
2. Invalid Cloudflare API token permissions
3. Cloudflare account issues

**Solution:**
```bash
# Verify secrets are set
# Go to: Repository → Settings → Secrets and variables → Actions

# Check Cloudflare API token has correct permissions:
# - Account → Cloudflare Pages → Edit
# - Account → Workers Scripts → Edit
```

### Issue: "Deployment succeeded but backend returns 500 errors"

**Possible causes:**
1. Missing Workers secrets (SUPABASE_URL, OPENAI_API_KEY, etc.)
2. Incorrect secret values

**Solution:**
```bash
cd workers

# List secrets to verify they exist
npx wrangler secret list --env production

# Re-add any missing secrets
npx wrangler secret put SUPABASE_URL --env production
```

### Issue: "Frontend deployed but shows blank page"

**Possible causes:**
1. Build errors not caught by tests
2. Missing environment variables in build

**Solution:**
```bash
# Check GitHub Actions logs for build step
# Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set

# Test build locally
npm run build
npm run preview
```

---

## Next Steps

1. **Configure Branch Protection**
   - Go to: **Repository → Settings → Branches**
   - Add rules for `main`, `staging`, `develop`
   - Require: Pull request reviews, status checks

2. **Set Up Staging Workflow**
   ```bash
   # Create feature branch
   git checkout develop
   git checkout -b feature/new-feature

   # Make changes, commit
   git add .
   git commit -m "feat: add new feature"

   # Push and create PR to develop
   git push origin feature/new-feature

   # After PR approval and merge to develop:
   # Tests run → Deploy to development

   # Test on development, then merge develop → staging
   # Tests run → Deploy to staging

   # Test on staging, then merge staging → main
   # Tests run → Deploy to production
   ```

3. **Monitor Deployments**
   - Watch GitHub Actions for deployment status
   - Check Cloudflare Dashboard for metrics
   - Review logs via `npx wrangler tail --env production`

---

## Security Notes

- ✅ Never commit `.env` files
- ✅ Rotate API keys every 90 days (see `CREDENTIAL_ROTATION_POLICY.md`)
- ✅ Use least-privilege API tokens (only required permissions)
- ✅ Keep `SUPABASE_SERVICE_ROLE_KEY` secret (never in frontend builds)
- ✅ Monitor Cloudflare logs for suspicious activity

---

## Summary

✅ **Automated CI/CD pipeline configured**
- Tests run before every deployment
- Branch-to-environment mapping enforced
- Manual deployments available when needed

✅ **Next action: Add GitHub secrets and push to develop to test**

---

**Questions?** See `workers/DEPLOYMENT_GUIDE.md` for Cloudflare-specific details.
