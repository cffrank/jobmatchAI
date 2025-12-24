# Phase 2: PR Preview Environment Automation

**Status:** IMPLEMENTATION COMPLETE ✅
**Date Completed:** December 24, 2025
**Time Required for Setup:** 10-15 minutes

---

## Overview

Phase 2 implements automatic preview environments for pull requests. Each PR automatically gets its own isolated Railway environment for testing backend changes before merging to production.

### What This Means

- **Before PR Preview:** Teams had to wait for merges to main to test backend changes in a live environment
- **After PR Preview:** Backend changes are deployed instantly to a preview environment for each PR
- **Result:** Parallel development testing, faster feedback loops, reduced merge conflicts

---

## What Was Implemented

### 1. PR Preview Deployment Workflow
**File:** `.github/workflows/deploy-pr-preview.yml`

Automatically deploys backend to Railway when:
- PR is opened
- New commits are pushed to PR
- PR is reopened after close

Features:
- Creates environment named `pr-{PR_NUMBER}`
- Waits 15 seconds for deployment stability
- Retrieves deployment URL from Railway
- Performs health checks
- Comments on PR with preview URL and status
- Inherits all environment variables from production

### 2. PR Cleanup Workflow
**Same file:** Cleanup job at bottom

Automatically deletes preview environment when:
- PR is closed (merged or abandoned)
- All associated resources are cleaned up
- Prevents resource waste and costs

### 3. PR Comments with Status
Workflow automatically posts:
- Preview URL for backend
- Environment name and status
- Health check results
- Testing instructions
- Configuration details

---

## How PR Preview Environments Work

### Automatic Workflow

```
1. User opens PR with backend changes
   ↓
2. GitHub Action triggers (if backend files changed)
   ↓
3. Workflow deploys to Railway "pr-{NUMBER}" environment
   ↓
4. Workflow retrieves deployment URL
   ↓
5. Workflow performs health check
   ↓
6. Workflow comments on PR with preview URL
   ↓
7. Developer tests changes at preview URL
   ↓
8. PR is merged or closed
   ↓
9. Cleanup job deletes "pr-{NUMBER}" environment
```

### Example: PR #42

```
Triggered Events:
- PR opened: Create environment pr-42, deploy backend
- Push to PR: Redeploy backend to pr-42
- PR closed: Delete environment pr-42

Environment Details:
- Name: pr-42
- Service: backend
- Variables: Inherited from production
- Deployment time: ~2-3 minutes
- Auto-cleanup: Yes
```

---

## Setup Instructions

### Step 1: Verify Workflow File Exists

The workflow has been created at:
```
.github/workflows/deploy-pr-preview.yml
```

Verify it's present:
```bash
ls -l .github/workflows/deploy-pr-preview.yml
```

### Step 2: Ensure Railway Token is Available

The workflow uses `RAILWAY_TOKEN` secret (already configured from Phase 1).

Verify in GitHub:
1. Go to repository Settings → Secrets and variables → Actions
2. Look for `RAILWAY_TOKEN`
3. Should be pre-configured from Phase 1

### Step 3: Optional - Configure Railway Environment Templates

For cost optimization (Railway Premium), you can create an environment template:

1. Go to https://railway.app/dashboard
2. Select JobMatch AI project
3. Click Settings → Environment Templates
4. Create template with:
   - Name: `pr-preview`
   - Base environment: `production`
   - Ephemeral: Yes (auto-delete)
   - CPU/Memory: Small (to minimize costs)
   - TTL: 7 days or custom

**Note:** This is optional - PR environments work without templates, but templates allow cost control.

### Step 4: Test the Workflow

Create a test PR:

```bash
# Create a test branch
git checkout -b test/pr-preview

# Make a small backend change
echo "# Test PR Preview" >> backend/README.md

# Commit and push
git add backend/README.md
git commit -m "test: verify PR preview workflow"
git push origin test/pr-preview

# Go to GitHub and create PR
```

Then watch:
1. GitHub Actions tab → Look for "Deploy PR Preview" workflow
2. Wait for deployment to complete (~3-5 minutes)
3. Check PR comments for preview URL
4. Test the preview URL

---

## Using PR Preview Environments

### For Backend Developers

When working on backend changes:

1. Create a PR with backend changes
2. Wait for "Deploy PR Preview" workflow to complete
3. Check PR comments for preview URL
4. Use the preview URL to test:
   - API endpoints
   - Health checks
   - Integration with frontend
   - Database operations

### For Frontend Developers

When integrating backend changes:

1. Get preview URL from PR comment
2. Update frontend environment variable:
   ```javascript
   // In development
   VITE_API_URL = "https://preview-url-from-pr"
   ```
3. Test frontend integration
4. Provide feedback on PR

### For QA/Testing

When testing complete features:

1. Use preview URL for:
   - Manual testing
   - API testing (Postman, curl, etc.)
   - Integration testing
   - Database state validation

2. Commands to test preview:
   ```bash
   # Health check
   curl https://preview-url/health

   # API endpoint example
   curl https://preview-url/api/jobs

   # Get API documentation (if available)
   curl https://preview-url/api/docs
   ```

---

## Cost Implications

### Per PR Deployment

```
Cost per PR preview: $0.10 - $0.50 (small instance, 10-30 min runtime)

Typical usage:
- PR stays open: 1-3 days
- Small compute instance: $0.02-0.05 per hour
- Example: PR open for 8 hours = $0.16-0.40
```

### Cost Optimization Tips

1. **Auto-cleanup:** Environments auto-delete when PR closes (included)
2. **Small instances:** Use minimal CPU/memory (included in workflow)
3. **Close PRs quickly:** Don't leave preview environments running
4. **Monitor costs:** Check Railway dashboard weekly
5. **Set alerts:** Use Railway's cost monitoring tools

### Monthly Cost Estimate

```
Scenario: 20 PRs per month, average 24 hours each

Cost calculation:
- Per environment: $0.04/hour (small instance)
- 20 PRs × 24 hours × $0.04 = $19.20/month
- Plus production environment: $8-15/month
- Total: ~$27-35/month

Benefits exceed costs:
- Reduced merge conflicts: Time savings
- Parallel development: Productivity gain
- Faster feedback: Better quality
```

---

## Troubleshooting

### Workflow Doesn't Trigger

**Problem:** PR created but workflow doesn't start

**Causes:**
1. Workflow file not committed to main
2. PR doesn't touch backend files
3. Incorrect trigger configuration

**Solution:**
```bash
# Verify workflow is on main
git log --oneline .github/workflows/deploy-pr-preview.yml | head -5

# Verify path filter
cat .github/workflows/deploy-pr-preview.yml | grep -A3 "paths:"

# Make change to backend to trigger
echo "# test" >> backend/README.md
git add .
git commit -m "test"
git push
```

### Deployment Fails

**Problem:** Workflow fails during deployment step

**Causes:**
1. RAILWAY_TOKEN not set or expired
2. Railway service not configured
3. Backend build errors

**Solution:**
```bash
# Check Railway token
echo $RAILWAY_TOKEN

# Verify service exists
railway service ls

# Check workflow logs
# GitHub → Actions → Deploy PR Preview → View logs

# Manual test
cd backend
railway up --service backend --detach
```

### Can't Get Preview URL

**Problem:** Workflow completes but preview URL shows "Check Railway dashboard"

**Causes:**
1. Deployment still stabilizing
2. URL not returned by Railway CLI
3. jq parsing issue

**Solution:**
1. Wait 30 seconds then check Railway dashboard manually
2. Navigate: Railway → Backend → Environment dropdown → Select pr-{NUMBER}
3. Copy URL from deployment info

### Health Check Fails

**Problem:** Health check step reports failure

**Causes:**
1. Application not starting
2. Wrong health endpoint
3. Environment variables missing

**Solution:**
```bash
# Check Railway logs
railway logs --service backend --environment "pr-{NUMBER}"

# Verify health endpoint exists
curl https://preview-url/health

# Check environment variables
railway variable ls --environment "pr-{NUMBER}"
```

### Cleanup Doesn't Work

**Problem:** PR environment still exists after PR closes

**Causes:**
1. Cleanup job didn't run
2. Environment name mismatch
3. Railway token permission issue

**Solution:**
```bash
# Manual cleanup
railway environment delete "pr-{NUMBER}" --yes

# Verify deletion
railway environment ls

# Check GitHub Actions logs for cleanup job failure
```

---

## Configuration Reference

### Workflow Configuration

```yaml
# Trigger conditions
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]
    paths:
      - 'backend/**'

# Environment name pattern
pr-{PR_NUMBER}  # Example: pr-42

# Deployment settings
- Deploy to: Railway backend service
- Environment: pr-{NUMBER}
- Inherit variables: Yes (from production)
- Auto-detach: Yes
```

### Health Check Configuration

```yaml
# Health check endpoint
{PREVIEW_URL}/health

# Retry settings
Max retries: 4
Retry interval: 10 seconds
Total time: ~40 seconds

# Wait time before health check
Initial wait: 15 seconds
```

### Cleanup Configuration

```yaml
# Trigger
Event: PR closed

# Action
Delete environment: pr-{PR_NUMBER}
Force delete: Yes (--yes flag)
Comment on PR: Yes
```

---

## GitHub Action Permissions

The workflow uses:
- `actions/checkout@v4` - Read repository
- `actions/github-script@v7` - Write PR comments

Verify permissions:
```
GitHub → Settings → Actions → General → Workflow permissions
Should be: "Read and write permissions"
```

---

## Railway Configuration

### Required Settings

✓ RAILWAY_TOKEN must be available as GitHub secret (from Phase 1)

### Optional Enhancements

1. **Environment Templates** (for cost control):
   ```
   Settings → Environment Templates → Create "pr-preview"
   Base: production
   Ephemeral: Yes
   ```

2. **Cost Alerts**:
   ```
   Settings → Billing → Cost alerts
   Set threshold: $50/month
   ```

3. **Environment Cleanup Policy**:
   ```
   Settings → Environments → pr-* → TTL
   Set to: 7 days (auto-delete old PR environments)
   ```

---

## Integration Examples

### Frontend Testing Against PR Preview

```javascript
// .env.preview
VITE_API_URL=https://pr-42-backend.up.railway.app

// Development server
npm run dev -- --env preview
```

### Postman Testing

```bash
# Environment variable
BACKEND_URL: https://pr-42-backend.up.railway.app

# Test request
GET {{BACKEND_URL}}/api/jobs
Authorization: Bearer {{TOKEN}}
```

### Integration Tests

```bash
# Run tests against preview
BACKEND_URL=https://pr-42-backend.up.railway.app npm run test:integration
```

### Docker Testing

```bash
# Build and test against preview
docker build -t jobmatch-frontend .
docker run -e REACT_APP_API_URL=https://pr-42-backend.up.railway.app jobmatch-frontend
```

---

## Monitoring PR Environments

### Check Active PR Environments

```bash
# List all environments
railway environment ls

# Output will show:
# production
# pr-42
# pr-41
# etc.
```

### Monitor Resource Usage

1. Go to Railway dashboard
2. Click project → Backend service
3. Select environment → Metrics tab
4. View CPU, memory, network usage

### Check Deployment Logs

```bash
# Get logs for PR environment
railway logs --service backend --environment "pr-42"

# Follow logs in real-time
railway logs --follow --service backend --environment "pr-42"
```

---

## Best Practices

### 1. Keep PRs Short-Lived
- Close PR when merged
- Delete branch after merge
- Prevents accumulation of environments

### 2. Clean Up Regularly
- Check for orphaned environments weekly
- Manually delete if cleanup job fails
- Use Railway dashboard to monitor

### 3. Test Preview Thoroughly
- Test health endpoint
- Test main API endpoints
- Test with frontend integration
- Check database state if needed

### 4. Document Preview Testing
- Add testing steps to PR description
- Link to preview URL in PR comments
- Provide test data/credentials if needed

### 5. Monitor Costs
- Check Railway dashboard weekly
- Look for expensive environments
- Review cost trends

---

## Next Steps

After Phase 2 is complete:

1. **Test PR Preview:**
   - Create test PR with backend change
   - Verify workflow runs
   - Verify preview URL works
   - Merge and verify cleanup

2. **Team Training:**
   - Show team how to use preview URLs
   - Explain cost implications
   - Establish PR testing procedures

3. **Proceed to Phase 3:**
   - See `docs/RAILWAY-MIGRATION-ANALYSIS.md` for Phase 3 details
   - Native git deployment (optional)
   - Automated promotions

---

## FAQ

### Q: Will preview environments cost money?
**A:** Yes, small amounts ($0.10-0.50 per PR). Costs are low because:
- Environments auto-delete when PR closes
- Small compute instances used
- Short-lived (typically 1-3 days)

### Q: Can I manually create a preview environment?
**A:** Yes, via Railway CLI:
```bash
railway up --service backend --environment "manual-test" --detach
```

### Q: What if I need the preview to stay longer?
**A:** Extend PR to prevent auto-cleanup:
- Don't close the PR
- Environment stays as long as PR is open
- Costs continue to accrue while open

### Q: Can I delete preview manually?
**A:** Yes:
```bash
railway environment delete "pr-{NUMBER}" --yes
```

### Q: What if health check fails?
**A:** Preview still works, health check takes time. Try again in 30 seconds or access preview manually in Railway dashboard.

### Q: Can I use preview with other developers?
**A:** Yes, share the preview URL from PR comment. All developers can test against it.

### Q: Do preview environments have database access?
**A:** Yes, they inherit all environment variables including database credentials. Be aware of data isolation needs.

### Q: Can I seed data in preview?
**A:** Yes, but changes won't persist after redeploy. Good for testing, not for persistent data.

### Q: What about secrets in preview?
**A:** Inherited from production. Don't commit secrets to code; they're managed via Railway variables.

---

## Reference Files

- **Workflow:** `.github/workflows/deploy-pr-preview.yml`
- **Analysis:** `docs/RAILWAY-MIGRATION-ANALYSIS.md` (Phase 2 details)
- **Quick Start:** `docs/PHASE2-QUICK-START.md` (setup instructions)
- **Phase 1:** `docs/PHASE1-QUICK-START.md` (prerequisites)

---

## Support

For issues:
1. Check troubleshooting section above
2. Review Railway logs: `railway logs --service backend --environment "pr-{NUMBER}"`
3. Check GitHub Actions workflow logs
4. Review Railway dashboard for service status

---

**Phase 2 Complete!** ✅

Your PR preview environments are ready. Each PR now automatically gets a live backend preview for testing.

**Next:** Follow `docs/PHASE2-QUICK-START.md` for rapid setup, or proceed to Phase 3 in `docs/RAILWAY-MIGRATION-ANALYSIS.md`.
