# GitHub Actions Secrets Configuration

This guide explains how to configure all required secrets for the JobMatch AI deployment pipeline.

## Table of Contents

1. [Overview](#overview)
2. [Required Secrets](#required-secrets)
3. [Obtaining Secret Values](#obtaining-secret-values)
4. [Adding Secrets to GitHub](#adding-secrets-to-github)
5. [Verifying Configuration](#verifying-configuration)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)

## Overview

GitHub Actions secrets are encrypted environment variables used during CI/CD workflows. They protect sensitive credentials like API keys and service account files.

**Never commit secrets to your repository.** Always use GitHub Secrets or environment variables.

## Required Secrets

### Firebase Frontend Configuration

These secrets are used to build the Vite frontend application:

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key | `AIzaSyBX...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `ai-career-os-139db.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `ai-career-os-139db` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket | `ai-career-os-139db.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID | `123456789012` |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | `1:123456789012:web:abc123` |

### Firebase Deployment Configuration

| Secret Name | Description | Format |
|------------|-------------|--------|
| `FIREBASE_SERVICE_ACCOUNT` | Service account JSON key | Complete JSON object |

## Obtaining Secret Values

### Firebase Configuration Values

1. **Go to Firebase Console**:
   - Navigate to https://console.firebase.google.com
   - Select your project (`ai-career-os-139db`)

2. **Access Project Settings**:
   - Click gear icon (⚙️) next to "Project Overview"
   - Select "Project settings"

3. **Find Web App Configuration**:
   - Scroll to "Your apps" section
   - Click on the web app (</> icon)
   - Click "Config" radio button
   - Copy the configuration values

4. **Configuration object looks like**:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyBX...",              // VITE_FIREBASE_API_KEY
     authDomain: "PROJECT.firebaseapp.com", // VITE_FIREBASE_AUTH_DOMAIN
     projectId: "PROJECT",                  // VITE_FIREBASE_PROJECT_ID
     storageBucket: "PROJECT.appspot.com",  // VITE_FIREBASE_STORAGE_BUCKET
     messagingSenderId: "123456789012",     // VITE_FIREBASE_MESSAGING_SENDER_ID
     appId: "1:123...:web:abc..."          // VITE_FIREBASE_APP_ID
   };
   ```

### Firebase Service Account

The service account is used for Firebase CLI authentication during deployment.

#### Method 1: Using Firebase Console (Recommended)

1. **Go to Firebase Console**:
   - Navigate to Project Settings
   - Click "Service accounts" tab

2. **Generate New Key**:
   - Click "Generate new private key"
   - Confirm by clicking "Generate key"
   - Save the downloaded JSON file securely
   - **IMPORTANT**: Never commit this file to git

3. **Copy JSON contents**:
   - Open the downloaded JSON file
   - Copy the entire contents
   - This will be the value for `FIREBASE_SERVICE_ACCOUNT`

#### Method 2: Using Google Cloud Console

1. **Go to Google Cloud Console**:
   - Navigate to https://console.cloud.google.com
   - Select your Firebase project

2. **Access IAM & Admin**:
   - Go to "IAM & Admin" > "Service Accounts"

3. **Create Service Account** (if needed):
   - Click "Create Service Account"
   - Name: `github-actions-deploy`
   - Role: `Firebase Admin`
   - Click "Done"

4. **Create Key**:
   - Click on the service account email
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Select "JSON"
   - Click "Create"
   - Save the JSON file securely

#### Service Account Permissions

Ensure the service account has these roles:

- **Firebase Admin** or these individual roles:
  - Cloud Functions Developer
  - Firebase Hosting Admin
  - Cloud Datastore Owner (for Firestore)
  - Storage Admin
  - Service Account User

## Adding Secrets to GitHub

### Via GitHub Web Interface

1. **Navigate to Repository Settings**:
   - Go to your GitHub repository
   - Click "Settings" tab
   - Click "Secrets and variables" > "Actions"

2. **Add New Secret**:
   - Click "New repository secret"
   - Enter secret name (exactly as shown in table above)
   - Paste secret value
   - Click "Add secret"

3. **Repeat for all secrets**:
   - Add each secret from the tables above
   - Double-check names match exactly

### Via GitHub CLI

```bash
# Authenticate with GitHub CLI
gh auth login

# Add secrets (replace values with actual secrets)
gh secret set VITE_FIREBASE_API_KEY --body "AIzaSyBX..."
gh secret set VITE_FIREBASE_AUTH_DOMAIN --body "ai-career-os-139db.firebaseapp.com"
gh secret set VITE_FIREBASE_PROJECT_ID --body "ai-career-os-139db"
gh secret set VITE_FIREBASE_STORAGE_BUCKET --body "ai-career-os-139db.appspot.com"
gh secret set VITE_FIREBASE_MESSAGING_SENDER_ID --body "123456789012"
gh secret set VITE_FIREBASE_APP_ID --body "1:123456789012:web:abc123"

# Add service account from file
gh secret set FIREBASE_SERVICE_ACCOUNT < path/to/service-account.json
```

### Quick Setup Script

Save as `setup-secrets.sh` and run locally (never commit this file):

```bash
#!/bin/bash

# Firebase configuration
export VITE_FIREBASE_API_KEY="AIzaSyBX..."
export VITE_FIREBASE_AUTH_DOMAIN="ai-career-os-139db.firebaseapp.com"
export VITE_FIREBASE_PROJECT_ID="ai-career-os-139db"
export VITE_FIREBASE_STORAGE_BUCKET="ai-career-os-139db.appspot.com"
export VITE_FIREBASE_MESSAGING_SENDER_ID="123456789012"
export VITE_FIREBASE_APP_ID="1:123456789012:web:abc123"

# Add secrets to GitHub
gh secret set VITE_FIREBASE_API_KEY --body "$VITE_FIREBASE_API_KEY"
gh secret set VITE_FIREBASE_AUTH_DOMAIN --body "$VITE_FIREBASE_AUTH_DOMAIN"
gh secret set VITE_FIREBASE_PROJECT_ID --body "$VITE_FIREBASE_PROJECT_ID"
gh secret set VITE_FIREBASE_STORAGE_BUCKET --body "$VITE_FIREBASE_STORAGE_BUCKET"
gh secret set VITE_FIREBASE_MESSAGING_SENDER_ID --body "$VITE_FIREBASE_MESSAGING_SENDER_ID"
gh secret set VITE_FIREBASE_APP_ID --body "$VITE_FIREBASE_APP_ID"

# Service account (adjust path)
gh secret set FIREBASE_SERVICE_ACCOUNT < ./service-account.json

echo "All secrets configured successfully!"
```

Run with:
```bash
chmod +x setup-secrets.sh
./setup-secrets.sh
rm setup-secrets.sh  # Delete after use
```

## Verifying Configuration

### Check Secrets Are Set

1. **Via GitHub Web**:
   - Go to Settings > Secrets and variables > Actions
   - Verify all 7 secrets are listed
   - You can't view values, only names

2. **Via GitHub CLI**:
   ```bash
   gh secret list
   ```

   Expected output:
   ```
   FIREBASE_SERVICE_ACCOUNT           Updated 2025-12-20
   VITE_FIREBASE_API_KEY              Updated 2025-12-20
   VITE_FIREBASE_APP_ID               Updated 2025-12-20
   VITE_FIREBASE_AUTH_DOMAIN          Updated 2025-12-20
   VITE_FIREBASE_MESSAGING_SENDER_ID  Updated 2025-12-20
   VITE_FIREBASE_PROJECT_ID           Updated 2025-12-20
   VITE_FIREBASE_STORAGE_BUCKET       Updated 2025-12-20
   ```

### Test Deployment

1. **Trigger Manual Workflow**:
   - Go to Actions tab
   - Select "Deploy to Firebase"
   - Click "Run workflow"
   - Select `main` branch
   - Click "Run workflow"

2. **Monitor for Errors**:
   - Watch for secret-related errors
   - Check build logs for missing variables

3. **Verify Build**:
   - Ensure frontend builds successfully
   - Check no "undefined" in config
   - Verify deployment completes

## Security Best Practices

### Secret Rotation

Rotate secrets regularly:

1. **Firebase API Keys**:
   - Rotate every 90 days
   - Can be done in Firebase Console > Project Settings

2. **Service Account Keys**:
   - Rotate every 90 days
   - Delete old keys after rotation
   - Test new key before deleting old one

### Access Control

1. **Limit Repository Access**:
   - Only grant write access to trusted team members
   - Use branch protection rules

2. **Service Account Permissions**:
   - Use least privilege principle
   - Only grant necessary Firebase roles
   - Regular audit of permissions

3. **Audit Secret Usage**:
   - Review workflow runs regularly
   - Check for unusual secret access
   - Monitor GitHub audit log

### Handling Compromised Secrets

If a secret is compromised:

1. **Immediately Revoke**:
   ```bash
   # Firebase service account
   gcloud iam service-accounts keys delete KEY_ID \
     --iam-account=SERVICE_ACCOUNT_EMAIL

   # Firebase API key
   # Go to Firebase Console > Project Settings > General
   # Delete and regenerate app configuration
   ```

2. **Generate New Secret**:
   - Follow steps in "Obtaining Secret Values"
   - Generate fresh credentials

3. **Update GitHub Secret**:
   ```bash
   gh secret set SECRET_NAME --body "NEW_VALUE"
   ```

4. **Verify Deployment**:
   - Trigger test deployment
   - Ensure new credentials work

5. **Audit Impact**:
   - Check Firebase usage logs
   - Review authentication logs
   - Assess potential data exposure

### Secret Storage

- **Never commit secrets to git**
- **Don't log secret values** in workflows
- **Don't echo secrets** in shell commands
- **Store service account JSON securely** offline
- **Use password manager** for local storage
- **Delete local copies** after uploading to GitHub

## Troubleshooting

### Build Fails: "Cannot find module 'firebase/app'"

**Cause**: Frontend build is missing Firebase configuration.

**Solution**:
1. Verify all `VITE_FIREBASE_*` secrets are set
2. Check secret names match exactly (case-sensitive)
3. Trigger new workflow run

### Deployment Fails: "Invalid service account"

**Cause**: `FIREBASE_SERVICE_ACCOUNT` is invalid or malformed.

**Solution**:
1. Download fresh service account JSON
2. Verify JSON is valid:
   ```bash
   cat service-account.json | jq .
   ```
3. Re-upload to GitHub:
   ```bash
   gh secret set FIREBASE_SERVICE_ACCOUNT < service-account.json
   ```

### Deployment Fails: "Permission denied"

**Cause**: Service account lacks necessary permissions.

**Solution**:
1. Go to Google Cloud Console > IAM & Admin
2. Find service account
3. Add missing roles (see "Service Account Permissions")
4. Wait 1-2 minutes for propagation
5. Retry deployment

### Frontend Shows "Firebase: Error (auth/invalid-api-key)"

**Cause**: `VITE_FIREBASE_API_KEY` is incorrect.

**Solution**:
1. Go to Firebase Console > Project Settings
2. Copy correct API key
3. Update secret:
   ```bash
   gh secret set VITE_FIREBASE_API_KEY --body "CORRECT_KEY"
   ```
4. Trigger new deployment

### Can't See Secret Values

**Expected**: GitHub never shows secret values after creation.

**Solution**:
- This is normal security behavior
- To verify, trigger a test deployment
- Check workflow logs for proper variable replacement
- Secret values are masked in logs

## Additional Resources

- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

## Secret Checklist

Before deploying, verify:

- [ ] All 7 secrets are configured in GitHub
- [ ] Service account JSON is valid
- [ ] Service account has required permissions
- [ ] Firebase configuration values are correct
- [ ] Secrets are not committed to git
- [ ] Local service account file is stored securely
- [ ] Old/unused service account keys are deleted

---

**Last Updated**: 2025-12-20
**Document Owner**: DevOps Team
**Review Frequency**: When secrets are rotated
