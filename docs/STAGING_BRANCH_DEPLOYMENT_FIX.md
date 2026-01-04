# Staging Branch Deployment Fix

**Date:** 2026-01-01
**Status:** Action Required
**Environment:** Staging (Cloudflare Workers + Pages)

## Problem Analysis

The staging branch is **not deploying** because it's **outdated and behind develop** by many commits. The staging branch still contains old Railway-era code, while develop has been migrated to Cloudflare Workers.

### Current State

```bash
# Staging branch (OUTDATED)
staging: 78f7380 "chore: merge main into develop (CORS simplification + Railway automation)"

# Develop branch (CURRENT)
develop: 352ce2f "chore: trigger deployment with updated Cloudflare environment variables"
```

**Commits ahead:** Develop is ~30+ commits ahead of staging

### Why Deployments Are Skipped

The `cloudflare-deploy.yml` workflow **IS configured correctly** for staging:

✅ Staging branch is in the trigger list (line 7)
✅ Environment mapping logic exists (lines 154-156, 673-674, 881-882)
✅ Infrastructure provisioning includes staging (lines 220-224, 266-267)
✅ Frontend deployment includes staging (lines 643-644, 694-696, 739-741)
✅ Backend deployment includes staging (lines 855, 953-954)

**The real issue:** Staging branch contains old code that may cause deployment failures or is simply too outdated to trigger properly.

## Solution: Update Staging Branch

### Option 1: Fast-Forward Merge (Recommended)

If staging has no unique commits, simply fast-forward it to develop:

```bash
# Switch to staging
git checkout staging

# Merge develop (fast-forward)
git merge develop --ff-only

# Push to trigger deployment
git push origin staging
```

**When to use:** When staging has no unique changes (just outdated)

### Option 2: Reset Staging to Develop

If staging has diverged significantly or has conflicts:

```bash
# Switch to staging
git checkout staging

# Reset to match develop exactly
git reset --hard origin/develop

# Force push (⚠️ overwrites remote staging)
git push --force origin staging
```

**When to use:** When staging has conflicts or you want to start fresh

### Option 3: Rebase Staging onto Develop

If staging has unique commits you want to preserve:

```bash
# Switch to staging
git checkout staging

# Rebase onto develop
git rebase develop

# Resolve any conflicts, then continue
git rebase --continue

# Push (may need force push)
git push --force-with-lease origin staging
```

**When to use:** When staging has unique commits to preserve

## Verification Steps

After updating staging branch:

### 1. Verify GitHub Actions Triggered

Go to: https://github.com/YOUR_ORG/jobmatch-ai/actions/workflows/cloudflare-deploy.yml

Look for:
- ✅ Workflow run triggered on `staging` branch
- ✅ All jobs complete successfully (lint → tests → provision → deploy-frontend → deploy-backend)
- ✅ Environment shows "staging"

### 2. Check Deployment URLs

**Frontend:** https://jobmatch-ai-staging.pages.dev
**Backend:** https://jobmatch-ai-staging.carl-f-frank.workers.dev

Test:
```bash
# Test frontend
curl -I https://jobmatch-ai-staging.pages.dev
# Should return: HTTP/2 200

# Test backend health
curl https://jobmatch-ai-staging.carl-f-frank.workers.dev/health
# Should return: {"status":"ok"}
```

### 3. Verify Supabase Connection

Staging environment uses the same Supabase instance as development:
- **Branch:** staging (wpupbucinufbaiphwogc)
- **URL:** Same as production (lrzhpnsykasqrousgmdh)

Check in workflow output that correct Supabase credentials are used.

### 4. Run E2E Tests (Optional)

Manually trigger post-deployment E2E tests:

```bash
# Go to Actions → Post-Deployment E2E Tests → Run workflow
# Select: environment = "staging"
```

Or run locally:
```bash
FRONTEND_URL=https://jobmatch-ai-staging.pages.dev \
BACKEND_URL=https://jobmatch-ai-staging.carl-f-frank.workers.dev \
npm run test:e2e
```

## Environment Configuration

### GitHub Secrets Required

The following secrets must be configured for staging deployments:

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Workers, Pages, D1, R2, KV, Vectorize permissions
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
- `SUPABASE_URL` - Supabase project URL (shared across all environments)
- `SUPABASE_ANON_KEY` - Supabase anon key (shared across all environments)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (shared across all environments)

Optional:
- `SLACK_WEBHOOK_URL` - For deployment notifications

### Cloudflare Resources Created

When you push to staging, the workflow will automatically provision:

**KV Namespaces:**
- JOB_ANALYSIS_CACHE
- SESSIONS
- RATE_LIMITS
- OAUTH_STATES
- EMBEDDINGS_CACHE
- AI_GATEWAY_CACHE

**R2 Buckets:**
- jobmatch-ai-staging-avatars
- jobmatch-ai-staging-resumes
- jobmatch-ai-staging-exports

**Vectorize Index:**
- jobmatch-ai-staging (768 dimensions, cosine similarity)

**AI Gateway:**
- jobmatch-ai-gateway-dev (shared with development)

**D1 Database:**
- DB (staging environment, migrations auto-applied)

## Branch Strategy Reminder

```
feature/x → develop → staging → main
            ↓         ↓          ↓
          dev env  staging   production
```

**Workflow:**
1. Develop features in `feature/*` branches
2. Merge to `develop` via PR → deploys to **development** environment
3. Merge `develop` to `staging` via PR → deploys to **staging** environment
4. Merge `staging` to `main` via PR → deploys to **production** environment

**Protected Branches:**
- `main` - Requires PR + approval + tests passing
- `staging` - Requires PR + approval + tests passing
- `develop` - Requires PR + tests passing

## Troubleshooting

### Deployment Fails with "Unknown branch" Error

**Cause:** Branch name mismatch in workflow trigger

**Fix:** Check that branch is exactly `staging` (lowercase, no spaces)

```bash
# Verify branch name
git branch -a | grep staging
```

### Deployment Succeeds but Site is Down

**Cause:** Cloudflare Pages build may be in progress or failed

**Check:**
1. Go to Cloudflare Dashboard → Pages → jobmatch-ai-staging
2. Check build status
3. Check build logs for errors

**Common issues:**
- Missing environment variables
- Build command failure
- Output directory mismatch

### D1 Migrations Fail

**Cause:** Database authorization or migration conflicts

**Check:**
1. Workflow logs → "Provision Infrastructure & Run Migrations"
2. Look for D1-specific errors

**Fix:**
- Ensure D1 is enabled in Cloudflare dashboard
- Check migration file syntax
- Verify migration sequence (0001, 0002, etc. - no gaps)

### Backend Workers Not Responding

**Cause:** Workers deployment failed or environment variables missing

**Check:**
1. Workflow logs → "Deploy Backend to Cloudflare Workers"
2. Check wrangler deployment output

**Fix:**
- Verify `workers/wrangler.toml` has `[env.staging]` configuration
- Check that all secrets are bound correctly
- Test worker with `wrangler tail` to see real-time logs

## Next Steps

1. **Update staging branch** using Option 1, 2, or 3 above
2. **Monitor GitHub Actions** for successful deployment
3. **Test staging environment** using verification steps
4. **Update documentation** if any staging-specific configuration is needed
5. **Establish merge schedule** (e.g., weekly develop → staging → main)

## Related Documentation

- **Main CLAUDE.md:** `/home/carl/application-tracking/jobmatch-ai/CLAUDE.md`
- **Deployment Workflow:** `.github/workflows/cloudflare-deploy.yml`
- **Cloudflare Setup:** `docs/cloudflare-migration/CLOUDFLARE_WORKERS_SETUP.md`
- **Environment Mapping:** `docs/ENVIRONMENT_MAPPING.md`
- **GitHub Secrets:** `docs/GITHUB_SECRETS_SETUP.md`

## Summary

**Problem:** Staging branch is outdated (still has Railway code) and won't deploy
**Root Cause:** Branch not updated after Cloudflare migration
**Solution:** Merge develop into staging to bring it up to date
**Impact:** Once updated, staging will auto-deploy on every push
**Timeline:** 5 minutes to update branch, 10-15 minutes for deployment to complete
