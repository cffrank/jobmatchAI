# CI/CD Documentation

Comprehensive documentation for the JobMatch AI deployment pipeline.

## Quick Links

- [Quick Start Guide](#quick-start-guide)
- [Deployment Runbook](./DEPLOYMENT_RUNBOOK.md) - Step-by-step deployment procedures
- [Secrets Configuration](./SECRETS_CONFIGURATION.md) - GitHub Actions secrets setup
- [Firebase Functions Secrets](./FIREBASE_FUNCTIONS_SECRETS.md) - Cloud Functions secrets management

## Quick Start Guide

### First-Time Setup

1. **Configure GitHub Secrets** (one-time setup):
   ```bash
   # Follow the guide to set all required secrets
   # See: SECRETS_CONFIGURATION.md
   ```

2. **Configure Firebase Functions Secrets** (one-time setup):
   ```bash
   firebase login
   firebase use ai-career-os-139db

   firebase functions:secrets:set SENDGRID_API_KEY
   firebase functions:secrets:set OPENAI_API_KEY
   firebase functions:secrets:set LINKEDIN_CLIENT_ID
   firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
   ```

3. **Verify Setup**:
   ```bash
   # Check GitHub secrets
   gh secret list

   # Check Firebase secrets
   firebase functions:secrets:access --all
   ```

### Standard Deployment Workflow

The deployment happens automatically on merge to `main`:

1. **Create Feature Branch**:
   ```bash
   git checkout -b feature/my-new-feature
   # Make changes
   git add .
   git commit -m "Add new feature"
   git push origin feature/my-new-feature
   ```

2. **Open Pull Request**:
   - Go to GitHub
   - Open PR from feature branch to `main`
   - Wait for CI checks to pass
   - Preview deployment will be created automatically

3. **Review & Merge**:
   - Get code review approval
   - Merge PR to `main`
   - Production deployment starts automatically

4. **Monitor Deployment**:
   - Watch GitHub Actions workflow
   - Check deployment summary
   - Verify at https://ai-career-os-139db.web.app

### Manual Deployment

For emergency deployments or testing:

1. **Via GitHub Actions**:
   - Go to Actions tab
   - Select "Deploy to Firebase"
   - Click "Run workflow"
   - Select environment: production
   - Click "Run workflow"

2. **Via Firebase CLI** (local):
   ```bash
   # Build frontend
   npm ci
   npm run build

   # Build functions
   cd functions
   npm ci
   npm run build
   cd ..

   # Deploy
   firebase deploy
   ```

## Pipeline Overview

### Deployment Stages

```
┌─────────────────────────────────────────────────────────────┐
│  1. VALIDATE & BUILD                                        │
│  - Install dependencies                                     │
│  - Run ESLint (frontend & functions)                       │
│  - TypeScript compilation check                            │
│  - Build frontend                                           │
│  - Build Cloud Functions                                    │
│  - Validate Firestore rules                                │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  2. SECURITY SCAN                                           │
│  - npm audit (frontend)                                     │
│  - npm audit (functions)                                    │
│  - Block on critical vulnerabilities                        │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  3. DEPLOY (PR = Preview, Main = Production)               │
│                                                              │
│  Preview (PR):                                              │
│  - Deploy frontend to preview channel                       │
│  - Comment PR with preview URL                              │
│  - Expires in 7 days                                        │
│                                                              │
│  Production (Main):                                         │
│  - Deploy Firestore rules & indexes                        │
│  - Deploy Storage rules                                     │
│  - Deploy Cloud Functions                                   │
│  - Deploy frontend to hosting                               │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  4. POST-DEPLOYMENT VERIFICATION (Production only)         │
│  - Wait 30s for propagation                                │
│  - HTTP health check (frontend)                            │
│  - Manual function verification checklist                   │
└─────────────────────────────────────────────────────────────┘
```

### Change Detection

The pipeline intelligently deploys only what changed:

- **Frontend changes** → Build and deploy frontend
- **Functions changes** → Build and deploy Cloud Functions
- **Rules changes** → Deploy Firestore/Storage rules
- **Any change to main** → Always deploy frontend

This optimizes deployment time and reduces risk.

## Key Features

### 1. Smart Change Detection

Uses `tj-actions/changed-files` to detect what changed and deploy only affected services.

### 2. Security Scanning

- Runs `npm audit` on both frontend and functions
- Blocks deployment if critical vulnerabilities found
- Reports security status in workflow summary

### 3. Preview Deployments

- Every PR gets a preview URL
- Frontend-only (functions not deployed)
- Automatically expires after 7 days
- Perfect for testing UI changes

### 4. Production Safety

- Concurrency controls prevent parallel deploys
- Environment protection rules
- Automatic rollback support
- Post-deployment health checks

### 5. Comprehensive Logging

- Detailed workflow summaries
- Build validation reports
- Deployment success/failure notifications
- Troubleshooting guidance in logs

## Environment Configuration

### GitHub Secrets Required

**Frontend Build**:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

**Deployment**:
- `FIREBASE_SERVICE_ACCOUNT`

See [SECRETS_CONFIGURATION.md](./SECRETS_CONFIGURATION.md) for details.

### Firebase Functions Secrets Required

- `SENDGRID_API_KEY` - Email sending
- `OPENAI_API_KEY` - AI features
- `LINKEDIN_CLIENT_ID` - OAuth
- `LINKEDIN_CLIENT_SECRET` - OAuth

See [FIREBASE_FUNCTIONS_SECRETS.md](./FIREBASE_FUNCTIONS_SECRETS.md) for details.

## Deployment Checklist

### Before Merging to Main

- [ ] All tests pass locally
- [ ] Code reviewed and approved
- [ ] Preview deployment works
- [ ] No breaking changes (or documented)
- [ ] Database migrations planned (if needed)
- [ ] Secrets configured (if new features need them)

### After Deployment

- [ ] Frontend loads successfully
- [ ] Authentication works
- [ ] Critical flows tested
- [ ] No errors in Firebase Console
- [ ] Function logs show no errors
- [ ] Performance is acceptable

## Monitoring

### Where to Check

1. **GitHub Actions**:
   - Workflow status: https://github.com/YOUR_ORG/jobmatch-ai/actions
   - Build logs and summaries

2. **Firebase Console**:
   - Overall health: https://console.firebase.google.com
   - Functions: Console > Functions
   - Hosting: Console > Hosting
   - Firestore: Console > Firestore

3. **Function Logs**:
   ```bash
   firebase functions:log
   ```

4. **Production Site**:
   - https://ai-career-os-139db.web.app

### Key Metrics

- Deployment success rate
- Deployment duration
- Function error rates
- Frontend response time
- Firestore read/write volumes

## Common Tasks

### View Deployment History

```bash
# GitHub CLI
gh run list --workflow="Deploy to Firebase"

# Firebase
firebase hosting:channel:list
```

### Rollback Deployment

See [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md#rollback-procedures)

### Update Secrets

**GitHub Secrets**:
```bash
gh secret set SECRET_NAME --body "NEW_VALUE"
```

**Firebase Functions Secrets**:
```bash
firebase functions:secrets:set SECRET_NAME
```

### Test Locally

```bash
# Frontend
npm run dev

# Functions with emulators
firebase emulators:start
```

### Manual Deploy Specific Service

```bash
# Frontend only
firebase deploy --only hosting

# Functions only
firebase deploy --only functions

# Rules only
firebase deploy --only firestore:rules,storage
```

## Troubleshooting

### Build Failing

1. Check GitHub Actions logs
2. Reproduce locally:
   ```bash
   npm ci
   npm run lint
   npm run build
   ```
3. Fix errors and push

### Deployment Failing

1. Check deployment logs in GitHub Actions
2. Verify secrets are configured
3. Check Firebase service status
4. See [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md#troubleshooting)

### Functions Not Working

1. Check Firebase Console > Functions
2. View function logs:
   ```bash
   firebase functions:log --only functionName
   ```
3. Verify secrets are set
4. Check function permissions

### Getting Help

1. Check this documentation
2. Review [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md)
3. Search GitHub Issues
4. Contact DevOps team

## Security

### Secret Management

- **Never commit secrets to git**
- Store in GitHub Secrets (CI/CD)
- Store in Firebase Secrets (Functions)
- Rotate every 90 days

### Access Control

- Limit who can merge to `main`
- Use branch protection rules
- Require PR reviews
- Enable 2FA for all accounts

### Audit

- Review GitHub audit log monthly
- Monitor Firebase usage
- Check for unauthorized deployments
- Review service account permissions

## Maintenance

### Regular Tasks

**Weekly**:
- [ ] Review deployment logs
- [ ] Check for failed deployments
- [ ] Monitor error rates

**Monthly**:
- [ ] Review dependency vulnerabilities
- [ ] Update dependencies if needed
- [ ] Check Firebase quotas and usage
- [ ] Review and update documentation

**Quarterly**:
- [ ] Rotate all secrets
- [ ] Audit service account permissions
- [ ] Review and optimize workflows
- [ ] Update documentation

## Additional Resources

### Documentation

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Cloud Functions Docs](https://firebase.google.com/docs/functions)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

### Tools

- [Firebase CLI](https://firebase.google.com/docs/cli)
- [GitHub CLI](https://cli.github.com/)
- [Firebase Console](https://console.firebase.google.com)

### Support

- Firebase Support: https://firebase.google.com/support
- GitHub Support: https://support.github.com

---

**Last Updated**: 2025-12-20
**Maintained By**: DevOps Team
**Questions?** Open an issue or contact the team
