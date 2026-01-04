# Cloudflare Workers - Deployment Guide

**Date:** 2025-12-31
**Purpose:** Complete Workers deployment setup and CI/CD integration
**Status:** Ready for production

---

## Overview

Cloudflare Workers hosts your Hono API backend. This guide covers:

1. **CI/CD Deployment** - GitHub Actions automated deployment
2. **Secret Management** - Secure API key storage
3. **Environment Management** - Dev/staging/prod setup
4. **Deployment Validation** - Verify deployments work
5. **Monitoring & Debugging** - View logs and errors

---

## Architecture

Your Workers setup:
```
workers/
├── wrangler.toml           # Config + bindings + environments
├── api/
│   ├── index.ts            # Hono app entry point
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   └── middleware/         # Auth, validation, etc.
├── migrations/             # D1 schema migrations
└── package.json            # Dependencies
```

**Deployed to:**
```
Development:  https://jobmatch-ai-dev.carl-f-frank.workers.dev
Staging:      https://jobmatch-ai-staging.carl-f-frank.workers.dev
Production:   https://jobmatch-ai-prod.carl-f-frank.workers.dev
```

---

## Deployment Flow

### Automatic Deployment via GitHub Actions

**Workflow:** `.github/workflows/cloudflare-deploy.yml`

```
Push to branch (develop/staging/main)
    ↓
Run Tests
    ├─ Frontend: type check, lint
    ├─ Backend: type check, lint, unit tests, integration tests
    └─ Workers: build
    ↓
IF ALL TESTS PASS ✓
    ↓
Deploy Frontend (Cloudflare Pages)
    ↓
Deploy Backend (Cloudflare Workers)
    ├─ Install dependencies: npm ci
    ├─ Deploy: npx wrangler deploy --env {environment}
    └─ Load secrets from Cloudflare vault
    ↓
DONE ✅
```

**Timeline:** ~6-7 minutes total

---

## GitHub Actions Setup

### Secrets Required

Navigate to: **Repository → Settings → Secrets and variables → Actions**

**Add these repository secrets:**
```
CLOUDFLARE_API_TOKEN
  Get from: https://dash.cloudflare.com/profile/api-tokens
  Permissions needed:
    - Account → Cloudflare Pages → Edit
    - Account → Workers Scripts → Edit
  Expiration: 1 year
  Type: Repository secret (available to all environments)

CLOUDFLARE_ACCOUNT_ID
  Value: 280c58ea17d9fe3235c33bd0a52a256b
  Type: Repository secret
```

**Example:**
```
Name: CLOUDFLARE_API_TOKEN
Value: v1.0d3bea1cfcd1c2mZkSUc8a6e3c3c3d3...

Name: CLOUDFLARE_ACCOUNT_ID
Value: 280c58ea17d9fe3235c33bd0a52a256b
```

### Environment Secrets (Per Environment)

Create GitHub Environments: **Repository → Settings → Environments**

**Create environments:**
- development
- staging
- production

**Add to each environment:**
```
OPENAI_API_KEY
  Get from: https://platform.openai.com/account/api-keys
  Type: Environment secret

SENDGRID_API_KEY (optional)
  Get from: https://app.sendgrid.com/settings/api_keys
  Type: Environment secret

APIFY_API_TOKEN
  Get from: https://console.apify.com/account/integrations
  Type: Environment secret

LINKEDIN_CLIENT_ID (optional)
  Get from: LinkedIn Developer Portal
  Type: Environment secret

LINKEDIN_CLIENT_SECRET (optional)
  Get from: LinkedIn Developer Portal
  Type: Environment secret

LINKEDIN_REDIRECT_URI (optional)
  Value: https://jobmatch-ai-{env}.pages.dev/auth/linkedin/callback
  Type: Environment secret
```

---

## Worker Secrets Management

Workers secrets are stored in Cloudflare's secure vault (different from GitHub secrets).

### Setting Secrets via CLI

**One-time setup (do this once per environment):**

```bash
cd workers

# Login to Cloudflare
npx wrangler login

# Set secrets for DEVELOPMENT
npx wrangler secret put SUPABASE_URL --env development
# Paste: https://lrzhpnsykasqrousgmdh.supabase.co

npx wrangler secret put SUPABASE_ANON_KEY --env development
# Paste: your-supabase-anon-key

npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env development
# Paste: your-supabase-service-role-key

npx wrangler secret put OPENAI_API_KEY --env development
# Paste: sk-proj-...

npx wrangler secret put SENDGRID_API_KEY --env development
# Paste: SG.xxx

npx wrangler secret put APIFY_API_TOKEN --env development
# Paste: your-apify-token

npx wrangler secret put APP_URL --env development
# Paste: https://jobmatch-ai-dev.pages.dev

# Repeat for STAGING and PRODUCTION
npx wrangler secret put SUPABASE_URL --env staging
npx wrangler secret put SUPABASE_URL --env production
# ... etc for all secrets
```

### Verifying Secrets

```bash
# List secrets for an environment
npx wrangler secret list --env production

# Output:
# name: SUPABASE_URL
# name: SUPABASE_ANON_KEY
# name: SUPABASE_SERVICE_ROLE_KEY
# name: OPENAI_API_KEY
# name: SENDGRID_API_KEY
# name: APIFY_API_TOKEN
# name: APP_URL
```

### Setting Secrets via GitHub Actions (CI/CD)

If you want to automate secret setup via CI/CD:

```yaml
# Add to .github/workflows/cloudflare-deploy.yml

set-secrets:
  name: Set Workers Secrets
  runs-on: ubuntu-latest
  needs: run-tests

  strategy:
    matrix:
      environment: [development, staging, production]

  steps:
    - name: Set SUPABASE_URL secret
      env:
        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      run: |
        cd workers
        npx wrangler secret put SUPABASE_URL \
          --env ${{ matrix.environment }} \
          << EOF
        $SUPABASE_URL
        EOF

    # Repeat for other secrets
```

**Recommendation:** Use manual CLI setup (simpler) unless you change secrets frequently

---

## Deployment via GitHub Actions

### Automatic Deployment

Just push to a branch:

```bash
# Deploy to development
git push origin develop

# Deploy to staging
git push origin staging

# Deploy to production
git push origin main
```

**GitHub Actions automatically:**
1. Runs all tests
2. Deploys Workers via Wrangler
3. Loads secrets from Cloudflare vault
4. Outputs deployment URL

### Manual Deployment

Trigger workflow manually without code push:

1. Go to **Repository → Actions**
2. Click **Deploy to Cloudflare Pages** workflow
3. Click **Run workflow**
4. Select environment: development / staging / production
5. Click **Run workflow**

---

## Environment Configuration

### Development Deployment

**Trigger:** Push to `develop` branch

**Configuration in wrangler.toml:**
```toml
[env.development]
name = "jobmatch-ai-dev"

[[env.development.d1_databases]]
binding = "DB"
database_id = "8140efd5-9912-4e31-981d-0566f1efe9dc"
database_name = "jobmatch-dev"

[[env.development.kv_namespaces]]
binding = "JOB_ANALYSIS_CACHE"
id = "fce1eb2547c14cd0811521246fec5c76"

# ... more bindings
```

**Deployed to:** https://jobmatch-ai-dev.carl-f-frank.workers.dev

**Secrets:** Development versions of all secrets

### Staging Deployment

**Trigger:** Push to `staging` branch

**Configuration in wrangler.toml:**
```toml
[env.staging]
name = "jobmatch-ai-staging"

[[env.staging.d1_databases]]
binding = "DB"
database_id = "84b09169-503f-4e40-91c1-b3828272c2e3"
database_name = "jobmatch-staging"

# ... more bindings
```

**Deployed to:** https://jobmatch-ai-staging.carl-f-frank.workers.dev

**Secrets:** Staging versions of all secrets

### Production Deployment

**Trigger:** Push to `main` branch (requires PR approval)

**Configuration in wrangler.toml:**
```toml
[env.production]
name = "jobmatch-ai-prod"

[[env.production.d1_databases]]
binding = "DB"
database_id = "06159734-6a06-4c4c-89f6-267e47cb8d30"
database_name = "jobmatch-prod"

# ... more bindings
```

**Deployed to:** https://jobmatch-ai-prod.carl-f-frank.workers.dev

**Secrets:** Production versions of all secrets (most sensitive)

---

## Deployment Validation

### Check Deployment Status

**Via GitHub Actions:**
```
Repository → Actions → Deploy to Cloudflare Pages workflow
→ Latest run → deploy-backend job
```

Look for:
- ✅ "Deploy to Cloudflare Workers" step completed
- ✅ No errors in logs
- ✅ Deployment summary shows success

**Via Cloudflare Dashboard:**
```
https://dash.cloudflare.com/
→ Workers & Pages
→ jobmatch-ai-{env}
→ Deployments tab
```

### Test Health Endpoint

```bash
# Development
curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
# Expected: {"status": "healthy", "environment": "development", "timestamp": "..."}

# Staging
curl https://jobmatch-ai-staging.carl-f-frank.workers.dev/health
# Expected: {"status": "healthy", "environment": "staging", "timestamp": "..."}

# Production
curl https://jobmatch-ai-prod.carl-f-frank.workers.dev/health
# Expected: {"status": "healthy", "environment": "production", "timestamp": "..."}
```

### Test API Endpoint

```bash
# Get health with authentication (if required)
curl -H "Authorization: Bearer {jwt-token}" \
  https://jobmatch-ai-prod.carl-f-frank.workers.dev/api/applications

# Should return: successful response or auth error (not 500)
```

### Check Logs

```bash
# Stream real-time logs
npx wrangler tail --env production

# View build logs
npx wrangler deployments list --env production
npx wrangler deployments view {deployment-id} --env production
```

---

## Troubleshooting

### Issue: Deployment Failed in GitHub Actions

**Error:** "Deploy to Cloudflare Workers failed"

**Check:**
1. Go to GitHub Actions logs
2. Find "Deploy to Cloudflare Workers" step
3. Read error message

**Common causes and solutions:**

```bash
# 1. Missing CLOUDFLARE_API_TOKEN
Error: "Unauthorized"
Solution: Add CLOUDFLARE_API_TOKEN to GitHub secrets

# 2. Invalid API token
Error: "Invalid API token"
Solution:
  - Regenerate token: https://dash.cloudflare.com/profile/api-tokens
  - Update GitHub secret

# 3. API token expired
Error: "Credentials invalid"
Solution: Rotate token every 90 days

# 4. Missing CLOUDFLARE_ACCOUNT_ID
Error: "accountId is required"
Solution: Add CLOUDFLARE_ACCOUNT_ID to GitHub secrets (value: 280c58ea17d9fe3235c33bd0a52a256b)

# 5. Workers build error
Error: "Error building Workers"
Solution:
  - Check: npm run build in workers directory
  - Check: npx wrangler deploy --dry-run
  - Review TypeScript errors: npm run typecheck
```

### Issue: Worker Returns 500 Errors

**Possible causes:**
1. Missing secrets in Cloudflare vault
2. Incorrect secret values
3. Database connection failure
4. API key invalid

**Check secrets:**
```bash
# List secrets
npx wrangler secret list --env production

# Should see:
# name: SUPABASE_URL
# name: SUPABASE_ANON_KEY
# name: SUPABASE_SERVICE_ROLE_KEY
# name: OPENAI_API_KEY
# etc

# If missing, add them:
npx wrangler secret put OPENAI_API_KEY --env production
```

**Check logs:**
```bash
# Stream logs
npx wrangler tail --env production

# Look for error messages
# Should show request logs and any errors
```

**Test API connectivity:**
```bash
# Test Supabase connection
curl https://jobmatch-ai-prod.workers.dev/health

# If returns error, check:
# - SUPABASE_URL is correct
# - SUPABASE_ANON_KEY is valid
# - Database is accessible

# Test OpenAI connection
# Make request that uses OpenAI (requires auth)
```

### Issue: Workers Build Size Too Large

**Error:** "Workers script exceeds size limit"

**Check size:**
```bash
cd workers
npx wrangler publish --dry-run --env production

# Output shows bundle size
# Must be < 1MB for free, < 10MB for paid
```

**Optimize:**
```bash
# 1. Remove unused dependencies
npm list
npm prune --production

# 2. Check bundle analysis
# In package.json, add:
"bundle-analyze": "vite-bundle-visualizer"

# 3. Lazy load heavy dependencies
# Only import when needed

# 4. Use Tree-shaking
# Ensure all imports are used
```

### Issue: Secrets Not Available in Worker

**Error:** Worker code tries to read secret but gets undefined

**Cause:** Secret not set in Cloudflare vault (different from GitHub secrets)

**Solution:**
```bash
# Set secret in Cloudflare vault
npx wrangler secret put SUPABASE_URL --env production

# Verify it's set
npx wrangler secret list --env production

# Redeploy
npx wrangler deploy --env production
```

**Important:** GitHub secrets ≠ Cloudflare secrets!
- GitHub secrets: Used by GitHub Actions workflow
- Cloudflare secrets: Used by running Worker code

---

## Local Development

### Run Worker Locally

```bash
cd workers

# Start local development server
npm run dev

# Output:
# ⛅ wrangler (version X.X.X)
# ▶ [wrangler] Serving at http://localhost:8787/

# Test endpoint
curl http://localhost:8787/health
```

### Run Worker with Bindings

```bash
# Use development environment bindings
npm run dev -- --env development

# Worker has access to:
# - Development D1 database
# - Development KV namespaces
# - Development R2 buckets
# - Development secrets
```

### Debug Worker

```bash
# Enable verbose logging
npm run dev -- --log-level debug

# Or in code, add logging
console.log("Request:", request);
console.log("Database:", env.DB);
```

---

## Monitoring

### Deployment History

```bash
# List recent deployments
npx wrangler deployments list --env production

# View specific deployment
npx wrangler deployments view {deployment-id} --env production
```

### Real-time Logs

```bash
# Stream logs
npx wrangler tail --env production

# Output:
# [2025-12-31 14:30:45] GET /api/applications 200 OK
# [2025-12-31 14:30:46] POST /api/applications 201 Created
# [2025-12-31 14:30:47] GET /health 200 OK
```

### Cloudflare Analytics

In Cloudflare Dashboard:

```
Workers & Pages
→ jobmatch-ai-prod
→ Analytics
```

View:
- Request count
- Response time
- Error rates
- Bandwidth usage
- Geographic distribution

---

## Deployment Checklist

**Before Deploying to Production:**

- [ ] Code changes pushed to feature branch
- [ ] Created PR with description
- [ ] PR review completed
- [ ] All tests pass (green checkmarks in GitHub)
- [ ] ESLint passes
- [ ] TypeScript type check passes
- [ ] No console errors in local dev
- [ ] CLOUDFLARE_API_TOKEN configured in GitHub secrets
- [ ] CLOUDFLARE_ACCOUNT_ID configured in GitHub secrets
- [ ] All required secrets set in Cloudflare vault
- [ ] wrangler.toml has correct environment bindings

**After Deployment:**

- [ ] Check GitHub Actions logs (all green)
- [ ] Test health endpoint returns 200
- [ ] Test API endpoints with real data
- [ ] Check Cloudflare logs for errors
- [ ] Monitor error rates in Analytics
- [ ] No customer-facing errors reported

---

## Rollback Procedure

If deployment causes issues:

### Option 1: Quick Rollback via Git

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# GitHub Actions automatically deploys previous version
# Takes ~7 minutes

# Verify rollback
curl https://jobmatch-ai-prod.workers.dev/health
```

### Option 2: Deploy Previous Version via CLI

```bash
# View recent deployments
npx wrangler deployments list --env production

# If you can identify the working deployment ID:
# Unfortunately Wrangler doesn't support direct rollback
# Use Option 1 (git revert) instead
```

### Option 3: Disable Worker Temporarily

```bash
# Go to Cloudflare Dashboard
# Workers & Pages → jobmatch-ai-prod
# Click "Disable"

# Requests return 523 (Service Unavailable)
# Allows time to fix and redeploy

# Re-enable after fix
# Click "Enable"
```

---

## Security Best Practices

### 1. Secret Rotation

Rotate secrets every 90 days:

```bash
# 1. Generate new secret in service (e.g., OpenAI API)
# 2. Update in Cloudflare vault
npx wrangler secret put OPENAI_API_KEY --env production
# Paste new key

# 3. Verify it works with test
curl https://jobmatch-ai-prod.workers.dev/health

# 4. Retire old secret in service
```

### 2. API Token Security

Your CLOUDFLARE_API_TOKEN:
- ✅ Rotate every 90 days
- ✅ Use least-privilege permissions (only Workers + Pages)
- ✅ Store only in GitHub secrets (not Git)
- ✅ Monitor for suspicious activity

### 3. Branch Protection

Require approval before deploying to production:

```
Repository → Settings → Branches
→ Add rule for main
→ Require pull request reviews (minimum 1)
→ Require status checks to pass (GitHub Actions)
→ Require branches to be up to date
```

### 4. Least Privilege Secrets

Never share production secrets:
- Each developer only needs development secrets
- Staging team gets staging secrets
- Only SRE/DevOps get production secrets

---

## Cost Considerations

### Free Tier Limits
- 100,000 requests/day
- 10ms CPU time per request
- 128MB memory
- 1MB request/response body
- 30 second request duration

### Paid Tier
- Unlimited requests
- 50ms CPU time per request
- Same memory/size limits
- 300 second request duration
- $0.50/million requests

Your project likely uses **Free Tier** (development/testing)

---

## Next Steps

1. **Set GitHub Secrets** (This Hour)
   - CLOUDFLARE_API_TOKEN
   - CLOUDFLARE_ACCOUNT_ID
   - SUPABASE_* secrets

2. **Set Cloudflare Secrets** (This Hour)
   - npx wrangler secret put for each environment
   - OPENAI_API_KEY, SENDGRID_API_KEY, etc.

3. **Test Deployments** (This Hour)
   - Push to develop → verify deployment
   - Verify health endpoint works
   - Test API endpoints

4. **Configure Branch Protection** (This Hour)
   - Require PR reviews for main
   - Require status checks to pass

5. **Document & Communicate** (Next Hour)
   - Share deployment process with team
   - Create runbooks for incidents
   - Establish on-call rotation

---

## References

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Actions CI/CD](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [Secret Management](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Monitoring & Debugging](https://developers.cloudflare.com/workers/observability/)

---

**Status:** ✅ Ready for production deployment
