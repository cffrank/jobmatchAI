# Workflows Quick Reference Card

**Print this or bookmark for quick lookup**

---

## What Workflows Do

### Automatic Workflows (Trigger on Push)

#### ✓ cloudflare-deploy.yml (Main)
**Triggers:** Push to develop, staging, or main

**What it does:**
```
1. Lint (2-3 min)
2. Tests (10-12 min)
3. Provision Infrastructure (5-8 min)
4. Deploy Frontend to Pages (3-5 min)
5. Deploy Backend to Workers (3-5 min)
6. E2E Tests [separate] (10-15 min)
```

**Status:** Check GitHub → Actions → "Deploy to Cloudflare (GitHub Actions)"

**Time:** ~20-25 min (all steps)

**Failure?** Click workflow → View logs → Find red "X" → See error message

---

#### ✓ test.yml (PR Gates)
**Triggers:** PRs to main/develop, Push to main

**What it does:**
```
1. Lint frontend & backend
2. Type check frontend & backend
3. Unit tests
```

**Status:** Check GitHub → Pull Requests → "Checks" tab

**Time:** ~8-10 min

---

#### ✓ post-deployment-e2e.yml (After Deploy)
**Triggers:** Push to develop

**What it does:**
```
1. Wait for Pages deployment (90 sec)
2. Verify site is live
3. Run E2E tests
```

**Status:** Check GitHub → Actions → "Post-Deployment E2E Tests"

**Time:** ~15-20 min

---

#### ✓ deploy-pr-preview.yml (PR Previews)
**Triggers:** PRs with backend changes

**What it does:**
```
1. Deploy backend to Railway (pr-{number} environment)
2. Test health endpoint
3. Comment PR with preview URL
```

**Status:** Check PR → Comments → "PR Preview Environment Ready"

**Time:** ~5-10 min

---

### Manual Workflows (Trigger via GitHub UI)

#### workflow_dispatch: cloudflare-deploy.yml
**How:** GitHub → Actions → "Deploy to Cloudflare" → "Run workflow"

**Use:** Deploy specific environment outside normal push

**Select:** development, staging, or production

---

#### workflow_dispatch: e2e-tests.yml
**How:** GitHub → Actions → "E2E Tests (Manual Only)" → "Run workflow"

**Use:** Test deployed environment without re-deploying

**Select:** development or production

---

#### workflow_dispatch: test.yml
**How:** GitHub → Actions → "Test Suite" → "Run workflow"

**Use:** Run tests without deploying

---

### Scheduled Workflows

#### cost-monitoring.yml
**Schedule:** Weekly (Monday 9 AM UTC)

**What:** Tracks Cloudflare/Railway spending

**Status:** GitHub → Actions → "Cost Monitoring"

---

### Template Workflows (Not Runnable)

#### slack-notifications-template.yml
**Purpose:** Template for Slack integration

**Status:** For reference/reuse only

---

## Workflow Locations

```
.github/workflows/
├── cloudflare-deploy.yml          ← Main deployment
├── test.yml                        ← PR & main tests
├── post-deployment-e2e.yml        ← E2E after deploy
├── deploy-pr-preview.yml          ← PR previews
├── e2e-tests.yml                  ← Manual E2E tests
├── cost-monitoring.yml            ← Cost tracking
└── slack-notifications-template.yml ← Slack template
```

---

## Quick Troubleshooting

### Problem: Workflow Failing

**Step 1:** Where to look?
```
GitHub → Actions → [Workflow Name] → [Latest Run]
```

**Step 2:** Which job failed?
```
Look for red "X" or "Failed" status
Click job name to expand
```

**Step 3:** What went wrong?
```
Scroll down to "Run [step name]"
Look for red text or error message
```

**Step 4:** Common fixes:
```
- Missing secret? Add to Settings → Secrets
- Type error? Fix code and push again
- Infrastructure issue? Usually auto-retries
- Timeout? Increase timeout in workflow
```

---

### Problem: Frontend Not Loading

**Check:**
```
1. GitHub Actions: All jobs passed? ✓
2. Cloudflare Pages: Deployment successful?
   Pages → [Project] → Deployments
3. Frontend URL: https://jobmatch-ai-dev.pages.dev
4. Backend URL: https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
```

**If Pages shows error:**
```
Click deployment → "Details" → "View logs"
Or check GitHub Actions deploy-frontend job
```

---

### Problem: Frontend Can't Talk to Backend

**Check:**
```
Browser console (F12):
  import.meta.env.VITE_API_URL

Should show:
  https://jobmatch-ai-dev.carl-f-frank.workers.dev

NOT:
  localhost:8787
  undefined
  http://localhost:3000
```

**If wrong:**
```
1. Check GitHub Actions build step
   Look for "VITE_API_URL" in environment
2. Check frontend code
   grep -r "localhost:8787" src/
3. Rebuild manually:
   npm run build (should fail without VITE_API_URL)
```

---

## Environment URLs

### Development (develop branch)

| Service | URL |
|---------|-----|
| Frontend | https://jobmatch-ai-dev.pages.dev |
| Backend | https://jobmatch-ai-dev.carl-f-frank.workers.dev |
| Health | https://jobmatch-ai-dev.carl-f-frank.workers.dev/health |
| Cloudflare Pages | Pages → jobmatch-ai-dev |
| Cloudflare Workers | Workers → jobmatch-ai-dev |

### Staging (staging branch)

| Service | URL |
|---------|-----|
| Frontend | https://jobmatch-ai-staging.pages.dev |
| Backend | https://jobmatch-ai-staging.carl-f-frank.workers.dev |
| Health | https://jobmatch-ai-staging.carl-f-frank.workers.dev/health |

### Production (main branch)

| Service | URL |
|---------|-----|
| Frontend | https://jobmatch-ai-production.pages.dev |
| Backend | https://jobmatch-ai-prod.carl-f-frank.workers.dev |
| Health | https://jobmatch-ai-prod.carl-f-frank.workers.dev/health |

---

## Common Tasks

### Deploy Manually (outside of push)

```bash
GitHub → Actions
→ "Deploy to Cloudflare (GitHub Actions)"
→ "Run workflow"
→ Select environment (development/staging/production)
→ Click "Run workflow"
→ Wait ~20-25 minutes
```

### Check Deployment Status

```bash
GitHub → Repository home page
→ Scroll down to "Deployments" section
→ Or: Actions tab → filter by "Deploy to Cloudflare"
```

### View Detailed Logs

```bash
GitHub → Actions
→ [Workflow Name]
→ [Latest Run]
→ Click failing job
→ Expand the step with error
→ Read error message
```

### Check Frontend Environment

```bash
1. Open https://jobmatch-ai-dev.pages.dev
2. Press F12 (DevTools)
3. Console tab
4. Type: console.log(import.meta.env)
5. Look for VITE_API_URL value
```

### Check Backend Health

```bash
# In terminal:
curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health

# Should return:
{"status":"ok"}
```

### Run E2E Tests Manually

```bash
GitHub → Actions
→ "E2E Tests (Manual Only)"
→ "Run workflow"
→ Select environment
→ Wait ~15-20 minutes
```

### View E2E Test Results

```bash
GitHub → Actions
→ "Post-Deployment E2E Tests" (automatic)
or "E2E Tests (Manual Only)" (manual)
→ Click run
→ Download artifacts (test-results, playwright-report)
```

---

## GitHub Actions Tips

### Speed Up Workflow

- NPM dependencies are cached automatically
- Specify exact node version in workflow
- Use `continue-on-error: true` for non-critical steps
- Run independent jobs in parallel

### Debug Workflow

- Add debug step: `run: env` (shows all variables)
- Add debug step: `run: ls -la` (shows file structure)
- Use GitHub CLI: `gh run view [run-id]`

### See Workflow Permissions

```
Settings → Actions → General
→ "Workflow permissions"
→ Should be "Read and write" for Pages deployment
```

---

## Cloudflare Integration

### View Pages Deployment

```
Cloudflare Dashboard
→ Pages
→ jobmatch-ai-dev (or appropriate)
→ Deployments tab
→ Click deployment to see details
```

### View Workers Deployment

```
Cloudflare Dashboard
→ Workers & Pages
→ jobmatch-ai-dev (or appropriate)
→ Deployments tab
→ Check status and health
```

### Check KV/R2/D1/Vectorize

```
Cloudflare Dashboard
→ Workers & Pages
→ [Service]
→ KV / R2 / D1 / Vectorize tabs
→ Verify resources exist
```

### Roll Back Deployment

```
Cloudflare Pages:
  Pages → [Project] → Deployments
  → Click ⋯ on previous deployment
  → "Rollback to this deployment"

Cloudflare Workers:
  (No rollback - re-deploy via GitHub Actions)
```

---

## Required Secrets

**Location:** Repository → Settings → Secrets and variables → Actions

```
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SLACK_WEBHOOK_URL (optional)
```

**Check if set:**
```bash
gh secret list
```

---

## Branch Strategy

| Branch | Workflow | Deploy To | Trigger |
|--------|----------|-----------|---------|
| develop | cloudflare-deploy.yml | Pages (dev), Workers (dev) | Push |
| staging | cloudflare-deploy.yml | Pages (staging), Workers (staging) | Push |
| main | cloudflare-deploy.yml + test.yml | Pages (prod), Workers (prod) | Push |
| feature/* | test.yml + deploy-pr-preview.yml | Railway (pr env) | PR |

---

## Documentation Links

| Document | Purpose |
|----------|---------|
| CLOUDFLARE-PAGES-MIGRATION.md | Full migration guide |
| CLOUDFLARE-PAGES-DISCONNECTION-STEPS.md | Disconnection instructions |
| WORKFLOW-CONSOLIDATION-SUMMARY.md | Executive summary |
| BEFORE-AFTER-WORKFLOW-COMPARISON.md | Visual comparisons |
| QUICK-REFERENCE-WORKFLOWS.md | This document |
| DEPLOYMENT-WORKFLOW-EXPLAINED.md | General deployment architecture |
| GITHUB-ACTIONS-MULTI-ENV.md | GitHub Actions details |

---

## SOS (Need Help?)

### Deployment Completely Broken

1. **Is develop branch working?**
   - GitHub → Actions → "Deploy to Cloudflare"
   - Watch latest run
   - Check for errors

2. **Is frontend accessible?**
   - https://jobmatch-ai-dev.pages.dev
   - Browser DevTools → Network/Console
   - Check for errors

3. **Is backend accessible?**
   - https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
   - Should return 200 OK with {"status":"ok"}

4. **Can frontend talk to backend?**
   - https://jobmatch-ai-dev.pages.dev
   - F12 → Console
   - Type: `import.meta.env.VITE_API_URL`
   - Should show Workers URL

### Nothing Works, Need Immediate Rollback

```bash
# 1. Re-enable Cloudflare Pages auto-deploy (quick temporary fix)
Cloudflare Dashboard
→ Pages → [Project] → Settings
→ "Connect repository"
→ Select develop branch

# 2. This gives immediate fallback while debugging
# 3. Disable again once fixed

# 4. Or manually re-deploy via GitHub Actions
GitHub → Actions
→ "Deploy to Cloudflare (GitHub Actions)"
→ "Run workflow" → development
```

---

**Last Updated:** 2026-01-01
**Bookmark This!** This is your quick reference guide.
