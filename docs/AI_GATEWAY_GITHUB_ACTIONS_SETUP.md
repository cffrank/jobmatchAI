# AI Gateway GitHub Actions Setup Guide

**Purpose:** Configure GitHub Actions to deploy AI Gateway secrets automatically
**Applies to:** Cloudflare Workers deployment pipeline
**Prerequisites:** AI Gateway created in Cloudflare Dashboard

## Table of Contents
- [Overview](#overview)
- [GitHub Environment Secrets Setup](#github-environment-secrets-setup)
- [Workflow Configuration](#workflow-configuration)
- [Verification Steps](#verification-steps)
- [Troubleshooting](#troubleshooting)

---

## Overview

### What This Guide Does

This guide shows you how to configure GitHub Actions to automatically deploy AI Gateway configuration secrets to Cloudflare Workers during CI/CD deployment.

### Current State

The existing workflow (`.github/workflows/cloudflare-deploy.yml`) already:
- ✅ Deploys Workers to development, staging, and production
- ✅ Uses GitHub Environments for environment-specific secrets
- ✅ Automatically runs on push to develop/staging/main branches

### What We're Adding

We're adding **two new secrets** to each GitHub Environment:
1. `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID (same for all environments)
2. `AI_GATEWAY_SLUG` - AI Gateway name (unique per environment)

These secrets will be **automatically deployed** to Cloudflare Workers during the normal deployment pipeline.

---

## GitHub Environment Secrets Setup

### Step 1: Navigate to GitHub Environments

1. Go to your GitHub repository
2. Click **Settings** (top menu)
3. Click **Environments** (left sidebar, under "Code and automation")
4. You should see three environments:
   - `development`
   - `staging`
   - `production`

### Step 2: Add AI Gateway Secrets to Development

1. Click **development** environment
2. Scroll to **Environment secrets** section
3. Click **Add secret**

**Secret 1: CLOUDFLARE_ACCOUNT_ID**
```
Name: CLOUDFLARE_ACCOUNT_ID
Value: 280c58ea17d9fe3235c33bd0a52a256b
```

4. Click **Add secret**

**Secret 2: AI_GATEWAY_SLUG**
```
Name: AI_GATEWAY_SLUG
Value: jobmatch-ai-gateway-dev
```

5. Click **Add secret**

**Verify Development:**
You should now see two new secrets in the development environment:
- `CLOUDFLARE_ACCOUNT_ID`
- `AI_GATEWAY_SLUG`

### Step 3: Add AI Gateway Secrets to Staging

1. Click **← Environments** to go back
2. Click **staging** environment
3. Add the same two secrets with staging-specific values:

**Secret 1: CLOUDFLARE_ACCOUNT_ID**
```
Name: CLOUDFLARE_ACCOUNT_ID
Value: 280c58ea17d9fe3235c33bd0a52a256b
# Note: Same value as development
```

**Secret 2: AI_GATEWAY_SLUG**
```
Name: AI_GATEWAY_SLUG
Value: jobmatch-ai-gateway-staging
# Note: Different slug for staging
```

### Step 4: Add AI Gateway Secrets to Production

1. Click **← Environments** to go back
2. Click **production** environment
3. Add the same two secrets with production-specific values:

**Secret 1: CLOUDFLARE_ACCOUNT_ID**
```
Name: CLOUDFLARE_ACCOUNT_ID
Value: 280c58ea17d9fe3235c33bd0a52a256b
# Note: Same value as development and staging
```

**Secret 2: AI_GATEWAY_SLUG**
```
Name: AI_GATEWAY_SLUG
Value: jobmatch-ai-gateway
# Note: Production slug (no -prod suffix)
```

### Summary of Secrets

| Environment | CLOUDFLARE_ACCOUNT_ID | AI_GATEWAY_SLUG |
|-------------|----------------------|-----------------|
| Development | 280c58ea17d9fe3235c33bd0a52a256b | jobmatch-ai-gateway-dev |
| Staging | 280c58ea17d9fe3235c33bd0a52a256b | jobmatch-ai-gateway-staging |
| Production | 280c58ea17d9fe3235c33bd0a52a256b | jobmatch-ai-gateway |

---

## Workflow Configuration

### Current Workflow (No Changes Required!)

The existing `.github/workflows/cloudflare-deploy.yml` workflow **already supports** environment-specific secrets via GitHub Environments.

**Key sections:**
```yaml
deploy-backend:
  # Uses GitHub Environment
  environment:
    name: ${{ ... environment logic ... }}

  steps:
    - name: Deploy to Cloudflare Workers
      env:
        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      run: npx wrangler deploy --env "$DEPLOY_ENV"
```

**What happens automatically:**
1. GitHub Actions detects which environment to use (based on branch)
2. Loads secrets from that GitHub Environment
3. Passes `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to wrangler
4. Wrangler deploys to Cloudflare Workers
5. **NEW:** Cloudflare Workers runtime picks up `AI_GATEWAY_SLUG` from environment secrets

### Enhanced Workflow (Optional - For Explicit AI Gateway Deployment)

If you want to **explicitly deploy** AI Gateway secrets during CI/CD (instead of manually via wrangler), you can add a new step:

**Create new file:** `.github/workflows/deploy-ai-gateway-secrets.yml`

```yaml
name: Deploy AI Gateway Secrets

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy AI Gateway secrets to'
        required: true
        type: choice
        options:
          - development
          - staging
          - production

jobs:
  deploy-ai-gateway-secrets:
    name: Deploy AI Gateway Secrets
    runs-on: ubuntu-latest
    environment:
      name: ${{ github.event.inputs.environment }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22.x'

      - name: Install Wrangler
        run: npm install -g wrangler

      - name: Deploy CLOUDFLARE_ACCOUNT_ID secret
        working-directory: workers
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          echo "${{ secrets.CLOUDFLARE_ACCOUNT_ID }}" | \
          wrangler secret put CLOUDFLARE_ACCOUNT_ID --env ${{ github.event.inputs.environment }}

      - name: Deploy AI_GATEWAY_SLUG secret
        working-directory: workers
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          echo "${{ secrets.AI_GATEWAY_SLUG }}" | \
          wrangler secret put AI_GATEWAY_SLUG --env ${{ github.event.inputs.environment }}

      - name: Summary
        run: |
          cat >> $GITHUB_STEP_SUMMARY << EOF
          ## ✅ AI Gateway Secrets Deployed

          **Environment:** ${{ github.event.inputs.environment }}
          **Account ID:** ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          **Gateway Slug:** ${{ secrets.AI_GATEWAY_SLUG }}

          Secrets deployed successfully to Cloudflare Workers.
          EOF
```

**Usage:**
1. Go to **Actions** tab in GitHub
2. Select **Deploy AI Gateway Secrets** workflow
3. Click **Run workflow**
4. Select environment (development/staging/production)
5. Click **Run workflow**

**Benefits:**
- One-click deployment of AI Gateway secrets
- No need to run wrangler commands manually
- Audit trail of secret deployments
- Can be run anytime without code deploy

**Drawback:**
- Requires manual trigger
- Not automatic with code deployments

**Recommendation:** Use the enhanced workflow for initial setup, then rely on manual wrangler deployment for updates.

---

## Verification Steps

### Verify GitHub Secrets Are Set

1. **Navigate to GitHub Environments:**
   - Repository → Settings → Environments

2. **Check Development:**
   - Click `development`
   - Verify secrets exist:
     - `CLOUDFLARE_ACCOUNT_ID` ✓
     - `AI_GATEWAY_SLUG` ✓

3. **Check Staging:**
   - Click `staging`
   - Verify secrets exist:
     - `CLOUDFLARE_ACCOUNT_ID` ✓
     - `AI_GATEWAY_SLUG` ✓

4. **Check Production:**
   - Click `production`
   - Verify secrets exist:
     - `CLOUDFLARE_ACCOUNT_ID` ✓
     - `AI_GATEWAY_SLUG` ✓

### Verify Wrangler Secrets Are Deployed

After GitHub secrets are set, you still need to deploy them to Cloudflare Workers:

**Option 1: Manual Deployment (Recommended for Initial Setup)**
```bash
cd /home/carl/application-tracking/jobmatch-ai
./scripts/deploy-ai-gateway.sh development
./scripts/deploy-ai-gateway.sh staging
./scripts/deploy-ai-gateway.sh production
```

**Option 2: Use Enhanced Workflow**
- Run the `Deploy AI Gateway Secrets` workflow for each environment

**Verify Secrets Are Deployed:**
```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# Check development
wrangler secret list --env development
# Should show:
# - CLOUDFLARE_ACCOUNT_ID
# - AI_GATEWAY_SLUG

# Check staging
wrangler secret list --env staging

# Check production
wrangler secret list --env production
```

### Verify AI Gateway is Working

**Deploy to Development:**
```bash
# Push to develop branch to trigger deployment
git checkout develop
git push origin develop
```

**Check Deployment Logs:**
1. Go to GitHub → Actions
2. Find the latest workflow run
3. Click on the run
4. Expand **Deploy Backend to Cloudflare Workers** job
5. Check logs for successful deployment

**Verify AI Gateway Usage:**
```bash
# Tail development worker logs
wrangler tail --env development

# Make a test request (from another terminal)
curl -X POST https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/applications/generate \
  -H "Authorization: Bearer DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "test-job-id"}'

# Expected log output:
# [OpenAI] Using Cloudflare AI Gateway: jobmatch-ai-gateway-dev
```

---

## Troubleshooting

### Issue: GitHub Secrets Not Available in Workflow

**Symptom:**
- Workflow runs but secrets are empty
- Error: "AI_GATEWAY_SLUG is not set"

**Solution:**
1. Verify secrets are added to correct GitHub Environment (not repository secrets)
2. Verify workflow is using `environment:` configuration
3. Check environment name matches branch logic:
   - `develop` branch → `development` environment
   - `staging` branch → `staging` environment
   - `main` branch → `production` environment

### Issue: Wrangler Secrets Not Deployed

**Symptom:**
- `wrangler secret list` shows no AI Gateway secrets
- Worker logs show "Using direct OpenAI API"

**Solution:**
```bash
# Deploy secrets manually
cd workers
echo "280c58ea17d9fe3235c33bd0a52a256b" | wrangler secret put CLOUDFLARE_ACCOUNT_ID --env development
echo "jobmatch-ai-gateway-dev" | wrangler secret put AI_GATEWAY_SLUG --env development
```

**Note:** GitHub Actions workflow does NOT automatically deploy wrangler secrets. You must:
1. Set GitHub Environment secrets (for CI/CD reference)
2. Deploy wrangler secrets manually (or via enhanced workflow)

### Issue: AI Gateway Not Being Used

**Symptom:**
- Worker logs show "Using direct OpenAI API" instead of "Using Cloudflare AI Gateway"
- No cache hits in Cloudflare dashboard

**Diagnosis:**
```bash
# Check if secrets are deployed
wrangler secret list --env production

# Should show:
# CLOUDFLARE_ACCOUNT_ID
# AI_GATEWAY_SLUG

# If missing, deploy them:
./scripts/deploy-ai-gateway.sh production
```

### Issue: Workflow Failing on Secret Deployment

**Symptom:**
- Enhanced workflow fails with "wrangler: command not found"
- Or: "Failed to authenticate with Cloudflare"

**Solution 1: Wrangler not installed**
```yaml
# Add to workflow before deploying secrets
- name: Install Wrangler
  run: npm install -g wrangler
```

**Solution 2: Missing CLOUDFLARE_API_TOKEN**
- Verify `CLOUDFLARE_API_TOKEN` is set in repository secrets
- Check token has correct permissions (Workers edit, Account read)

### Issue: Different Values in GitHub vs Wrangler

**Symptom:**
- GitHub Environment shows one value
- Wrangler shows different value
- AI Gateway uses wrong gateway slug

**Explanation:**
- GitHub Environment secrets are used for CI/CD reference only
- Wrangler secrets are the actual runtime secrets
- They must be kept in sync manually (or via enhanced workflow)

**Solution:**
1. Verify GitHub Environment secrets are correct
2. Re-deploy wrangler secrets:
   ```bash
   ./scripts/deploy-ai-gateway.sh production
   ```
3. Verify both match:
   ```bash
   # GitHub: Check in UI
   # Wrangler: wrangler secret list --env production
   ```

---

## Best Practices

### 1. Keep Secrets in Sync

GitHub Environment secrets and Wrangler secrets should always match:
- GitHub: Source of truth for CI/CD
- Wrangler: Actual runtime secrets
- Use deployment script to keep in sync

### 2. Audit Secret Changes

- All secret deployments should be logged
- Use enhanced workflow for audit trail
- Document when/why secrets were changed

### 3. Test in Development First

Before deploying to production:
1. Deploy to development
2. Verify AI Gateway works
3. Monitor for 24 hours
4. Then deploy to staging/production

### 4. Rotate Secrets Regularly

- CLOUDFLARE_ACCOUNT_ID: Rarely changes (only if account changes)
- AI_GATEWAY_SLUG: Changes if gateway renamed
- Update both GitHub and Wrangler when rotating

### 5. Use Branch Protection

Require approvals for production deployments:
1. GitHub → Settings → Environments → production
2. Enable "Required reviewers"
3. Add 1-2 reviewers
4. Prevents accidental production AI Gateway changes

---

## Related Documentation

- [AI Gateway Rollout Plan](./AI_GATEWAY_ROLLOUT_PLAN.md) - Phased deployment strategy
- [AI Gateway Rollback](./AI_GATEWAY_ROLLBACK.md) - How to rollback if issues occur
- [Environment Mapping](./ENVIRONMENT_MAPPING.md) - All environment variables
- [GitHub Secrets Setup](./GITHUB_SECRETS_SETUP.md) - General secrets configuration

---

## Summary Checklist

Before deploying AI Gateway via GitHub Actions:

- [ ] GitHub Environment secrets configured (development, staging, production)
- [ ] Wrangler secrets deployed to Cloudflare Workers (all environments)
- [ ] AI Gateway created in Cloudflare Dashboard (all environments)
- [ ] Deployment script tested in development
- [ ] Worker logs verified (showing AI Gateway usage)
- [ ] Cloudflare dashboard showing cache hits
- [ ] Team notified of deployment

**Ready to deploy?** Follow the [AI Gateway Rollout Plan](./AI_GATEWAY_ROLLOUT_PLAN.md).
