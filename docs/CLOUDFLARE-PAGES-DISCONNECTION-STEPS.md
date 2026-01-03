# Cloudflare Pages GitHub Integration Disconnection Steps

## Quick Summary

This guide walks you through disconnecting Cloudflare Pages' GitHub integration so that GitHub Actions becomes the single source of truth for deployments.

## Why Disconnect?

Currently, when you push to `develop`:
1. Cloudflare Pages auto-builds (uncontrolled)
2. GitHub Actions workflow also tries to deploy (duplication)
3. Multiple workflows run simultaneously (confusion)
4. Frontend may connect to wrong backend URL

After disconnection:
1. Only GitHub Actions controls deployments
2. Single workflow: `cloudflare-deploy.yml`
3. Clear success/failure visibility in GitHub Actions
4. Frontend always gets correct `VITE_API_URL`

## Prerequisites

Before disconnecting, verify:
- [ ] GitHub Actions secrets are configured (see below)
- [ ] `cloudflare-deploy.yml` is updated with lint job
- [ ] Frontend code uses `import.meta.env.VITE_API_URL` (not hardcoded URLs)

### Required GitHub Secrets

Check that these exist in: Repository → Settings → Secrets and variables → Actions

```
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

If any are missing, add them before proceeding.

## Step 1: Disconnect in Cloudflare Dashboard

**Time Required:** 2 minutes

1. Go to: https://dash.cloudflare.com/
2. Select your account (top right)
3. Navigate to: **Pages** (left sidebar)
4. Select your project: **JobMatch AI Dev** (or appropriate project)
5. Click: **Settings** (top navigation bar)
6. Scroll to: **"Git integration"** section
7. Click: **"Disconnect repository"** button
8. Confirm the dialog

**Expected Result:**
```
✓ Git integration is now disconnected
No automatic deployments from GitHub
Manual deployments still available
```

## Step 2: Disconnect from GitHub (Cleanup)

**Time Required:** 1 minute

1. Go to: https://github.com/[your-username]/jobmatch-ai
2. Navigate to: Settings (scroll down) → **Applications** → **Installed GitHub Apps**
3. Find: **Cloudflare Pages**
4. Click: **Configure** or **Revoke**
5. Click: **Revoke access**
6. Confirm removal

**Expected Result:**
```
✓ Cloudflare Pages app removed from repository
GitHub will no longer allow auto-deployment
```

## Step 3: Verify Disconnection

**Time Required:** 2 minutes

1. In Cloudflare Dashboard:
   - Pages → [Project] → Settings → Git integration
   - Should show: "Not connected to a repository"

2. In GitHub Repository:
   - Settings → Applications → Installed GitHub Apps
   - Cloudflare Pages should NOT be listed

## Step 4: Test with Manual Commit

**Time Required:** 5-10 minutes

This verifies GitHub Actions deployment works without Pages auto-deploy.

### 4A: Make a Test Commit

```bash
cd /path/to/jobmatch-ai
git checkout develop
git pull origin develop

# Make a small, harmless change
echo "# Test deployment: $(date)" >> .github/DEPLOYMENT_TEST.txt

git add .github/DEPLOYMENT_TEST.txt
git commit -m "test: verify github actions deployment"
git push origin develop
```

### 4B: Watch GitHub Actions

1. Go to: https://github.com/[your-username]/jobmatch-ai/actions
2. Find the latest workflow run: **"Deploy to Cloudflare (GitHub Actions)"**
3. Watch the status:
   - lint (should pass)
   - run-tests (should pass)
   - provision-infrastructure (should pass)
   - deploy-frontend (should pass)
   - deploy-backend (should pass)

4. Expected time: ~8-12 minutes total

### 4C: Verify Frontend Deployment

Once workflow completes:

1. **Check Frontend:**
   - URL: https://jobmatch-ai-dev.pages.dev
   - Should load the JobMatch AI interface
   - Check browser console (F12 → Console tab)
   - Should NOT show errors about backend connection

2. **Check Backend:**
   - URL: https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
   - Should return: `{"status":"ok"}`

3. **Check Frontend → Backend Connection:**
   - In browser console at https://jobmatch-ai-dev.pages.dev
   - Type: `console.log(import.meta.env.VITE_API_URL)`
   - Should show: `https://jobmatch-ai-dev.carl-f-frank.workers.dev`
   - Should NOT show: `http://localhost:8787`

### 4D: Cleanup Test File

```bash
git rm .github/DEPLOYMENT_TEST.txt
git commit -m "chore: remove deployment test file"
git push origin develop
```

## Step 5: Document for Team

Create a brief summary for your team:

```
Subject: Cloudflare Pages GitHub Integration Disconnected

From now on, all deployments to develop/staging/main are controlled by GitHub Actions:

Repository → Actions → "Deploy to Cloudflare (GitHub Actions)"

Key Points:
- No more Cloudflare Pages auto-deploys
- GitHub Actions is the single source of truth
- Deployments are visible in GitHub Actions tab
- If deployment fails, check GitHub Actions logs (not Cloudflare dashboard)

Monitoring:
- Check: Repository → Actions
- Look for: "Deploy to Cloudflare (GitHub Actions)" workflow
- All 6 jobs must pass:
  1. lint
  2. run-tests
  3. provision-infrastructure
  4. deploy-frontend
  5. deploy-backend
  6. (post-deployment-e2e - if enabled)

Frontend URL: https://jobmatch-ai-dev.pages.dev
Backend URL: https://jobmatch-ai-dev.carl-f-frank.workers.dev
```

## Troubleshooting

### Problem: Cloudflare Dashboard Still Shows "Connected"

**Solution:**
- Clear browser cache (Cmd/Ctrl + Shift + R)
- Refresh Cloudflare dashboard
- Try disconnecting again if needed

### Problem: GitHub Actions Workflow Failed

**Solution:**
1. Check job that failed (lint, tests, deploy)
2. Click job to see detailed logs
3. Common issues:
   - Missing GitHub secrets → Add to Settings → Secrets
   - Type errors → Fix and push again
   - Infrastructure provisioning → Usually auto-retries

### Problem: Frontend Still Not Loading

**Solution:**
1. Verify Cloudflare Pages deployment:
   ```
   Pages → [Project] → Deployments
   ```
   Should show recent deployment with ✓ status

2. Clear browser cache and reload

3. Check frontend build environment variables:
   ```
   Repository → Actions → [Latest Run] → deploy-frontend job
   Look for: VITE_API_URL step
   Should show: https://jobmatch-ai-dev.carl-f-frank.workers.dev
   ```

### Problem: Backend Health Check Returns 502/Connection Error

**Solution:**
1. Verify Workers deployment in Cloudflare:
   ```
   Workers & Pages → Overview → [jobmatch-ai-dev]
   Should show recent deployment
   ```

2. Check GitHub Actions deploy-backend job for errors

3. If Workers deployment succeeded but 502:
   - Wait 30-60 seconds for propagation
   - Try again

### Problem: Old Pages Deployment Still Showing

**Solution:**
1. In Cloudflare Pages project, scroll to **Deployments**
2. Find the deployment you want to rollback from
3. Click the three dots (⋯) → **Rollback to this deployment**
4. Confirm

## Rollback Plan (If Needed)

If something goes wrong and you need to revert:

1. **Temporarily Re-enable Pages GitHub Integration:**
   ```
   Cloudflare Pages → [Project] → Settings → Connect repository
   ```
   This gives you a fallback deployment method

2. **Debug GitHub Actions:**
   - Find the failed workflow run
   - Check logs for errors
   - Fix the issue in `cloudflare-deploy.yml`

3. **Test Locally:**
   ```bash
   npm run build  # Verify frontend builds
   npm run lint   # Verify linting passes
   ```

4. **Push a fix commit and retry**

5. **Once working, disconnect Pages again**

## Verification Checklist

After completing all steps, verify:

- [ ] Cloudflare Dashboard shows: "Git integration: Not connected"
- [ ] GitHub Apps shows: Cloudflare Pages NOT listed
- [ ] Push to develop triggers GitHub Actions
- [ ] All workflow jobs pass
- [ ] Frontend loads from https://jobmatch-ai-dev.pages.dev
- [ ] Frontend console shows correct `VITE_API_URL`
- [ ] Backend health check passes
- [ ] Team notified of change

## Files Modified

Track which files were changed:
- `.github/workflows/cloudflare-deploy.yml` - Added lint job, fixed env vars
- `.github/workflows/test.yml` - Removed develop from push trigger
- `.github/workflows/e2e-tests.yml` - Disabled workflow_run trigger

No frontend or backend code changes needed.

## Support & Questions

**Documentation:**
- Full migration guide: `docs/CLOUDFLARE-PAGES-MIGRATION.md`
- Deployment architecture: `docs/DEPLOYMENT-WORKFLOW-EXPLAINED.md`

**Common Tasks:**

*View deployment logs:*
```
GitHub → Repository → Actions
→ "Deploy to Cloudflare (GitHub Actions)"
→ Click the run
→ Expand each job to see logs
```

*Manual deployment:*
```
GitHub → Repository → Actions
→ "Deploy to Cloudflare (GitHub Actions)"
→ Click "Run workflow"
→ Select environment (development/staging/production)
→ Click "Run workflow"
```

*Rollback to previous deployment:*
```
Cloudflare Pages → [Project] → Deployments
→ Find the previous good deployment
→ Click ⋯ → "Rollback to this deployment"
```

---

**Last Updated:** 2026-01-01
**Status:** Ready for Implementation
