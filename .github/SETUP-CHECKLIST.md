# Setup Checklist - CI/CD Pipeline

Complete this checklist to activate your automated deployment pipeline.

## Pre-Flight Checks

- [ ] Firebase project exists: `ai-career-os-139db`
- [ ] GitHub repository exists: `cffrank/jobmatchAI`
- [ ] Local repository is up to date with remote
- [ ] You have Firebase Console access
- [ ] You have GitHub repository admin access

## Configuration Files Created

- [x] `.firebaserc` - Firebase project configuration
- [x] `firebase.json` - Hosting configuration
- [x] `.github/workflows/firebase-deploy.yml` - CI/CD workflow
- [x] `.gitignore` - Updated with Firebase exclusions

## Setup Steps

### 1. Generate Firebase Service Account Key

Choose one method:

#### Method A: Firebase Console (Recommended)
- [ ] Go to https://console.firebase.google.com/project/ai-career-os-139db/settings/serviceaccounts/adminsdk
- [ ] Click "Generate new private key"
- [ ] Download JSON file
- [ ] Copy entire JSON contents to clipboard

#### Method B: Google Cloud Console
- [ ] Go to https://console.cloud.google.com/iam-admin/serviceaccounts?project=ai-career-os-139db
- [ ] Create service account: `github-actions-deploy`
- [ ] Assign roles: Firebase Hosting Admin, Service Account User
- [ ] Create JSON key
- [ ] Copy entire JSON contents to clipboard

### 2. Add Secret to GitHub Repository

- [ ] Go to https://github.com/cffrank/jobmatchAI/settings/secrets/actions
- [ ] Click "New repository secret"
- [ ] Name: `FIREBASE_SERVICE_ACCOUNT`
- [ ] Value: Paste JSON contents from step 1
- [ ] Click "Add secret"
- [ ] Verify secret appears in secrets list

### 3. Commit Configuration Files

Run these commands from `/home/carl/application-tracking/jobmatch-ai`:

```bash
# Review files to be committed
git status

# Add configuration files
git add .firebaserc firebase.json .gitignore
git add .github/workflows/firebase-deploy.yml
git add DEPLOYMENT.md QUICK-START.md CI-CD-SUMMARY.md
git add .github/SETUP-CHECKLIST.md

# Commit
git commit -m "Add Firebase CI/CD pipeline configuration

- Configure Firebase Hosting with SPA routing
- Add GitHub Actions workflow for automated deployments
- Set up preview deployments for pull requests
- Add comprehensive documentation"

# Push to GitHub
git push origin main
```

Checklist:
- [ ] Files added to git
- [ ] Commit created
- [ ] Pushed to origin/main

### 4. Verify Initial Deployment

- [ ] Go to https://github.com/cffrank/jobmatchAI/actions
- [ ] Verify workflow appears and is running
- [ ] Click on workflow run to see details
- [ ] Wait for "Build and Test" job to complete (green checkmark)
- [ ] Wait for "Deploy Production" job to complete (green checkmark)
- [ ] Visit https://ai-career-os-139db.web.app
- [ ] Verify your application loads correctly

### 5. Test Pull Request Preview

```bash
# Create test branch
git checkout -b test-ci-cd-pipeline

# Make a small change
echo "\n## CI/CD Pipeline Active\n" >> README.md

# Commit and push
git add README.md
git commit -m "Test: Verify CI/CD pipeline preview deployment"
git push origin test-ci-cd-pipeline
```

- [ ] Create PR: https://github.com/cffrank/jobmatchAI/compare/main...test-ci-cd-pipeline
- [ ] Wait for workflow to complete
- [ ] Verify GitHub bot posts preview URL in PR comments
- [ ] Click preview URL and verify it loads
- [ ] Merge or close PR

## Verification Tests

### Test 1: Build Locally
```bash
cd /home/carl/application-tracking/jobmatch-ai
npm ci
npm run lint
npm run build
```
- [ ] All commands succeed without errors
- [ ] `dist/` directory is created

### Test 2: Firebase CLI (Optional)
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login
firebase login

# Test deployment
firebase deploy --only hosting --project ai-career-os-139db
```
- [ ] Deployment succeeds
- [ ] Application loads at production URL

### Test 3: Workflow Syntax
```bash
# Validate workflow syntax (requires act or GitHub CLI)
gh workflow view "Deploy to Firebase Hosting"
```
- [ ] Workflow appears correctly
- [ ] No syntax errors

## Troubleshooting

### Issue: Workflow not appearing in Actions tab

**Solution:**
- Ensure `.github/workflows/firebase-deploy.yml` is committed and pushed
- Check file is in correct location
- Verify YAML syntax is valid

### Issue: Build fails with "FIREBASE_SERVICE_ACCOUNT not found"

**Solution:**
- Verify secret was added to GitHub
- Check secret name is exactly: `FIREBASE_SERVICE_ACCOUNT` (case-sensitive)
- Ensure you copied the entire JSON contents including `{}` braces

### Issue: Build succeeds but deployment fails

**Solution:**
- Check service account has correct permissions
- Verify project ID matches: `ai-career-os-139db`
- Check Firebase Console for any project issues

### Issue: Preview URL not appearing in PR comments

**Solution:**
- Ensure GITHUB_TOKEN has write permissions (default for most repos)
- Check workflow logs for errors
- Verify FirebaseExtended/action-hosting-deploy@v0 is accessible

## Post-Setup Configuration (Optional)

### Add Custom Domain
- [ ] Firebase Console → Hosting → Add custom domain
- [ ] Follow DNS configuration steps
- [ ] Update workflow notification with custom URL

### Add Environment Variables
- [ ] GitHub Settings → Secrets → Actions → New secret
- [ ] Add as: `VITE_YOUR_VARIABLE_NAME`
- [ ] Update workflow to pass to build step:
```yaml
- name: Build application
  run: npm run build
  env:
    VITE_API_URL: ${{ secrets.API_URL }}
```

### Enable Firebase Features
- [ ] Firebase Console → Enable Analytics
- [ ] Enable Performance Monitoring
- [ ] Configure App Check for security

## Success Criteria

Your pipeline is fully operational when:

- [x] Configuration files created
- [ ] FIREBASE_SERVICE_ACCOUNT secret added to GitHub
- [ ] Files committed and pushed to GitHub
- [ ] Workflow runs successfully on main branch
- [ ] Production site accessible at https://ai-career-os-139db.web.app
- [ ] Preview deployments work for pull requests
- [ ] No manual deployment steps required

## Next Steps After Setup

1. **Monitor First Week**
   - Watch workflow runs for any issues
   - Verify preview deployments work as expected
   - Check production site performance

2. **Team Onboarding**
   - Share DEPLOYMENT.md with team
   - Explain PR preview workflow
   - Document any custom procedures

3. **Optimization**
   - Add unit tests to workflow
   - Configure performance monitoring
   - Set up deployment notifications (Slack, email)

## Support

- **Full Documentation:** `/home/carl/application-tracking/jobmatch-ai/DEPLOYMENT.md`
- **Quick Start Guide:** `/home/carl/application-tracking/jobmatch-ai/QUICK-START.md`
- **Summary:** `/home/carl/application-tracking/jobmatch-ai/CI-CD-SUMMARY.md`

## Estimated Setup Time

- Generate service account: 2 minutes
- Add GitHub secret: 1 minute
- Commit and push files: 2 minutes
- Verify deployment: 5 minutes

**Total:** ~10 minutes

---

**Status:** Ready for setup
**Created:** 2025-12-18
**Pipeline Version:** 1.0
