# CI/CD Quick Reference

Fast reference for common deployment tasks.

## One-Time Setup

### 1. Configure GitHub Secrets

```bash
gh secret set VITE_FIREBASE_API_KEY --body "YOUR_VALUE"
gh secret set VITE_FIREBASE_AUTH_DOMAIN --body "ai-career-os-139db.firebaseapp.com"
gh secret set VITE_FIREBASE_PROJECT_ID --body "ai-career-os-139db"
gh secret set VITE_FIREBASE_STORAGE_BUCKET --body "ai-career-os-139db.appspot.com"
gh secret set VITE_FIREBASE_MESSAGING_SENDER_ID --body "YOUR_VALUE"
gh secret set VITE_FIREBASE_APP_ID --body "YOUR_VALUE"
gh secret set FIREBASE_SERVICE_ACCOUNT < service-account.json
```

### 2. Configure Firebase Functions Secrets

```bash
firebase functions:secrets:set SENDGRID_API_KEY
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set LINKEDIN_CLIENT_ID
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
```

## Common Commands

### Deploy to Production

```bash
# Automatic: Just merge to main
git checkout main
git merge feature-branch
git push origin main

# Manual: Use GitHub Actions
# Go to Actions > Deploy to Firebase > Run workflow
```

### Local Development

```bash
# Frontend
npm run dev

# Functions with emulators
firebase emulators:start

# Build locally
npm run build
cd functions && npm run build
```

### Manual Firebase Deploy

```bash
# All services
firebase deploy

# Frontend only
firebase deploy --only hosting

# Functions only
firebase deploy --only functions

# Rules only
firebase deploy --only firestore:rules,storage

# Specific function
firebase deploy --only functions:sendApplicationEmail
```

### Check Deployment Status

```bash
# GitHub workflow runs
gh run list --workflow="Deploy to Firebase"

# Firebase hosting channels
firebase hosting:channel:list

# Function logs
firebase functions:log
firebase functions:log --only sendApplicationEmail
```

### Rollback

```bash
# Method 1: Git-based rollback
git checkout -b rollback/issue main
git revert HEAD  # or git reset --hard <good-commit>
git push origin rollback/issue
# Then merge via PR or manual workflow

# Method 2: Firebase CLI
git checkout <good-commit>
npm run build
cd functions && npm run build && cd ..
firebase deploy --force
```

## Secrets Management

### View Secrets

```bash
# GitHub secrets (names only, not values)
gh secret list

# Firebase secrets (names only)
firebase functions:secrets:access --all
```

### Update Secrets

```bash
# GitHub
gh secret set SECRET_NAME --body "NEW_VALUE"

# Firebase Functions
firebase functions:secrets:set SECRET_NAME
# Then redeploy functions
firebase deploy --only functions
```

### Test Secrets Locally

```bash
# Create .env in functions/
cd functions
cp .env.example .env
# Edit .env with actual values
# Run emulators
firebase emulators:start
```

## Monitoring

### Check Application Health

```bash
# Frontend
curl -I https://ai-career-os-139db.web.app

# Firebase Console
# https://console.firebase.google.com/project/ai-career-os-139db
```

### View Logs

```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only functionName

# Tail logs (real-time)
firebase functions:log --only functionName --tail
```

### Audit Dependencies

```bash
# Check for vulnerabilities
npm audit
cd functions && npm audit

# Fix automatically
npm audit fix
cd functions && npm audit fix

# Check outdated packages
npm outdated
cd functions && npm outdated
```

## Troubleshooting

### Build Fails Locally

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install

# For functions
cd functions
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Deployment Fails

```bash
# Check workflow logs
gh run view  # Latest run
gh run view <run-id>

# Verify secrets exist
gh secret list

# Test build locally
npm ci && npm run lint && npm run build
cd functions && npm ci && npm run lint && npm run build
```

### Functions Not Working

```bash
# View recent logs
firebase functions:log --limit 100

# Check function status in Console
# https://console.firebase.google.com/project/ai-career-os-139db/functions

# Verify secrets
firebase functions:secrets:access SENDGRID_API_KEY
```

## File Locations

```
.github/
├── workflows/
│   ├── firebase-deploy.yml          # Main workflow
│   └── cost-monitoring.yml          # Monitoring
└── docs/
    ├── README.md                     # Start here
    ├── DEPLOYMENT_RUNBOOK.md        # Full procedures
    ├── SECRETS_CONFIGURATION.md     # GitHub secrets
    ├── FIREBASE_FUNCTIONS_SECRETS.md # Functions secrets
    └── QUICK_REFERENCE.md           # This file
```

## Checklists

### Before Merging to Main

- [ ] Tests pass locally
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Functions build: `cd functions && npm run build`
- [ ] PR approved
- [ ] Preview deployment works

### After Deployment

- [ ] Frontend loads: https://ai-career-os-139db.web.app
- [ ] No console errors
- [ ] Authentication works
- [ ] Functions show "Active" in Console
- [ ] No error spikes in logs

### Monthly Maintenance

- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Run `npm outdated` and update dependencies
- [ ] Check Firebase usage and costs
- [ ] Review function error rates
- [ ] Update documentation if needed

### Quarterly Maintenance

- [ ] Rotate all secrets (90-day cycle)
- [ ] Review service account permissions
- [ ] Audit Firebase security rules
- [ ] Update workflow dependencies
- [ ] Review and optimize costs

## URLs

- **Production**: https://ai-career-os-139db.web.app
- **Firebase Console**: https://console.firebase.google.com/project/ai-career-os-139db
- **GitHub Actions**: https://github.com/YOUR_ORG/jobmatch-ai/actions
- **GitHub Secrets**: https://github.com/YOUR_ORG/jobmatch-ai/settings/secrets/actions

## Emergency Contacts

- **Deployment Issues**: Check `.github/docs/DEPLOYMENT_RUNBOOK.md`
- **Secret Issues**: Check `.github/docs/SECRETS_CONFIGURATION.md`
- **Firebase Issues**: Check Firebase Status: https://status.firebase.google.com
- **GitHub Issues**: Check GitHub Status: https://www.githubstatus.com

## Quick Fixes

### "Cannot find module" Error

```bash
rm -rf node_modules package-lock.json
npm install
```

### "Invalid API key" Error

```bash
# Update Firebase config secret
gh secret set VITE_FIREBASE_API_KEY --body "CORRECT_KEY"
# Trigger new deployment
```

### "Permission denied" in Functions

```bash
# Check service account roles in Google Cloud Console
# Required: Cloud Functions Developer, Firestore Owner, Storage Admin
```

### Security Scan Blocks Deployment

```bash
# Fix vulnerabilities
npm audit fix
cd functions && npm audit fix

# Commit and push fixes
git add .
git commit -m "fix: resolve security vulnerabilities"
git push
```

## Getting Help

1. **Documentation**: Start with `.github/docs/README.md`
2. **Runbook**: Check `.github/docs/DEPLOYMENT_RUNBOOK.md`
3. **GitHub Issues**: Search existing issues
4. **Firebase Support**: https://firebase.google.com/support
5. **Team**: Contact DevOps team

---

**Last Updated**: 2025-12-20
**For detailed information**: See `.github/docs/README.md`
