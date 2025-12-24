# Phase 3: Troubleshooting Guide

**Purpose:** Comprehensive troubleshooting guide for Railway native git deployment issues
**Applies to:** Phase 3 - Native Git Deployment Integration
**Last Updated:** December 24, 2025

---

## Quick Reference

| Issue | Quick Fix | Details |
|-------|-----------|---------|
| Deployment not triggering | Check GitHub webhook | [Section 1.1](#11-deployments-not-triggering) |
| Build fails | Check build logs | [Section 2.1](#21-build-failures) |
| Health check fails | Verify /health endpoint | [Section 3.1](#31-health-check-failures) |
| GitHub Actions still running | Update workflow trigger | [Section 4.1](#41-github-actions-conflicts) |
| Variables not working | Check Railway dashboard | [Section 5.1](#51-environment-variable-issues) |

---

## Category 1: Deployment Trigger Issues

### 1.1: Deployments Not Triggering on Push

**Symptoms:**
- Push to main branch
- Railway doesn't create new deployment
- No activity in Railway dashboard

**Diagnosis Steps:**

1. **Check GitHub Webhook:**
```bash
# In GitHub:
# Settings → Webhooks → Railway webhook
# Check "Recent Deliveries"
```

Look for:
- ✓ 200 OK responses (working)
- ✗ 4xx/5xx errors (broken)

2. **Check Railway Connection:**
```bash
# Railway dashboard → Settings → GitHub Repo
# Should show: Connected to cffrank/jobmatchAI
```

3. **Check Branch Configuration:**
```bash
# Railway → Backend → Settings
# Branch should be: main
# Auto-deploy should be: ON
```

4. **Check Watch Patterns:**
```bash
# Verify files changed match watch patterns
cat backend/railway.toml | grep -A3 "watchPatterns"
git log -1 --stat
```

**Common Causes:**

**Cause 1: GitHub Webhook Not Configured**
- Railway not connected to GitHub
- Fix: Re-link repository in Railway settings

**Cause 2: Wrong Branch**
- Pushing to wrong branch
- Railway watching `master` but you pushed to `main`
- Fix: Verify branch names match

**Cause 3: Watch Patterns Don't Match**
- Changed files not in watch patterns
- Example: Changed README.md (not watched)
- Fix: This is expected behavior for non-source files

**Cause 4: Railway Service Misconfigured**
- Service not linked to repository
- Fix: Re-configure service source

**Solutions:**

**Solution 1: Re-link GitHub Repository**
```bash
# Railway dashboard:
1. Settings → GitHub Repo → Disconnect
2. Connect GitHub Repo
3. Select cffrank/jobmatchAI
4. Set root directory: backend
5. Confirm connection
```

**Solution 2: Fix Branch Mapping**
```bash
# Railway → Backend → Settings
1. Check current branch
2. If wrong, change to: main
3. Save changes
4. Make test commit and push
```

**Solution 3: Verify Webhook**
```bash
# GitHub → Settings → Webhooks → Railway
1. Check webhook URL
2. Check recent deliveries
3. If errors, click "Redeliver"
4. If 404, re-link repository in Railway
```

**Solution 4: Manual Trigger as Test**
```bash
# Test deployment manually
cd backend
railway up --detach

# If this works, issue is with automatic trigger
# Check webhook and branch configuration
```

---

### 1.2: Railway Shows "No Changes Detected"

**Symptoms:**
- Push to main
- Railway detects push
- Shows "No changes detected"
- No deployment created

**This is EXPECTED for non-source files!**

**Diagnosis:**

```bash
# Check which files changed
git log -1 --stat

# Check watch patterns
cat backend/railway.toml | grep -A3 "watchPatterns"
```

**Current Watch Patterns:**
```toml
watchPatterns = ["src/**/*.ts", "package.json", "tsconfig.json"]
```

**Files that WILL trigger deployment:**
- ✓ `backend/src/index.ts`
- ✓ `backend/src/controllers/jobs.ts`
- ✓ `backend/package.json`
- ✓ `backend/tsconfig.json`

**Files that will NOT trigger deployment:**
- ✗ `backend/README.md`
- ✗ `backend/.env.example`
- ✗ `backend/tests/**` (if tests are separate)
- ✗ `docs/` (documentation)

**When This is a Problem:**

If source files changed but Railway says "No changes detected":

1. **Check file paths:**
   - Files must be in `backend/src/` directory
   - Pattern is `src/**/*.ts` not `backend/src/**/*.ts`
   - Railway looks from root directory (backend/)

2. **Check file extensions:**
   - Pattern matches `*.ts` not `*.js`
   - If you have `.js` files, add pattern: `src/**/*.js`

3. **Update watch patterns if needed:**
```toml
# Add JavaScript files
watchPatterns = [
  "src/**/*.ts",
  "src/**/*.js",  # Add this
  "package.json",
  "tsconfig.json"
]
```

**When This is Expected:**

Documentation or configuration changes that don't affect the build:
```bash
# These SHOULD NOT deploy (by design)
git commit -m "docs: update README [railway skip]"
git commit -m "chore: update .gitignore"
```

This saves resources and prevents unnecessary deployments.

---

### 1.3: Deployment Triggers on Every Push (Including Docs)

**Symptoms:**
- Documentation changes trigger deployments
- Test file changes trigger deployments
- Too many unnecessary deployments

**Diagnosis:**

```bash
# Check watch patterns
cat backend/railway.toml | grep -A5 "watchPatterns"
```

**Problem Patterns:**

```toml
# TOO BROAD - triggers on everything
watchPatterns = ["**/*"]

# TOO BROAD - includes docs and tests
watchPatterns = ["**/*.ts"]
```

**Solution: Use Specific Patterns**

```toml
# GOOD - specific to source files
watchPatterns = [
  "src/**/*.ts",      # Only source TypeScript
  "package.json",     # Dependencies
  "tsconfig.json"     # TS configuration
]
```

Update `backend/railway.toml` and push:

```bash
# Edit railway.toml with specific patterns
git add backend/railway.toml
git commit -m "fix: optimize watch patterns for source files only"
git push origin main
```

---

## Category 2: Build Failures

### 2.1: Build Failures - General

**Symptoms:**
- Deployment starts
- Build phase fails
- Deployment status: Failed
- Previous deployment remains active

**Diagnosis:**

1. **Check Build Logs:**
```bash
# Railway dashboard:
Backend → Deployments → Click failed deployment → Build Logs
```

2. **Test Build Locally:**
```bash
cd backend
npm ci
npm run build
```

3. **Compare Node Versions:**
```bash
# Check local version
node --version

# Check package.json engines
cat package.json | grep -A2 "engines"
```

**Common Build Errors:**

**Error 1: TypeScript Compilation Errors**
```
Error: TS2304: Cannot find name 'SomeType'
```

**Solution:**
```bash
# Fix TypeScript errors locally
npm run build

# Address each error
# Commit and push fix
git add .
git commit -m "fix: resolve TypeScript compilation errors"
git push
```

**Error 2: Missing Dependencies**
```
Error: Cannot find module 'some-package'
```

**Solution:**
```bash
# Install missing dependency
npm install some-package

# Commit package.json and lock file
git add package.json package-lock.json
git commit -m "fix: add missing dependency"
git push
```

**Error 3: Build Script Error**
```
npm ERR! missing script: build
```

**Solution:**
```json
// package.json - add build script
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

**Error 4: Out of Memory**
```
FATAL ERROR: Ineffective mark-compacts near heap limit
```

**Solution:**
```json
// package.json - increase memory limit
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' tsc"
  }
}
```

---

### 2.2: Build Succeeds Locally But Fails on Railway

**Symptoms:**
- `npm run build` works locally
- Same build fails on Railway
- Different behavior between environments

**Common Causes:**

**Cause 1: Different Node Versions**

Check versions:
```bash
# Local
node --version  # e.g., v20.10.0

# Railway (from build logs)
# Look for: "Using Node.js v18.17.0"
```

**Solution:**
```json
// package.json - specify Node version
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

**Cause 2: Missing Environment Variables at Build Time**

Some builds require env vars:
```bash
# If build script uses environment variables
npm run build  # May need SOME_VAR
```

**Solution:**
```toml
# railway.toml - add build-time env vars
[build]
buildCommand = "npm ci && npm run build && npm prune --omit=dev"

# Note: Secret env vars go in Railway dashboard
# Public env vars can go here
```

**Cause 3: Case-Sensitive File Paths**

Railway uses Linux (case-sensitive):
```typescript
// This might work on macOS/Windows:
import { User } from './Models/user'

// But fail on Linux if file is:
// models/user.ts  (lowercase)

// Fix: Match case exactly
import { User } from './models/user'
```

**Cause 4: Local Node Modules Cache**

```bash
# Clear local cache and test
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## Category 3: Health Check Failures

### 3.1: Health Check Failures

**Symptoms:**
- Build succeeds
- Deployment starts
- Health check fails repeatedly
- Deployment marked as unhealthy

**Diagnosis:**

1. **Check Health Endpoint:**
```bash
# Get deployment URL
BACKEND_URL=$(railway status --service backend --json | jq -r '.deployments[0].url')

# Test health endpoint manually
curl $BACKEND_URL/health
curl -v $BACKEND_URL/health  # Verbose output
```

2. **Check Application Logs:**
```bash
# Railway dashboard:
Backend → Deployments → Logs

# Or via CLI:
railway logs --service backend
```

3. **Check railway.toml Configuration:**
```bash
cat backend/railway.toml | grep -A3 "healthcheck"
```

**Common Causes:**

**Cause 1: Health Endpoint Doesn't Exist**

```typescript
// Missing /health endpoint
app.listen(3000)

// Solution: Add health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(3000);
```

**Cause 2: Health Endpoint is Slow**

```typescript
// Bad: Slow health check (database query)
app.get('/health', async (req, res) => {
  await db.query('SELECT 1');  // Slow!
  res.json({ status: 'ok' });
});

// Good: Fast health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });  // Fast!
});
```

**Cause 3: Wrong Health Check Path**

```toml
# railway.toml
[deploy]
healthcheckPath = "/health"  # But endpoint is /healthz

# Solution: Match endpoint path
healthcheckPath = "/healthz"
```

**Cause 4: Application Not Starting**

Check logs for startup errors:
```bash
# Common startup errors:
# - Port binding issues
# - Database connection failures
# - Missing environment variables
```

**Cause 5: Health Check Timeout Too Short**

```toml
# railway.toml
[deploy]
healthcheckTimeout = 300  # 5 minutes

# If app is slow to start, increase:
healthcheckTimeout = 600  # 10 minutes
```

---

### 3.2: Intermittent Health Check Failures

**Symptoms:**
- Health checks sometimes pass, sometimes fail
- Deployment becomes healthy after retries
- Inconsistent behavior

**Common Causes:**

**Cause 1: Application Still Warming Up**

```typescript
// App takes time to initialize
const app = express();

// Heavy initialization
await loadConfigFiles();
await connectToDatabase();
await warmupCache();

// Health check might fail during initialization

// Solution: Track initialization state
let isReady = false;

app.get('/health', (req, res) => {
  if (!isReady) {
    return res.status(503).json({ status: 'initializing' });
  }
  res.json({ status: 'ok' });
});

// Mark ready after initialization
isReady = true;
app.listen(3000);
```

**Cause 2: Database Connection Issues**

```typescript
// Health check depends on database
app.get('/health', async (req, res) => {
  try {
    await db.ping();  // May fail if DB busy
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy' });
  }
});

// Solution: Simple health check + separate readiness check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });  // Always returns OK
});

app.get('/ready', async (req, res) => {
  try {
    await db.ping();
    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false });
  }
});
```

---

## Category 4: GitHub Actions Conflicts

### 4.1: GitHub Actions Still Running Deployment Workflow

**Symptoms:**
- Push to main
- Both Railway AND GitHub Actions deploy
- Duplicate deployments
- Confusion about which deployment is active

**Diagnosis:**

```bash
# Check workflow triggers
cat .github/workflows/deploy-backend-railway.yml | grep -A5 "on:"
```

**Problem Configuration:**

```yaml
# BAD - still triggers on push
on:
  push:
    branches: [main]
  workflow_dispatch:
```

**Solution: Convert to Manual-Only**

```yaml
# GOOD - only manual trigger
on:
  workflow_dispatch:
    inputs:
      reason:
        description: 'Reason for manual deployment'
        required: true
```

Update and commit:

```bash
# Edit workflow file
# Change trigger to workflow_dispatch only

git add .github/workflows/deploy-backend-railway.yml
git commit -m "ci: convert to manual-only deployment workflow"
git push
```

**Alternative: Delete Workflow**

```bash
git rm .github/workflows/deploy-backend-railway.yml
git commit -m "ci: remove manual deployment workflow"
git push
```

---

### 4.2: PR Preview Workflow Not Working

**Symptoms:**
- Phase 2 PR previews stopped working after Phase 3
- PR preview workflow doesn't trigger
- PRs don't get preview environments

**Diagnosis:**

```bash
# Check PR preview workflow exists
ls -l .github/workflows/deploy-pr-preview.yml

# Check workflow configuration
cat .github/workflows/deploy-pr-preview.yml | grep -A5 "on:"
```

**Common Cause:**

Accidentally modified or deleted PR preview workflow.

**Solution:**

PR preview workflow should remain unchanged from Phase 2:

```yaml
# deploy-pr-preview.yml should have:
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]
    paths:
      - 'backend/**'
```

If missing, restore from git history:

```bash
# Find commit where it was deleted
git log --all --full-history -- .github/workflows/deploy-pr-preview.yml

# Restore from that commit
git checkout <commit-hash> -- .github/workflows/deploy-pr-preview.yml
git commit -m "fix: restore PR preview workflow"
git push
```

---

## Category 5: Environment Variable Issues

### 5.1: Environment Variables Not Working

**Symptoms:**
- Application can't connect to database
- API calls fail with authentication errors
- Logs show "undefined" for environment variables

**Diagnosis:**

1. **Check Railway Dashboard:**
```bash
# Railway → Backend → Variables
# Verify all variables are set
```

2. **Check Application Logs:**
```bash
railway logs --service backend | grep -i "error\|undefined"
```

3. **List Variables via CLI:**
```bash
railway variables list --service backend
```

**Common Causes:**

**Cause 1: Variables Not Set in Railway**

From Phase 1, these should be set:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- OPENAI_API_KEY
- SENDGRID_API_KEY
- SENDGRID_FROM_EMAIL
- JWT_SECRET
- LINKEDIN_CLIENT_ID
- LINKEDIN_CLIENT_SECRET
- LINKEDIN_REDIRECT_URI
- APIFY_API_TOKEN
- NODE_ENV
- PORT

**Solution:**

Add missing variables in Railway dashboard:
```
Backend → Variables → + Add Variable
Name: [VARIABLE_NAME]
Value: [VARIABLE_VALUE]
```

**Cause 2: Variable Name Mismatch**

```typescript
// Code expects:
const apiKey = process.env.OPENAI_API_KEY;

// But Railway has:
// OPENAPI_KEY  ← typo!

// Solution: Fix variable name in Railway
```

**Cause 3: Variable Value Issues**

- Extra spaces in value
- Quotes included when they shouldn't be
- Truncated value (didn't paste fully)

**Solution:** Re-enter variable carefully

---

### 5.2: Variables Work in Manual Deployment But Not Automatic

**Symptoms:**
- Manual deployment (via CLI) works fine
- Automatic deployment (git push) fails with variable errors
- Same code, different behavior

**This should NOT happen** - both use same Railway environment.

**Diagnosis:**

1. **Check Environment:**
```bash
# Verify both deployments use same environment
# Railway → Deployments → Click each deployment
# Check environment name
```

2. **Check Deployment Logs:**
```bash
# Compare startup logs
# Look for variable loading differences
```

**Solution:**

Usually a timing issue:
- Application starts before variables are fully loaded
- Add retry logic or delay in application startup

```typescript
// Wait for critical variables
const MAX_RETRIES = 5;
let retries = 0;

while (!process.env.DATABASE_URL && retries < MAX_RETRIES) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  retries++;
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL not available after retries');
}
```

---

## Category 6: Performance Issues

### 6.1: Deployments Taking Too Long

**Symptoms:**
- Deployments take > 5 minutes
- Build phase is slow
- Deployment phase is slow

**Diagnosis:**

Check build logs for slow steps:
```bash
# Railway → Deployments → Build Logs
# Look for time-consuming steps
```

**Common Causes:**

**Cause 1: Installing Dependencies Every Time**

```bash
# Build logs show:
# npm install → 2 minutes
# Every single deployment

# Solution: Use npm ci (already in railway.toml)
buildCommand = "npm ci && npm run build"
```

**Cause 2: No Build Cache**

Railway should cache node_modules automatically.

If not caching:
- Check if package-lock.json is committed
- Verify buildCommand uses `npm ci` not `npm install`

**Cause 3: Slow TypeScript Compilation**

```bash
# TypeScript taking > 1 minute to compile
```

**Solution:**

```json
// tsconfig.json - optimize for speed
{
  "compilerOptions": {
    "incremental": true,  // Enable incremental compilation
    "skipLibCheck": true  // Skip type checking of declaration files
  }
}
```

**Cause 4: Large devDependencies**

```bash
# Not pruning devDependencies
# Package size: 500MB instead of 50MB
```

**Solution:**

```toml
# railway.toml - already has prune
buildCommand = "npm ci && npm run build && npm prune --omit=dev"
```

---

### 6.2: Application Slow to Respond After Deployment

**Symptoms:**
- Deployment succeeds
- Health check passes
- But first requests take 10+ seconds
- Subsequent requests are fast

**This is "Cold Start"**

**Diagnosis:**

```bash
# Test response time
time curl $BACKEND_URL/health
time curl $BACKEND_URL/api/jobs
```

**Solutions:**

**Solution 1: Keep App Warm**

```typescript
// Add startup warmup
app.listen(PORT, async () => {
  console.log('Server starting...');

  // Warm up critical paths
  await warmupDatabase();
  await warmupCache();

  console.log('Server ready!');
});
```

**Solution 2: Optimize Database Connections**

```typescript
// Don't create new connection per request
// Use connection pooling

const pool = new Pool({
  max: 20,  // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

---

## Category 7: Rollback Issues

### 7.1: Can't Find Previous Working Deployment

**Symptoms:**
- Need to rollback
- Can't identify which deployment was working
- Deployment history unclear

**Solution:**

1. **Check Deployment History:**
```bash
# Railway → Backend → Deployments
# Sort by date
# Look for "Active" status in past
```

2. **Check Git History:**
```bash
# Find last known-good commit
git log --oneline | head -10

# Check deployment for specific commit
# Railway → Find deployment by commit message
```

3. **Use Git Tags for Releases:**
```bash
# Tag stable releases
git tag -a v1.2.3 -m "Stable release"
git push --tags

# Easy to rollback to tagged version
```

---

### 7.2: Rollback Doesn't Fix the Issue

**Symptoms:**
- Rolled back to previous deployment
- Issue persists
- Same errors in logs

**Common Causes:**

**Cause 1: Database Schema Changes**

Rollback reverts code but not database:

```sql
-- New code added column:
ALTER TABLE users ADD COLUMN new_field VARCHAR(255);

-- Rollback code, but column still exists
-- Old code doesn't expect new_field
```

**Solution:**

```sql
-- May need to rollback database too
ALTER TABLE users DROP COLUMN new_field;
```

**Cause 2: Environment Variable Changes**

Rollback doesn't revert Railway variable changes:

```bash
# New deployment added variable
# Rolled back but variable still set
# Old code doesn't expect it
```

**Solution:**

```bash
# Remove or update variable in Railway
Backend → Variables → Delete or edit variable
```

**Cause 3: External Service Changes**

Issue is not in your deployment:
- Database service down
- External API down
- Network issues

**Solution:**

```bash
# Check external services
# Check Railway status page
# Check third-party service status
```

---

## Category 8: Watch Pattern Issues

### 8.1: Watch Patterns Too Restrictive

**Symptoms:**
- Changed important file
- Railway says "No changes detected"
- Should have deployed but didn't

**Diagnosis:**

```bash
# Check which files changed
git diff HEAD~1 --name-only

# Check watch patterns
cat backend/railway.toml | grep -A5 "watchPatterns"
```

**Solution:**

Add missing patterns:

```toml
# Before
watchPatterns = ["src/**/*.ts"]

# After
watchPatterns = [
  "src/**/*.ts",
  "src/**/*.js",      # Add if using JavaScript
  "prisma/**/*",      # Add if using Prisma
  "package.json",
  "tsconfig.json"
]
```

Commit and push:

```bash
git add backend/railway.toml
git commit -m "fix: add missing watch patterns"
git push
```

---

## Emergency Procedures

### When Everything Fails

If you can't get automatic deployments working:

**Option 1: Manual Deployment via CLI**

```bash
cd backend
railway up --detach
```

**Option 2: Use Emergency Workflow**

```bash
# GitHub → Actions
# Run "Manual Backend Deployment" workflow
# If kept from decision in Step 3.4
```

**Option 3: Disconnect and Reconnect**

```bash
# Railway dashboard:
1. Settings → Disconnect GitHub
2. Wait 1 minute
3. Connect GitHub Repo
4. Reconfigure all settings
5. Test deployment
```

**Option 4: Contact Railway Support**

```
# Railway Discord or Support
Provide:
- Project ID
- Error messages
- Recent deployment logs
- Steps you've tried
```

---

## Diagnostic Checklist

When troubleshooting, go through this checklist:

```
CONNECTIVITY:
[ ] GitHub repository linked in Railway
[ ] Railway shows "Connected" status
[ ] GitHub webhook exists and is active
[ ] Railway can access repository

CONFIGURATION:
[ ] Branch set to: main
[ ] Auto-deploy is: ON
[ ] Root directory is: backend
[ ] Watch patterns are configured
[ ] railway.toml exists and is valid

DEPLOYMENT:
[ ] Recent push visible in git log
[ ] Files changed match watch patterns
[ ] Railway deployment initiated
[ ] Build phase succeeded
[ ] Deploy phase succeeded
[ ] Health check passed

VERIFICATION:
[ ] Application accessible at Railway URL
[ ] /health endpoint responds
[ ] API endpoints working
[ ] Environment variables loaded
[ ] No errors in logs

WORKFLOWS:
[ ] GitHub Actions NOT running for deployments
[ ] PR preview workflow still functional
[ ] Manual workflow status decided (kept/archived/deleted)
```

---

## Getting Help

### Self-Service Resources

1. **Documentation:**
   - Quick Start: `docs/PHASE3-QUICK-START.md`
   - Detailed Guide: `docs/PHASE3-NATIVE-GIT-DEPLOYMENT.md`
   - Test Plan: `docs/PHASE3-TEST-PLAN.md`

2. **Verification:**
   - Run: `./scripts/verify-phase3-setup.sh`
   - Check all outputs

3. **Logs:**
   - Railway dashboard → Deployments → Logs
   - `railway logs --service backend`

### Community Support

1. **Railway Discord:**
   - https://railway.app/discord
   - #help channel

2. **Railway Documentation:**
   - https://docs.railway.app/
   - GitHub integration docs

### Creating Support Tickets

When asking for help, provide:

```
Problem Description:
[What's happening vs what should happen]

Environment:
- Railway project ID: [ID]
- GitHub repository: cffrank/jobmatchAI
- Branch: main
- Railway service: backend

Recent Changes:
- [What changed before issue started]
- [Recent commits]

Steps Tried:
- [What you've attempted]
- [Results of each attempt]

Error Messages:
[Full error messages from logs]

Logs:
[Relevant log excerpts]
```

---

## Prevention Best Practices

Avoid future issues:

1. **Test Locally First:**
```bash
cd backend
npm run build
npm start
# Verify works before pushing
```

2. **Use Feature Branches:**
```bash
# Don't commit directly to main
git checkout -b feature/new-feature
# Test in PR preview environment
# Merge when confirmed working
```

3. **Monitor Deployments:**
```bash
# Watch Railway dashboard after push
# First 5 minutes are critical
# Address issues immediately
```

4. **Keep Documentation Updated:**
```bash
# Document any configuration changes
# Update team when procedures change
# Maintain troubleshooting notes
```

5. **Regular Health Checks:**
```bash
# Weekly: Review deployment history
# Monthly: Review Railway configuration
# Quarterly: Review watch patterns
```

---

**Troubleshooting guide complete!**

Use this guide to diagnose and resolve Phase 3 native git deployment issues quickly and effectively.
