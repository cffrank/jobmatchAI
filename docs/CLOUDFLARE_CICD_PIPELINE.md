# Cloudflare CI/CD Pipeline - Complete Setup Guide

**Date:** 2025-12-31
**Purpose:** Comprehensive CI/CD implementation for Cloudflare Workers, Pages, and D1 migrations
**Status:** Implementation guide for immediate deployment

---

## Architecture Overview

```
Feature Branch
    ↓
    └─→ Push to develop/staging/main
        ↓
        ├─→ Run Tests
        │   ├─ Frontend: TypeScript, ESLint
        │   ├─ Backend: TypeScript, ESLint, Unit tests, Integration tests
        │   └─ Workers: Build and type check
        │
        ├─→ IF ALL TESTS PASS ✓
        │
        ├─→ Deploy Frontend (Cloudflare Pages)
        │
        ├─→ Deploy Backend Workers (Cloudflare Workers)
        │
        └─→ Apply D1 Migrations (if applicable)
```

---

## Workflow Files

### 1. Main Deployment Workflow: `.github/workflows/cloudflare-deploy.yml`

This workflow already exists in your project (created 2025-12-29). Below are enhancements and the complete reference.

**Current Status:** Mostly complete, needs GitHub secrets configuration

**Key Features:**
- Tests run before ANY deployment
- Separate frontend and backend deployment jobs
- Environment-specific configuration
- Deployment status notifications

---

## GitHub Secrets Configuration (CRITICAL)

Navigate to: **Repository → Settings → Secrets and variables → Actions**

### Required Secrets

#### 1. Cloudflare Authentication
```
CLOUDFLARE_API_TOKEN
  Description: API token with Workers and Pages permissions
  Get from: https://dash.cloudflare.com/profile/api-tokens
  Create Token → Use template "Edit Cloudflare Workers"
  Add permissions:
    - Account → Cloudflare Pages → Edit
    - Account → Workers Scripts → Edit
  Expiration: 1 year
  Copy and add to GitHub

CLOUDFLARE_ACCOUNT_ID
  Description: Your Cloudflare account ID
  Get from: https://dash.cloudflare.com/
  Look in URL: https://dash.cloudflare.com/YOUR_ACCOUNT_ID
  Or right sidebar of any page
  Value: 280c58ea17d9fe3235c33bd0a52a256b (from your wrangler.toml)
```

#### 2. Supabase Configuration
```
SUPABASE_URL
  Value: https://lrzhpnsykasqrousgmdh.supabase.co
  Get from: Supabase Dashboard → Project Settings → API → Project URL

SUPABASE_ANON_KEY
  Description: Public anon key (safe for frontend builds)
  Get from: Supabase Dashboard → Project Settings → API → anon public
  This is safe to expose in frontend builds

SUPABASE_SERVICE_ROLE_KEY
  Description: Secret key for backend (NEVER in frontend)
  Get from: Supabase Dashboard → Project Settings → API → service_role secret
  Store securely - only used in backend
```

#### 3. Application Secrets (Per Environment)

Create separate GitHub Environments for each stage:
- `development`
- `staging`
- `production`

Then add these secrets to EACH environment:

**Base Secrets (all environments):**
```
OPENAI_API_KEY
  Your OpenAI API key for GPT-4 access
  Get from: https://platform.openai.com/account/api-keys

SENDGRID_API_KEY
  Your SendGrid API key for email
  Get from: https://app.sendgrid.com/settings/api_keys
  (Optional if not using email features)

APIFY_API_TOKEN
  Your Apify token for job scraping
  Get from: https://console.apify.com/account/integrations
```

**Optional Secrets:**
```
LINKEDIN_CLIENT_ID
  From LinkedIn Developer Portal
  (Only if implementing LinkedIn OAuth)

LINKEDIN_CLIENT_SECRET
  From LinkedIn Developer Portal
  (Only if implementing LinkedIn OAuth)

LINKEDIN_REDIRECT_URI
  Your OAuth callback URL
  (Only if implementing LinkedIn OAuth)
```

### Setup GitHub Environments

1. Go to **Repository → Settings → Environments**
2. Create three environments:
   ```
   - development
   - staging
   - production
   ```

3. For each environment, add environment-specific secrets:

   **Development Environment:**
   - All base secrets above
   - Optional: Less strict security policies
   - Optional: Deployment protection rules disabled

   **Staging Environment:**
   - All base secrets above (staging credentials)
   - Optional: Require manual approval before deploy

   **Production Environment:**
   - All base secrets above (production credentials)
   - REQUIRED: Require pull request reviews before deploy
   - REQUIRED: Require status checks to pass
   - Optional: Require manual approval

---

## Workflow Structure

### Job 1: Run Tests

**Purpose:** Validate code before any deployment

**Frontend Tests:**
```bash
npm ci
npm run build:check        # TypeScript type checking
npm run lint              # ESLint code quality
```

**Backend Tests:**
```bash
cd backend
npm ci
npm run typecheck         # TypeScript type checking
npm run lint             # ESLint code quality
npm run test:unit        # Unit tests
npm run test:integration # Integration tests (requires Supabase)
```

**Workers Tests:**
```bash
cd workers
npm ci
npm run build            # Type check and build
npm run lint             # Code quality
npm run test             # Unit tests (if any)
```

**Failure:** If any test fails, deployment is blocked (status: failed)

### Job 2: Deploy Frontend (Cloudflare Pages)

**Trigger:** Only runs if tests pass

**Steps:**
1. Checkout code
2. Setup Node.js
3. Determine environment (develop → dev, staging → staging, main → prod)
4. Build frontend: `npm run build`
5. Deploy to Cloudflare Pages using official action
6. Output deployment URL

**Environment Detection:**
```
develop  → development  → jobmatch-ai-dev
staging  → staging     → jobmatch-ai-staging
main     → production  → jobmatch-ai-production
```

**Build Variables:**
```
VITE_API_URL          = https://jobmatch-ai-{env}.workers.dev
VITE_SUPABASE_URL     = https://lrzhpnsykasqrousgmdh.supabase.co
VITE_SUPABASE_ANON_KEY = (from GitHub secrets)
VITE_USE_WORKERS_API  = "true"
VITE_CLOUDFLARE_PAGES = "true"
```

### Job 3: Deploy Backend (Cloudflare Workers)

**Trigger:** Only runs if tests pass

**Steps:**
1. Checkout code
2. Setup Node.js
3. Determine environment
4. Install dependencies: `cd workers && npm ci`
5. Deploy using Wrangler: `npx wrangler deploy --env {environment}`
6. Workers reads secrets from Cloudflare vault
7. Output deployment URL and status

---

## Complete Workflow Reference

Your current workflow at `.github/workflows/cloudflare-deploy.yml` is **99% complete**. Here are the key sections:

### Test Job (Already Correct)
```yaml
run-tests:
  name: Run Tests
  runs-on: ubuntu-latest
  timeout-minutes: 20

  steps:
    # Frontend tests
    - name: Run frontend type check
      run: npm run build:check

    # Backend tests
    - name: Run backend unit tests
      working-directory: backend
      run: npm run test:unit
```

### Frontend Deploy Job (Already Correct)
```yaml
deploy-frontend:
  name: Deploy Frontend to Cloudflare Pages
  runs-on: ubuntu-latest
  needs: run-tests  # Wait for tests

  environment:
    name: ${{ ... }}  # Determines development/staging/production

  steps:
    - name: Determine environment
      id: env
      run: |
        # Maps branches to environments

    - name: Build frontend
      env:
        VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      run: npm run build

    - name: Deploy to Cloudflare Pages
      uses: cloudflare/pages-action@v1
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### Backend Deploy Job (Already Correct)
```yaml
deploy-backend:
  name: Deploy Backend to Cloudflare Workers
  runs-on: ubuntu-latest
  needs: run-tests

  steps:
    - name: Deploy to Cloudflare Workers
      working-directory: workers
      env:
        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      run: npx wrangler deploy --env "${{ steps.env.outputs.environment }}"
```

---

## D1 Migrations in CI/CD (Optional Enhancement)

To run D1 migrations as part of CI/CD, add a migration job:

```yaml
# Add this job after deploy-backend succeeds
migrate-database:
  name: Run D1 Migrations
  runs-on: ubuntu-latest
  needs: deploy-backend
  if: github.event_name != 'workflow_dispatch'  # Skip for manual runs

  environment:
    name: ${{ github.ref_name == 'develop' && 'development' || (github.ref_name == 'staging' && 'staging' || 'production') }}

  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '22.x'
        cache: 'npm'

    - name: Install dependencies
      working-directory: workers
      run: npm ci

    - name: Run D1 migrations
      working-directory: workers
      env:
        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      run: |
        DEPLOY_ENV="${{ steps.env.outputs.environment }}"

        # List migrations
        npx wrangler d1 migrations list jobmatch-$DEPLOY_ENV --env $DEPLOY_ENV

        # Apply pending migrations
        npx wrangler d1 migrations apply jobmatch-$DEPLOY_ENV --env $DEPLOY_ENV
```

---

## Manual Deployment Trigger

The workflow supports manual deployment via GitHub UI:

1. Go to **Repository → Actions**
2. Click **Deploy to Cloudflare Pages** workflow
3. Click **Run workflow**
4. Select environment: development / staging / production
5. Click **Run workflow**

This allows deploying without pushing code (useful for emergency fixes).

---

## Secrets Setup Checklist

### Step 1: Create API Token
- [ ] Go to https://dash.cloudflare.com/profile/api-tokens
- [ ] Click "Create Token"
- [ ] Use template "Edit Cloudflare Workers"
- [ ] Add permissions:
  - [ ] Account → Cloudflare Pages → Edit
  - [ ] Account → Workers Scripts → Edit
- [ ] Set expiration to 1 year
- [ ] Copy token

### Step 2: Add GitHub Secrets
- [ ] Go to Repository → Settings → Secrets and variables → Actions
- [ ] Click "New repository secret"
- [ ] Add CLOUDFLARE_API_TOKEN
- [ ] Add CLOUDFLARE_ACCOUNT_ID
- [ ] Add SUPABASE_URL
- [ ] Add SUPABASE_ANON_KEY
- [ ] Add SUPABASE_SERVICE_ROLE_KEY

### Step 3: Create GitHub Environments
- [ ] Go to Repository → Settings → Environments
- [ ] Create "development" environment
- [ ] Create "staging" environment
- [ ] Create "production" environment

### Step 4: Add Environment Secrets
For each environment (development, staging, production):
- [ ] Add OPENAI_API_KEY
- [ ] Add SENDGRID_API_KEY
- [ ] Add APIFY_API_TOKEN
- [ ] Optional: Add LinkedIn secrets if using OAuth

### Step 5: Configure Branch Protection
- [ ] Go to Repository → Settings → Branches
- [ ] Add protection rule for "main"
  - [ ] Require pull request reviews
  - [ ] Require status checks to pass
  - [ ] Require branches to be up to date before merging
- [ ] Repeat for "staging" and "develop"

### Step 6: Test Workflow
- [ ] Push to develop branch
- [ ] Go to Actions tab
- [ ] Verify workflow runs
- [ ] Verify tests pass
- [ ] Verify deployments succeed

---

## Monitoring Deployments

### GitHub Actions Dashboard
```
Repository → Actions → Deploy to Cloudflare Pages
```

**What to check:**
- ✅ Tests: green checkmarks for all steps
- ✅ Frontend Deploy: URL shows https://jobmatch-ai-{env}.pages.dev
- ✅ Backend Deploy: Worker deployed to Cloudflare
- ✅ Status: All jobs completed successfully

### Cloudflare Dashboard
```
https://dash.cloudflare.com/
  → Workers & Pages
  → jobmatch-ai-{env}
  → Deployments tab
```

**What to check:**
- ✅ Latest deployment status
- ✅ Deployment time
- ✅ Worker script size
- ✅ Any errors or warnings

### Testing Deployments

**Frontend:**
```bash
# Development
curl -I https://jobmatch-ai-dev.pages.dev
# Expected: 200 OK

# Production
curl -I https://jobmatch-ai-production.pages.dev
```

**Backend:**
```bash
# Development
curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
# Expected: {"status": "healthy", "environment": "development"}

# Production
curl https://jobmatch-ai-prod.carl-f-frank.workers.dev/health
```

---

## Troubleshooting

### Issue: "Tests passed but deployment failed"

**Possible causes:**
1. Missing CLOUDFLARE_API_TOKEN
2. Invalid API token permissions
3. API token expired

**Solution:**
```bash
# Verify secrets are set
Go to Repository → Settings → Secrets

# Check token permissions
https://dash.cloudflare.com/profile/api-tokens
Click on token → Edit
Verify: Account → Cloudflare Pages → Edit
Verify: Account → Workers Scripts → Edit
```

### Issue: "Deployment succeeded but backend returns 500 errors"

**Possible causes:**
1. Missing Workers secrets (SUPABASE_URL, OPENAI_API_KEY, etc.)
2. Incorrect secret values
3. D1 database not initialized

**Solution:**
```bash
cd workers

# List current secrets
npx wrangler secret list --env production

# Verify all required secrets exist
# If missing, add via CLI:
npx wrangler secret put SUPABASE_URL --env production
npx wrangler secret put OPENAI_API_KEY --env production

# Check recent logs
npx wrangler tail --env production
```

### Issue: "Frontend deployed but shows blank page"

**Possible causes:**
1. Build failed silently
2. Missing VITE_* environment variables
3. API URL misconfiguration

**Solution:**
```bash
# Check GitHub Actions logs
Repository → Actions → Latest run → Deploy Frontend job

# Look for build step errors
# Verify VITE_API_URL is correct

# Test build locally
npm install
npm run build
npm run preview
```

### Issue: "Workers deployment times out"

**Possible causes:**
1. Large bundle size
2. Cloudflare API rate limiting
3. Network connectivity

**Solution:**
```bash
cd workers

# Check bundle size
npx wrangler publish --dry-run --env development

# Size should be < 1MB
# If > 1MB, optimize imports and tree-shaking

# Try deploying manually
npx wrangler deploy --env development

# Check Cloudflare API status
curl https://www.cloudflarestatus.com/
```

---

## Environment Variables Reference

### Frontend Build Variables

**Set via GitHub Secrets → Environment:**

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `VITE_API_URL` | https://jobmatch-ai-dev.workers.dev | https://jobmatch-ai-staging.workers.dev | https://jobmatch-ai-prod.workers.dev |
| `VITE_SUPABASE_URL` | https://lrzhpnsykasqrousgmdh.supabase.co | https://lrzhpnsykasqrousgmdh.supabase.co | https://lrzhpnsykasqrousgmdh.supabase.co |
| `VITE_SUPABASE_ANON_KEY` | (GitHub secret) | (GitHub secret) | (GitHub secret) |

### Workers Runtime Variables

**Set via `wrangler secret put` (in wrangler vault):**

| Secret | Source | Environment |
|--------|--------|-------------|
| `SUPABASE_URL` | Supabase Dashboard | All |
| `SUPABASE_ANON_KEY` | Supabase Dashboard | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard | All |
| `OPENAI_API_KEY` | OpenAI Dashboard | All |
| `SENDGRID_API_KEY` | SendGrid Dashboard | All |
| `APIFY_API_TOKEN` | Apify Console | All |
| `LINKEDIN_CLIENT_ID` | LinkedIn Developer Portal | Optional |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn Developer Portal | Optional |

---

## Security Best Practices

### 1. API Token Rotation
```bash
# Rotate API token every 90 days
# https://dash.cloudflare.com/profile/api-tokens
# - Create new token
# - Update GitHub secrets
# - Delete old token
```

### 2. Secret Isolation
```yaml
# Development secrets should differ from production
# Update secrets per environment in GitHub

GitHub Environments:
  development:
    - OPENAI_API_KEY: sk-dev-...
    - SENDGRID_API_KEY: SG_dev_...

  production:
    - OPENAI_API_KEY: sk-prod-...
    - SENDGRID_API_KEY: SG_prod_...
```

### 3. Least Privilege
```
CLOUDFLARE_API_TOKEN:
  - Only: Cloudflare Pages (Edit)
  - Only: Workers Scripts (Edit)
  - Not: DNS, Firewall, SSL/TLS
  - Expiration: 1 year
```

### 4. Protected Branches
```
Require before merge:
  - Pull request reviews (1+ approval)
  - Status checks pass (tests, linting)
  - Branches up to date
  - No dismissals allowed

Apply to: main, staging, develop
```

---

## Deployment Flow Summary

### Automatic Deployments

**Push to develop:**
```
$ git push origin develop

GitHub Actions:
  1. Run tests (5 min)
  2. Deploy frontend → https://jobmatch-ai-dev.pages.dev (1 min)
  3. Deploy backend → https://jobmatch-ai-dev.workers.dev (30 sec)

Total: ~6.5 minutes
```

**Push to staging:**
```
$ git push origin staging

GitHub Actions:
  1. Run tests (5 min)
  2. Deploy frontend → https://jobmatch-ai-staging.pages.dev (1 min)
  3. Deploy backend → https://jobmatch-ai-staging.workers.dev (30 sec)

Total: ~6.5 minutes
```

**Push to main:**
```
$ git push origin main

GitHub Actions:
  1. Run tests (5 min)
  2. Deploy frontend → https://jobmatch-ai-production.pages.dev (1 min)
  3. Deploy backend → https://jobmatch-ai-prod.workers.dev (30 sec)

Total: ~6.5 minutes
```

### Manual Deployments

**Via GitHub UI:**
```
Repository → Actions → Deploy to Cloudflare Pages
→ Run workflow → Select environment → Run

Runs the same tests and deployment process
```

---

## Next Steps

1. **Configure GitHub Secrets** (This Hour)
   - Add CLOUDFLARE_API_TOKEN
   - Add CLOUDFLARE_ACCOUNT_ID
   - Add Supabase secrets
   - Add application secrets per environment

2. **Create GitHub Environments** (This Hour)
   - Create development, staging, production
   - Add environment-specific secrets
   - Configure protection rules

3. **Test CI/CD Pipeline** (This Hour)
   - Push to develop branch
   - Monitor GitHub Actions
   - Verify deployments succeed

4. **Configure Branch Protection** (This Hour)
   - Require status checks
   - Require pull request reviews
   - Require up-to-date branches

5. **Document for Team** (Next hour)
   - Share this guide
   - Explain deployment flow
   - Establish deployment guidelines

---

## References

- [Cloudflare GitHub Actions Guide](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

**Status:** ✅ Workflow file exists, ready for secrets configuration
