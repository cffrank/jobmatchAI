# Deployment Runbook - JobMatch AI

## Quick Reference

### Emergency Contacts
- **DevOps Lead:** [Your contact]
- **Firebase Console:** https://console.firebase.google.com/project/ai-career-os-139db
- **GitHub Actions:** https://github.com/cffrank/jobmatchAI/actions
- **Production URL:** https://ai-career-os-139db.web.app

### Critical Commands
```bash
# Check deployment status
firebase hosting:channel:list --project ai-career-os-139db

# Rollback hosting to previous version
firebase hosting:rollback --project ai-career-os-139db

# View recent deployments
firebase hosting:releases:list --project ai-career-os-139db

# Check function logs
firebase functions:log --project ai-career-os-139db
```

## Pre-Deployment Checklist

### Before Every Deployment

- [ ] All CI checks passing
- [ ] Code review completed and approved
- [ ] No breaking changes to Firebase security rules
- [ ] Environment variables updated (if needed)
- [ ] Database migrations prepared (if needed)
- [ ] Stakeholders notified of deployment window
- [ ] Backup/rollback plan confirmed

### Production Deployment Checklist

- [ ] Staging/preview environment tested successfully
- [ ] All tests passing
- [ ] Security scans completed
- [ ] Performance impact assessed
- [ ] Documentation updated
- [ ] Monitoring dashboards ready
- [ ] On-call engineer available during deployment

## Deployment Procedures

### Standard Deployment (Automated via GitHub Actions)

#### 1. Deploy to Staging (Preview)

**Trigger:** Create or update a Pull Request

```bash
# Create feature branch
git checkout -b feature/my-new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push to GitHub
git push origin feature/my-new-feature

# Create PR on GitHub
gh pr create --title "Add new feature" --body "Description of changes"
```

**Expected Result:**
- CI pipeline runs all checks
- If CI passes, preview deployment is created
- Preview URL commented on PR (format: `https://PROJECT_ID--pr-{number}-HASH.web.app`)
- Preview expires in 7 days

**Validation:**
1. Click preview URL in PR comment
2. Test all changed functionality
3. Verify no console errors
4. Check Firebase Console for any errors

#### 2. Deploy to Production

**Trigger:** Merge PR to main branch

```bash
# After PR approval, merge via GitHub UI or:
gh pr merge {PR_NUMBER} --squash

# Or via git:
git checkout main
git pull origin main
```

**Expected Result:**
- CI pipeline runs all checks
- Deployment pipeline triggered
- Components deployed in order:
  1. Firestore Rules
  2. Storage Rules
  3. Firestore Indexes
  4. Firebase Functions
  5. Frontend Hosting
- Health check performed
- Deployment summary created

**Validation:**
1. Check GitHub Actions for successful completion
2. Visit production URL: https://ai-career-os-139db.web.app
3. Verify site loads correctly
4. Check Firebase Console for errors
5. Monitor for 15 minutes post-deployment

### Manual Deployment (Emergency)

Use only when GitHub Actions is unavailable.

```bash
# 1. Ensure you're on main branch with latest code
git checkout main
git pull origin main

# 2. Install dependencies
npm ci
cd functions && npm ci && cd ..

# 3. Build frontend
npm run build

# 4. Login to Firebase
firebase login

# 5. Deploy all components
firebase deploy --project ai-career-os-139db

# OR deploy selectively:
firebase deploy --only hosting --project ai-career-os-139db
firebase deploy --only functions --project ai-career-os-139db
firebase deploy --only firestore:rules --project ai-career-os-139db
firebase deploy --only storage --project ai-career-os-139db
```

## Rollback Procedures

### Immediate Rollback (Critical Issues)

If production is broken and needs immediate rollback:

#### Option 1: Rollback via Firebase Console (Fastest)

1. Open Firebase Console: https://console.firebase.google.com/project/ai-career-os-139db
2. Navigate to Hosting
3. Click "Release history"
4. Find the last known good version
5. Click "⋮" menu → "Rollback"

#### Option 2: Rollback via CLI

```bash
# 1. List recent releases
firebase hosting:releases:list --project ai-career-os-139db

# 2. Rollback to previous version
firebase hosting:rollback --project ai-career-os-139db

# 3. Verify rollback
curl -I https://ai-career-os-139db.web.app
```

#### Option 3: Clone Previous Version

```bash
# List all release channels
firebase hosting:channel:list --project ai-career-os-139db

# Clone a specific version to live
firebase hosting:clone ai-career-os-139db:SOURCE_CHANNEL ai-career-os-139db:live
```

### Rollback Firebase Functions

```bash
# 1. Check function versions
firebase functions:log --project ai-career-os-139db

# 2. Revert code to previous version
git checkout {PREVIOUS_COMMIT_HASH}

# 3. Redeploy functions
cd functions
npm ci
firebase deploy --only functions --project ai-career-os-139db
```

### Rollback Firestore/Storage Rules

```bash
# 1. Find previous working rules in git history
git log --all --full-history -- firestore.rules
git log --all --full-history -- storage.rules

# 2. Checkout previous version
git checkout {COMMIT_HASH} -- firestore.rules storage.rules

# 3. Deploy old rules
firebase deploy --only firestore:rules,storage --project ai-career-os-139db
```

## Troubleshooting Guide

### Issue: CI Pipeline Failing

#### Symptoms
- GitHub Actions shows red X
- PR cannot be merged

#### Diagnosis
```bash
# Check which job failed in GitHub Actions UI
# Click on the failed job to see logs
```

#### Solutions

**ESLint Errors:**
```bash
npm run lint
npm run lint -- --fix  # Auto-fix issues
```

**TypeScript Errors:**
```bash
npx tsc --noEmit
# Fix type errors in reported files
```

**Build Failures:**
```bash
# Check environment variables are set
# Verify dependencies are installed
npm ci
npm run build
```

**Security Scan Failures:**
```bash
# Check Gitleaks output for leaked secrets
# Remove any hardcoded credentials
# Add secrets to .gitignore
```

### Issue: Deployment Stuck/Hanging

#### Symptoms
- Deployment job running for > 20 minutes
- No progress in logs

#### Solutions

1. **Cancel the workflow:**
   - Go to GitHub Actions
   - Click on running workflow
   - Click "Cancel workflow"

2. **Check Firebase status:**
   - Visit https://status.firebase.google.com
   - Check for ongoing incidents

3. **Retry deployment:**
   - Re-run the workflow from GitHub Actions UI
   - Or push a new commit to trigger deployment

### Issue: Preview Channel Not Created

#### Symptoms
- PR created but no preview URL commented
- Preview deployment job shows success but no URL

#### Diagnosis
```bash
# Check GitHub Actions logs for deploy-staging job
# Look for Firebase Hosting errors
```

#### Solutions

1. **Check Firebase Service Account:**
   - Verify `FIREBASE_SERVICE_ACCOUNT` secret is set correctly
   - Ensure service account has necessary permissions

2. **Check PR permissions:**
   - Ensure GitHub Actions has permission to comment on PRs
   - Check repository settings → Actions → General

3. **Manual preview creation:**
```bash
firebase hosting:channel:deploy pr-{NUMBER} --project ai-career-os-139db --expires 7d
```

### Issue: Functions Not Deploying

#### Symptoms
- Hosting deploys successfully
- Functions show errors or don't update

#### Diagnosis
```bash
# Check functions logs
firebase functions:log --project ai-career-os-139db --lines 50

# Check functions list
firebase functions:list --project ai-career-os-139db
```

#### Solutions

1. **Check function dependencies:**
```bash
cd functions
npm ci
npm ls  # Check for dependency conflicts
```

2. **Check environment variables:**
```bash
# Verify functions environment config
firebase functions:config:get --project ai-career-os-139db

# Set missing variables
firebase functions:config:set openai.api_key="YOUR_KEY" --project ai-career-os-139db
```

3. **Deploy functions individually:**
```bash
# Deploy specific function
firebase deploy --only functions:functionName --project ai-career-os-139db
```

### Issue: Security Rules Not Updating

#### Symptoms
- Rules deployed successfully
- But old rules still in effect

#### Diagnosis
```bash
# View current rules
firebase firestore:rules:get --project ai-career-os-139db
```

#### Solutions

1. **Force redeploy:**
```bash
firebase deploy --only firestore:rules --project ai-career-os-139db --force
firebase deploy --only storage --project ai-career-os-139db --force
```

2. **Check rules syntax:**
```bash
# Validate locally
firebase firestore:rules:release firestore.rules --dry-run
```

### Issue: Health Check Failing After Deployment

#### Symptoms
- Deployment completes
- Health check returns non-200 status
- Pipeline fails

#### Diagnosis
```bash
# Manual health check
curl -I https://ai-career-os-139db.web.app

# Check for specific errors
curl https://ai-career-os-139db.web.app
```

#### Solutions

1. **Wait for propagation:**
   - Sometimes CDN needs time to update
   - Wait 2-3 minutes and re-run health check

2. **Check Firebase Console:**
   - Look for errors in Hosting dashboard
   - Check if deployment actually completed

3. **Clear CDN cache:**
```bash
# Firebase Hosting has automatic CDN
# Usually resolves within 5 minutes
```

### Issue: Environment Variables Not Working

#### Symptoms
- Build succeeds locally
- Fails in CI/CD
- Missing configuration errors

#### Diagnosis
```bash
# Check which variables are missing
# Look at build logs in GitHub Actions
```

#### Solutions

1. **Verify GitHub Secrets:**
   - Go to Repository Settings → Secrets and variables → Actions
   - Ensure all required secrets are set:
     - `FIREBASE_SERVICE_ACCOUNT`
     - `FIREBASE_PROJECT_ID`
     - `FIREBASE_TOKEN`
     - `VITE_FIREBASE_*` variables
     - `OPENAI_API_KEY`
     - `SENDGRID_API_KEY`

2. **Check secret names:**
   - Must match exactly in workflow file
   - Case sensitive

3. **Update secrets:**
   - Delete old secret
   - Add new secret with correct value

## Monitoring and Alerts

### Post-Deployment Monitoring

**First 15 Minutes:**
- [ ] Check production URL loads
- [ ] Verify no JavaScript console errors
- [ ] Check Firebase Functions logs for errors
- [ ] Monitor Firebase Hosting metrics
- [ ] Check Firestore reads/writes are working

**First Hour:**
- [ ] Monitor error rates in Firebase Console
- [ ] Check performance metrics
- [ ] Review user feedback channels
- [ ] Monitor API quota usage

**First 24 Hours:**
- [ ] Review error logs daily
- [ ] Check for unusual patterns
- [ ] Monitor costs in Firebase billing

### Key Metrics to Monitor

```bash
# Function execution count
firebase functions:log --project ai-career-os-139db | grep "Function execution"

# Hosting requests
# Check in Firebase Console → Hosting → Usage

# Firestore operations
# Check in Firebase Console → Firestore → Usage
```

### Setting Up Alerts

1. **Firebase Performance Monitoring:**
   - Automatic for Hosting
   - Configure thresholds in Firebase Console

2. **Budget Alerts:**
   - Firebase Console → Project Settings → Billing
   - Set budget alerts at thresholds (e.g., 50%, 80%, 100%)

3. **Error Alerts:**
   - Consider integrating Sentry or similar
   - Set up Cloud Logging alerts

## Communication Templates

### Deployment Announcement

```
📢 Deployment Notification

Environment: Production
Time: [TIMESTAMP]
Changes: [BRIEF DESCRIPTION]
Expected Impact: None (zero-downtime deployment)
Rollback Plan: Automated via Firebase Console

Deployed Components:
- Frontend: ✅
- Functions: ✅
- Security Rules: ✅

Production URL: https://ai-career-os-139db.web.app

Monitoring for next 15 minutes. Will update if any issues arise.
```

### Incident Report

```
🚨 Production Incident Report

Incident: [DESCRIPTION]
Detected: [TIMESTAMP]
Severity: [Critical/High/Medium/Low]
Impact: [DESCRIPTION]

Timeline:
- [TIMESTAMP]: Issue detected
- [TIMESTAMP]: Investigation started
- [TIMESTAMP]: Root cause identified
- [TIMESTAMP]: Fix deployed
- [TIMESTAMP]: Incident resolved

Root Cause: [DESCRIPTION]

Resolution: [DESCRIPTION]

Prevention: [STEPS TO PREVENT RECURRENCE]
```

## Maintenance Windows

### Scheduled Maintenance

For major updates requiring downtime:

1. **Schedule maintenance window:**
   - Announce at least 48 hours in advance
   - Choose low-traffic time (e.g., Sunday 2-4 AM UTC)

2. **Pre-maintenance:**
   - Database backup
   - Document current state
   - Prepare rollback plan

3. **During maintenance:**
   - Display maintenance page (if needed)
   - Perform updates
   - Test thoroughly

4. **Post-maintenance:**
   - Verify all systems operational
   - Monitor for issues
   - Announce completion

## Appendix

### Useful Firebase Commands

```bash
# Project info
firebase projects:list
firebase use ai-career-os-139db

# Hosting
firebase hosting:channel:list
firebase hosting:releases:list
firebase hosting:clone SOURCE:CHANNEL TARGET:live

# Functions
firebase functions:list
firebase functions:log
firebase functions:delete FUNCTION_NAME

# Firestore
firebase firestore:delete --all-collections
firebase firestore:indexes:list

# Auth
firebase auth:export users.json
firebase auth:import users.json
```

### Environment Variables Reference

See [ENVIRONMENT-SETUP.md](./ENVIRONMENT-SETUP.md) for complete list.

---

**Document Version:** 1.0
**Last Updated:** 2025-12-19
**Next Review:** 2026-01-19
