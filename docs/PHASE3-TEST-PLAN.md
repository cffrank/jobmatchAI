# Phase 3: Native Git Deployment - Test Plan

**Purpose:** Comprehensive testing procedures to verify Phase 3 native git deployment implementation
**Target:** Railway native git-connected deployment system
**Date:** December 24, 2025

---

## Test Scope

This test plan covers:
1. GitHub repository linking
2. Automatic deployment triggers
3. Watch pattern functionality
4. Deployment success and health checks
5. Manual workflow configuration
6. Rollback procedures
7. Edge cases and error scenarios

---

## Prerequisites

Before testing:
- [ ] Phase 1 complete (environment variables configured)
- [ ] Phase 2 complete (PR preview environments working)
- [ ] Railway account access
- [ ] GitHub repository admin access
- [ ] Railway CLI installed
- [ ] Git configured locally

---

## Test Suite 1: Repository Linking

### Test 1.1: Verify Current Link Status

**Objective:** Check if GitHub repository is already linked

**Steps:**
1. Go to https://railway.app/dashboard
2. Select JobMatch AI project
3. Navigate to Settings
4. Check GitHub Repo section

**Expected Result:**
- Shows repository name `cffrank/jobmatchAI` if linked
- Shows "Connect GitHub Repo" button if not linked

**Pass Criteria:**
- ✓ Can view link status
- ✓ Status is clearly indicated

### Test 1.2: Link GitHub Repository (If Not Already Linked)

**Objective:** Successfully link GitHub repository to Railway

**Steps:**
1. Click "Connect GitHub Repo"
2. Authenticate with GitHub
3. Select `cffrank/jobmatchAI`
4. Grant Railway access
5. Set root directory to `backend`
6. Confirm connection

**Expected Result:**
- Authentication succeeds
- Repository appears in Railway
- Connection confirmed with green indicator

**Pass Criteria:**
- ✓ Repository linked successfully
- ✓ Root directory set correctly
- ✓ Connection status shows "Connected"

### Test 1.3: Verify Branch Configuration

**Objective:** Confirm correct branch mapping

**Steps:**
1. Go to Backend service settings
2. Check deployment configuration
3. Verify branch is set to `main`
4. Verify auto-deploy is enabled

**Expected Result:**
- Branch: main
- Auto-deploy: ON
- Deploy on push: Enabled

**Pass Criteria:**
- ✓ Correct branch configured
- ✓ Auto-deploy enabled
- ✓ Settings match requirements

---

## Test Suite 2: Automatic Deployment Triggers

### Test 2.1: Source Code Change Triggers Deployment

**Objective:** Verify deployment triggers on TypeScript source change

**Steps:**
```bash
# Make a change to source file
echo "// Test 2.1: source change" >> backend/src/index.ts

# Commit and push
git add backend/src/index.ts
git commit -m "test: verify source change triggers deployment"
git push origin main
```

**Monitor:**
1. Railway dashboard → Backend → Deployments
2. GitHub Actions tab

**Expected Result:**
- Railway shows new deployment within 10 seconds
- Deployment status: Building → Deploying → Active
- GitHub Actions does NOT show backend deployment workflow
- Deployment triggered by: GitHub

**Pass Criteria:**
- ✓ Railway deploys automatically
- ✓ No GitHub Actions workflow runs
- ✓ Deployment succeeds in 2-3 minutes
- ✓ Health check passes

### Test 2.2: Package.json Change Triggers Deployment

**Objective:** Verify deployment triggers on dependency change

**Steps:**
```bash
# Add a comment to package.json
cd backend
# Add comment in package.json
git add package.json
git commit -m "test: verify package.json change triggers deployment"
git push origin main
```

**Expected Result:**
- Railway deploys automatically
- Builds with new dependencies
- Deployment succeeds

**Pass Criteria:**
- ✓ Deployment triggered
- ✓ Build includes dependency changes
- ✓ Deployment succeeds

### Test 2.3: Documentation Change Does NOT Trigger Deployment

**Objective:** Verify watch patterns prevent unnecessary builds

**Steps:**
```bash
# Change README
echo "# Test 2.3" >> backend/README.md
git add backend/README.md
git commit -m "docs: update readme"
git push origin main
```

**Expected Result:**
- Railway shows "No changes detected"
- No new deployment created
- Last deployment remains active

**Pass Criteria:**
- ✓ No deployment triggered
- ✓ Railway correctly identifies no relevant changes
- ✓ Service remains stable

### Test 2.4: TypeScript Config Change Triggers Deployment

**Objective:** Verify tsconfig.json changes trigger rebuild

**Steps:**
```bash
# Make a comment change in tsconfig.json
cd backend
# Add comment to tsconfig.json
git add tsconfig.json
git commit -m "test: verify tsconfig change triggers deployment"
git push origin main
```

**Expected Result:**
- Railway deploys automatically
- Rebuilds TypeScript with new config
- Deployment succeeds

**Pass Criteria:**
- ✓ Deployment triggered
- ✓ Build uses updated config
- ✓ Deployment succeeds

### Test 2.5: Skip Deployment with [railway skip]

**Objective:** Verify skip tag prevents deployment

**Steps:**
```bash
# Make a source change with skip tag
echo "// Test 2.5" >> backend/src/index.ts
git add backend/src/index.ts
git commit -m "test: verify skip tag [railway skip]"
git push origin main
```

**Expected Result:**
- Railway ignores this push
- No deployment created
- Last deployment remains active

**Pass Criteria:**
- ✓ No deployment triggered
- ✓ Skip tag honored
- ✓ Service stable

---

## Test Suite 3: Watch Pattern Verification

### Test 3.1: Verify Watch Patterns Configuration

**Objective:** Confirm watch patterns are correctly configured

**Steps:**
```bash
# Check railway.toml
cat backend/railway.toml | grep -A5 "watchPatterns"
```

**Expected Result:**
```toml
watchPatterns = ["src/**/*.ts", "package.json", "tsconfig.json"]
```

**Pass Criteria:**
- ✓ Watch patterns exist
- ✓ Patterns match expected configuration
- ✓ Syntax is correct

### Test 3.2: Test Each Watch Pattern

**Objective:** Verify each pattern triggers correctly

**Test 3.2a: src/**/*.ts pattern**
```bash
echo "// test" >> backend/src/controllers/test.ts
git add . && git commit -m "test: src pattern" && git push
```
Expected: ✓ Deploys

**Test 3.2b: package.json pattern**
```bash
# Add comment to package.json
git add . && git commit -m "test: package.json pattern" && git push
```
Expected: ✓ Deploys

**Test 3.2c: tsconfig.json pattern**
```bash
# Add comment to tsconfig.json
git add . && git commit -m "test: tsconfig pattern" && git push
```
Expected: ✓ Deploys

**Pass Criteria:**
- ✓ All three patterns trigger deployments
- ✓ Deployments succeed
- ✓ No false negatives

### Test 3.3: Test Non-Watched Files

**Objective:** Verify non-watched files don't trigger

**Test 3.3a: README.md**
```bash
echo "# test" >> backend/README.md
git add . && git commit -m "docs: readme" && git push
```
Expected: ✗ Does NOT deploy

**Test 3.3b: .env files**
```bash
echo "# test" >> backend/.env.example
git add . && git commit -m "docs: env example" && git push
```
Expected: ✗ Does NOT deploy

**Test 3.3c: Test files (if separate)**
```bash
echo "// test" >> backend/tests/unit/test.ts
git add . && git commit -m "test: add test" && git push
```
Expected: ✗ Does NOT deploy (if tests are in separate directory)

**Pass Criteria:**
- ✓ Non-watched files don't trigger
- ✓ No unnecessary deployments
- ✓ No false positives

---

## Test Suite 4: Deployment Success and Health Checks

### Test 4.1: Verify Deployment Completes Successfully

**Objective:** Confirm end-to-end deployment success

**Steps:**
1. Make a source change and push
2. Monitor Railway dashboard
3. Wait for deployment to complete

**Expected Result:**
- Build phase completes without errors
- Deployment phase succeeds
- Service transitions to Active state
- Health check passes

**Pass Criteria:**
- ✓ Build succeeds
- ✓ Deployment succeeds
- ✓ Health check passes
- ✓ Service is accessible

### Test 4.2: Verify Health Check Endpoint

**Objective:** Confirm health endpoint responds correctly

**Steps:**
```bash
# Get deployment URL from Railway
BACKEND_URL=$(railway status --service backend --json | jq -r '.deployments[0].url')

# Test health endpoint
curl $BACKEND_URL/health
```

**Expected Result:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-24T..."
}
```

**Pass Criteria:**
- ✓ Endpoint responds within 5 seconds
- ✓ Returns 200 OK status
- ✓ JSON response is valid
- ✓ Status shows "ok"

### Test 4.3: Verify Service Accessibility

**Objective:** Confirm deployed service is accessible

**Steps:**
```bash
# Test various endpoints
curl -I $BACKEND_URL/health
curl -I $BACKEND_URL/api/jobs
# Add other key endpoints
```

**Expected Result:**
- All endpoints return appropriate status codes
- No 502/503 gateway errors
- Response times < 2 seconds

**Pass Criteria:**
- ✓ All endpoints accessible
- ✓ No server errors
- ✓ Reasonable response times

### Test 4.4: Verify Environment Variables Loaded

**Objective:** Confirm environment variables from Phase 1 are available

**Steps:**
1. Check Railway logs for startup
2. Verify no "undefined variable" errors
3. Test endpoints that require environment variables

**Expected Result:**
- No environment variable errors
- All required variables available
- Services requiring variables work correctly

**Pass Criteria:**
- ✓ No variable errors in logs
- ✓ Database connections work
- ✓ API keys functional

---

## Test Suite 5: Manual Workflow Configuration

### Test 5.1: Verify Manual Workflow Status

**Objective:** Confirm manual workflow is configured correctly

**Steps:**
```bash
# Check workflow file
cat .github/workflows/deploy-backend-railway.yml | grep "on:"
```

**Expected Result (if keeping as fallback):**
```yaml
on:
  workflow_dispatch:
```

**Expected Result (if deleted):**
File not found (deleted)

**Pass Criteria:**
- ✓ Workflow status matches chosen option
- ✓ If kept: Only triggers on workflow_dispatch
- ✓ If deleted: File is gone

### Test 5.2: Test Manual Workflow (If Kept)

**Objective:** Verify emergency manual workflow still works

**Steps:**
1. Go to GitHub → Actions
2. Select "Manual Backend Deployment" workflow
3. Click "Run workflow"
4. Provide reason: "Test emergency deployment"
5. Run workflow

**Expected Result:**
- Workflow runs successfully
- Deployment completes
- Health check passes

**Pass Criteria:**
- ✓ Manual trigger works
- ✓ Deployment succeeds
- ✓ Can be used as fallback

### Test 5.3: Verify PR Preview Still Works

**Objective:** Confirm Phase 2 PR previews unaffected

**Steps:**
1. Create a test branch
2. Make backend changes
3. Create PR
4. Monitor PR preview workflow

**Expected Result:**
- PR preview workflow runs
- Preview environment created
- PR comment with preview URL posted

**Pass Criteria:**
- ✓ PR previews still functional
- ✓ Phase 2 unaffected by Phase 3
- ✓ Both systems work independently

---

## Test Suite 6: Rollback Procedures

### Test 6.1: Test Dashboard Rollback

**Objective:** Verify one-click rollback functionality

**Steps:**
1. Note current deployment ID
2. Make a new deployment
3. Go to Railway → Deployments
4. Click ⋮ on previous deployment
5. Click "Rollback"
6. Confirm

**Expected Result:**
- Rollback initiates immediately
- Previous deployment reactivates
- Service transitions smoothly
- Completes in < 60 seconds

**Pass Criteria:**
- ✓ Rollback succeeds
- ✓ Completes quickly (< 60s)
- ✓ Service healthy after rollback
- ✓ No downtime

### Test 6.2: Test Git Revert Rollback

**Objective:** Verify rollback via git revert

**Steps:**
```bash
# After a problematic deployment
git log --oneline | head -3
git revert HEAD
git push origin main
```

**Expected Result:**
- Revert commit creates new deployment
- Deployment uses reverted code
- Service returns to previous state

**Pass Criteria:**
- ✓ Revert deployment succeeds
- ✓ Service restored to working state
- ✓ Git history is clean

### Test 6.3: Test Rollback During Deployment

**Objective:** Verify rollback during active deployment

**Steps:**
1. Start a deployment
2. While building, rollback to previous
3. Monitor Railway dashboard

**Expected Result:**
- Current deployment cancelled or ignored
- Rollback takes priority
- Previous deployment reactivated

**Pass Criteria:**
- ✓ Rollback interrupts current deployment
- ✓ Service stable
- ✓ No errors

---

## Test Suite 7: Edge Cases and Error Scenarios

### Test 7.1: Build Failure Handling

**Objective:** Verify graceful handling of build failures

**Steps:**
1. Introduce TypeScript error
2. Commit and push
3. Monitor deployment

**Expected Result:**
- Build fails with clear error message
- Previous deployment remains active
- No downtime
- Error logs available

**Pass Criteria:**
- ✓ Build failure detected
- ✓ Service remains on last good deployment
- ✓ Clear error messages
- ✓ No downtime

### Test 7.2: Health Check Failure Handling

**Objective:** Verify handling of failed health checks

**Steps:**
1. Break health endpoint temporarily
2. Deploy
3. Monitor Railway

**Expected Result:**
- Deployment attempts but health check fails
- Railway keeps trying or times out
- Previous deployment remains active if timeout

**Pass Criteria:**
- ✓ Health check failure detected
- ✓ Service stability maintained
- ✓ Clear failure indication

### Test 7.3: Large File Change

**Objective:** Verify handling of large commits

**Steps:**
1. Add or modify large file (if applicable)
2. Commit and push
3. Monitor build time

**Expected Result:**
- Build succeeds but takes longer
- Deployment completes successfully
- No timeout errors

**Pass Criteria:**
- ✓ Large changes handled
- ✓ Build completes
- ✓ No size-related errors

### Test 7.4: Concurrent Pushes

**Objective:** Verify handling of multiple rapid pushes

**Steps:**
1. Make multiple commits in quick succession
2. Push all at once
3. Monitor Railway

**Expected Result:**
- Railway queues or batches deployments
- Latest commit deployed
- Intermediate commits may be skipped

**Pass Criteria:**
- ✓ Handles concurrent pushes
- ✓ Latest version deployed
- ✓ No deployment conflicts

### Test 7.5: Railway Temporary Outage

**Objective:** Verify fallback procedures work

**Simulation:**
1. Assume Railway is down
2. Use manual deployment workflow
3. Or deploy via Railway CLI locally

**Steps:**
```bash
# If Railway dashboard unavailable
cd backend
railway up --detach
```

**Expected Result:**
- Manual methods still work
- Can deploy via CLI
- Emergency workflow available

**Pass Criteria:**
- ✓ Fallback methods functional
- ✓ Can deploy without dashboard
- ✓ Team knows fallback procedures

---

## Test Suite 8: Performance and Monitoring

### Test 8.1: Deployment Time Verification

**Objective:** Confirm deployment time meets expectations

**Steps:**
1. Note deployment start time
2. Wait for completion
3. Calculate total time

**Expected Result:**
- Total time: 2-3 minutes
- No significant overhead
- Matches or beats previous times

**Pass Criteria:**
- ✓ Deployment time ≤ 3 minutes
- ✓ Consistent across deployments
- ✓ No regression from Phase 2

### Test 8.2: Build Cache Verification

**Objective:** Verify build caching improves performance

**Steps:**
1. Deploy with dependency changes
2. Deploy again with no dependency changes
3. Compare build times

**Expected Result:**
- Second build faster (cached dependencies)
- Build cache hit logged
- Noticeable time improvement

**Pass Criteria:**
- ✓ Cache is working
- ✓ Second build faster
- ✓ Cache hit rate visible

### Test 8.3: Deployment Logs Accessibility

**Objective:** Confirm logs are accessible and useful

**Steps:**
1. Access Railway dashboard
2. View deployment logs
3. Check for completeness

**Expected Result:**
- Full build logs available
- Deployment logs available
- Application logs streaming

**Pass Criteria:**
- ✓ Logs accessible
- ✓ Logs complete and useful
- ✓ Real-time streaming works

---

## Test Suite 9: Security and Access Control

### Test 9.1: Verify Environment Variable Security

**Objective:** Confirm secrets remain secure

**Steps:**
1. Check Railway variable visibility
2. Review deployment logs for secrets
3. Verify no secrets in git

**Expected Result:**
- Variables hidden in Railway UI
- No secrets in logs
- No secrets in git history

**Pass Criteria:**
- ✓ Secrets properly secured
- ✓ No exposure in logs
- ✓ Clean git history

### Test 9.2: Verify GitHub Webhook Security

**Objective:** Confirm webhook is properly secured

**Steps:**
1. Go to GitHub → Settings → Webhooks
2. Find Railway webhook
3. Check configuration

**Expected Result:**
- Webhook has secret token
- Uses HTTPS
- Proper event configuration

**Pass Criteria:**
- ✓ Webhook secured
- ✓ HTTPS enforced
- ✓ Correct events configured

---

## Test Suite 10: Documentation and Team Readiness

### Test 10.1: Verify Documentation Completeness

**Objective:** Confirm all documentation is present and accurate

**Checklist:**
- [ ] PHASE3-IMPLEMENTATION-COMPLETE.md exists
- [ ] docs/PHASE3-QUICK-START.md exists
- [ ] docs/PHASE3-NATIVE-GIT-DEPLOYMENT.md exists
- [ ] scripts/verify-phase3-setup.sh exists and is executable
- [ ] docs/RAILWAY-MIGRATION-ANALYSIS.md updated
- [ ] All documents accurate and up to date

**Pass Criteria:**
- ✓ All documents present
- ✓ Content is accurate
- ✓ Links work correctly

### Test 10.2: Run Verification Script

**Objective:** Verify automated verification works

**Steps:**
```bash
./scripts/verify-phase3-setup.sh
```

**Expected Result:**
- All checks pass
- Green checkmarks for each item
- Clear pass/fail indication

**Pass Criteria:**
- ✓ Script runs without errors
- ✓ All checks pass
- ✓ Output is clear and actionable

### Test 10.3: Team Training Verification

**Objective:** Confirm team understands new process

**Checklist:**
- [ ] Team knows how to monitor deployments
- [ ] Team knows how to rollback
- [ ] Team knows manual fallback procedures
- [ ] Team has Railway dashboard access
- [ ] Team understands watch patterns

**Pass Criteria:**
- ✓ Team trained
- ✓ Documentation shared
- ✓ Questions answered

---

## Test Execution Summary

### Test Results Template

```
Test Suite: [Suite Number and Name]
Date: [Execution Date]
Tester: [Name]
Environment: Railway Production / Staging

Results:
- Total Tests: [Number]
- Passed: [Number]
- Failed: [Number]
- Skipped: [Number]

Failed Tests (if any):
- Test [Number]: [Description]
  Reason: [Failure reason]
  Action: [Remediation plan]

Overall Status: PASS / FAIL / PASS WITH WARNINGS

Notes:
[Any additional observations]
```

---

## Acceptance Criteria

Phase 3 is considered successfully implemented when:

**Functional Requirements:**
- ✓ GitHub repository linked to Railway
- ✓ Auto-deploy triggers on push to main
- ✓ Watch patterns filter changes correctly
- ✓ Deployments complete in 2-3 minutes
- ✓ Health checks pass automatically
- ✓ Rollback procedures work (< 60 seconds)
- ✓ Manual fallback available

**Non-Functional Requirements:**
- ✓ No GitHub Actions overhead for deployments
- ✓ Railway dashboard is single source of truth
- ✓ Team trained and comfortable with new process
- ✓ Documentation complete and accurate
- ✓ Verification script passes all checks

**Regression Requirements:**
- ✓ Phase 1 still works (environment variables)
- ✓ Phase 2 still works (PR preview environments)
- ✓ No increase in deployment time
- ✓ No decrease in reliability

---

## Rollback Plan

If testing reveals critical issues:

1. **Immediate Rollback:**
   - Disconnect GitHub from Railway
   - Re-enable push trigger on GitHub Actions workflow
   - Continue using manual deployment process

2. **Investigate Issues:**
   - Review failed test results
   - Check Railway logs
   - Identify root cause

3. **Fix and Retest:**
   - Address issues found
   - Re-run failed tests
   - Verify fixes work

4. **Re-implement Phase 3:**
   - Follow updated procedures
   - Test more thoroughly
   - Monitor closely

---

## Post-Test Activities

After all tests pass:

1. **Document Results:**
   - Record test execution summary
   - Note any issues and resolutions
   - Update documentation if needed

2. **Team Communication:**
   - Announce Phase 3 completion
   - Share documentation links
   - Provide training if needed

3. **Monitoring Period:**
   - Monitor deployments for 1 week
   - Watch for any issues
   - Gather team feedback

4. **Phase 3 Sign-Off:**
   - Mark Phase 3 as complete
   - Archive test results
   - Proceed to Phase 4 (optional)

---

## Test Schedule

Suggested test execution order:

**Day 1: Setup and Basic Tests**
- Test Suite 1: Repository Linking
- Test Suite 2: Automatic Deployment Triggers
- Test Suite 3: Watch Pattern Verification

**Day 2: Advanced Tests**
- Test Suite 4: Deployment Success and Health Checks
- Test Suite 5: Manual Workflow Configuration
- Test Suite 6: Rollback Procedures

**Day 3: Edge Cases and Final Verification**
- Test Suite 7: Edge Cases and Error Scenarios
- Test Suite 8: Performance and Monitoring
- Test Suite 9: Security and Access Control
- Test Suite 10: Documentation and Team Readiness

**Total Time:** 3-5 hours spread across 3 days

---

## Support and Resources

- **Quick Start:** `docs/PHASE3-QUICK-START.md`
- **Detailed Guide:** `docs/PHASE3-NATIVE-GIT-DEPLOYMENT.md`
- **Implementation Summary:** `PHASE3-IMPLEMENTATION-COMPLETE.md`
- **Verification Script:** `scripts/verify-phase3-setup.sh`
- **Railway Documentation:** https://docs.railway.app/deploy/github

---

**Test plan ready for execution!**

Run tests systematically, document results, and ensure all acceptance criteria are met before marking Phase 3 as complete.
