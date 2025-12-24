# GitHub Actions Multi-Environment Workflows

**Last Updated:** December 24, 2025
**Status:** Production Ready
**Prerequisites:** Railway environments created, git branches exist

---

## Overview

This document explains the updated GitHub Actions workflows that support multi-environment deployment to Railway.

## Workflow Architecture

### Current Workflows

1. **test.yml** - Run tests on push/PR ✓ (already supports develop)
2. **deploy-backend-railway.yml** - Deploy backend to Railway (NEEDS UPDATE)
3. **deploy-pr-preview.yml** - PR preview environments ✓ (no changes needed)

### Changes Required

Only **deploy-backend-railway.yml** needs updating to support multiple branches/environments.

---

## Updated Deployment Workflow

### File: `.github/workflows/deploy-backend-railway.yml`

The updated workflow will:
1. Trigger on push to `main`, `staging`, or `develop` branches
2. Automatically detect which environment to deploy to based on branch
3. Deploy to the correct Railway environment
4. Run environment-specific health checks

### Implementation

Replace the contents of `.github/workflows/deploy-backend-railway.yml` with:

```yaml
name: Deploy Backend to Railway

on:
  push:
    branches:
      - main      # → production environment
      - staging   # → staging environment
      - develop   # → development environment
    paths:
      - 'backend/**'
      - '.github/workflows/deploy-backend-railway.yml'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        type: choice
        options:
          - production
          - staging
          - development

jobs:
  deploy:
    name: Deploy Backend
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Determine deployment environment
        id: env-setup
        run: |
          # Determine environment based on branch or manual input
          if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
            ENV_NAME="${{ github.event.inputs.environment }}"
            BRANCH_NAME="${GITHUB_REF#refs/heads/}"
          else
            BRANCH_NAME="${GITHUB_REF#refs/heads/}"
            case "$BRANCH_NAME" in
              main)
                ENV_NAME="production"
                ;;
              staging)
                ENV_NAME="staging"
                ;;
              develop)
                ENV_NAME="development"
                ;;
              *)
                echo "Error: Unknown branch $BRANCH_NAME"
                exit 1
                ;;
            esac
          fi

          echo "environment=$ENV_NAME" >> $GITHUB_OUTPUT
          echo "branch=$BRANCH_NAME" >> $GITHUB_OUTPUT
          echo "Deploying branch '$BRANCH_NAME' to environment '$ENV_NAME'"

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
          ENVIRONMENT: ${{ steps.env-setup.outputs.environment }}
        run: |
          cd backend
          echo "Deploying to Railway environment: $ENVIRONMENT"
          railway up --service backend --environment "$ENVIRONMENT" --detach

      - name: Wait for Deployment Stability
        run: sleep 15

      - name: Health Check
        id: health-check
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
          ENVIRONMENT: ${{ steps.env-setup.outputs.environment }}
        run: |
          cd backend

          # Get backend URL from Railway for specific environment
          BACKEND_URL=$(railway status \
            --service backend \
            --environment "$ENVIRONMENT" \
            --json | jq -r '.deployments[0].url')

          if [ -z "$BACKEND_URL" ] || [ "$BACKEND_URL" == "null" ]; then
            echo "Failed to get backend URL for environment: $ENVIRONMENT"
            exit 1
          fi

          echo "Testing health endpoint: $BACKEND_URL/health"
          echo "backend_url=$BACKEND_URL" >> $GITHUB_OUTPUT

          # Retry health check up to 5 times
          for i in {1..5}; do
            if curl -f -s "$BACKEND_URL/health" > /dev/null; then
              echo "Health check passed on attempt $i"
              curl -s "$BACKEND_URL/health" | jq '.'
              exit 0
            fi
            echo "Health check attempt $i/5 failed, retrying in 10s..."
            sleep 10
          done

          echo "Health check failed after 5 attempts"
          exit 1

      - name: Deployment Summary
        if: success()
        env:
          ENVIRONMENT: ${{ steps.env-setup.outputs.environment }}
          BRANCH: ${{ steps.env-setup.outputs.branch }}
          BACKEND_URL: ${{ steps.health-check.outputs.backend_url }}
        run: |
          echo "=========================================="
          echo "Deployment Successful!"
          echo "=========================================="
          echo "Branch: $BRANCH"
          echo "Environment: $ENVIRONMENT"
          echo "Backend URL: $BACKEND_URL"
          echo "Health Endpoint: $BACKEND_URL/health"
          echo "=========================================="
          echo ""
          echo "Next Steps:"
          case "$ENVIRONMENT" in
            production)
              echo "✓ Production is now live with latest changes"
              echo "- Monitor Railway dashboard for any issues"
              echo "- Check error tracking (if configured)"
              echo "- Verify critical user flows"
              ;;
            staging)
              echo "✓ Staging environment updated"
              echo "- Run QA test suite against staging"
              echo "- Verify all features work as expected"
              echo "- If tests pass, create PR: staging → main"
              ;;
            development)
              echo "✓ Development environment updated"
              echo "- Test integrated features"
              echo "- Verify API endpoints work correctly"
              echo "- If stable, create PR: develop → staging"
              ;;
          esac

      - name: Notify on Failure
        if: failure()
        env:
          ENVIRONMENT: ${{ steps.env-setup.outputs.environment }}
          BRANCH: ${{ steps.env-setup.outputs.branch }}
        run: |
          echo "=========================================="
          echo "Deployment Failed!"
          echo "=========================================="
          echo "Branch: $BRANCH"
          echo "Environment: $ENVIRONMENT"
          echo ""
          echo "Troubleshooting Steps:"
          echo "1. Check Railway dashboard for deployment logs"
          echo "2. Verify environment variables are set correctly"
          echo "3. Check backend build logs for errors"
          echo "4. Verify health endpoint is accessible"
          echo ""
          echo "Railway Dashboard: https://railway.app/project"
```

---

## Test Workflow (No Changes Needed)

### File: `.github/workflows/test.yml`

This workflow already supports `develop` branch:

```yaml
on:
  push:
    branches: [main, develop]  # ✓ Already configured
  pull_request:
    branches: [main, develop]  # ✓ Already configured
```

**No changes required** - it will automatically run tests for:
- Pushes to `main` or `develop`
- PRs targeting `main` or `develop`
- PRs from any branch (including `staging`)

---

## PR Preview Workflow (No Changes Needed)

### File: `.github/workflows/deploy-pr-preview.yml`

This workflow creates ephemeral Railway environments for each PR:

- Triggers on PR open, sync, reopen, close
- Creates `pr-123` environment for each PR
- Auto-deletes when PR closes

**No changes required** - it works independently of branch-based deployments.

---

## Deployment Flow Examples

### Example 1: Feature Development

```bash
# Developer creates feature branch
git checkout develop
git checkout -b feature/new-feature

# Make changes, commit
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Create PR to develop
gh pr create --base develop

# GitHub Actions:
# ✓ test.yml runs (tests the code)
# ✓ deploy-pr-preview.yml runs (creates pr-123 environment)
# ✗ deploy-backend-railway.yml does NOT run (only runs on main/staging/develop)

# After PR approval, merge to develop
# GitHub Actions:
# ✓ test.yml runs (tests develop branch)
# ✓ deploy-backend-railway.yml runs (deploys to development environment)
```

### Example 2: Staging Promotion

```bash
# After testing in development, promote to staging
git checkout staging
git pull origin staging
git merge develop  # or create PR: develop → staging
git push origin staging

# GitHub Actions:
# ✓ test.yml runs (tests staging branch)
# ✓ deploy-backend-railway.yml runs (deploys to staging environment)
```

### Example 3: Production Release

```bash
# After QA approval in staging, promote to production
git checkout main
git pull origin main
git merge staging  # or create PR: staging → main (recommended)
git push origin main

# GitHub Actions:
# ✓ test.yml runs (tests main branch)
# ✓ deploy-backend-railway.yml runs (deploys to production environment)
```

---

## Manual Deployment Trigger

The workflow supports manual deployment via GitHub Actions UI:

1. Go to GitHub repository
2. Click **Actions** tab
3. Select **Deploy Backend to Railway** workflow
4. Click **Run workflow** button
5. Select environment (production/staging/development)
6. Click **Run workflow**

This allows manual deployment without pushing code.

---

## Environment-Specific Behavior

### Production Deployment
- Deploys from `main` branch
- Targets Railway `production` environment
- Critical - monitor closely after deployment
- Consider adding manual approval gate (see Branch Protection)

### Staging Deployment
- Deploys from `staging` branch
- Targets Railway `staging` environment
- Pre-production testing ground
- Should mirror production configuration

### Development Deployment
- Deploys from `develop` branch
- Targets Railway `development` environment
- Integration testing environment
- Can use test/sandbox API keys

---

## Status Checks and Branch Protection

After implementing multi-environment workflows, configure branch protection rules to require successful deployments before merging.

### Recommended Status Checks

**For `main` branch (production):**
- Require: Backend Tests
- Require: Frontend Tests
- Require: E2E Tests
- Require: PR approval
- Optional: Require staging deployment success

**For `staging` branch:**
- Require: Backend Tests
- Require: Frontend Tests
- Optional: PR approval

**For `develop` branch:**
- Require: Backend Tests
- Require: Frontend Tests

See `docs/BRANCH-PROTECTION-SETUP.md` for detailed configuration.

---

## Monitoring Deployments

### Via GitHub Actions

1. Go to repository → Actions tab
2. View workflow runs for each environment
3. Check logs for deployment details

### Via Railway Dashboard

1. Go to Railway project
2. Select environment (production/staging/development)
3. View deployment history and logs
4. Monitor resource usage

### Via CLI

```bash
# Check status of development environment
railway environment development
railway status

# View logs
railway logs

# Switch to staging
railway environment staging
railway status
```

---

## Rollback Procedures

### Railway Dashboard Rollback (Fastest)

1. Go to Railway → Select environment
2. Click on deployment history
3. Click "Rollback" on previous successful deployment
4. Deployment rolls back in ~30 seconds

### Git Revert Rollback

```bash
# For production
git checkout main
git revert <bad-commit-sha>
git push origin main
# → Triggers automatic deployment of reverted code

# For staging
git checkout staging
git revert <bad-commit-sha>
git push origin staging

# For development
git checkout develop
git revert <bad-commit-sha>
git push origin develop
```

---

## Troubleshooting

### Deployment Not Triggering

**Check:**
1. Did you push to `main`, `staging`, or `develop`?
2. Did you modify files in `backend/**` directory?
3. Check GitHub Actions tab for workflow status
4. Verify RAILWAY_TOKEN secret is configured

### Wrong Environment Deployed To

**Check:**
1. Verify branch name matches exactly (`main`, `staging`, `develop`)
2. Check workflow logs for environment detection
3. Verify Railway environments are named correctly

### Health Check Failing

**Check:**
1. Railway environment is running
2. Backend service has public domain
3. Health endpoint returns 200 status
4. Environment variables are set correctly

### Deployment Stuck

**Fix:**
1. Cancel workflow in GitHub Actions
2. Check Railway dashboard for deployment status
3. Manually trigger redeploy if needed
4. Review Railway deployment logs

---

## Cost Impact

### GitHub Actions Minutes

Multi-environment deployments increase Actions usage:

- **Before:** ~3-5 minutes per deployment (main only)
- **After:** ~3-5 minutes per environment (main, staging, develop)

**Estimated increase:** 2-3x GitHub Actions minutes

**Mitigation:**
- GitHub free tier: 2,000 minutes/month (sufficient for most projects)
- Only backend changes trigger deployment (frontend doesn't)
- PR previews already counted separately

---

## Testing the Workflows

### Test Checklist

After updating workflows, test each environment:

```bash
# 1. Test development deployment
git checkout develop
echo "test" >> backend/README.md
git add backend/README.md
git commit -m "test: verify development deployment"
git push origin develop
# → Check GitHub Actions → Verify deploys to development

# 2. Test staging deployment
git checkout staging
git merge develop
git push origin staging
# → Check GitHub Actions → Verify deploys to staging

# 3. Test production deployment
git checkout main
git merge staging
git push origin main
# → Check GitHub Actions → Verify deploys to production

# 4. Clean up test commits
git checkout develop
git revert HEAD
git push origin develop
git checkout staging
git merge develop
git push origin staging
git checkout main
git merge staging
git push origin main
```

---

## Next Steps

After implementing GitHub Actions changes:

1. **Configure branch protection rules** (see `docs/BRANCH-PROTECTION-SETUP.md`)
2. **Update team documentation** (README, CONTRIBUTING)
3. **Train team on new workflow**
4. **Monitor first few deployments closely**
5. **Gather feedback and iterate**

---

## Quick Reference

### Workflow Trigger Matrix

| Branch Push | Test Workflow | Deploy Workflow | Deploys To |
|------------|---------------|-----------------|------------|
| `feature/*` | ✓ (via PR) | ✗ | PR preview only |
| `develop` | ✓ | ✓ | development |
| `staging` | ✓ | ✓ | staging |
| `main` | ✓ | ✓ | production |

### Environment Variables Required

GitHub Secrets needed:
- `RAILWAY_TOKEN` ✓ (already configured)

Railway Environment Variables (per environment):
- See `docs/RAILWAY-MULTI-ENVIRONMENT-SETUP.md`

---

**Document Version:** 1.0
**Author:** Project Manager AI
**Related Docs:**
- `docs/RAILWAY-MULTI-ENVIRONMENT-SETUP.md`
- `docs/BRANCH-PROTECTION-SETUP.md` (to be created)
- `docs/DEPLOYMENT-WORKFLOW-EXPLAINED.md`
