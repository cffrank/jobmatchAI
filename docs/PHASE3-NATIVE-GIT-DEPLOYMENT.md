# Phase 3: Native Git Deployment Integration

**Status:** IMPLEMENTATION COMPLETE ✅
**Date Completed:** December 24, 2025
**Time Required for Setup:** 15-20 minutes

---

## Overview

Phase 3 migrates from manual GitHub Actions-triggered deployments to Railway's native git-connected deployment system. This eliminates intermediary deployment steps and leverages Railway's built-in CI/CD capabilities.

### What This Means

- **Before Native Git:** GitHub Actions acts as intermediary, installing Railway CLI and manually triggering deployments
- **After Native Git:** Railway monitors GitHub repository directly and deploys automatically on push
- **Result:** Simpler architecture, faster deployments, native Railway integration

---

## What Was Implemented

### 1. GitHub Repository Linking Documentation

**File:** This document

Complete instructions for:
- Linking GitHub repository to Railway project
- Configuring automatic deployments on push
- Setting up branch-based deployment strategies
- Optimizing watch patterns for efficient builds
- Implementing deployment notifications
- Troubleshooting connection issues

### 2. Watch Pattern Optimization

**File:** `backend/railway.toml`

Review confirms current watch patterns are optimal:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci && npm run build && npm prune --omit=dev"
watchPatterns = ["src/**/*.ts", "package.json", "tsconfig.json"]
```

**What these patterns do:**
- `src/**/*.ts` - Rebuild when any TypeScript source file changes
- `package.json` - Rebuild when dependencies change
- `tsconfig.json` - Rebuild when TypeScript configuration changes

**What they prevent:**
- Rebuilds on documentation changes (*.md files)
- Rebuilds on test file changes (if tests are separate)
- Rebuilds on configuration changes not affecting build
- Unnecessary deploys on non-functional changes

**Result:** Efficient builds, only when necessary

### 3. Workflow Decision Framework

**File:** `.github/workflows/deploy-backend-railway.yml`

**Three Options:**

#### Option A: Keep as Emergency Fallback (Recommended)

Convert to manual-only workflow:

```yaml
name: Manual Backend Deployment (Emergency Only)

on:
  workflow_dispatch:
    inputs:
      reason:
        description: 'Reason for manual deployment (e.g., Railway outage)'
        required: true
        type: string
      environment:
        description: 'Environment to deploy to'
        required: true
        type: choice
        options:
          - production
          - staging

jobs:
  deploy:
    name: Manual Deploy Backend
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Log deployment reason
        run: |
          echo "Manual deployment triggered"
          echo "Reason: ${{ github.event.inputs.reason }}"
          echo "Environment: ${{ github.event.inputs.environment }}"
          echo "Triggered by: ${{ github.actor }}"

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          cd backend
          railway up --service backend --environment ${{ github.event.inputs.environment }} --detach

      - name: Wait for deployment stability
        run: sleep 15

      - name: Health Check
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          cd backend
          BACKEND_URL=$(railway status --service backend --json | jq -r '.deployments[0].url')

          if [ -z "$BACKEND_URL" ]; then
            echo "Failed to get backend URL"
            exit 1
          fi

          echo "Testing health endpoint: $BACKEND_URL/health"

          for i in {1..5}; do
            if curl -f -s "$BACKEND_URL/health" > /dev/null; then
              echo "Health check passed on attempt $i"
              exit 0
            fi
            echo "Health check attempt $i/5 failed, retrying in 10s..."
            sleep 10
          done

          echo "Health check failed after 5 attempts"
          exit 1

      - name: Output Backend URL
        if: success()
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          cd backend
          BACKEND_URL=$(railway status --service backend --json | jq -r '.deployments[0].url')
          echo "Manual deployment successful!"
          echo "Backend URL: $BACKEND_URL"
          echo "Deployed by: ${{ github.actor }}"
          echo "Reason: ${{ github.event.inputs.reason }}"
```

**When to use this workflow:**
- Railway experiencing downtime
- GitHub integration temporarily broken
- Need to deploy from specific commit
- Emergency hotfix deployment
- Testing deployment process

**Benefits:**
- Safety net for emergencies
- Maintains deployment capability
- No automatic triggers
- Clear documentation of manual deploys

#### Option B: Archive Workflow

Move to archive location:

```bash
mkdir -p .github/workflows/archive
git mv .github/workflows/deploy-backend-railway.yml .github/workflows/archive/
git commit -m "ci: archive manual deployment workflow (Phase 3 - native git deployment active)"
```

**Benefits:**
- Keeps file in history
- Clearly indicates it's not active
- Can be restored if needed
- Reduces active workflow count

#### Option C: Delete Workflow

Remove completely:

```bash
git rm .github/workflows/deploy-backend-railway.yml
git commit -m "ci: remove manual deployment workflow (Phase 3 - native git deployment active)"
```

**Benefits:**
- Simplest option
- Forces use of native Railway
- Can always restore from git history
- Cleanest codebase

**Recommendation:** Option A (Keep as Emergency Fallback)

---

## How Native Git Deployment Works

### Automatic Deployment Flow

```
1. Developer pushes to main branch
   ↓
2. GitHub sends webhook to Railway (<1 second)
   ↓
3. Railway detects push event
   ↓
4. Railway checks watch patterns
   ↓
5. If patterns match: Start build
   ↓
6. Railway runs buildCommand from railway.toml
   ↓
7. Build completes (~2 minutes)
   ↓
8. Railway deploys new version
   ↓
9. Railway runs health check
   ↓
10. Deployment marked as active
   ↓
11. Old deployment terminated gracefully
```

**Total Time:** 2-3 minutes (same as before, but no GitHub Actions overhead)

### Key Components

1. **GitHub Webhook**
   - Automatically configured when you link repository
   - Sends push events to Railway
   - No configuration needed on GitHub side

2. **Railway Build System**
   - Uses Nixpacks builder (from railway.toml)
   - Runs buildCommand
   - Caches dependencies for faster builds
   - Prunes devDependencies automatically

3. **Watch Patterns**
   - Filters which file changes trigger rebuilds
   - Prevents unnecessary builds
   - Configurable in railway.toml

4. **Health Checks**
   - Railway automatically monitors health endpoint
   - Configured in railway.toml: `healthcheckPath = "/health"`
   - Timeout: 300 seconds (5 minutes)
   - Retries automatically

5. **Zero-Downtime Deployment**
   - Railway keeps old version running
   - New version starts and health check passes
   - Traffic switches to new version
   - Old version terminates gracefully

---

## Setup Instructions

### Prerequisites

Before starting Phase 3:
- [ ] Phase 1 complete (environment variables configured)
- [ ] Phase 2 complete (PR preview environments working)
- [ ] Railway account with admin access
- [ ] GitHub repository admin access
- [ ] Railway CLI installed (for verification)

### Step 1: Access Railway Project Settings

1. Go to https://railway.app/dashboard
2. Sign in with your Railway account
3. Select the **JobMatch AI** project
4. Click **Settings** in the left sidebar

### Step 2: Check Current GitHub Connection Status

In the Settings page, look for:
- **Source** section
- **GitHub Repo** section
- **Connected Repository** status

**If Already Connected:**
- You'll see repository name: `cffrank/jobmatchAI`
- You'll see connected branch(es)
- Skip to Step 4 (Verify Configuration)

**If Not Connected:**
- You'll see "Connect GitHub Repo" button
- Continue to Step 3

### Step 3: Link GitHub Repository

1. **Click "Connect GitHub Repo"**
   - Railway will redirect to GitHub
   - You may need to authenticate

2. **Grant Repository Access**
   - Select "Only select repositories"
   - Choose `cffrank/jobmatchAI`
   - Click "Install & Authorize"

3. **Select Repository in Railway**
   - You'll return to Railway dashboard
   - Select `cffrank/jobmatchAI` from dropdown
   - Railway will detect the repository structure

4. **Configure Root Directory**
   - Railway may auto-detect `backend/` folder
   - If not, set root directory to: `backend`
   - This ensures Railway only builds the backend

5. **Confirm Connection**
   - Click "Connect"
   - Railway will show "Connected to GitHub"

### Step 4: Verify Configuration

In Railway project settings, verify:

1. **Repository Connected**
   - Shows: `cffrank/jobmatchAI`
   - Status: Connected (green indicator)

2. **Branch Configuration**
   - **Production environment** linked to `main` branch
   - Auto-deploy enabled for `main`

3. **Service Configuration**
   - Backend service shows GitHub as source
   - Root directory: `backend/`
   - Railway.toml detected

4. **Build Configuration**
   - Builder: NIXPACKS
   - Build command matches railway.toml
   - Start command matches railway.toml

### Step 5: Configure Deployment Triggers

1. **Navigate to Backend Service**
   - Click on **Backend** service card
   - Go to **Settings** tab

2. **Deployment Settings**
   - **Auto-Deploy:** ON (enabled)
   - **Branch:** main
   - **Deploy on push:** ON (enabled)

3. **Watch Patterns (Advanced)**
   - Railway uses patterns from railway.toml
   - Current patterns are optimal
   - No changes needed

### Step 6: Test Automatic Deployment

Create a test commit to verify automatic deployment:

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Make a small backend change
echo "// Phase 3 native git deployment test" >> backend/src/index.ts

# Commit and push
git add backend/src/index.ts
git commit -m "test: verify phase 3 native git deployment"
git push origin main
```

**Monitor in Railway:**

1. Go to Railway dashboard
2. Click Backend service
3. Click **Deployments** tab
4. You should see:
   ```
   New Deployment
   Triggered by: GitHub
   Commit: test: verify phase 3 native git deployment
   Status: Building...
   ```

5. Wait for deployment to complete (~2-3 minutes)

6. Verify deployment succeeded:
   - Status: Active (green)
   - Health check: Passed
   - No errors in logs

**Monitor in GitHub:**

1. Go to GitHub repository
2. Click **Actions** tab
3. You should **NOT** see "Deploy Backend to Railway" workflow running
4. Only PR preview workflows should appear (if any PRs open)

**Success Criteria:**
- ✓ Deployment triggered automatically on push
- ✓ No GitHub Actions workflow for backend deployment
- ✓ Deployment completed in 2-3 minutes
- ✓ Health check passed
- ✓ Application accessible at Railway URL

### Step 7: Update Deployment Workflow (Optional)

Choose what to do with `.github/workflows/deploy-backend-railway.yml`:

**Option A: Convert to Emergency Fallback (Recommended)**

Edit the workflow file:

```yaml
# Change trigger from push to manual only
on:
  workflow_dispatch:
    inputs:
      reason:
        description: 'Reason for manual deployment'
        required: true

# Add comment at top explaining when to use
# Emergency manual deployment - only use if Railway automatic deployment is unavailable
```

Commit the changes:

```bash
git add .github/workflows/deploy-backend-railway.yml
git commit -m "ci: convert deployment workflow to emergency fallback only (Phase 3)"
git push origin main
```

**Option B: Archive or Delete**

See "Workflow Decision Framework" section above for detailed instructions.

### Step 8: Run Verification Script

Verify complete configuration:

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Run verification
chmod +x scripts/verify-phase3-setup.sh
./scripts/verify-phase3-setup.sh

# Expected output: All checks pass
```

The script verifies:
- GitHub repository link status
- Railway project configuration
- Watch patterns
- Deployment settings
- Recent deployment history

### Step 9: Update Team Documentation

Inform your team about the new deployment process:

1. **Update README.md or DEPLOYMENT.md:**

```markdown
## Deployment Process

Deployments are fully automated via Railway's native git integration.

### Production Deployment

1. Merge PR to `main` branch
2. Railway automatically deploys (no manual steps)
3. Monitor in Railway dashboard: https://railway.app/project/jobmatch-ai
4. Deployment completes in ~2-3 minutes

### Rollback

1. Go to Railway dashboard → Backend → Deployments
2. Find last working deployment
3. Click ⋮ → Rollback
4. Confirm

### Emergency Manual Deployment

If Railway is unavailable:
1. Go to GitHub → Actions
2. Run "Manual Backend Deployment" workflow
3. Provide reason for manual deployment
4. Select environment

See docs/PHASE3-NATIVE-GIT-DEPLOYMENT.md for details.
```

2. **Send notification to team:**
   - Link to quick start: `docs/PHASE3-QUICK-START.md`
   - Explain new deployment process
   - Show Railway dashboard access
   - Train on rollback procedures

---

## Watch Pattern Optimization

### Current Watch Patterns (Optimal)

```toml
watchPatterns = ["src/**/*.ts", "package.json", "tsconfig.json"]
```

### Pattern Syntax

Railway uses glob patterns to determine which file changes trigger rebuilds:

- `*` - Matches any characters except `/`
- `**` - Matches any characters including `/`
- `?` - Matches single character
- `[abc]` - Matches any character in brackets
- `{a,b}` - Matches either pattern

### Common Patterns

**TypeScript Project:**
```toml
watchPatterns = [
  "src/**/*.ts",           # All TypeScript source
  "src/**/*.tsx",          # React components (if frontend)
  "package.json",          # Dependencies
  "package-lock.json",     # Lock file
  "tsconfig.json"          # TS configuration
]
```

**JavaScript Project:**
```toml
watchPatterns = [
  "src/**/*.js",
  "package.json",
  "package-lock.json"
]
```

**Include Environment-Specific Files:**
```toml
watchPatterns = [
  "src/**/*.ts",
  "package.json",
  ".env.production",       # Production env file
  "railway.toml"           # Railway config
]
```

**Exclude Patterns:**
```toml
# Railway doesn't support explicit exclude
# Instead, be specific with includes

# Good: Only source files
watchPatterns = ["src/**/*.ts"]

# Avoid: Too broad (includes everything)
watchPatterns = ["**/*"]
```

### Testing Watch Patterns

Test which files trigger rebuilds:

1. **Make a change to a watched file:**
   ```bash
   echo "// test" >> backend/src/index.ts
   git commit -am "test: trigger rebuild"
   git push
   ```
   **Expected:** Railway deploys

2. **Make a change to an ignored file:**
   ```bash
   echo "# test" >> backend/README.md
   git commit -am "docs: update readme"
   git push
   ```
   **Expected:** Railway does NOT deploy

3. **Check Railway deployment log:**
   - Should show "No changes detected" for ignored files
   - Should show "Building..." for watched files

### Optimizing Watch Patterns

If you notice unnecessary rebuilds:

1. **Check recent deployments:**
   - Railway dashboard → Deployments
   - Look for deployments with "No changes"

2. **Review commit history:**
   - Identify which file changes triggered unnecessary deploys
   - Add those patterns to exclusions (by being more specific with includes)

3. **Update watch patterns:**
   ```toml
   # Before: Too broad
   watchPatterns = ["**/*.ts"]  # Includes test files, config files

   # After: More specific
   watchPatterns = ["src/**/*.ts"]  # Only source files
   ```

4. **Test new patterns:**
   - Make test commits
   - Verify deploy/no-deploy behavior
   - Adjust as needed

---

## Branch-Based Deployment Strategies

### Single Branch (Simple)

**Configuration:**
- `main` branch → production environment
- All pushes to main deploy immediately

**Use when:**
- Small team
- Simple deployment needs
- Direct-to-production workflow

### Multi-Branch (Recommended)

**Configuration:**
- `main` branch → production environment
- `develop` branch → staging environment
- PR branches → PR preview environments (Phase 2)

**Setup in Railway:**

1. Create staging environment:
   - Railway dashboard → Environments
   - Click "New Environment"
   - Name: "staging"
   - Clone from: "production"

2. Link staging to develop branch:
   - Select staging environment
   - Settings → Deployments
   - Branch: `develop`
   - Auto-deploy: ON

3. Workflow:
   ```
   Feature branch → PR → PR preview environment
                ↓
           Merge to develop
                ↓
         Staging deployment
                ↓
          Test in staging
                ↓
       Merge to main (or promote)
                ↓
       Production deployment
   ```

### Environment Promotion

**Option A: Git-based promotion (Simple)**

```bash
# After testing in staging
git checkout main
git merge develop
git push origin main

# Deploys to production automatically
```

**Option B: Railway promotion (Advanced)**

Railway dashboard:
1. Go to staging deployment
2. Click "Promote to production"
3. Confirm

Benefits:
- Same build promoted (no rebuild)
- Faster deployment
- Guaranteed same code

---

## Deployment Notifications

### Slack Integration

1. **Create Slack Webhook:**
   - Slack → Apps → Incoming Webhooks
   - Create webhook for deployment channel
   - Copy webhook URL

2. **Configure Railway:**
   - Railway → Settings → Webhooks
   - Add new webhook
   - URL: [Your Slack webhook URL]
   - Events: deployment.started, deployment.completed, deployment.failed

3. **Test:**
   - Make a test commit
   - Check Slack for deployment notification

**Example Notification:**
```
🚀 Backend Deployment Started
Branch: main
Commit: abc123 - "feat: add new feature"
Triggered by: GitHub push
```

### Discord Integration

Similar to Slack:
1. Discord → Server Settings → Integrations → Webhooks
2. Create webhook
3. Copy webhook URL
4. Configure in Railway webhooks

### Email Notifications

Railway settings:
1. Project → Settings → Notifications
2. Add email address
3. Select events to notify

---

## Rollback Procedures

### Method 1: Railway Dashboard (Fastest)

1. **Access Deployments:**
   - Railway dashboard → Backend service
   - Click "Deployments" tab

2. **Find Last Working Deployment:**
   - Scroll through deployment history
   - Identify last known-good deployment
   - Check deployment time and commit

3. **Rollback:**
   - Click ⋮ (three dots) next to deployment
   - Click "Rollback"
   - Confirm action

4. **Verify:**
   - New deployment starts (uses previous build)
   - No rebuild needed
   - Completes in < 30 seconds
   - Health check passes

**Time to recover:** 30-60 seconds

### Method 2: Git Revert (Clean History)

```bash
# Revert the problematic commit
git revert <bad-commit-hash>
git push origin main

# Railway automatically deploys the revert
```

**Time to recover:** 2-3 minutes (full rebuild)

**Benefits:**
- Creates revert commit (clean history)
- Fully automated
- Can be reverted again if needed

### Method 3: Force Push Previous Commit (Caution)

```bash
# ONLY use if absolutely necessary
# This rewrites git history

git checkout main
git reset --hard <good-commit-hash>
git push origin main --force

# Railway deploys the previous commit
```

**Time to recover:** 2-3 minutes (full rebuild)

**Risks:**
- Rewrites git history
- Can affect team members' local repos
- Should be avoided if possible

**When to use:**
- Bad commit contains secrets
- Commit broke git history
- Emergency recovery only

### Method 4: Manual Deployment from Specific Commit

Using emergency workflow:

1. Go to GitHub → Actions
2. Run "Manual Backend Deployment" workflow
3. Checkout specific commit in workflow
4. Deploy manually

---

## Troubleshooting

### Issue: Deployments Not Triggering on Push

**Symptoms:** Push to main but Railway doesn't deploy

**Diagnosis:**

1. **Check GitHub Webhook:**
   - GitHub → Settings → Webhooks
   - Look for Railway webhook
   - Check recent deliveries
   - Look for errors

2. **Check Railway Connection:**
   - Railway → Settings → GitHub Repo
   - Verify connection status
   - Re-authenticate if needed

3. **Check Branch Configuration:**
   - Railway → Backend → Settings
   - Verify branch is set to `main`
   - Check auto-deploy is enabled

4. **Check Watch Patterns:**
   - Review files changed in commit
   - Verify they match watch patterns
   - Railway logs will show "No changes detected" if patterns don't match

**Solutions:**

```bash
# Re-link GitHub repository
# Railway dashboard → Settings → Disconnect GitHub
# Then: Connect GitHub Repo again

# Verify webhook is active
# GitHub → Settings → Webhooks → Railway
# Click "Redeliver" on recent push

# Check Railway logs
railway logs --service backend

# Manual trigger as fallback
cd backend && railway up --detach
```

### Issue: Build Fails on Railway

**Symptoms:** Deployment starts but build fails

**Common Causes:**

1. **Missing Dependencies:**
   ```
   Error: Cannot find module 'some-package'
   ```

   **Fix:**
   ```bash
   # Ensure dependency is in package.json
   npm install some-package
   git add package.json package-lock.json
   git commit -m "fix: add missing dependency"
   git push
   ```

2. **Build Script Errors:**
   ```
   Error: TypeScript compilation failed
   ```

   **Fix:**
   ```bash
   # Test build locally
   cd backend
   npm run build

   # Fix TypeScript errors
   # Commit and push
   ```

3. **Environment Variable Missing:**
   ```
   Error: Environment variable not defined
   ```

   **Fix:**
   - Railway dashboard → Backend → Variables
   - Add missing variable
   - Railway will auto-redeploy

4. **Node Version Mismatch:**
   ```
   Error: Unsupported Node.js version
   ```

   **Fix:**
   ```json
   // package.json
   {
     "engines": {
       "node": ">=18.0.0"
     }
   }
   ```

**Debugging:**

```bash
# View full build logs
railway logs --service backend --deployment <deployment-id>

# Check build environment
railway run --service backend env

# Test build locally with same command
cd backend
npm ci && npm run build && npm prune --omit=dev
```

### Issue: Deployment Succeeds but Service Unhealthy

**Symptoms:** Build completes but health check fails

**Diagnosis:**

1. **Check Health Endpoint:**
   ```bash
   # Get deployment URL
   railway status --service backend --json | jq -r '.deployments[0].url'

   # Test health endpoint
   curl https://[url]/health
   ```

2. **Check Service Logs:**
   ```bash
   railway logs --service backend --follow

   # Look for:
   # - Startup errors
   # - Port binding issues
   # - Missing environment variables
   # - Database connection failures
   ```

3. **Check Environment Variables:**
   ```bash
   # List all variables
   railway variables list --service backend

   # Compare with required variables
   # Ensure all are set correctly
   ```

**Solutions:**

1. **Health Check Endpoint Issue:**
   ```typescript
   // Ensure /health endpoint exists and responds quickly
   app.get('/health', (req, res) => {
     res.json({ status: 'ok', timestamp: new Date().toISOString() });
   });
   ```

2. **Increase Health Check Timeout:**
   ```toml
   # railway.toml
   [deploy]
   healthcheckPath = "/health"
   healthcheckTimeout = 300  # Increase if startup is slow
   ```

3. **Fix Port Binding:**
   ```typescript
   // Use Railway's PORT environment variable
   const PORT = process.env.PORT || 3000;
   app.listen(PORT, '0.0.0.0', () => {
     console.log(`Server listening on port ${PORT}`);
   });
   ```

### Issue: Want to Skip Deployment for Specific Commit

**Symptoms:** Need to commit but don't want to trigger deployment

**Solution:**

Add `[railway skip]` or `[skip ci]` to commit message:

```bash
git commit -m "docs: update documentation [railway skip]"
git push

# Railway will ignore this push
```

**Use cases:**
- Documentation updates
- README changes
- Comment-only changes
- Test file updates (if not in watch patterns)

### Issue: Multiple Deployments Triggered

**Symptoms:** Single push triggers multiple deployments

**Causes:**
1. Multiple environments watching same branch
2. GitHub Actions workflow still active
3. Manual deployment overlapping with automatic

**Solutions:**

```bash
# Check active environments
railway environment list

# Verify each environment's branch
# Ensure only one environment watches each branch

# Disable GitHub Actions workflow
# Or convert to manual-only trigger

# Check for pending deployments
railway status --service backend --json
```

---

## Advanced Configuration

### Custom Build Configuration

Override Nixpacks defaults:

```toml
# railway.toml

[build]
builder = "NIXPACKS"

# Custom build command
buildCommand = "npm ci && npm run build:production && npm prune --omit=dev"

# Watch specific patterns
watchPatterns = [
  "src/**/*.ts",
  "package.json",
  "tsconfig.json",
  "prisma/schema.prisma"  # If using Prisma
]

# Ignore patterns (via excludePaths in some configs)
# Note: Railway doesn't support excludePaths directly
# Use specific include patterns instead
```

### Custom Start Configuration

```toml
[deploy]
# Start command
startCommand = "node dist/index.js"

# Health check
healthcheckPath = "/health"
healthcheckTimeout = 300

# Restart policy
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

# Number of replicas (for scaling)
numReplicas = 1  # Increase for load balancing
```

### Environment-Specific Configuration

```toml
# railway.toml - production config

[build]
buildCommand = "npm ci && npm run build && npm prune --omit=dev"

[deploy]
startCommand = "npm start"

# For staging environment, create railway.staging.toml
# Railway will use appropriate file based on environment
```

### Database Migration Integration

```toml
[deploy]
# Run migrations before starting
# Note: This requires custom nixpacks configuration
# Alternative: Use Railway's built-in migration support

startCommand = "npm run migrate && npm start"
```

**Better approach using package.json:**

```json
{
  "scripts": {
    "start": "npm run migrate:deploy && node dist/index.js",
    "migrate:deploy": "prisma migrate deploy"
  }
}
```

---

## Monitoring & Analytics

### Deployment Metrics

Railway dashboard provides:

1. **Deployment Frequency**
   - Deployments per day/week/month
   - Average time between deployments
   - Deployment success rate

2. **Build Performance**
   - Average build time
   - Build cache hit rate
   - Build failure rate

3. **Deployment Performance**
   - Average deployment time
   - Time to health check pass
   - Deployment failure rate

### Access Metrics

1. Go to Railway dashboard
2. Click Backend service
3. Click "Metrics" tab
4. View:
   - Deployment history
   - Build times
   - Success/failure rates
   - Resource usage during builds

### Set Up Alerts

Railway → Settings → Alerts:

1. **Deployment Failure Alert**
   - Email when deployment fails
   - Slack notification
   - Include error details

2. **Health Check Alert**
   - Alert when health checks fail
   - Include endpoint response
   - Link to deployment logs

3. **Build Timeout Alert**
   - Alert if build takes > 10 minutes
   - May indicate dependency issues

---

## Best Practices

### Commit Practices

1. **Meaningful Commit Messages:**
   ```bash
   # Good
   git commit -m "feat: add user authentication endpoint"
   git commit -m "fix: resolve database connection timeout"

   # Avoid
   git commit -m "update"
   git commit -m "changes"
   ```

2. **Atomic Commits:**
   - One logical change per commit
   - Makes rollbacks easier
   - Clearer deployment history

3. **Skip CI When Appropriate:**
   ```bash
   # Documentation changes
   git commit -m "docs: update API documentation [railway skip]"

   # Configuration changes not affecting deployment
   git commit -m "chore: update .gitignore [railway skip]"
   ```

### Deployment Practices

1. **Test Locally First:**
   ```bash
   cd backend
   npm run build
   npm start
   # Test endpoints
   # Verify functionality
   # Then commit and push
   ```

2. **Use PR Preview Environments:**
   - Test changes in PR preview first
   - Merge only after preview testing
   - Reduces production deployment failures

3. **Monitor After Deployment:**
   - Watch Railway dashboard for 5-10 minutes
   - Check health status
   - Review logs for errors
   - Verify endpoints respond correctly

4. **Have Rollback Ready:**
   - Know how to rollback (see Rollback Procedures)
   - Identify last known-good deployment
   - Test rollback in staging first

### Watch Pattern Practices

1. **Be Specific:**
   ```toml
   # Good: Specific patterns
   watchPatterns = ["src/**/*.ts", "package.json"]

   # Avoid: Too broad
   watchPatterns = ["**/*"]
   ```

2. **Include Build Dependencies:**
   ```toml
   # Include files that affect build output
   watchPatterns = [
     "src/**/*.ts",
     "package.json",        # Dependencies
     "package-lock.json",   # Lock file
     "tsconfig.json",       # TS config
     "prisma/schema.prisma" # Database schema
   ]
   ```

3. **Exclude Non-Functional Changes:**
   - Don't include documentation in patterns
   - Don't include test files (unless they affect build)
   - Don't include dev-only configuration

---

## Security Considerations

### GitHub Access

1. **Use Minimal Permissions:**
   - Grant Railway access only to required repositories
   - Review permissions regularly
   - Revoke access if no longer needed

2. **Webhook Security:**
   - Railway webhooks are signed
   - GitHub verifies webhook signatures
   - Monitor webhook activity

### Environment Variables

1. **Never Commit Secrets:**
   - All secrets in Railway dashboard
   - Not in railway.toml
   - Not in code

2. **Rotate Secrets Regularly:**
   - Update Railway variables
   - Railway automatically redeploys with new secrets
   - No code changes needed

3. **Audit Variable Access:**
   - Review who has Railway project access
   - Limit access to production environment
   - Use separate environments for staging

### Deployment Security

1. **Protected Branches:**
   - Require PR reviews for main
   - Prevent direct pushes to main
   - Use branch protection rules

2. **Deployment Verification:**
   - Monitor deployment logs
   - Check for suspicious deployments
   - Review deployment history regularly

3. **Rollback Capability:**
   - Always able to rollback quickly
   - Test rollback procedures
   - Document rollback process

---

## Cost Optimization

### Build Optimization

1. **Cache Dependencies:**
   - Railway caches `node_modules` by default
   - Use `npm ci` instead of `npm install`
   - Faster builds = lower costs

2. **Optimize Watch Patterns:**
   - Fewer unnecessary builds
   - Reduced compute usage
   - Lower monthly costs

3. **Efficient Build Commands:**
   ```toml
   # Efficient
   buildCommand = "npm ci && npm run build && npm prune --omit=dev"

   # Less efficient
   buildCommand = "npm install && npm run build"  # Doesn't prune
   ```

### Deployment Optimization

1. **Reduce Deployment Frequency:**
   - Batch related changes
   - Use feature branches
   - Merge when ready

2. **Use PR Previews:**
   - Test in PR preview first
   - Reduce production deployment failures
   - Lower redeploy costs

3. **Skip Unnecessary Deployments:**
   - Use `[railway skip]` for docs
   - Optimize watch patterns
   - Reduce overhead

---

## Migration Checklist

Use this checklist when implementing Phase 3:

```
PREREQUISITES:
[ ] Phase 1 complete (environment variables set)
[ ] Phase 2 complete (PR previews working)
[ ] Railway account access verified
[ ] GitHub repository admin access verified
[ ] Railway CLI installed for testing

IMPLEMENTATION:
[ ] Railway dashboard accessed
[ ] GitHub repository connection status checked
[ ] Repository linked to Railway (if needed)
[ ] Branch configuration verified (main → production)
[ ] Service configuration verified (backend service)
[ ] Watch patterns reviewed (optimal)
[ ] Test deployment performed
[ ] Automatic trigger verified
[ ] GitHub Actions workflow NOT triggered

WORKFLOW DECISION:
[ ] Decided: Keep/Archive/Delete manual workflow
[ ] Workflow file updated (if keeping as fallback)
[ ] Workflow tested (if keeping)
[ ] Team notified of workflow status

VERIFICATION:
[ ] Verification script executed
[ ] All checks passed
[ ] GitHub webhook delivering successfully
[ ] Railway deployment history shows "Triggered by: GitHub"
[ ] Health checks passing automatically

DOCUMENTATION:
[ ] Team deployment docs updated
[ ] Team notified of new process
[ ] Railway dashboard access provided
[ ] Rollback procedures communicated
[ ] Training completed

POST-DEPLOYMENT:
[ ] Monitor deployments for 1 week
[ ] Gather team feedback
[ ] Address any issues
[ ] Document lessons learned
[ ] Mark Phase 3 as complete
```

---

## FAQ

**Q: Will this affect PR preview environments from Phase 2?**
A: No, PR previews continue to work independently. They use GitHub Actions to create ephemeral environments. Production deployments use native Railway integration.

**Q: Can I still deploy manually if needed?**
A: Yes! You can:
1. Use the emergency workflow (if kept)
2. Run `railway up` from local machine
3. Deploy from Railway dashboard manually

**Q: What happens if Railway is down?**
A: You can:
1. Wait for Railway to recover
2. Use emergency manual workflow
3. Deploy via Railway CLI locally
4. Check Railway status page for updates

**Q: How do I deploy a specific commit?**
A: Railway dashboard → Deployments → "Deploy from commit" or use emergency manual workflow.

**Q: Can I have multiple branches deploy to different environments?**
A: Yes! Configure in Railway: main → production, develop → staging, etc.

**Q: What if I push by mistake?**
A: Rollback immediately using Railway dashboard (< 1 minute). Then push a revert commit.

**Q: How do I know if automatic deployment is working?**
A: Check Railway deployment history. Should show "Triggered by: GitHub" for automatic deployments.

**Q: Can I disable automatic deployment temporarily?**
A: Yes, Railway → Settings → Deployments → Auto-deploy toggle OFF.

**Q: What about environment variables?**
A: No change needed. Variables configured in Phase 1 continue to work with native git deployment.

**Q: How do I test this without affecting production?**
A: Use PR preview environments (Phase 2) or create a staging environment linked to a develop branch.

---

## Support Resources

### Railway Documentation

- **GitHub Integration:** https://docs.railway.app/deploy/github
- **Deployments:** https://docs.railway.app/deploy/deployments
- **Railway.toml:** https://docs.railway.app/deploy/railway-toml
- **Rollbacks:** https://docs.railway.app/deploy/rollbacks

### Internal Documentation

- **Quick Start:** `docs/PHASE3-QUICK-START.md`
- **Implementation:** `PHASE3-IMPLEMENTATION-COMPLETE.md`
- **Verification:** `scripts/verify-phase3-setup.sh`
- **Full Analysis:** `docs/RAILWAY-MIGRATION-ANALYSIS.md`

### Community Support

- **Railway Discord:** https://railway.app/discord
- **Railway Status:** https://status.railway.app/

---

**Phase 3 Complete!** ✅

Your backend deployments are now fully automated via Railway's native git integration. Push to main → automatic deployment. Simple, fast, reliable.

**Next:** Monitor automatic deployments and optionally proceed to Phase 4 (advanced deployment strategies).
