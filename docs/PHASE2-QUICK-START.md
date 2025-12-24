# Phase 2: Quick Start - PR Preview Environments

**Time Required:** 10 minutes
**Prerequisites:** Phase 1 complete (Railway token configured)
**Status:** Ready to implement

---

## What You're About to Do

Enable automatic preview environments for pull requests. When developers open a PR with backend changes, an automatic deployment creates a preview environment for testing.

**Result:** Each PR gets its own live backend at a preview URL

---

## The 3-Minute Checklist

- [ ] Verify workflow file exists: `.github/workflows/deploy-pr-preview.yml`
- [ ] Verify RAILWAY_TOKEN secret is set in GitHub
- [ ] Optional: Configure Railway environment template (cost control)

---

## Task 1: Verify Workflow File (1 minute)

The workflow has been created. Verify it's present:

```bash
ls -l .github/workflows/deploy-pr-preview.yml
```

Expected output:
```
-rw-r--r-- 1 user user 12345 Dec 24 10:00 deploy-pr-preview.yml
```

### File should contain:
- `name: Deploy PR Preview`
- `on: pull_request:` with `[opened, synchronize, reopened, closed]`
- `paths: - 'backend/**'`

If missing, see "Troubleshooting" section below.

---

## Task 2: Verify RAILWAY_TOKEN (1 minute)

The token from Phase 1 should still be configured. Verify:

**In GitHub:**
1. Go to your repository
2. Settings → Secrets and variables → Actions
3. Look for `RAILWAY_TOKEN`
4. Should show: "Last used less than a month ago"

If missing: Copy RAILWAY_TOKEN from Phase 1 setup.

**Don't have it?**
```bash
# Get token from Railway
# 1. Go to railway.app
# 2. Account → API Tokens
# 3. Create new token
# 4. Copy token value

# Then add to GitHub
# Settings → Secrets and variables → Actions
# New secret: RAILWAY_TOKEN = [paste token]
```

---

## Task 3: Optional - Configure Railway Environment Template (5 minutes)

This step is optional but recommended for cost control.

**Why:** Templates let Railway auto-cleanup PR environments, saving money.

**Steps:**

1. Go to https://railway.app/dashboard
2. Select JobMatch AI project
3. Click "Settings" → "Environment Templates"
4. Click "Create New Template"
5. Fill in:
   ```
   Template Name:        pr-preview
   Base Environment:     production
   Ephemeral:           Yes (toggle ON)
   Compute Tier:        Small (or your default)
   TTL (Time to Live):  7 days
   ```
6. Click "Create Template"

**What this does:**
- New PR environments inherit these settings
- Auto-delete after 7 days if forgotten
- Uses minimal resources (saves money)
- Inherits all production variables

**Result:** Automatic cost optimization

---

## Testing the Setup (3 minutes)

### Option A: Automated Test (Recommended)

Create a test PR:

```bash
# Create and switch to test branch
git checkout -b test/phase2-verify

# Make a small backend change
echo "# Phase 2 test" >> backend/README.md

# Commit and push
git add backend/README.md
git commit -m "test: verify phase 2 pr preview"
git push origin test/phase2-verify
```

Then:
1. Go to GitHub repository
2. You should see "Create pull request" prompt
3. Click "Create pull request"
4. Watch the "Deploy PR Preview" workflow run
5. Check PR comments for preview URL

**Expected workflow:**
```
Deploy PR Preview (starts immediately)
  ↓
  Checkout code
  Install Railway CLI
  Deploy to PR environment  (1 min)
  Wait for stability        (15 sec)
  Get deployment URL        (30 sec)
  Health check              (40 sec)
  Comment with URL          (30 sec)
  ↓
  COMPLETE in ~3-5 minutes
  ↓
  Check PR comments for preview URL
```

### Option B: Manual Test

If you prefer not to create a test PR:

1. Run workflow manually:
   - Go to GitHub → Actions
   - Select "Deploy PR Preview"
   - Click "Run workflow"
   - But this won't trigger due to missing PR context

**Recommendation:** Use Option A (create test PR) to verify everything works.

---

## After Testing: Verify the Results

### Check 1: Workflow Completed

GitHub → Actions → Deploy PR Preview

Look for:
- ✓ Green checkmark next to workflow
- ✓ All steps show green (especially "Comment PR")
- ✓ Time taken: 3-5 minutes

### Check 2: PR Has Preview Comment

Click on your test PR, scroll down.

Look for comment:
```
🚀 PR Preview Environment Ready

Backend URL: https://...

Environment Name: pr-{NUMBER}

Health Status: 🟢 Health check passed ✓
```

### Check 3: Preview URL Works

Copy preview URL from comment and test:

```bash
# Get the URL from PR comment
PREVIEW_URL="https://..."

# Test health endpoint
curl $PREVIEW_URL/health

# Expected response:
# {"status":"ok","timestamp":"..."}
```

### Check 4: Cleanup Works

Close your test PR (click "Close pull request")

Then check:
1. GitHub Actions should run "Cleanup PR Preview" job
2. It should show "Successfully deleted environment"
3. PR should have cleanup comment
4. In Railway: environment pr-{NUMBER} should be gone

---

## Now Test Against the Preview

### For Backend Developers

```bash
# Test your API endpoints
PREVIEW_URL="https://..."

# Example API calls
curl $PREVIEW_URL/api/jobs
curl $PREVIEW_URL/api/users

# Test with auth (if needed)
curl -H "Authorization: Bearer $TOKEN" $PREVIEW_URL/api/jobs
```

### For Frontend Developers

```bash
# Update frontend to use preview
export VITE_API_URL="https://..."

# Start frontend dev server
npm run dev

# Test integration with preview backend
```

### For QA/Testing

Use preview URL in your testing tools:
- Postman collections
- API testing scripts
- Integration tests
- Manual testing

---

## Verify Everything Works

Checklist after testing:

```
WORKFLOW:
[ ] Deploy PR Preview workflow runs on PR open
[ ] All steps complete successfully
[ ] Takes 3-5 minutes total

PR COMMENT:
[ ] Workflow posts comment with preview URL
[ ] Comment includes health status
[ ] Comment includes testing instructions

PREVIEW URL:
[ ] Preview URL is accessible
[ ] Health endpoint responds (200 OK)
[ ] Backend API responds
[ ] Variables inherited from production

CLEANUP:
[ ] PR closed triggers cleanup workflow
[ ] Cleanup workflow deletes environment
[ ] Environment no longer in Railway dashboard
[ ] Cleanup comment posted on PR

NEXT PR:
[ ] Second PR creates different environment (pr-{DIFFERENT_NUMBER})
[ ] Each PR has its own independent environment
[ ] PRs don't interfere with each other
```

---

## Common Issues & Fixes

### Workflow Doesn't Start

**Problem:** Create PR but "Deploy PR Preview" doesn't appear

**Fixes:**
1. Check workflow file exists: `ls .github/workflows/deploy-pr-preview.yml`
2. Verify file is on main branch: `git log .github/workflows/deploy-pr-preview.yml`
3. PR must touch backend files: Add to `backend/` directory
4. Commit workflow changes and push to main

```bash
# If workflow is new, commit and push it first
git add .github/workflows/deploy-pr-preview.yml
git commit -m "ci: add pr preview deployment workflow"
git push origin main

# Then create new PR - it should trigger
```

### Deployment Fails

**Problem:** Workflow runs but deployment step fails

**Check GitHub Actions logs:**
1. Go to Actions → Deploy PR Preview
2. Click on failed run
3. Click on "Deploy to PR Preview Environment" step
4. Look for error message

**Common causes:**
1. RAILWAY_TOKEN expired or invalid
   - Fix: Update in GitHub Settings → Secrets
2. Railway service not found
   - Fix: Verify backend service exists in Railway dashboard
3. Backend build errors
   - Fix: Check backend builds locally: `cd backend && npm run build`

### Can't Get Preview URL

**Problem:** Deployment completes but preview URL shows "Check Railway dashboard"

**Fixes:**
1. Wait 30 seconds and check again (URL retrieval can take time)
2. Get URL manually from Railway:
   - Go to railway.app/dashboard
   - Select project → Backend service
   - Environment dropdown → pr-{NUMBER}
   - Copy URL from deployment info
3. Or check GitHub Actions logs for more details

### Preview URL Not Responding

**Problem:** Got preview URL but it's not responding or times out

**Fixes:**
1. Wait 30 seconds more (application might still starting)
2. Check health endpoint: `curl https://preview-url/health`
3. Check Railway logs:
   ```bash
   railway logs --service backend --environment "pr-{NUMBER}"
   ```
4. Verify environment variables:
   ```bash
   railway variable ls --environment "pr-{NUMBER}"
   ```

### Environment Doesn't Delete on PR Close

**Problem:** PR closed but environment still exists in Railway

**Fixes:**
1. Check GitHub Actions for cleanup job failure
2. Manual delete:
   ```bash
   railway environment delete "pr-{NUMBER}" --yes
   ```
3. Or delete in Railway dashboard:
   - Select environment
   - Click Settings → Dangerous Zone → Delete Environment

---

## Cost Monitoring

Monitor costs as you use PR preview environments:

### Check Weekly

1. Go to https://railway.app/dashboard
2. Click project → Settings → Billing
3. Look at "This month's cost"
4. Check cost breakdown by environment

### Cost Tips

- Each PR environment costs ~$0.10-0.50
- Environments auto-delete when PR closes
- Close PRs promptly to minimize costs
- Use small compute instances (default setting)

### If Costs Are High

1. Check for orphaned environments: `railway environment ls`
2. Delete unused environments manually
3. Review PR lifetime (average open time)
4. Consider limiting preview environments to critical PRs

---

## Next Steps

### Now That Phase 2 Is Complete

1. **Share with team:**
   - Send link to this guide
   - Show them how to use preview URLs
   - Train on testing against previews

2. **Update your workflow:**
   - Create PR testing procedures
   - Add preview testing to PR checklist
   - Use preview URLs in development

3. **Monitor and optimize:**
   - Watch for issues first week
   - Monitor costs
   - Gather feedback from team

4. **Consider Phase 3:**
   - Read `docs/RAILWAY-MIGRATION-ANALYSIS.md`
   - Phase 3: Native git deployment (optional)
   - Phase 4: Automated production deployments (optional)

---

## Reference

- **Detailed Guide:** `docs/PHASE2-PR-ENVIRONMENTS.md`
- **Full Analysis:** `docs/RAILWAY-MIGRATION-ANALYSIS.md`
- **Workflow File:** `.github/workflows/deploy-pr-preview.yml`
- **Phase 1 Guide:** `docs/PHASE1-QUICK-START.md`

---

## Questions?

**"Why is preview URL showing 'Check Railway dashboard'?"**
→ URL retrieval takes time, check again in 30 seconds or get URL manually from Railway dashboard

**"How long does deployment take?"**
→ 3-5 minutes total from PR creation to preview URL ready

**"Can I test frontend against preview?"**
→ Yes! Set `VITE_API_URL` to preview URL and run frontend

**"What if preview stops working?"**
→ Check health endpoint, check logs, check environment variables

**"When does environment delete?"**
→ When PR closes. Checkout `Cleanup PR Preview` workflow in GitHub Actions

**"Can I manually create a preview?"**
→ Yes: `railway up --service backend --environment pr-custom --detach`

**"How much does this cost?"**
→ ~$0.10-0.50 per PR (small instance, auto-deletes when PR closes)

---

## You're Ready!

Phase 2 is complete. Your PR environments are now:
- ✓ Automatically deployed on PR creation
- ✓ Automatically cleaned up on PR close
- ✓ Ready for team testing
- ✓ Cost-controlled with auto-cleanup

**Start using PR preview URLs for testing!**

Next, consider:
1. Phase 3: Native git deployment (optional optimization)
2. Phase 4: Automated production deployment strategy

See `docs/RAILWAY-MIGRATION-ANALYSIS.md` for future phases.
