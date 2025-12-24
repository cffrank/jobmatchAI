# Multi-Environment Deployment Setup Checklist

**Project:** JobMatch AI
**Date:** December 24, 2025
**Time Required:** ~2 hours
**Difficulty:** Medium

> **IMPORTANT:** This is a PRODUCTION money-making application. Follow each step carefully.

---

## Quick Start

**Before You Begin:**
1. Read: `DEPLOYMENT_STATUS_REPORT_2025-12-24.md` (full context)
2. Have Railway account ready
3. Have GitHub account access
4. Block out 2 uninterrupted hours

**Documentation References:**
- Railway Guide: `docs/RAILWAY-MULTI-ENVIRONMENT-SETUP.md`
- Branch Protection: `docs/BRANCH-PROTECTION-SETUP.md`
- Full Status Report: `DEPLOYMENT_STATUS_REPORT_2025-12-24.md`

---

## Pre-Flight Check

- [ ] Read full deployment status report
- [ ] Have 2 hours available
- [ ] Railway account credentials ready
- [ ] GitHub account access ready
- [ ] All branches exist: develop, staging, main

---

## Part 1: Railway Development Environment (30 min)

### 1.1 Login to Railway
- [ ] Open https://railway.app
- [ ] Sign in
- [ ] Navigate to **jobmatch-ai** project

### 1.2 Create Development Environment
- [ ] Settings → Environments tab
- [ ] Click **+ New Environment**
- [ ] Name: `development`
- [ ] Branch: `develop`
- [ ] Auto-deploy: **ON**
- [ ] Source: `production`
- [ ] Click **Create**
- [ ] Wait for creation (1-2 min)

### 1.3 Generate Development Domain
- [ ] Select **development** environment
- [ ] Click **backend** service
- [ ] Settings → Domains
- [ ] Click **Generate Domain**
- [ ] **COPY URL:** `___________________________________`

### 1.4 Update Development Variables
- [ ] Backend service → Variables tab
- [ ] Update `APP_URL` = [dev frontend URL]
- [ ] Update `CORS_ORIGIN` = [dev frontend URL]
- [ ] Consider: Separate Supabase project for dev
- [ ] Save

### 1.5 Verify Development
- [ ] Wait for deployment to complete
- [ ] Test: `curl [dev-backend-url]/health`
- [ ] Verify successful response

---

## Part 2: Railway Staging Environment (30 min)

### 2.1 Create Staging Environment
- [ ] Settings → Environments
- [ ] Click **+ New Environment**
- [ ] Name: `staging`
- [ ] Branch: `staging`
- [ ] Auto-deploy: **ON**
- [ ] Source: `production`
- [ ] Click **Create**

### 2.2 Generate Staging Domain
- [ ] Select **staging** environment
- [ ] Click **backend** service
- [ ] Settings → Domains
- [ ] Click **Generate Domain**
- [ ] **COPY URL:** `___________________________________`

### 2.3 Update Staging Variables
- [ ] Backend service → Variables tab
- [ ] Update `APP_URL` = [staging frontend URL]
- [ ] Update `CORS_ORIGIN` = [staging frontend URL]
- [ ] Mirror production config
- [ ] Save

### 2.4 Verify Staging
- [ ] Wait for deployment to complete
- [ ] Test: `curl [staging-backend-url]/health`
- [ ] Verify successful response

---

## Part 3: GitHub Branch Protection - Main (15 min)

### 3.1 Access Branch Protection
- [ ] Open https://github.com/cffrank/jobmatchAI
- [ ] Click **Settings**
- [ ] Click **Branches**
- [ ] Click **Add branch protection rule**

### 3.2 Configure Main Branch
Branch name pattern: `main`

**Require pull request before merging:**
- [ ] ✅ Enable
- [ ] Required approvals: `1`
- [ ] ✅ Dismiss stale PR approvals

**Require status checks:**
- [ ] ✅ Enable
- [ ] ✅ Require branches to be up to date
- [ ] Add: `Backend Tests`
- [ ] Add: `Frontend Tests`
- [ ] Add: `E2E Tests`

**Other:**
- [ ] ✅ Require conversation resolution
- [ ] ✅ Require linear history
- [ ] ✅ Do not allow bypassing
- [ ] ❌ Allow force pushes (NO)
- [ ] ❌ Allow deletions (NO)

- [ ] Click **Create**

---

## Part 4: GitHub Branch Protection - Staging (12 min)

### 4.1 Create Staging Rule
Branch name pattern: `staging`

**Require pull request before merging:**
- [ ] ✅ Enable
- [ ] Required approvals: `1`
- [ ] ✅ Dismiss stale PR approvals

**Require status checks:**
- [ ] ✅ Enable
- [ ] ✅ Require branches to be up to date
- [ ] Add: `Backend Tests`
- [ ] Add: `Frontend Tests`
- [ ] Add: `E2E Tests`

**Other:**
- [ ] ✅ Require conversation resolution
- [ ] ✅ Require linear history
- [ ] ❌ Force pushes (NO)
- [ ] ❌ Deletions (NO)

- [ ] Click **Create**

---

## Part 5: GitHub Branch Protection - Develop (10 min)

### 5.1 Create Develop Rule
Branch name pattern: `develop`

**Require pull request before merging:**
- [ ] ✅ Enable
- [ ] Required approvals: `0` (or `1` for teams)

**Require status checks:**
- [ ] ✅ Enable
- [ ] ❌ Require up to date (NO for develop)
- [ ] Add: `Backend Tests`
- [ ] Add: `Frontend Tests`

**Other:**
- [ ] ❌ Force pushes (NO)
- [ ] ❌ Deletions (NO)

- [ ] Click **Create**

---

## Part 6: Testing (20 min)

### 6.1 Test Development Auto-Deploy
```bash
git checkout develop
echo "# Test Dev" >> TEST_DEV.md
git add TEST_DEV.md
git commit -m "test: verify development auto-deploy"
git push origin develop
```
- [ ] Push test commit
- [ ] Watch Railway development environment
- [ ] Verify deployment succeeds
- [ ] Test health endpoint
- [ ] Cleanup: `git rm TEST_DEV.md && git commit -m "cleanup" && git push`

### 6.2 Test Staging Auto-Deploy
```bash
git checkout staging
echo "# Test Staging" >> TEST_STAGING.md
git add TEST_STAGING.md
git commit -m "test: verify staging auto-deploy"
git push origin staging
```
- [ ] Push test commit
- [ ] Watch Railway staging environment
- [ ] Verify deployment succeeds
- [ ] Test health endpoint
- [ ] Cleanup: `git rm TEST_STAGING.md && git commit -m "cleanup" && git push`

### 6.3 Test Branch Protection
```bash
git checkout main
echo "test" >> README.md
git add README.md
git commit -m "test: verify protection"
git push origin main
```
- [ ] Attempt direct push to main
- [ ] **VERIFY IT FAILS** with "protected branch" error
- [ ] Reset: `git reset --hard HEAD~1`

### 6.4 Test PR Workflow
```bash
git checkout -b test/verify-pr
echo "# PR Test" >> PR_TEST.md
git add PR_TEST.md
git commit -m "test: verify PR workflow"
git push origin test/verify-pr
```
- [ ] Push test branch
- [ ] Create PR to main via GitHub
- [ ] Verify status checks run
- [ ] Close PR (don't merge)
- [ ] Delete branch: `git push origin --delete test/verify-pr`

---

## Part 7: Final Verification (10 min)

### 7.1 Run Verification Script
```bash
bash scripts/verify-multi-env-setup.sh
```
- [ ] Run script
- [ ] Expected: 0 failures, 30+ passes
- [ ] Review results

### 7.2 Verify All Environments
- [ ] Railway development: Active and healthy
- [ ] Railway staging: Active and healthy
- [ ] Railway production: Active and healthy
- [ ] All domains accessible

### 7.3 Verify All Protection Rules
- [ ] Main: Cannot push directly ✅
- [ ] Staging: Cannot push directly ✅
- [ ] Develop: Cannot push directly ✅
- [ ] All require PRs ✅
- [ ] All require status checks ✅

---

## Post-Completion

### Document URLs
```bash
# Development
DEV_BACKEND_URL="https://___________________________________"

# Staging
STAGING_BACKEND_URL="https://___________________________________"

# Production
PROD_BACKEND_URL="https://___________________________________"
```

### Update Frontend
- [ ] Create `.env.development`
- [ ] Create `.env.staging`
- [ ] Verify `.env.production`

### Update Docs
- [ ] Update README.md
- [ ] Update CONTRIBUTING.md
- [ ] Document environment URLs

---

## Success Criteria

✅ 3 Railway environments (dev, staging, prod)
✅ Each auto-deploys from its branch
✅ Each has unique domain URL
✅ 3 GitHub branch protection rules active
✅ Direct pushes blocked on all protected branches
✅ Test deployments succeed
✅ All health checks pass
✅ Verification script: 0 failures

---

## If Something Goes Wrong

### Railway Issues
- Environment won't create: Check plan limits
- Deployment fails: Check logs and env vars
- Domain won't generate: Wait 60 sec, retry

### GitHub Issues
- Can't add status checks: Ensure workflows ran once
- Protection too strict: Review settings
- Can't push: Double-check branch names

### Need Help?
- Review: `DEPLOYMENT_STATUS_REPORT_2025-12-24.md`
- Railway: `docs/RAILWAY-MULTI-ENVIRONMENT-SETUP.md`
- Branch Protection: `docs/BRANCH-PROTECTION-SETUP.md`

---

## Rollback Plan

**Railway:** Settings → Environments → Delete
**GitHub:** Settings → Branches → Delete rule
**Git:** `git revert <commit> && git push`

---

**Estimated Time:** 2 hours
**Difficulty:** Medium
**Risk Level:** Low (production protected)

**Good luck! 🚀**
