# Environment Setup Guide - JobMatch AI CI/CD

## Overview

This guide walks you through setting up all required environments, secrets, and configurations for the JobMatch AI CI/CD pipeline.

## Prerequisites

- GitHub repository access with admin permissions
- Firebase project access (ai-career-os-139db)
- Firebase CLI installed locally: `npm install -g firebase-tools`
- Git and Node.js 20+ installed

## Table of Contents

1. [GitHub Repository Setup](#github-repository-setup)
2. [Firebase Configuration](#firebase-configuration)
3. [GitHub Secrets Configuration](#github-secrets-configuration)
4. [GitHub Environments](#github-environments)
5. [Local Development Setup](#local-development-setup)
6. [Verification](#verification)

## GitHub Repository Setup

### 1. Branch Protection Rules

Protect the `main` branch to ensure all code goes through CI/CD:

1. Go to **Repository Settings** → **Branches**
2. Click **Add branch protection rule**
3. Configure:
   - **Branch name pattern:** `main`
   - **Require a pull request before merging:** ✓
   - **Require approvals:** 1 (or more)
   - **Require status checks to pass before merging:** ✓
     - Add required status checks:
       - `Frontend Build & Test`
       - `Functions Build & Test`
       - `Security Scanning`
       - `Validate Firebase Security Rules`
   - **Require branches to be up to date before merging:** ✓
   - **Do not allow bypassing the above settings:** ✓
4. Click **Create**

### 2. GitHub Actions Permissions

1. Go to **Repository Settings** → **Actions** → **General**
2. **Workflow permissions:**
   - Select **Read and write permissions**
   - ✓ **Allow GitHub Actions to create and approve pull requests**
3. Click **Save**

### 3. Enable GitHub Environments

1. Go to **Repository Settings** → **Environments**
2. Click **New environment**
3. Create two environments:

#### Staging Environment
- **Name:** `staging`
- **Environment protection rules:**
  - (Optional) Required reviewers: None
  - **Deployment branches:** Selected branches only → `main`

#### Production Environment
- **Name:** `production`
- **Environment protection rules:**
  - (Optional) **Required reviewers:** Select team members
  - (Optional) **Wait timer:** 5 minutes
  - **Deployment branches:** Selected branches only → `main`

## Firebase Configuration

### 1. Create Firebase Service Account

This service account allows GitHub Actions to deploy to Firebase.

```bash
# 1. Go to Firebase Console
# https://console.firebase.google.com/project/ai-career-os-139db/settings/serviceaccounts/adminsdk

# 2. Click "Generate new private key"
# 3. Save the JSON file securely (you'll need it for GitHub Secrets)
# 4. NEVER commit this file to Git!
```

### 2. Generate Firebase CI Token

```bash
# Login to Firebase
firebase login:ci

# This will generate a token - save it securely
# Format: 1//abc123def456...
# You'll need this for FIREBASE_TOKEN secret
```

### 3. Configure Firebase Functions Environment Variables

```bash
# Set environment variables for Firebase Functions
firebase functions:config:set \
  openai.api_key="YOUR_OPENAI_API_KEY" \
  sendgrid.api_key="YOUR_SENDGRID_API_KEY" \
  --project ai-career-os-139db

# Verify configuration
firebase functions:config:get --project ai-career-os-139db
```

### 4. Enable Required Firebase Services

Ensure these are enabled in Firebase Console:

- ✓ Authentication (Email/Password, Google)
- ✓ Firestore Database
- ✓ Cloud Storage
- ✓ Cloud Functions
- ✓ Hosting
- ✓ Performance Monitoring (recommended)
- ✓ Analytics (recommended)

## GitHub Secrets Configuration

Go to **Repository Settings** → **Secrets and variables** → **Actions**

### Required Secrets

#### Firebase Deployment Secrets

1. **FIREBASE_SERVICE_ACCOUNT**
   - Type: Repository secret
   - Value: Contents of the service account JSON file from step 2.1
   - Format: Entire JSON object
   ```json
   {
     "type": "service_account",
     "project_id": "ai-career-os-139db",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "...",
     "client_id": "...",
     ...
   }
   ```

2. **FIREBASE_PROJECT_ID**
   - Type: Repository secret
   - Value: `ai-career-os-139db`

3. **FIREBASE_TOKEN**
   - Type: Repository secret
   - Value: Token from `firebase login:ci` command
   - Format: `1//abc123def456...`

#### Frontend Environment Variables

Get these from Firebase Console → Project Settings → Your apps → SDK setup and configuration

4. **VITE_FIREBASE_API_KEY**
   - Value: Your Firebase API key
   - Example: `AIzaSyA...`

5. **VITE_FIREBASE_AUTH_DOMAIN**
   - Value: `ai-career-os-139db.firebaseapp.com`

6. **VITE_FIREBASE_PROJECT_ID**
   - Value: `ai-career-os-139db`

7. **VITE_FIREBASE_STORAGE_BUCKET**
   - Value: `ai-career-os-139db.appspot.com`

8. **VITE_FIREBASE_MESSAGING_SENDER_ID**
   - Value: Your messaging sender ID
   - Example: `123456789012`

9. **VITE_FIREBASE_APP_ID**
   - Value: Your app ID
   - Example: `1:123456789012:web:abc123def456`

#### Third-Party API Keys

10. **OPENAI_API_KEY**
    - Value: Your OpenAI API key
    - Get from: https://platform.openai.com/api-keys
    - Format: `sk-proj-...`

11. **SENDGRID_API_KEY**
    - Value: Your SendGrid API key
    - Get from: https://app.sendgrid.com/settings/api_keys
    - Format: `SG.abc123...`

### Secret Validation Script

Run this script to verify all secrets are configured:

```bash
#!/bin/bash
# save as: verify-secrets.sh

echo "Checking GitHub Secrets Configuration..."
echo "========================================"
echo ""
echo "Required secrets:"
echo "- FIREBASE_SERVICE_ACCOUNT"
echo "- FIREBASE_PROJECT_ID"
echo "- FIREBASE_TOKEN"
echo "- VITE_FIREBASE_API_KEY"
echo "- VITE_FIREBASE_AUTH_DOMAIN"
echo "- VITE_FIREBASE_PROJECT_ID"
echo "- VITE_FIREBASE_STORAGE_BUCKET"
echo "- VITE_FIREBASE_MESSAGING_SENDER_ID"
echo "- VITE_FIREBASE_APP_ID"
echo "- OPENAI_API_KEY"
echo "- SENDGRID_API_KEY"
echo ""
echo "Go to: https://github.com/cffrank/jobmatchAI/settings/secrets/actions"
echo "Ensure all 11 secrets are configured."
echo ""
echo "To test locally, create .env.local with:"
echo "VITE_FIREBASE_API_KEY=your_key"
echo "VITE_FIREBASE_AUTH_DOMAIN=ai-career-os-139db.firebaseapp.com"
echo "# ... etc"
```

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/cffrank/jobmatchAI.git
cd jobmatchAI
```

### 2. Install Dependencies

```bash
# Frontend dependencies
npm ci

# Functions dependencies
cd functions
npm ci
cd ..
```

### 3. Configure Local Environment

Create `.env.local` file in project root:

```bash
# Frontend Environment Variables
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=ai-career-os-139db.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ai-career-os-139db
VITE_FIREBASE_STORAGE_BUCKET=ai-career-os-139db.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**IMPORTANT:** `.env.local` is gitignored. Never commit this file!

### 4. Set Up Firebase Emulators (Optional but Recommended)

```bash
# Install Firebase CLI tools
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize emulators (if not already done)
firebase init emulators

# Select:
# - Authentication Emulator
# - Functions Emulator
# - Firestore Emulator
# - Storage Emulator
# - Hosting Emulator

# Start emulators
firebase emulators:start
```

Update your `.env.local` to use emulators:

```bash
# Use emulators in development
VITE_USE_EMULATORS=true
```

### 5. Start Development Server

```bash
# Start Vite dev server
npm run dev

# In another terminal, start Firebase emulators
firebase emulators:start
```

Visit: http://localhost:5173

## Verification

### 1. Verify GitHub Actions Setup

Create a test branch and push:

```bash
git checkout -b test/ci-verification
echo "# CI Test" >> TEST.md
git add TEST.md
git commit -m "Test CI pipeline"
git push origin test/ci-verification
```

Create a PR and verify:
- [ ] CI pipeline runs automatically
- [ ] All jobs complete successfully
- [ ] Preview deployment is created
- [ ] Preview URL is commented on PR

### 2. Verify Secrets Configuration

Check GitHub Actions logs for any "secret not found" errors:

```bash
# Look for these patterns in failed jobs:
# "VITE_FIREBASE_API_KEY is not set"
# "Error: Unexpected input(s) 'firebaseServiceAccount'"
```

### 3. Test Local Build

```bash
# Build frontend
npm run build

# Verify dist/ directory is created
ls -la dist/

# Test functions locally
cd functions
npm run serve
```

### 4. Test Deployment (Manual)

```bash
# Deploy to preview channel
firebase hosting:channel:deploy test-channel \
  --project ai-career-os-139db \
  --expires 1d

# Visit the preview URL provided
# Test functionality
# Delete the channel when done:
firebase hosting:channel:delete test-channel --project ai-career-os-139db
```

### 5. Verify Firebase Configuration

```bash
# Check current project
firebase projects:list
firebase use --project ai-career-os-139db

# Verify hosting config
firebase hosting:channel:list

# Verify functions
firebase functions:list

# Check security rules
firebase firestore:rules:get
```

## Common Setup Issues

### Issue: "Permission denied" when deploying

**Solution:** Check Firebase IAM permissions for service account

1. Go to Google Cloud Console: https://console.cloud.google.com/iam-admin/iam?project=ai-career-os-139db
2. Find your service account
3. Ensure it has these roles:
   - Firebase Admin
   - Cloud Functions Admin
   - Service Account User

### Issue: GitHub Actions can't comment on PRs

**Solution:** Update workflow permissions

1. Settings → Actions → General
2. Workflow permissions → Read and write permissions
3. ✓ Allow GitHub Actions to create and approve pull requests

### Issue: Environment variables not loading in build

**Solution:** Ensure variables are prefixed with `VITE_`

Only variables starting with `VITE_` are exposed to client code by Vite.

### Issue: Firebase CLI commands fail with "project not found"

**Solution:** Verify project ID and authentication

```bash
# Check logged-in account
firebase login:list

# Switch project
firebase use ai-career-os-139db

# Verify access
firebase projects:list
```

## Security Best Practices

### Secrets Management

1. **Never commit secrets to Git**
   - Always use `.env.local` for local development
   - Use GitHub Secrets for CI/CD
   - Use Firebase Functions config for backend secrets

2. **Rotate secrets regularly**
   - Rotate API keys every 90 days
   - Regenerate service accounts annually
   - Update Firebase tokens if compromised

3. **Principle of Least Privilege**
   - Service accounts should have minimal required permissions
   - Separate dev/staging/prod environments if possible
   - Limit who can access GitHub Secrets

4. **Audit access**
   - Review who has repository admin access
   - Monitor Firebase Console access logs
   - Review GitHub Actions logs regularly

### Environment Variables Checklist

- [ ] All secrets stored in GitHub Secrets
- [ ] No secrets in `.env.example`
- [ ] `.env.local` in `.gitignore`
- [ ] Client variables prefixed with `VITE_`
- [ ] Backend secrets in Firebase Functions config
- [ ] API keys restricted by domain/IP when possible

## Maintenance

### Monthly Tasks

- [ ] Review dependency updates: `npm outdated`
- [ ] Check for security vulnerabilities: `npm audit`
- [ ] Review GitHub Actions usage and costs
- [ ] Review Firebase usage and costs
- [ ] Update documentation if needed

### Quarterly Tasks

- [ ] Rotate API keys
- [ ] Review and update Firebase security rules
- [ ] Review IAM permissions
- [ ] Audit access logs
- [ ] Performance review and optimization

### Annually

- [ ] Regenerate Firebase service accounts
- [ ] Comprehensive security audit
- [ ] Review and update CI/CD pipeline
- [ ] Update Node.js version
- [ ] Review Firebase project settings

## Support

### Documentation
- [CI/CD Architecture](./CI-CD-ARCHITECTURE.md)
- [Deployment Runbook](./DEPLOYMENT-RUNBOOK.md)
- [Firebase Documentation](https://firebase.google.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

### Troubleshooting
- Check GitHub Actions logs
- Review Firebase Console for errors
- Consult deployment runbook for common issues
- Check Firebase status: https://status.firebase.google.com

### Getting Help
1. Check documentation first
2. Search GitHub Issues
3. Review Firebase Stack Overflow
4. Contact DevOps team

---

**Document Version:** 1.0
**Last Updated:** 2025-12-19
**Next Review:** 2026-01-19
