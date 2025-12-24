# Deployment Workflow - Current Setup & Best Practices

## Your Current Deployment Flow (As-Is)

### 1. Local Development → GitHub

```bash
# You write code locally
vim src/some-file.ts

# Stage and commit changes
git add src/some-file.ts
git commit -m "feat: add new feature"

# Push to GitHub
git push origin feature-branch  # or main
```

### 2. GitHub Actions Run (Quality Gates)

When you push code, **3 GitHub Actions workflows** automatically run:

#### A. Test Suite (`.github/workflows/test.yml`)
```yaml
Triggers: push or PR to main/develop branches
Runs:
  ✓ Backend Tests (TypeScript check, lint, unit tests, integration tests)
  ✓ Frontend Tests (TypeScript check, lint)
  ✓ E2E Tests (Playwright tests against local services)
Duration: ~10-15 minutes
```

#### B. PR Preview Environment (`.github/workflows/deploy-pr-preview.yml`)
```yaml
Triggers: PR opened, synchronized, reopened, or closed
Creates: Temporary Railway environment (pr-1, pr-2, etc.)
Result: PR comment with preview URL for testing
Auto-cleanup: When PR closes, environment deleted
```

#### C. Cost Monitoring (`.github/workflows/cost-monitoring.yml`)
```yaml
Triggers: Daily schedule
Monitors: Railway costs and usage
Alerts: If costs exceed thresholds
```

### 3. What Happens Next? (Current Behavior)

#### If you pushed to a feature branch:
```
1. GitHub Actions run tests
2. If tests pass → PR preview environment created
3. You review PR + test preview environment
4. You manually merge PR to main
5. → Triggers production deployment (see below)
```

#### If you pushed to main (or merged PR):
```
1. GitHub Actions run tests
2. Deploy Backend to Railway workflow runs (.github/workflows/deploy-backend-railway.yml)
3. Railway builds and deploys backend to PRODUCTION
4. Health check verifies deployment
5. Production is live with new code
```

### Current Railway Deployment (.github/workflows/deploy-backend-railway.yml)

```yaml
Trigger: Push to main branch (backend changes)
Steps:
  1. Install Railway CLI
  2. Deploy to Railway production: railway up --service backend
  3. Wait 15 seconds for stability
  4. Health check: curl $BACKEND_URL/health (retry 5 times)
  5. Output backend URL if successful
Duration: ~2-3 minutes
```

---

## Your Current Branch Strategy

### Current State: **Single Branch (Main Only)**
```
Repository branches:
├── main (only branch)
    ├── Deploys directly to production
    └── Protected by GitHub Actions tests
```

**What this means:**
- ❌ No separate dev/test/staging environments
- ❌ Every merge to main goes straight to production
- ✓ Simple workflow (good for solo/small teams)
- ✓ PR previews provide temporary test environments
- ⚠️ High risk - production breaks if tests don't catch issues

---

## Best Practice: Multi-Environment Strategy

### Recommended Branch Strategy

```
┌─────────────┐
│   develop   │ ← Default branch for development
└──────┬──────┘
       │ (merge when feature complete)
       ↓
┌─────────────┐
│   staging   │ ← Pre-production testing
└──────┬──────┘
       │ (merge after staging verification)
       ↓
┌─────────────┐
│    main     │ ← Production only
└─────────────┘
```

### Environment Mapping

| Branch | Environment | Railway Env | Purpose | Auto-Deploy |
|--------|-------------|-------------|---------|-------------|
| `feature/*` | PR Preview | `pr-123` | Feature testing | Yes (on PR) |
| `develop` | Development | `development` | Integration testing | Yes (on push) |
| `staging` | Staging | `staging` | Pre-production QA | Yes (on push) |
| `main` | Production | `production` | Live users | Yes (on push) or Manual |

### Deployment Flow with Best Practices

```
┌──────────────────────────────────────────────────────────────┐
│ 1. LOCAL DEVELOPMENT                                         │
│    Developer writes code on feature branch                   │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ↓ git push origin feature/new-thing
┌──────────────────────────────────────────────────────────────┐
│ 2. GITHUB PR + TESTS                                         │
│    - Create PR to develop                                    │
│    - GitHub Actions run tests                                │
│    - PR preview environment created (Railway: pr-123)        │
│    - Code review by team                                     │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ↓ Merge PR (after approval + tests pass)
┌──────────────────────────────────────────────────────────────┐
│ 3. DEVELOPMENT ENVIRONMENT                                   │
│    Railway Environment: development                          │
│    - Auto-deploys on merge to develop                        │
│    - Used for integration testing                            │
│    - Multiple features tested together                       │
│    Duration: Features accumulate for 1-2 weeks               │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ↓ Create PR: develop → staging
┌──────────────────────────────────────────────────────────────┐
│ 4. STAGING ENVIRONMENT (Pre-Production)                      │
│    Railway Environment: staging                              │
│    - Auto-deploys on merge to staging                        │
│    - Production-like configuration                           │
│    - QA team tests here                                      │
│    - Performance testing                                     │
│    - Security scanning                                       │
│    Duration: 2-3 days of intensive testing                   │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ↓ Create PR: staging → main (with approval)
┌──────────────────────────────────────────────────────────────┐
│ 5. PRODUCTION ENVIRONMENT                                    │
│    Railway Environment: production                           │
│    - Manual approval required (recommended)                  │
│    - OR auto-deploy if staging tests pass                    │
│    - Zero-downtime deployment                                │
│    - Health checks verify success                            │
│    - Rollback available if issues detected                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Railway Environment Configuration

### Current State: Phase 3 (Native Git Deployment)

Your Phase 3 documentation (`docs/PHASE3-NATIVE-GIT-DEPLOYMENT.md`) describes **Railway's native git deployment**:

```
When you link GitHub repo to Railway:
1. Railway monitors GitHub for pushes
2. Push to main → Railway automatically builds & deploys
3. No GitHub Actions needed for deployment trigger
4. GitHub Actions only for tests + quality checks
```

### Recommended Railway Environments

Create these environments in your Railway project:

```
Railway Project: jobmatch-ai
├── production (linked to main branch)
├── staging (linked to staging branch)
├── development (linked to develop branch)
└── pr-* (ephemeral, auto-created by GitHub Actions)
```

**How to set up:**
```bash
# In Railway dashboard:
1. Create "production" environment → link to main branch
2. Create "staging" environment → link to staging branch
3. Create "development" environment → link to develop branch
4. Configure environment variables for each
```

---

## Phase-by-Phase Implementation

### Phase 1: ✅ COMPLETED - Basic Railway Deployment
- Railway deploys backend on push to main
- GitHub Actions trigger Railway via CLI
- Single production environment

### Phase 2: ✅ COMPLETED - PR Preview Environments
- Automatic preview environments for PRs
- Each PR gets isolated Railway environment
- Auto-cleanup when PR closes

### Phase 3: 📋 DOCUMENTED (Ready to Implement)
- **Native git deployment** (Railway monitors GitHub directly)
- **No GitHub Actions needed** for deployment trigger
- **Faster deployments** (Railway starts immediately on push)

**To implement Phase 3:**
```bash
# Follow docs/PHASE3-QUICK-START.md
1. Link GitHub repo to Railway project (Railway dashboard)
2. Configure branch-to-environment mapping
3. Update GitHub Actions to be tests-only (not deployment triggers)
```

---

## Recommended: Multi-Environment Implementation Plan

### Step 1: Create Branches Locally
```bash
cd /home/carl/application-tracking/jobmatch-ai

# Create develop branch from main
git checkout -b develop
git push -u origin develop

# Create staging branch from main
git checkout main
git checkout -b staging
git push -u origin staging

# Go back to main
git checkout main
```

### Step 2: Create Railway Environments
```
In Railway Dashboard:
1. Go to your project → Settings → Environments
2. Click "New Environment"
   - Name: development
   - Link to GitHub branch: develop
   - Copy env vars from production
3. Repeat for staging environment
```

### Step 3: Update GitHub Actions Workflows

#### deploy-backend-railway.yml
```yaml
# Change from:
on:
  push:
    branches:
      - main

# To multi-environment:
on:
  push:
    branches:
      - main       # production
      - staging    # staging env
      - develop    # development env
```

#### test.yml (already supports develop)
```yaml
on:
  push:
    branches: [main, develop]  # ✓ Already configured
  pull_request:
    branches: [main, develop]  # ✓ Already configured
```

### Step 4: Protect Branches (GitHub Repository Settings)

**Main Branch Protection:**
```
Settings → Branches → Add rule for "main"
✓ Require pull request reviews before merging (1 approval)
✓ Require status checks to pass (Backend Tests, Frontend Tests)
✓ Require branches to be up to date
✓ Require conversation resolution before merging
✓ Do not allow bypassing the above settings
```

**Staging Branch Protection:**
```
Settings → Branches → Add rule for "staging"
✓ Require pull request reviews (optional for solo dev)
✓ Require status checks to pass
✓ Require branches to be up to date
```

### Step 5: Update Team Workflow

**New developer workflow:**
```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/add-new-feature

# 2. Write code, commit, push
git add .
git commit -m "feat: add new feature"
git push origin feature/add-new-feature

# 3. Create PR to develop (not main!)
gh pr create --base develop --title "feat: add new feature"

# 4. After PR approval + tests pass → merge to develop
# → Auto-deploys to development environment

# 5. After testing in dev → create PR: develop → staging
# → Auto-deploys to staging environment

# 6. After QA approval → create PR: staging → main
# → Auto-deploys to production environment
```

---

## What You Have vs What's Recommended

### Current Setup (What You Have)

```
Branches:
  main (only branch) → Production

Deployment Flow:
  Local → Push to feature branch → PR to main → Merge → Production

GitHub Actions:
  ✓ Test on PR
  ✓ Deploy to production on merge to main
  ✓ Create PR preview environments

Railway:
  ✓ Production environment
  ✓ PR preview environments (pr-*)

Risks:
  ❌ No staging environment for pre-production testing
  ❌ Every merge to main goes to production immediately
  ❌ No way to test integrated features before production
```

### Recommended Setup (Best Practices)

```
Branches:
  develop → Development environment
  staging → Staging environment (pre-production)
  main → Production environment

Deployment Flow:
  Local → feature branch → PR to develop → Development
         → PR to staging → Staging (QA testing)
         → PR to main → Production (manual approval recommended)

GitHub Actions:
  ✓ Test on every PR
  ✓ Deploy to correct environment based on branch
  ✓ Create PR preview environments
  ✓ Require approvals for staging → main

Railway:
  ✓ Production environment (main branch)
  ✓ Staging environment (staging branch)
  ✓ Development environment (develop branch)
  ✓ PR preview environments (pr-*)

Benefits:
  ✓ Safe pre-production testing in staging
  ✓ Integration testing in development
  ✓ Production deployments are validated
  ✓ Easy rollback strategy (revert merge to main)
  ✓ Reduced production incidents
```

---

## Implementation Decision Matrix

| Current Situation | Stick with Current | Upgrade to Multi-Env |
|-------------------|-------------------|----------------------|
| Solo developer, low traffic | ✓ Simple, fast | Overkill |
| Solo dev, critical app | Maybe | ✓ Recommended |
| Small team (2-5 devs) | ❌ Too risky | ✓ Strongly recommended |
| Team (5+ devs) | ❌ Dangerous | ✓ Required |
| Frequent deployments | ❌ Too risky | ✓ Recommended |
| Occasional deployments | ✓ Acceptable | Nice to have |
| Revenue-generating app | ❌ Too risky | ✓ Required |
| Personal project | ✓ Acceptable | Optional |

---

## Quick Decision Guide

### Keep Current Setup (Main Only) If:
- ✓ You're a solo developer
- ✓ Low traffic / non-critical application
- ✓ You prefer speed over safety
- ✓ You test thoroughly locally before pushing
- ✓ You're comfortable with production incidents

### Upgrade to Multi-Environment If:
- ✓ Multiple developers on the team
- ✓ Revenue-generating or business-critical app
- ✓ You want to reduce production incidents
- ✓ You need QA/testing before production
- ✓ You deploy frequently (multiple times per week)
- ✓ You want to test integrations before production

---

## Next Steps

### Option A: Keep Current Setup
```bash
# No changes needed!
# Continue: Local → PR to main → Production
# Use PR previews for testing
```

### Option B: Implement Multi-Environment
```bash
# Run the implementation plan:
cd /home/carl/application-tracking/jobmatch-ai

# 1. Create branches
git checkout -b develop && git push -u origin develop
git checkout main
git checkout -b staging && git push -u origin staging
git checkout main

# 2. Set up Railway environments (Railway dashboard)
# 3. Update GitHub Actions workflows
# 4. Configure branch protections
# 5. Update team documentation
```

Would you like me to help you implement the multi-environment setup?

---

## Appendix: Common Questions

### Q: Do I need GitHub Actions if Railway has native git deployment?

**A:** Yes, but for different purposes:
- **GitHub Actions:** Run tests, linting, security scans (quality gates)
- **Railway:** Build and deploy the application (hosting)

Even with Railway's native git deployment, you want GitHub Actions to verify code quality before Railway starts deploying.

### Q: Should staging and development auto-deploy?

**A:** Recommended:
- **Development:** Auto-deploy (fast iteration)
- **Staging:** Auto-deploy (but require PR approval)
- **Production:** Manual approval recommended (via GitHub protected branch rules)

### Q: How do I rollback a bad production deployment?

**Option 1 - Railway Dashboard (fastest):**
```
1. Go to Railway dashboard
2. Click on the deployment history
3. Click "Rollback" on previous successful deployment
Duration: 30 seconds
```

**Option 2 - Git Revert:**
```bash
# Revert the bad commit
git revert <bad-commit-sha>
git push origin main

# Railway auto-deploys the revert
Duration: 2-3 minutes
```

**Option 3 - Emergency Redeploy:**
```bash
# Force redeploy previous good commit
git reset --hard <good-commit-sha>
git push --force origin main

# ⚠️ Only use in emergency! Rewrites history.
```

### Q: What's the difference between PR previews and staging?

| Feature | PR Preview | Staging |
|---------|-----------|---------|
| **Purpose** | Test individual feature | Test integrated features before production |
| **Lifetime** | Temporary (deleted when PR closes) | Permanent environment |
| **Data** | Empty or test data | Production-like data |
| **URL** | Changes per PR | Stable URL |
| **When** | Every PR | After features merge to staging branch |
| **Who uses** | Developer testing feature | QA team, stakeholders |

---

**Document Version:** 1.0
**Last Updated:** December 24, 2025
**Related Docs:**
- `docs/PHASE3-NATIVE-GIT-DEPLOYMENT.md`
- `docs/PHASE2-PR-ENVIRONMENTS.md`
- `docs/RAILWAY-MIGRATION-ANALYSIS.md`
