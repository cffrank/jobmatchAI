# JobMatch AI - Complete Deployment Guide

This comprehensive guide covers deploying the JobMatch AI application to Firebase, including Firestore, Storage, Cloud Functions, and Hosting.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Process](#deployment-process)
- [Verification](#verification)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Tools

1. **Node.js 20+**
   ```bash
   node --version  # Should be v20 or higher
   ```

2. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase --version  # Should be v13 or higher
   ```

3. **Git**
   ```bash
   git --version
   ```

### Required Accounts & Access

1. **Firebase Project**
   - Project ID: `ai-career-os-139db`
   - Owner or Editor role required
   - Blaze (pay-as-you-go) plan required for Cloud Functions

2. **OpenAI Account**
   - API key with GPT-4 access
   - Billing enabled
   - Rate limits configured

3. **GitHub Repository**
   - Admin access for setting up secrets
   - Actions enabled

### Cost Estimates

**Monthly costs for 1,000 active users:**
- Firebase Hosting: $0 (generous free tier)
- Firestore: ~$5-10 (depending on reads/writes)
- Storage: ~$1-2 (5GB storage)
- Cloud Functions: ~$10-20 (depending on invocations)
- OpenAI API: ~$30-50 (GPT-4o-mini for resume generation)
- **Total: ~$50-80/month**

---

## Environment Setup

### 1. Firebase CLI Authentication

```bash
# Login to Firebase
firebase login

# Verify authentication
firebase projects:list

# Set active project
firebase use ai-career-os-139db
```

### 2. Local Environment Variables

Create `.env.local` in the project root:

```bash
# Copy example file
cp .env.example .env.local
```

Edit `.env.local` with your Firebase configuration:

```env
# Firebase Configuration (from Firebase Console > Project Settings > Your Apps)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=ai-career-os-139db.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ai-career-os-139db
VITE_FIREBASE_STORAGE_BUCKET=ai-career-os-139db.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

**IMPORTANT:** Never commit `.env.local` to Git. It's already in `.gitignore`.

### 3. Firebase Console Configuration

#### Enable Authentication Providers

1. Go to Firebase Console > Authentication > Sign-in method
2. Enable **Email/Password**
   - Check "Allow users to sign up using email and password"
   - Check "Email link (passwordless sign-in)" (optional)
3. Enable **Google**
   - Add your project support email
   - Add authorized domains: `localhost`, `ai-career-os-139db.web.app`
4. (Optional) Enable **LinkedIn OAuth**
   - Requires LinkedIn Developer App
   - See [LINKEDIN_OAUTH_SETUP.md](./docs/LINKEDIN_OAUTH_SETUP.md)

#### Configure Authorized Domains

Authentication > Settings > Authorized domains:
- `localhost` (for development)
- `ai-career-os-139db.web.app` (Firebase hosting)
- `ai-career-os-139db.firebaseapp.com` (Firebase hosting)
- Add your custom domain if you have one

### 4. Cloud Functions Environment Secrets

Firebase Functions uses Secret Manager for sensitive environment variables.

```bash
# Set OpenAI API Key (REQUIRED)
firebase functions:secrets:set OPENAI_API_KEY
# Enter your sk-... key when prompted

# Verify secret is set
firebase functions:secrets:access OPENAI_API_KEY --project ai-career-os-139db
```

**Optional secrets for future features:**

```bash
# LinkedIn OAuth (for profile import feature)
firebase functions:secrets:set LINKEDIN_CLIENT_ID
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET

# Stripe (for billing/subscription feature)
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

# Email Service (for notifications)
firebase functions:secrets:set SENDGRID_API_KEY
```

### 5. GitHub Actions Secrets

Required for CI/CD pipeline. Go to GitHub Repository > Settings > Secrets and variables > Actions.

Add the following secrets:

| Secret Name | Description | Where to Get It |
|-------------|-------------|-----------------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key | Firebase Console > Project Settings > Web App |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | Firebase Console > Project Settings |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | `ai-career-os-139db` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | Firebase Console > Project Settings |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Sender ID | Firebase Console > Project Settings |
| `VITE_FIREBASE_APP_ID` | Firebase App ID | Firebase Console > Project Settings |
| `FIREBASE_SERVICE_ACCOUNT` | Service Account JSON | Firebase Console > Project Settings > Service Accounts > Generate New Private Key |

**Detailed setup:** See [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md)

---

## Deployment Process

### Pre-Deployment Checklist

Before deploying, run through [PRE_DEPLOYMENT_CHECKLIST.md](./PRE_DEPLOYMENT_CHECKLIST.md):

- [ ] All tests pass locally
- [ ] Firebase CLI authenticated
- [ ] Environment variables configured
- [ ] Firestore rules reviewed
- [ ] Storage rules reviewed
- [ ] Cloud Functions tested in emulator
- [ ] Security review completed
- [ ] Backup of current production data (if applicable)

### Manual Deployment (Recommended for First Deploy)

#### Step 1: Deploy Firestore Rules & Indexes

```bash
# Deploy security rules and indexes
firebase deploy --only firestore

# Verify deployment
firebase firestore:indexes:list
```

**What this does:**
- Deploys security rules from `firestore.rules`
- Creates indexes defined in `firestore.indexes.json`
- Validates rules syntax before deployment

**Expected output:**
```
✔  Deploy complete!
Project Console: https://console.firebase.google.com/project/ai-career-os-139db/firestore
```

#### Step 2: Deploy Storage Rules

```bash
# Deploy storage security rules
firebase deploy --only storage

# Verify deployment
firebase deploy --only storage --dry-run
```

**What this does:**
- Deploys security rules from `storage.rules`
- Enforces file type and size limits
- Validates rules syntax before deployment

#### Step 3: Deploy Cloud Functions

```bash
# Install function dependencies
cd functions
npm install
cd ..

# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:generateApplication
```

**What this does:**
- Packages Node.js functions
- Deploys to Cloud Functions (2nd gen)
- Sets up HTTPS callable endpoints
- Configures secrets access

**Expected output:**
```
✔  functions[us-central1-generateApplication] Successful create operation.
Function URL: https://us-central1-ai-career-os-139db.cloudfunctions.net/generateApplication
```

**Monitor logs:**
```bash
# Stream logs in real-time
firebase functions:log --only generateApplication

# View last 100 lines
firebase functions:log --only generateApplication --limit 100
```

#### Step 4: Build Frontend

```bash
# Install dependencies
npm ci

# Build for production
npm run build
```

**What this does:**
- Compiles TypeScript
- Bundles with Vite
- Optimizes assets
- Outputs to `dist/` directory

**Verify build:**
```bash
# Preview production build locally
npm run preview
```

#### Step 5: Deploy to Firebase Hosting

```bash
# Deploy to Firebase Hosting
firebase deploy --only hosting

# Or deploy everything at once
firebase deploy
```

**What this does:**
- Uploads `dist/` folder to Firebase Hosting
- Configures routing (SPA mode)
- Sets cache headers for assets
- Deploys to production domain

**Expected output:**
```
✔  Deploy complete!
Hosting URL: https://ai-career-os-139db.web.app
```

### Automated Deployment (CI/CD via GitHub Actions)

The project includes a GitHub Actions workflow that automatically deploys on every push to `main`.

**Workflow file:** `.github/workflows/firebase-deploy.yml`

**Triggers:**
- Push to `main` branch → Deploy to production
- Pull request → Deploy to preview channel (expires in 7 days)

**Pipeline stages:**
1. **Build & Test** - Lint, build, run tests
2. **Deploy Preview** - Preview channel for PRs
3. **Deploy Production** - Live deployment for main branch

**View deployment status:**
- GitHub Repository > Actions tab
- Check individual workflow runs
- Review logs for each step

**Preview deployments:**
```bash
# List active preview channels
firebase hosting:channel:list

# View specific preview URL
# URL is posted as a comment on the PR
```

---

## Verification

After deployment, verify everything is working correctly.

### 1. Run Verification Script

```bash
# Make script executable
chmod +x verify-deployment.sh

# Run verification
./verify-deployment.sh
```

The script checks:
- Hosting is accessible
- Authentication is enabled
- Firestore rules are deployed
- Storage rules are deployed
- Cloud Functions are callable

### 2. Manual Verification Steps

#### Authentication

1. Open https://ai-career-os-139db.web.app
2. Click "Sign Up"
3. Create account with email/password
4. Verify email verification email is sent
5. Try Google OAuth sign-in
6. Verify redirect to app after login

#### Firestore

1. Sign in to the app
2. Go to Profile section
3. Add work experience entry
4. Verify data appears in Firebase Console > Firestore
5. Refresh page, verify data persists
6. Try to access another user's data (should fail)

#### Storage

1. Go to Account Settings
2. Upload profile photo
3. Verify upload progress shows
4. Verify photo appears immediately
5. Check Firebase Console > Storage for file

#### Cloud Functions

1. Go to Jobs section
2. Click "Apply" on a job
3. Verify AI generation starts
4. Wait for 3 variants to generate
5. Check function logs:
   ```bash
   firebase functions:log --only generateApplication
   ```

### 3. Performance Checks

```bash
# Check hosting response time
curl -w "@curl-format.txt" -o /dev/null -s https://ai-career-os-139db.web.app

# Check function cold start time
firebase functions:log --only generateApplication | grep "execution took"
```

### 4. Security Validation

Test Firestore security rules:

```javascript
// Try to read another user's data (should fail)
// Open browser console on https://ai-career-os-139db.web.app
const db = firebase.firestore();
db.collection('users').doc('other-user-id').get()
  .then(() => console.error('SECURITY BREACH: Read other user data'))
  .catch(() => console.log('✓ Security rules working'));
```

---

## Monitoring

### Firebase Console Dashboards

1. **Authentication**
   - Console > Authentication > Users
   - Monitor sign-ups, sign-ins, failures

2. **Firestore**
   - Console > Firestore > Usage
   - Monitor reads, writes, deletes
   - Check index status

3. **Storage**
   - Console > Storage > Usage
   - Monitor file uploads, bandwidth

4. **Cloud Functions**
   - Console > Functions > Dashboard
   - Monitor invocations, errors, execution time
   - View logs and metrics

### Logging

**Function logs:**
```bash
# Real-time logs
firebase functions:log

# Filter by function
firebase functions:log --only generateApplication

# Filter by severity
firebase functions:log --severity ERROR

# Time range
firebase functions:log --since 2h
```

**Hosting logs:**
```bash
# View hosting traffic
firebase hosting:logs
```

### Alerts

Set up Firebase Alerts in Console > Alerts:

1. **Function errors** - Alert when error rate > 5%
2. **High latency** - Alert when p95 > 10 seconds
3. **Budget** - Alert when costs exceed threshold
4. **Authentication failures** - Alert on unusual sign-in attempts

### Cost Monitoring

```bash
# View Firebase usage
firebase projects:list --json

# Check current month's usage
# Go to Console > Usage and billing
```

Set up budget alerts:
- Firebase Console > Project Settings > Usage and billing > Details and settings
- Set budget alerts at $50, $100, $150

---

## Troubleshooting

### Common Issues

#### 1. Build Fails with "Environment variable not set"

**Problem:** Vite can't find Firebase config variables

**Solution:**
```bash
# Verify .env.local exists and has all variables
cat .env.local

# For GitHub Actions, verify secrets are set
# Repository > Settings > Secrets and variables > Actions
```

#### 2. Functions Deployment Fails

**Problem:** `Error: Permission denied`

**Solution:**
```bash
# Verify you have correct permissions
firebase projects:get ai-career-os-139db

# Re-authenticate if needed
firebase logout
firebase login
```

**Problem:** `Error: OPENAI_API_KEY secret not found`

**Solution:**
```bash
# Set the secret
firebase functions:secrets:set OPENAI_API_KEY

# Verify it's accessible
firebase functions:secrets:access OPENAI_API_KEY
```

#### 3. Firestore Rules Deployment Fails

**Problem:** `Error: Invalid rules syntax`

**Solution:**
```bash
# Validate rules locally
firebase firestore:rules:validate firestore.rules

# Check for common issues:
# - Missing semicolons
# - Unmatched braces
# - Invalid function names
```

#### 4. Storage Upload Fails

**Problem:** "Permission denied" when uploading files

**Solution:**
- Verify user is authenticated
- Check storage rules are deployed:
  ```bash
  firebase deploy --only storage
  ```
- Verify file size and type match rules

#### 5. Function Returns "CORS error"

**Problem:** Functions can't be called from web app

**Solution:**
- Functions v2 automatically handles CORS for callable functions
- For HTTP functions, add CORS headers:
  ```javascript
  res.set('Access-Control-Allow-Origin', '*');
  ```

#### 6. High Firebase Costs

**Problem:** Unexpectedly high bills

**Solution:**
```bash
# Check Firestore usage
firebase firestore:stats

# Common issues:
# - Missing indexes causing full collection scans
# - Listeners not unsubscribed
# - N+1 query patterns

# Add composite indexes for common queries
# See firestore.indexes.json
```

### Getting Help

1. **Firebase Support**
   - Console > Support
   - For Blaze plan: Live chat support

2. **Stack Overflow**
   - Tag: `firebase`, `cloud-functions`, `firestore`

3. **Firebase Discord**
   - https://discord.gg/firebase

---

## Rollback Procedures

If a deployment introduces issues, follow these rollback steps.

### Rollback Hosting

```bash
# List recent deployments
firebase hosting:channel:list

# Rollback to specific version
firebase hosting:rollback

# Verify rollback
curl https://ai-career-os-139db.web.app
```

### Rollback Cloud Functions

```bash
# List function versions
gcloud functions list --project=ai-career-os-139db

# Rollback specific function
gcloud functions deploy generateApplication \
  --source=gs://gcf-sources-previous-version \
  --project=ai-career-os-139db
```

**Better approach:** Re-deploy previous Git commit:
```bash
# Find last good commit
git log --oneline

# Checkout that commit
git checkout <commit-hash>

# Re-deploy
firebase deploy --only functions

# Return to main
git checkout main
```

### Rollback Firestore Rules

**IMPORTANT:** Rules changes take effect immediately and can't be "rolled back" in the traditional sense.

**Best practice:**
1. Keep rules in version control (already done via `firestore.rules`)
2. Test rules changes in emulator first
3. Have a backup of working rules

**Emergency rollback:**
```bash
# Checkout previous version
git checkout HEAD~1 firestore.rules

# Deploy old rules
firebase deploy --only firestore

# Restore latest version
git checkout main firestore.rules
```

### Rollback Storage Rules

Same process as Firestore rules:

```bash
git checkout HEAD~1 storage.rules
firebase deploy --only storage
git checkout main storage.rules
```

### Data Backup & Restore

**Before major changes, backup Firestore:**

```bash
# Export Firestore data
gcloud firestore export gs://ai-career-os-139db.appspot.com/backups/$(date +%Y%m%d) \
  --project=ai-career-os-139db
```

**Restore from backup:**

```bash
# Import Firestore data
gcloud firestore import gs://ai-career-os-139db.appspot.com/backups/20250101 \
  --project=ai-career-os-139db
```

---

## Production Checklist

Before going live with real users:

- [ ] All environment variables are production values (not dev/staging)
- [ ] Firestore security rules are strict (no test/development rules)
- [ ] Storage rules enforce file size and type limits
- [ ] OpenAI API key is production key with billing enabled
- [ ] Firebase project is on Blaze plan
- [ ] Budget alerts configured
- [ ] Error monitoring configured (Sentry, LogRocket, etc.)
- [ ] Analytics configured (Google Analytics, Mixpanel, etc.)
- [ ] Custom domain configured (optional)
- [ ] SSL certificate configured (automatic with Firebase)
- [ ] Privacy policy and terms of service pages created
- [ ] GDPR/CCPA compliance measures implemented
- [ ] Backup strategy established
- [ ] Disaster recovery plan documented
- [ ] Team access and permissions configured
- [ ] Support email configured

---

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Functions Best Practices](https://firebase.google.com/docs/functions/best-practices)
- [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Project-specific Docs](./docs/)
  - [GitHub Secrets Setup](./GITHUB_SECRETS_SETUP.md)
  - [Pre-deployment Checklist](./PRE_DEPLOYMENT_CHECKLIST.md)
  - [Firebase Integration Status](./FIREBASE_INTEGRATION_STATUS.md)

---

**Last Updated:** December 19, 2025
