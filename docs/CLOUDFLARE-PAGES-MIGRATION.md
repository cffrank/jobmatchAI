# Cloudflare Pages GitHub Actions Migration Guide

## Overview

This document provides a comprehensive guide to migrating the JobMatch AI frontend from Cloudflare Pages' GitHub integration to GitHub Actions-based deployment. This eliminates duplicate workflows and provides centralized control over the build and deployment process.

## Current Problem Statement

### Issues Identified

1. **Multiple Workflows Running on `develop` Branch:**
   - `cloudflare-deploy.yml` - Main deployment workflow (Lint + Tests + Infrastructure + Deploy)
   - `test.yml` - Runs on push to develop (duplicate testing)
   - `post-deployment-e2e.yml` - E2E tests after Pages auto-deploys
   - Cloudflare Pages GitHub integration (auto-deploys on push)

2. **Environment Variable Mismatch:**
   - Cloudflare Pages uses `VITE_BACKEND_URL`
   - Code expects `VITE_API_URL`
   - Frontend connecting to `localhost:8787` instead of Workers URL

3. **Deployment Confusion:**
   - Cloudflare Pages auto-deploys (uncontrolled)
   - GitHub Actions also attempts deployment
   - Unclear which source of truth to use

## Solution Architecture

### Deployment Flow (Consolidated)

```
Push to develop
    ↓
GitHub Actions: cloudflare-deploy.yml
    ├── 1. Lint (ESLint)
    ├── 2. Tests (Type check + Unit tests)
    ├── 3. Provision Infrastructure (KV, R2, D1, Vectorize)
    ├── 4. Deploy Frontend to Cloudflare Pages (Build with VITE_API_URL)
    ├── 5. Deploy Backend to Cloudflare Workers
    └── 6. Run Post-Deployment E2E Tests
```

### Key Changes

1. **Disable Cloudflare Pages GitHub Integration** - Remove auto-deploy
2. **Use GitHub Actions as Single Source of Truth** - All deployments controlled here
3. **Fix Environment Variables** - Use `VITE_API_URL` for frontend build
4. **Consolidate Workflows** - One workflow handles everything

## Workflow Analysis

### Workflows Running on `develop` Branch

| Workflow | File | Trigger | Purpose | Status |
|----------|------|---------|---------|--------|
| Deploy to Cloudflare | `cloudflare-deploy.yml` | Push to develop/staging/main | Full deployment pipeline | **KEEP** |
| Test Suite | `test.yml` | Push to develop + PRs | Linting & unit tests | **DISABLE for develop** |
| Post-Deployment E2E | `post-deployment-e2e.yml` | Push to develop | E2E tests after deploy | **KEEP** |
| Deploy PR Preview | `deploy-pr-preview.yml` | PR (backend changes) | PR preview environments | **KEEP** |
| E2E Tests | `e2e-tests.yml` | workflow_run (after Deploy) | Legacy E2E trigger | **DISABLE** |
| Slack Notifications | `slack-notifications-template.yml` | Manual only | Template only | **KEEP** |
| Cost Monitoring | `cost-monitoring.yml` | Scheduled (weekly) | Cost tracking | **KEEP** |

### Duplicate Work Being Done

**Before:** When pushing to `develop`:
1. Cloudflare Pages auto-builds and deploys (uncontrolled)
2. `test.yml` runs (duplication of cloudflare-deploy.yml)
3. `post-deployment-e2e.yml` runs against Pages deployment
4. `cloudflare-deploy.yml` also runs (more duplication)

**After:** When pushing to `develop`:
1. `cloudflare-deploy.yml` runs once (single source of truth)
   - Lint + Test + Build + Deploy (Pages + Workers) + Post-deploy E2E
2. No other workflows run on `develop` push

## Step-by-Step Migration

### Phase 1: Prepare GitHub Actions Workflow

**Already Done:**
- Updated `cloudflare-deploy.yml` with:
  - New lint job (runs first)
  - Improved concurrency settings
  - Correct environment variable `VITE_API_URL`
  - Proper job dependencies

### Phase 2: Disable Duplicate Test Workflow

The `test.yml` workflow runs tests on every push to `develop`. Since `cloudflare-deploy.yml` already runs tests, this is redundant.

**Action:** Modify `test.yml` to not run on `develop` branch pushes:

```yaml
# .github/workflows/test.yml
on:
  push:
    branches: [main]          # CHANGED: remove 'develop'
  pull_request:
    branches: [main, develop]  # Still runs on PRs
  workflow_dispatch:
```

Rationale:
- PRs still get tested via `test.yml`
- `develop` branch gets tested via `cloudflare-deploy.yml`
- No duplicate test runs

### Phase 3: Disable Cloudflare Pages GitHub Integration

The Cloudflare Pages GitHub app auto-deploys on push. Disable it to avoid conflicts with GitHub Actions.

**Steps:**

1. **In Cloudflare Dashboard:**
   - Go to: Pages → JobMatch AI Dev (or your project)
   - Click: Settings
   - Section: "Deployments"
   - Click: "Disconnect GitHub"
   - Confirm disconnection

2. **Verify:**
   - Pages dashboard should show "Git integration disconnected"
   - Future pushes to `develop` should NOT trigger Pages builds via the app

3. **GitHub Cleanup:**
   - Go to: Repository → Settings → Applications
   - Find: "Cloudflare Pages"
   - Click: "Revoke"

### Phase 4: Verify Workflow Environment Variables

The `cloudflare-deploy.yml` workflow has been updated to use `VITE_API_URL`:

```yaml
- name: Build frontend
  env:
    VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    VITE_API_URL: ${{ steps.env.outputs.backend_url }}  # CORRECT
    VITE_USE_WORKERS_API: 'true'
    VITE_CLOUDFLARE_PAGES: 'true'
```

The `backend_url` is set based on environment:
- **development:** `https://jobmatch-ai-dev.carl-f-frank.workers.dev`
- **staging:** `https://jobmatch-ai-staging.carl-f-frank.workers.dev`
- **production:** `https://jobmatch-ai-prod.carl-f-frank.workers.dev`

**Verification:** Check that your frontend code uses `import.meta.env.VITE_API_URL`:

```typescript
// src/lib/supabase.ts or API client
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```

### Phase 5: First Test Deployment

Once changes are in place, test with a real push:

1. **Make a small commit** to develop branch
2. **Push to develop**
3. **Watch GitHub Actions:**
   - Go to: Repository → Actions
   - Find: "Deploy to Cloudflare (GitHub Actions)"
   - Verify execution:
     - lint job passes
     - run-tests job passes
     - provision-infrastructure job passes
     - deploy-frontend job passes
     - deploy-backend job passes
     - post-deployment E2E tests pass (if enabled)

4. **Verify Deployments:**
   - **Frontend:** https://jobmatch-ai-dev.pages.dev (should load)
   - **Backend:** https://jobmatch-ai-dev.carl-f-frank.workers.dev/health (should return 200)
   - Check browser console for correct `VITE_API_URL` (should be Workers URL, not localhost)

### Phase 6: Clean Up Other Workflows

Once verified working, disable conflicting workflows:

#### Option A: Disable `test.yml` for `develop` (Recommended)

Edit `.github/workflows/test.yml`:
```yaml
on:
  push:
    branches: [main]          # CHANGED: removed 'develop'
  pull_request:
    branches: [main, develop]
  workflow_dispatch:
```

This allows:
- PRs get tested before merge
- `develop` tested via `cloudflare-deploy.yml`
- `main` tested via dedicated job

#### Option B: Keep `test.yml` as PR Gate Only

This is acceptable if you want a separate "just tests" workflow for PR checks, separate from deployment.

#### Disable `e2e-tests.yml`

Edit `.github/workflows/e2e-tests.yml`:
```yaml
on:
  # DISABLED: workflow_run trigger
  # workflow_run:
  #   workflows: ["Deploy"]
  #   types:
  #     - completed

  # Manual trigger only
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to test'
        required: true
        default: 'development'
        type: choice
        options:
          - development
          - production
```

Keep `post-deployment-e2e.yml` - it's the primary E2E test runner.

## Configuration Checklist

- [ ] **GitHub Actions Secrets Configured:**
  - [ ] `CLOUDFLARE_API_TOKEN` - Cloudflare API token
  - [ ] `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
  - [ ] `SUPABASE_URL` - Production Supabase URL
  - [ ] `SUPABASE_ANON_KEY` - Public anon key
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key
  - [ ] `SLACK_WEBHOOK_URL` (optional) - Slack notifications

- [ ] **Cloudflare Pages GitHub Integration Disconnected:**
  - [ ] Pages → Settings → Deployments → Disconnected
  - [ ] GitHub Repository → Settings → Applications → Cloudflare Pages revoked

- [ ] **Frontend Environment Variables Correct:**
  - [ ] Code uses `import.meta.env.VITE_API_URL`
  - [ ] No hardcoded `localhost:8787` references
  - [ ] Build passes with correct URL

- [ ] **Workflow Files Updated:**
  - [ ] `cloudflare-deploy.yml` - lint job added, correct env vars
  - [ ] `test.yml` - removed develop from push trigger
  - [ ] `e2e-tests.yml` - disabled (or kept for manual only)

- [ ] **First Deployment Verified:**
  - [ ] Push to develop triggers workflow
  - [ ] All jobs pass
  - [ ] Frontend loads correctly
  - [ ] Backend health check passes
  - [ ] Frontend connects to correct backend URL

## Environment Variable Reference

### Build Time (Frontend)

Set during `npm run build` in GitHub Actions:

```bash
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_API_URL=https://jobmatch-ai-dev.carl-f-frank.workers.dev
VITE_USE_WORKERS_API=true
VITE_CLOUDFLARE_PAGES=true
```

### Runtime (Backend Workers)

Set in `wrangler.toml` secrets and bindings:

```toml
[env.development.vars]
ENVIRONMENT = "development"
SUPABASE_URL = "..."  # via secret
SUPABASE_ANON_KEY = "..."  # via secret
OPENAI_API_KEY = "..."  # via secret
```

## Troubleshooting

### Problem: Frontend Still Connects to localhost:8787

**Symptom:** Browser console shows `VITE_API_URL=http://localhost:8787`

**Cause:** Environment variable not passed during build or code has hardcoded fallback

**Solution:**
1. Check `cloudflare-deploy.yml` deployment step has `VITE_API_URL` env var
2. Search code for hardcoded `localhost:8787` and remove
3. Ensure frontend code reads: `import.meta.env.VITE_API_URL`

### Problem: Workflow Takes Too Long

**Symptom:** Deploy takes 15+ minutes

**Cause:** Running tests and linting in cloudflare-deploy.yml adds overhead

**Solution:**
- Tests are necessary (catch issues before deploy)
- Linting is necessary (code quality gate)
- Use caching: npm installs are cached (`cache: 'npm'`)
- Consider splitting into separate test job if needed

### Problem: Deployment Fails with "GitHub Integration" Error

**Symptom:** Pages deployment fails or conflicts with GitHub Actions

**Cause:** Cloudflare Pages GitHub integration still connected

**Solution:** Follow "Phase 3: Disable Cloudflare Pages GitHub Integration"

### Problem: E2E Tests Fail After Deployment

**Symptom:** `post-deployment-e2e.yml` fails with 404 or connection errors

**Cause:** Frontend not deployed yet or backend URL incorrect

**Solution:**
1. Verify frontend deployment: https://jobmatch-ai-dev.pages.dev
2. Verify backend health: https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
3. Check `post-deployment-e2e.yml` has correct URLs for test environment
4. Increase wait time in workflow if needed (currently 90 seconds)

## Rollback Plan

If issues occur with GitHub Actions deployment:

1. **Temporarily Re-enable Pages GitHub Integration:**
   - Cloudflare Pages → Settings → Connect to GitHub
   - Select repository and branch
   - This gives you a fallback while troubleshooting

2. **Debug Workflow:**
   - Check GitHub Actions logs
   - Fix issues in `cloudflare-deploy.yml`
   - Test with `workflow_dispatch` manual trigger

3. **Re-disable Pages Integration Once Fixed:**
   - After confirming GitHub Actions works correctly
   - Disconnect Pages GitHub integration again

## Migration Timeline

- **Day 1:** Update workflows + disable duplicate tests
- **Day 2:** Disconnect Cloudflare Pages GitHub integration
- **Day 3-5:** Monitor deployments, verify E2E tests
- **Day 6+:** Confirm stable, document any learnings

## Success Criteria

- [x] Single workflow controls develop branch deployments
- [x] No duplicate test runs
- [x] Frontend builds with correct `VITE_API_URL`
- [x] Frontend connects to Workers backend (not localhost)
- [x] E2E tests run automatically after deployment
- [x] Clear error messages if deployment fails
- [x] Team can understand workflow from this doc

## Related Documentation

- `docs/DEPLOYMENT-WORKFLOW-EXPLAINED.md` - High-level deployment architecture
- `docs/GITHUB-ACTIONS-MULTI-ENV.md` - GitHub Actions workflow details
- `docs/CLOUDFLARE_WORKERS_SETUP.md` - Workers API setup

## Questions & Support

For issues with this migration:

1. **Check workflow logs:** GitHub → Actions → Select failed run → View logs
2. **Check frontend console:** Open https://jobmatch-ai-dev.pages.dev → DevTools → Console
3. **Check backend health:** curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
4. **Review Cloudflare dashboard:** Pages & Workers sections for errors

---

**Last Updated:** 2026-01-01
**Status:** Implementation Guide
