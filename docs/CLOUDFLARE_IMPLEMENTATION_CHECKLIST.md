# Cloudflare CI/CD Implementation - Step-by-Step Checklist

**Date:** 2025-12-31
**Project:** JobMatch AI - Cloudflare Workers Migration
**Estimated Time:** 1-2 hours total
**Complexity:** Medium (mostly configuration, no coding)

---

## Phase 1: GitHub Secrets Setup (15 minutes)

### Step 1.1: Get Cloudflare API Token

**Time:** 5 minutes

- [ ] Go to: https://dash.cloudflare.com/profile/api-tokens
- [ ] Click "Create Token"
- [ ] Under "Create Custom Token":
  - [ ] Name: `GitHub Actions - JobMatch AI`
  - [ ] Permissions:
    - [ ] Account → Cloudflare Pages → Edit
    - [ ] Account → Workers Scripts → Edit
  - [ ] Account resources: All accounts
  - [ ] TTL: 1 year (or max available)
  - [ ] Click "Create Token"
- [ ] Copy the token value (you won't see it again!)
- [ ] Save to notepad temporarily

**Expected:** Long string like `v1.0d3bea1cfcd1...`

---

### Step 1.2: Get Cloudflare Account ID

**Time:** 2 minutes

- [ ] Go to: https://dash.cloudflare.com/
- [ ] Look at browser URL: `https://dash.cloudflare.com/{ACCOUNT_ID}`
- [ ] Or right sidebar on any page shows "Account ID"
- [ ] Value should be: `280c58ea17d9fe3235c33bd0a52a256b`
- [ ] Save this value

---

### Step 1.3: Get Supabase Credentials

**Time:** 3 minutes

- [ ] Go to: https://app.supabase.com/
- [ ] Select project: `lrzhpnsykasqrousgmdh`
- [ ] Click "Settings" (bottom left)
- [ ] Click "API"
- [ ] Copy:
  - [ ] **Project URL**: `https://lrzhpnsykasqrousgmdh.supabase.co`
  - [ ] **anon public key**: Starts with `eyJ...`
  - [ ] **service_role secret**: Starts with `eyJ...` (different from anon key)
- [ ] Save all three values

---

### Step 1.4: Add GitHub Repository Secrets

**Time:** 5 minutes

- [ ] Go to: https://github.com/application-tracking/jobmatch-ai
- [ ] Click **Settings** (top menu)
- [ ] Click **Secrets and variables** (left sidebar)
- [ ] Click **Actions**
- [ ] Click **New repository secret**

**Add Secret 1: CLOUDFLARE_API_TOKEN**
- [ ] Name: `CLOUDFLARE_API_TOKEN`
- [ ] Secret: (paste from Step 1.1)
- [ ] Click **Add secret**

**Add Secret 2: CLOUDFLARE_ACCOUNT_ID**
- [ ] Click **New repository secret**
- [ ] Name: `CLOUDFLARE_ACCOUNT_ID`
- [ ] Secret: `280c58ea17d9fe3235c33bd0a52a256b`
- [ ] Click **Add secret**

**Add Secret 3: SUPABASE_URL**
- [ ] Click **New repository secret**
- [ ] Name: `SUPABASE_URL`
- [ ] Secret: `https://lrzhpnsykasqrousgmdh.supabase.co`
- [ ] Click **Add secret**

**Add Secret 4: SUPABASE_ANON_KEY**
- [ ] Click **New repository secret**
- [ ] Name: `SUPABASE_ANON_KEY`
- [ ] Secret: (paste anon key from Step 1.3)
- [ ] Click **Add secret**

**Add Secret 5: SUPABASE_SERVICE_ROLE_KEY**
- [ ] Click **New repository secret**
- [ ] Name: `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Secret: (paste service_role key from Step 1.3)
- [ ] Click **Add secret**

**Verification:**
- [ ] Go back to **Settings → Secrets and variables → Actions**
- [ ] You should see 5 secrets listed:
  - [ ] CLOUDFLARE_API_TOKEN
  - [ ] CLOUDFLARE_ACCOUNT_ID
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY

---

## Phase 2: GitHub Environments Setup (15 minutes)

### Step 2.1: Create Development Environment

**Time:** 5 minutes

- [ ] Go to: https://github.com/application-tracking/jobmatch-ai/settings/environments
- [ ] Click **New environment**
- [ ] Name: `development`
- [ ] Click **Configure environment**
- [ ] Under "Environment secrets", click **Add secret**

**Add Development Secrets:**

**Secret 1: OPENAI_API_KEY**
- [ ] Name: `OPENAI_API_KEY`
- [ ] Value: (from https://platform.openai.com/account/api-keys)
- [ ] Click **Add secret**

**Secret 2: SENDGRID_API_KEY**
- [ ] Click **Add secret**
- [ ] Name: `SENDGRID_API_KEY`
- [ ] Value: (from https://app.sendgrid.com/settings/api_keys)
- [ ] Click **Add secret**

**Secret 3: APIFY_API_TOKEN**
- [ ] Click **Add secret**
- [ ] Name: `APIFY_API_TOKEN`
- [ ] Value: (from https://console.apify.com/account/integrations)
- [ ] Click **Add secret**

**Verification:**
- [ ] Development environment shows 3 secrets

---

### Step 2.2: Create Staging Environment

**Time:** 5 minutes

- [ ] Click **New environment** (same page)
- [ ] Name: `staging`
- [ ] Click **Configure environment**
- [ ] Add same 3 secrets as development (might be same values or staging-specific)

**Verification:**
- [ ] Staging environment shows 3 secrets

---

### Step 2.3: Create Production Environment

**Time:** 5 minutes

- [ ] Click **New environment**
- [ ] Name: `production`
- [ ] Click **Configure environment**
- [ ] Add 3 secrets (OPENAI_API_KEY, SENDGRID_API_KEY, APIFY_API_TOKEN)
- [ ] **Optional:** Enable "Require approval before deploying" for extra safety

**Verification:**
- [ ] Production environment shows 3 secrets
- [ ] All environments listed:
  - [ ] development
  - [ ] staging
  - [ ] production

---

## Phase 3: Cloudflare Secrets Setup (30 minutes)

### Step 3.1: Setup Development Environment

**Time:** 10 minutes

**Open terminal:**
```bash
cd /home/carl/application-tracking/jobmatch-ai/workers
npx wrangler login
```

- [ ] Opens browser window for authentication
- [ ] Click "Allow" to authorize
- [ ] Return to terminal

**Set SUPABASE_URL:**
```bash
npx wrangler secret put SUPABASE_URL --env development
```
- [ ] Paste: `https://lrzhpnsykasqrousgmdh.supabase.co`
- [ ] Press Ctrl+D or Cmd+D to submit

**Set SUPABASE_ANON_KEY:**
```bash
npx wrangler secret put SUPABASE_ANON_KEY --env development
```
- [ ] Paste: (your Supabase anon key)
- [ ] Press Ctrl+D

**Set SUPABASE_SERVICE_ROLE_KEY:**
```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env development
```
- [ ] Paste: (your Supabase service role key)
- [ ] Press Ctrl+D

**Set OPENAI_API_KEY:**
```bash
npx wrangler secret put OPENAI_API_KEY --env development
```
- [ ] Paste: (from platform.openai.com)
- [ ] Press Ctrl+D

**Set SENDGRID_API_KEY:**
```bash
npx wrangler secret put SENDGRID_API_KEY --env development
```
- [ ] Paste: (from sendgrid.com)
- [ ] Press Ctrl+D

**Set APIFY_API_TOKEN:**
```bash
npx wrangler secret put APIFY_API_TOKEN --env development
```
- [ ] Paste: (from apify.com)
- [ ] Press Ctrl+D

**Set APP_URL:**
```bash
npx wrangler secret put APP_URL --env development
```
- [ ] Paste: `https://jobmatch-ai-dev.pages.dev`
- [ ] Press Ctrl+D

**Verify:**
```bash
npx wrangler secret list --env development
```
- [ ] Should show 7 secrets listed

---

### Step 3.2: Setup Staging Environment

**Time:** 10 minutes

Repeat the same commands but with `--env staging`:

```bash
npx wrangler secret put SUPABASE_URL --env staging
npx wrangler secret put SUPABASE_ANON_KEY --env staging
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging
npx wrangler secret put OPENAI_API_KEY --env staging
npx wrangler secret put SENDGRID_API_KEY --env staging
npx wrangler secret put APIFY_API_TOKEN --env staging
npx wrangler secret put APP_URL --env staging
# Paste: https://jobmatch-ai-staging.pages.dev

npx wrangler secret list --env staging
```

- [ ] All 7 secrets listed for staging

---

### Step 3.3: Setup Production Environment

**Time:** 10 minutes

Repeat the same commands but with `--env production`:

```bash
npx wrangler secret put SUPABASE_URL --env production
npx wrangler secret put SUPABASE_ANON_KEY --env production
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
npx wrangler secret put OPENAI_API_KEY --env production
npx wrangler secret put SENDGRID_API_KEY --env production
npx wrangler secret put APIFY_API_TOKEN --env production
npx wrangler secret put APP_URL --env production
# Paste: https://jobmatch-ai-production.pages.dev

npx wrangler secret list --env production
```

- [ ] All 7 secrets listed for production

**Verification - List all secrets for all environments:**
```bash
echo "=== Development ==="
npx wrangler secret list --env development

echo "=== Staging ==="
npx wrangler secret list --env staging

echo "=== Production ==="
npx wrangler secret list --env production
```

- [ ] Each environment shows 7 secrets
- [ ] No errors about missing secrets

---

## Phase 4: Branch Protection Setup (10 minutes)

### Step 4.1: Protect Develop Branch

**Time:** 3 minutes

- [ ] Go to: https://github.com/application-tracking/jobmatch-ai/settings/branches
- [ ] Click **Add rule**
- [ ] Branch name pattern: `develop`
- [ ] Check: ✅ "Require status checks to pass before merging"
- [ ] Search and select: `run-tests`, `deploy-frontend`, `deploy-backend`
- [ ] Check: ✅ "Require branches to be up to date before merging"
- [ ] Click **Create**

---

### Step 4.2: Protect Staging Branch

**Time:** 3 minutes

- [ ] Click **Add rule**
- [ ] Branch name pattern: `staging`
- [ ] Check: ✅ "Require pull request reviews before merging" (set to 1)
- [ ] Check: ✅ "Require status checks to pass before merging"
- [ ] Select: `run-tests`, `deploy-frontend`, `deploy-backend`
- [ ] Check: ✅ "Require branches to be up to date before merging"
- [ ] Click **Create**

---

### Step 4.3: Protect Main Branch

**Time:** 4 minutes

- [ ] Click **Add rule**
- [ ] Branch name pattern: `main`
- [ ] Check: ✅ "Require a pull request before merging"
- [ ] Check: ✅ "Require pull request reviews before merging" (set to 1)
- [ ] Check: ✅ "Require status checks to pass before merging"
- [ ] Select: `run-tests`, `deploy-frontend`, `deploy-backend`
- [ ] Check: ✅ "Require branches to be up to date before merging"
- [ ] Check: ✅ "Require conversation resolution before merging"
- [ ] Click **Create**

**Verification:**
- [ ] Three branch protection rules listed:
  - [ ] develop
  - [ ] staging
  - [ ] main

---

## Phase 5: Test Deployment (15 minutes)

### Step 5.1: Push to Develop

**Time:** 2 minutes

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Make sure you're on develop
git checkout develop

# Make a small change (or skip if nothing to commit)
echo "# Test deployment on $(date)" >> DEPLOYMENT_TEST.md
git add DEPLOYMENT_TEST.md
git commit -m "test: trigger CI/CD pipeline"

# Push to develop
git push origin develop
```

- [ ] Push succeeds
- [ ] No errors about protected branch (develop doesn't require PR)

---

### Step 5.2: Monitor GitHub Actions

**Time:** 8 minutes

- [ ] Go to: https://github.com/application-tracking/jobmatch-ai/actions
- [ ] Find latest workflow run labeled "Deploy to Cloudflare Pages"
- [ ] Click on the run to expand

**Watch the stages:**
- [ ] **run-tests job** (5 min)
  - [ ] Frontend type check ✅
  - [ ] Frontend linter ✅
  - [ ] Backend type check ✅
  - [ ] Backend linter ✅
  - [ ] Backend unit tests ✅
  - [ ] Backend integration tests ✅

**If tests FAIL:**
→ Go to Phase 6: Troubleshooting

**If tests PASS, continue:**
- [ ] **deploy-frontend job** (1 min)
  - [ ] Checkout code ✅
  - [ ] Setup Node.js ✅
  - [ ] Install dependencies ✅
  - [ ] Determine environment ✅
  - [ ] Build frontend ✅
  - [ ] Deploy to Cloudflare Pages ✅
  - [ ] Deployment summary ✅

- [ ] **deploy-backend job** (1 min)
  - [ ] Checkout code ✅
  - [ ] Setup Node.js ✅
  - [ ] Determine environment ✅
  - [ ] Install dependencies ✅
  - [ ] Deploy to Cloudflare Workers ✅
  - [ ] Deployment summary ✅

**Result:** All jobs should show ✅ green checkmarks

---

### Step 5.3: Verify Deployments

**Time:** 5 minutes

**Test Frontend:**
```bash
# Should return HTML (not error)
curl -I https://jobmatch-ai-dev.pages.dev
# Expected: HTTP/2 200
```

- [ ] Returns 200 OK
- [ ] Try visiting in browser: https://jobmatch-ai-dev.pages.dev
- [ ] Page should load (no blank page)

**Test Backend Health:**
```bash
# Should return healthy status
curl https://jobmatch-ai-dev.workers.dev/health
# Expected: {"status": "healthy", "environment": "development", "timestamp": "..."}
```

- [ ] Returns 200 OK
- [ ] JSON response shows "status": "healthy"
- [ ] Environment shows "development"

**Test API Connectivity:**
```bash
# Try an actual API endpoint (requires auth token or public endpoint)
# Example: Get applications (requires JWT token in header)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://jobmatch-ai-dev.workers.dev/api/applications
# Should return data or 401 Unauthorized (not 500)
```

- [ ] Does not return 500 error
- [ ] Returns data or 401/403 (auth errors are expected)

---

### Step 5.4: Check Cloudflare Dashboard

**Time:** 2 minutes

- [ ] Go to: https://dash.cloudflare.com/
- [ ] Click **Workers & Pages**
- [ ] Click **Pages**
- [ ] Should see: `jobmatch-ai-dev`, `jobmatch-ai-staging`, `jobmatch-ai-production`
- [ ] Click on `jobmatch-ai-dev`
- [ ] Click **Deployments** tab
- [ ] Should show latest deployment with status ✅

- [ ] Go back to **Workers & Pages**
- [ ] Click **Workers**
- [ ] Should see: `jobmatch-ai-dev`, `jobmatch-ai-staging`, `jobmatch-ai-prod`
- [ ] Click on `jobmatch-ai-dev`
- [ ] Click **Deployments** tab
- [ ] Should show latest deployment with status ✅

---

## Phase 6: Troubleshooting (If Needed)

### Issue: GitHub Actions Shows Red X (Tests Failed)

**What to do:**
1. Click on the failed job
2. Click on the failed step
3. Read the error message
4. Common issues:
   - Missing Node dependencies: `npm install`
   - TypeScript errors: `npm run typecheck`
   - ESLint errors: `npm run lint`
   - Test failures: `npm run test`

**Solution:** Fix the error locally, push again

---

### Issue: Deployment Succeeded But Backend Returns 500

**What to do:**
1. Check if secrets are set:
   ```bash
   npx wrangler secret list --env development
   ```
2. Should list: SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY, etc.
3. If missing, re-run Phase 3

---

### Issue: Frontend Shows Blank Page

**What to do:**
1. Check browser console (F12) for JavaScript errors
2. Check if API URL is correct in Vite config
3. Check if backend is responding: `curl https://jobmatch-ai-dev.workers.dev/health`
4. If backend returns error, fix backend first

---

### Issue: "Cannot find module" or Build Error

**What to do:**
```bash
cd /home/carl/application-tracking/jobmatch-ai
npm install
npm run build
npm run lint
npm run typecheck
```

Fix any errors shown, then:
```bash
git add .
git commit -m "fix: resolve build errors"
git push origin develop
```

---

## Phase 7: Final Verification Checklist

- [ ] All GitHub secrets added (5 total):
  - [ ] CLOUDFLARE_API_TOKEN
  - [ ] CLOUDFLARE_ACCOUNT_ID
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY

- [ ] All GitHub environments created (3 total):
  - [ ] development (with 3 environment secrets)
  - [ ] staging (with 3 environment secrets)
  - [ ] production (with 3 environment secrets)

- [ ] All Cloudflare secrets set (21 total: 7 per environment):
  - [ ] Development: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY, SENDGRID_API_KEY, APIFY_API_TOKEN, APP_URL
  - [ ] Staging: (same 7)
  - [ ] Production: (same 7)

- [ ] Branch protection rules configured (3 total):
  - [ ] develop (tests required)
  - [ ] staging (PR review + tests required)
  - [ ] main (PR review + tests required)

- [ ] Workflow tested:
  - [ ] Push to develop triggered GitHub Actions
  - [ ] Tests passed
  - [ ] Frontend deployed to https://jobmatch-ai-dev.pages.dev
  - [ ] Backend deployed to https://jobmatch-ai-dev.workers.dev
  - [ ] Health endpoint returns 200

---

## Summary

**Time Spent:**
- Phase 1 (GitHub Secrets): 15 min
- Phase 2 (Environments): 15 min
- Phase 3 (Cloudflare Secrets): 30 min
- Phase 4 (Branch Protection): 10 min
- Phase 5 (Testing): 15 min
- **Total: ~85 minutes (1.5 hours)**

**What's Now Working:**
✅ Automatic CI/CD pipeline
✅ Tests run before deployment
✅ Three environments (dev, staging, prod)
✅ Secrets securely managed
✅ Branch protection enforced

**Next Steps:**
1. Team members can now use the deployment workflow:
   - Create feature branch from `develop`
   - Make changes
   - Push and create PR
   - After approval, merge to `develop`
   - GitHub Actions automatically deploys
   - Done!

2. Optional: Setup Terraform for advanced features (see `CLOUDFLARE_IAC_RECOMMENDATION.md`)

3. Optional: Setup monitoring and alerting (see `CLOUDFLARE_CICD_PIPELINE.md` → Monitoring)

---

**Status:** ✅ **FULLY CONFIGURED AND TESTED**

Congratulations! Your Cloudflare CI/CD pipeline is now live!
