# Phase 3: Quick Start - Native Git Deployment

**Time Required:** 10 minutes
**Prerequisites:** Phase 1 and Phase 2 complete
**Status:** Ready to implement

---

## What You're About to Do

Enable Railway's native git-connected deployment system. Railway will automatically deploy your backend whenever you push to the main branch - no GitHub Actions needed.

**Result:** Push to main → automatic deployment (2-3 minutes)

---

## The 5-Minute Checklist

- [ ] Link GitHub repository to Railway project
- [ ] Verify automatic deployment is enabled
- [ ] Test with a commit to main
- [ ] Decide what to do with manual deployment workflow
- [ ] Run verification script

---

## Task 1: Link GitHub Repository (3 minutes)

### Check if Already Linked

1. Go to https://railway.app/dashboard
2. Select **JobMatch AI** project
3. Click **Settings** → Look for **GitHub Repo** section

**If you see repository name (`cffrank/jobmatchAI`):**
- ✓ Already linked! Skip to Task 2

**If you see "Connect GitHub Repo" button:**
- Continue below

### Link the Repository

1. Click **Connect GitHub Repo**
2. Authenticate with GitHub (if prompted)
3. Select **Only select repositories**
4. Choose `cffrank/jobmatchAI`
5. Click **Install & Authorize**
6. Back in Railway, select the repository from dropdown
7. Set root directory to: `backend`
8. Click **Connect**

**Expected result:** Shows "Connected to GitHub" with green indicator

---

## Task 2: Verify Configuration (2 minutes)

In Railway project settings, verify:

### Backend Service Settings

1. Click **Backend** service card
2. Go to **Settings** tab
3. Check:
   - [ ] Source: GitHub (should show repository name)
   - [ ] Auto-Deploy: ON (toggle should be enabled)
   - [ ] Branch: `main`
   - [ ] Root directory: `backend`

### Deployment Triggers

1. In Backend settings, find **Deployments** section
2. Verify:
   - [ ] Deploy on push: ✓ Enabled
   - [ ] Branch: main
   - [ ] Trigger: Automatic

**Expected result:** All settings configured for automatic deployment

---

## Task 3: Test Automatic Deployment (3 minutes)

Create a test commit to verify automatic deployment works:

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Make a small backend change
echo "// Phase 3 test: native git deployment" >> backend/src/index.ts

# Commit and push
git add backend/src/index.ts
git commit -m "test: verify phase 3 native git deployment"
git push origin main
```

### Monitor in Railway

1. Open Railway dashboard → Backend service → Deployments
2. Watch for new deployment (appears within 10 seconds)
3. Should show:
   ```
   New Deployment
   Triggered by: GitHub
   Commit: test: verify phase 3 native git deployment
   Status: Building...
   ```

4. Wait for completion (~2-3 minutes)
5. Verify:
   - Status: Active (green)
   - Health check: Passed

### Verify GitHub Actions NOT Running

1. Go to GitHub repository → Actions tab
2. Should **NOT** see "Deploy Backend to Railway" workflow
3. Only PR preview workflows should appear (if PRs exist)

**Success criteria:**
- ✓ Railway deployed automatically on push
- ✓ GitHub Actions deployment workflow did NOT run
- ✓ Deployment completed in 2-3 minutes
- ✓ Health check passed

---

## Task 4: Decide on Manual Workflow (2 minutes)

Choose what to do with `.github/workflows/deploy-backend-railway.yml`:

### Option A: Keep as Emergency Fallback (Recommended)

**Why:** Safety net for Railway outages

Edit the workflow file to change trigger from `push` to `workflow_dispatch`:

```yaml
name: Manual Backend Deployment (Emergency Only)

on:
  workflow_dispatch:
    inputs:
      reason:
        description: 'Reason for manual deployment'
        required: true
```

Then commit:
```bash
git add .github/workflows/deploy-backend-railway.yml
git commit -m "ci: convert to emergency-only manual deployment workflow"
git push
```

### Option B: Delete the Workflow

**Why:** Simplest option, rely entirely on Railway

```bash
git rm .github/workflows/deploy-backend-railway.yml
git commit -m "ci: remove manual deployment workflow (native git deployment active)"
git push
```

Can always restore from git history if needed.

**Recommendation:** Option A (keep as fallback)

---

## Task 5: Run Verification Script (1 minute)

Verify everything is configured correctly:

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Make script executable
chmod +x scripts/verify-phase3-setup.sh

# Run verification
./scripts/verify-phase3-setup.sh
```

**Expected output:**
```
===================================================================
  Phase 3 Setup Verification
===================================================================

✓ GitHub repository linked to Railway
✓ Backend service configured
✓ Watch patterns optimized
✓ Auto-deploy enabled for main branch
✓ Recent deployment triggered by GitHub
✓ Deployment succeeded

All checks passed!
```

---

## Verify Everything Works

Checklist after testing:

```
RAILWAY DASHBOARD:
[ ] Repository connected (shows: cffrank/jobmatchAI)
[ ] Backend service source is GitHub
[ ] Auto-deploy is enabled
[ ] Recent deployment shows "Triggered by: GitHub"

TEST DEPLOYMENT:
[ ] Push to main triggered Railway deployment
[ ] Deployment completed in 2-3 minutes
[ ] Status shows Active (green)
[ ] Health check passed

GITHUB ACTIONS:
[ ] Manual deployment workflow NOT triggered on push
[ ] Only PR preview workflows are active
[ ] Actions tab shows no backend deployment runs

VERIFICATION:
[ ] verify-phase3-setup.sh shows all green checks
[ ] No configuration warnings
[ ] Team notified of new deployment process
```

---

## Understanding the New Process

### Before Phase 3:

```
Push to main
  ↓
GitHub Actions workflow starts
  ↓
Install Railway CLI (~30s)
  ↓
railway up --detach (~2-3 min)
  ↓
Health check (~40s)
  ↓
Total: 3-5 minutes + overhead
```

### After Phase 3:

```
Push to main
  ↓
Railway detects push (<10s)
  ↓
Railway builds & deploys (~2-3 min)
  ↓
Health check (built-in)
  ↓
Total: 2-3 minutes (no overhead)
```

**Benefits:**
- Simpler (one system instead of two)
- Faster (no GitHub Actions overhead)
- Native Railway integration
- Better monitoring in Railway dashboard

---

## Common Issues & Fixes

### Workflow Doesn't Trigger

**Problem:** Push to main but Railway doesn't deploy

**Fixes:**

1. **Check GitHub webhook:**
   - GitHub → Settings → Webhooks
   - Look for Railway webhook
   - Check recent deliveries for errors

2. **Re-link repository:**
   - Railway → Settings → Disconnect GitHub
   - Then reconnect: Connect GitHub Repo

3. **Verify branch name:**
   - Ensure branch is named `main` not `master`
   - Railway → Backend → Settings → Branch: main

4. **Check watch patterns:**
   - Files changed must match watch patterns
   - backend/src files trigger rebuild
   - docs/ files do NOT trigger rebuild

### Railway Shows "No Changes Detected"

**Problem:** Deployment starts but immediately says "No changes"

**Cause:** Files changed don't match watch patterns

**Fix:**

Check watch patterns in `backend/railway.toml`:
```toml
watchPatterns = ["src/**/*.ts", "package.json", "tsconfig.json"]
```

Changes to these files trigger rebuilds:
- ✓ backend/src/index.ts
- ✓ backend/package.json
- ✓ backend/tsconfig.json

Changes to these do NOT:
- ✗ backend/README.md
- ✗ backend/tests/
- ✗ docs/

**This is correct behavior!**

### GitHub Actions Still Running

**Problem:** Push triggers both Railway AND GitHub Actions

**Fix:**

The manual workflow is still set to trigger on push. Update it:

```yaml
# Change from:
on:
  push:
    branches: [main]

# To:
on:
  workflow_dispatch:
```

Or delete the workflow file entirely.

### Build Fails on Railway

**Problem:** Railway starts build but it fails

**Check:**

1. **Build logs:**
   - Railway → Backend → Deployments → Click failed deployment
   - Read build logs for error

2. **Test locally:**
   ```bash
   cd backend
   npm ci && npm run build
   ```

3. **Common causes:**
   - Missing dependencies
   - TypeScript errors
   - Wrong Node.js version

**Fix:** Address error in logs, commit fix, push

---

## How to Rollback

If a deployment breaks something:

### Quick Rollback (30 seconds)

1. Railway dashboard → Backend → Deployments
2. Find last working deployment
3. Click ⋮ (three dots)
4. Click "Rollback"
5. Confirm

**Deployment reverts in < 30 seconds!**

### Git Revert (2 minutes)

```bash
# Revert the bad commit
git revert <bad-commit-hash>
git push origin main

# Railway automatically deploys the revert
```

---

## Testing the Setup

### Test 1: Documentation Change (Should NOT Deploy)

```bash
# Change a doc file
echo "# test" >> backend/README.md
git commit -am "docs: update readme"
git push

# Check Railway - should NOT deploy
# Railway logs: "No changes detected"
```

### Test 2: Source Code Change (Should Deploy)

```bash
# Change source code
echo "// test" >> backend/src/index.ts
git commit -am "test: trigger deploy"
git push

# Check Railway - should deploy
# Railway logs: "Building..."
```

### Test 3: Skip Deployment

```bash
# Use [railway skip] in commit message
git commit -am "docs: update [railway skip]"
git push

# Railway should ignore this push
```

---

## Next Steps

### Now That Phase 3 Is Complete

1. **Update team:**
   - Share this guide
   - Explain new deployment process
   - Show Railway dashboard
   - Train on rollback procedures

2. **Monitor deployments:**
   - Watch for automatic deploys first week
   - Verify no issues
   - Gather team feedback

3. **Optimize workflow:**
   - Review watch patterns
   - Adjust if needed
   - Document any edge cases

4. **Consider Phase 4:**
   - Advanced deployment strategies
   - Canary deployments
   - Deployment analytics
   - See `docs/RAILWAY-MIGRATION-ANALYSIS.md`

---

## Team Communication Template

Send this to your team:

```markdown
## Deployment Process Update - Phase 3

We've upgraded our deployment process to use Railway's native git integration.

**What changed:**
- Deployments are now fully automatic
- Push to main → automatic deployment
- No manual steps required
- Faster and more reliable

**How to deploy:**
1. Merge PR to main
2. Railway deploys automatically
3. Monitor at: https://railway.app/project/jobmatch-ai
4. Done! (~2-3 minutes)

**How to rollback:**
1. Railway dashboard → Backend → Deployments
2. Find last working deployment
3. Click ⋮ → Rollback
4. Confirm

**Emergency manual deployment:**
- Only if Railway is down
- GitHub → Actions → "Manual Backend Deployment"
- Provide reason and deploy

See docs/PHASE3-QUICK-START.md for details.
```

---

## Reference

- **Detailed Guide:** `docs/PHASE3-NATIVE-GIT-DEPLOYMENT.md`
- **Full Analysis:** `docs/RAILWAY-MIGRATION-ANALYSIS.md`
- **Implementation:** `PHASE3-IMPLEMENTATION-COMPLETE.md`
- **Verification:** `scripts/verify-phase3-setup.sh`

---

## Questions?

**"How do I know if it's working?"**
→ Check Railway dashboard → Deployments → Should show "Triggered by: GitHub"

**"Can I still deploy manually?"**
→ Yes! Use emergency workflow or `railway up` from CLI

**"What if Railway is down?"**
→ Use emergency manual workflow (if kept) or wait for Railway to recover

**"Can I deploy from a branch other than main?"**
→ Yes, configure additional branch mappings in Railway settings

**"How do I skip deployment?"**
→ Add `[railway skip]` to commit message

**"Does this affect PR previews?"**
→ No, PR previews (Phase 2) continue to work independently

**"What about environment variables?"**
→ No change needed, variables from Phase 1 still work

---

## You're Ready!

Phase 3 is complete. Your deployments are now:
- ✓ Fully automatic on push to main
- ✓ No GitHub Actions overhead
- ✓ Native Railway integration
- ✓ Simpler and faster

**Start pushing to main - Railway handles the rest!**

Next: Optionally explore Phase 4 (advanced deployment strategies) in `docs/RAILWAY-MIGRATION-ANALYSIS.md`.
