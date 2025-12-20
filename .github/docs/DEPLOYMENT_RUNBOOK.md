# Deployment Runbook

This runbook provides step-by-step procedures for deploying JobMatch AI, troubleshooting common issues, and performing rollbacks.

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Procedures](#deployment-procedures)
4. [Rollback Procedures](#rollback-procedures)
5. [Troubleshooting](#troubleshooting)
6. [Emergency Contacts](#emergency-contacts)

## Deployment Overview

### Deployment Architecture

JobMatch AI uses a multi-stage deployment pipeline:

1. **Validation Stage**: Linting, TypeScript compilation, and build verification
2. **Security Scanning**: Dependency audits and vulnerability checks
3. **Preview Deployment**: PR-based preview deployments (frontend only)
4. **Production Deployment**: Full stack deployment to Firebase
5. **Post-Deployment Verification**: Health checks and smoke tests

### Deployment Triggers

- **Automatic**: Push to `main` branch triggers production deployment
- **Preview**: Pull requests trigger preview deployments
- **Manual**: Workflow dispatch from GitHub Actions tab

### Services Deployed

- **Firebase Hosting**: Frontend React application
- **Cloud Functions**: Backend serverless functions
- **Firestore Rules**: Database security rules
- **Firestore Indexes**: Database performance indexes
- **Storage Rules**: File storage security rules

## Prerequisites

### Required GitHub Secrets

The following secrets must be configured in GitHub repository settings:

**Firebase Configuration** (Frontend Build):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

**Firebase Deployment**:
- `FIREBASE_SERVICE_ACCOUNT`: JSON service account key

See [SECRETS_CONFIGURATION.md](./SECRETS_CONFIGURATION.md) for setup instructions.

### Required Firebase Functions Secrets

The following secrets must be configured in Firebase Functions:

```bash
firebase functions:secrets:set SENDGRID_API_KEY
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set LINKEDIN_CLIENT_ID
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
```

See [FIREBASE_FUNCTIONS_SECRETS.md](./FIREBASE_FUNCTIONS_SECRETS.md) for setup instructions.

### Access Requirements

- GitHub repository write access
- Firebase project owner/editor role
- Firebase CLI authenticated locally (for manual deployments)

## Deployment Procedures

### Standard Deployment (Automatic)

**Trigger**: Merge PR to `main` branch

1. Create and test changes in a feature branch
2. Open Pull Request to `main`
3. Verify preview deployment succeeds
4. Review and approve PR
5. Merge PR to `main`
6. Monitor GitHub Actions workflow
7. Verify deployment in Firebase Console
8. Test production application

**Timeline**: ~10-15 minutes

### Manual Deployment

**Use case**: Emergency fixes, manual verification needed

1. Go to GitHub Actions tab
2. Select "Deploy to Firebase" workflow
3. Click "Run workflow"
4. Select environment: `production`
5. Click "Run workflow" button
6. Monitor workflow execution
7. Verify deployment success

**Timeline**: ~10-15 minutes

### Deploying Individual Services

**Use case**: Deploy only specific Firebase services

#### Deploy Only Frontend

```bash
npm run build
firebase deploy --only hosting
```

#### Deploy Only Cloud Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

#### Deploy Only Security Rules

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

#### Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

### Pre-Deployment Checklist

Before deploying to production:

- [ ] All tests pass locally
- [ ] Code reviewed and approved
- [ ] No critical vulnerabilities in dependencies
- [ ] Database migrations tested (if applicable)
- [ ] Firestore rules validated
- [ ] Functions secrets are configured
- [ ] Breaking changes documented
- [ ] Rollback plan prepared

### Post-Deployment Checklist

After deployment completes:

- [ ] Frontend loads successfully
- [ ] User authentication works
- [ ] Critical user flows tested
- [ ] Cloud Functions show as "Active" in console
- [ ] No error spikes in Firebase Console
- [ ] Firestore rules functioning correctly
- [ ] No performance degradation
- [ ] SendGrid integration working (if deployed)

## Rollback Procedures

### Quick Rollback (Frontend Only)

If the frontend has issues but backend is stable:

```bash
# Get previous deployment ID
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:clone <SOURCE_SITE>:<SOURCE_CHANNEL> <DEST_SITE>:live
```

**Timeline**: ~2 minutes

### Full Rollback

If both frontend and backend need rollback:

1. **Identify last known good commit**:
   ```bash
   git log --oneline
   ```

2. **Create rollback branch**:
   ```bash
   git checkout -b rollback/<issue-description> <good-commit-sha>
   git push origin rollback/<issue-description>
   ```

3. **Deploy via manual workflow**:
   - Go to GitHub Actions
   - Run workflow on rollback branch
   - Monitor deployment

4. **Verify rollback**:
   - Test critical flows
   - Check Firebase Console for errors

**Timeline**: ~15-20 minutes

### Emergency Rollback (Direct Firebase CLI)

If GitHub Actions is unavailable:

```bash
# Authenticate
firebase login

# Checkout last good commit
git checkout <good-commit-sha>

# Build frontend
npm ci
npm run build

# Build functions
cd functions
npm ci
npm run build
cd ..

# Deploy all services
firebase deploy --force
```

**Timeline**: ~15 minutes

### Rollback Cloud Functions Only

```bash
# List recent deployments
gcloud functions list --project=ai-career-os-139db

# Rollback specific function
firebase functions:delete <functionName>
git checkout <good-commit> -- functions/
cd functions && npm run build && cd ..
firebase deploy --only functions:<functionName>
```

**Timeline**: ~5 minutes

## Troubleshooting

### Deployment Fails at Build Stage

**Symptoms**:
- TypeScript compilation errors
- Linting failures
- Build errors

**Solutions**:
1. Run build locally:
   ```bash
   npm ci
   npm run lint
   npm run build
   ```
2. Fix errors locally
3. Commit and push fixes
4. Verify in CI

### Deployment Fails at Functions Deploy

**Symptoms**:
- "Deployment failed" during functions deployment
- Timeout errors
- Permission errors

**Solutions**:

1. **Check function logs**:
   ```bash
   firebase functions:log --only <functionName>
   ```

2. **Verify secrets are set**:
   ```bash
   firebase functions:secrets:access SENDGRID_API_KEY
   firebase functions:secrets:access OPENAI_API_KEY
   ```

3. **Check service account permissions**:
   - Go to Firebase Console > Project Settings
   - Verify service account has necessary roles
   - Required roles: Cloud Functions Developer, Service Account User

4. **Increase timeout** (if needed):
   - Edit function configuration in `functions/src/index.ts`
   - Set higher timeout value
   - Redeploy

### Firestore Rules Deployment Fails

**Symptoms**:
- "Invalid rules" error
- Syntax errors in rules

**Solutions**:

1. **Validate rules locally**:
   ```bash
   firebase emulators:start --only firestore
   ```

2. **Test rules**:
   - Use Firebase Console Rules Playground
   - Test read/write operations
   - Fix syntax errors

3. **Check rules syntax**:
   - Verify all brackets match
   - Check function names
   - Validate helper functions

### Security Scan Blocks Deployment

**Symptoms**:
- Critical vulnerabilities found
- Deployment blocked

**Solutions**:

1. **Review vulnerability report**:
   - Check GitHub Actions summary
   - Identify affected packages

2. **Update dependencies**:
   ```bash
   npm audit fix
   npm audit fix --force  # If safe updates don't work
   ```

3. **Update functions dependencies**:
   ```bash
   cd functions
   npm audit fix
   cd ..
   ```

4. **Manual review**:
   - Check if vulnerability affects your usage
   - Consider adding to audit exceptions if false positive

### Frontend Not Loading After Deployment

**Symptoms**:
- Blank page
- 404 errors
- "Failed to load resource" errors

**Solutions**:

1. **Check build output**:
   - Verify `dist/` folder was created
   - Check GitHub Actions artifacts

2. **Verify Firebase configuration**:
   - Check all `VITE_FIREBASE_*` secrets are set
   - Verify values match Firebase Console

3. **Check browser console**:
   - Look for CORS errors
   - Check for missing environment variables
   - Verify API endpoints

4. **Clear cache**:
   - Hard refresh (Ctrl+Shift+R)
   - Clear browser cache
   - Try incognito mode

### Cloud Functions Not Responding

**Symptoms**:
- 500 errors from function endpoints
- Timeout errors
- "Function not found" errors

**Solutions**:

1. **Check function status**:
   - Go to Firebase Console > Functions
   - Verify functions show as "Active"
   - Check error rates

2. **View function logs**:
   ```bash
   firebase functions:log
   ```

3. **Check cold start time**:
   - Functions may timeout on first invocation
   - Increase timeout in function configuration

4. **Verify secrets**:
   - Ensure all required secrets are configured
   - Check secret values are correct

5. **Test function directly**:
   ```bash
   curl https://us-central1-ai-career-os-139db.cloudfunctions.net/<functionName>
   ```

### Database Connection Issues

**Symptoms**:
- "Permission denied" errors
- "Document not found" errors
- Slow query performance

**Solutions**:

1. **Verify Firestore rules deployed**:
   - Check Firebase Console > Firestore > Rules
   - Ensure rules updated timestamp is recent

2. **Check indexes**:
   - Go to Firebase Console > Firestore > Indexes
   - Verify required composite indexes exist
   - Check for "Create index" links in function logs

3. **Test rules locally**:
   - Use Firebase Rules Playground
   - Simulate read/write operations
   - Verify authentication state

### Performance Issues After Deployment

**Symptoms**:
- Slow page loads
- High latency
- Function timeouts

**Solutions**:

1. **Check function metrics**:
   - Firebase Console > Functions > Usage tab
   - Look for cold start spikes
   - Check execution time

2. **Review Firestore usage**:
   - Console > Firestore > Usage
   - Check for excessive reads
   - Optimize queries

3. **Enable caching**:
   - Verify Cache-Control headers
   - Check CDN configuration

4. **Monitor costs**:
   - Check Firebase Console > Usage and Billing
   - Set up budget alerts

## Emergency Contacts

### Escalation Path

1. **Development Team**: Review logs, attempt fixes
2. **DevOps/Platform Team**: Infrastructure issues
3. **Firebase Support**: Platform-level issues

### Key Resources

- **Firebase Console**: https://console.firebase.google.com
- **GitHub Repository**: https://github.com/YOUR_ORG/jobmatch-ai
- **Firebase Status**: https://status.firebase.google.com
- **GitHub Status**: https://www.githubstatus.com

### Incident Response

For production incidents:

1. **Assess severity**:
   - Critical: Site down, data loss risk
   - High: Major features broken
   - Medium: Minor features affected
   - Low: Cosmetic issues

2. **Communicate**:
   - Post in team Slack channel
   - Update status page (if available)
   - Notify stakeholders

3. **Mitigate**:
   - Rollback if necessary
   - Apply hotfix
   - Monitor closely

4. **Post-incident**:
   - Write postmortem
   - Identify root cause
   - Implement prevention measures

## Appendix

### Useful Commands

```bash
# View deployment history
firebase hosting:channel:list

# View function logs
firebase functions:log --only <functionName>

# Test rules locally
firebase emulators:start

# Force deploy (use with caution)
firebase deploy --force

# Deploy specific function
firebase deploy --only functions:<functionName>

# View current project
firebase projects:list
firebase use --add
```

### Deployment Timing

Typical deployment times:
- Frontend only: 2-3 minutes
- Functions only: 3-5 minutes
- Full deployment: 10-15 minutes
- Rollback: 2-15 minutes (depending on method)

### Known Issues

None currently documented.

---

**Last Updated**: 2025-12-20
**Document Owner**: DevOps Team
**Review Frequency**: Quarterly
