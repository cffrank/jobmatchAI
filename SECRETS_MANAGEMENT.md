# Secrets Management Guide

This document provides comprehensive guidance on managing secrets securely in the JobMatch AI application.

## Table of Contents

1. [Overview](#overview)
2. [Never Commit Secrets](#never-commit-secrets)
3. [Frontend Secrets (Vite)](#frontend-secrets-vite)
4. [Backend Secrets (Firebase Functions)](#backend-secrets-firebase-functions)
5. [CI/CD Secrets (GitHub Actions)](#cicd-secrets-github-actions)
6. [Local Development Setup](#local-development-setup)
7. [Secret Rotation](#secret-rotation)
8. [Security Best Practices](#security-best-practices)

---

## Overview

**CRITICAL SECURITY PRINCIPLE**: Never commit secrets to version control.

Secrets include:
- API keys (Firebase, OpenAI, etc.)
- Service account credentials
- Private keys and certificates
- Database passwords
- OAuth client secrets
- Session secrets
- Any credential that grants access to resources

---

## Never Commit Secrets

### Protected by .gitignore

The following patterns are automatically ignored:

```
.env*
*.backup
*service-account*.json
*-adminsdk-*.json
*secrets*.txt
*credentials*.txt
```

### Pre-commit Hooks

Pre-commit hooks automatically scan for:
- Firebase API keys
- OpenAI API keys
- GitHub tokens
- AWS credentials
- Private keys
- Forbidden files

**Installation**:
```bash
npm run prepare
# or
./scripts/install-pre-commit-hooks.sh
```

---

## Frontend Secrets (Vite)

### Environment Variables

Vite exposes environment variables to the frontend using the `VITE_` prefix.

**⚠️ IMPORTANT**: Frontend environment variables are PUBLIC. They are bundled into the client-side JavaScript and can be read by anyone.

### What to Store in Frontend

**✅ Safe to expose**:
- Firebase configuration (API key, project ID, etc.)
- Public API endpoints
- Feature flags
- Analytics IDs (Google Analytics, etc.)

**❌ Never expose**:
- Service account keys
- Admin credentials
- Backend API secrets
- Database passwords

### Setup

1. **Create `.env.local`** (not committed to git):

```bash
# Firebase Configuration (PUBLIC - but should be restricted in console)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890

# Firebase App Check (reCAPTCHA site key - PUBLIC)
VITE_FIREBASE_APP_CHECK_SITE_KEY=6LeXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

2. **Access in Code**:

```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
```

3. **Security Measures**:

Even though Firebase API keys are public, you should:
- Enable Firebase App Check
- Restrict API keys in Google Cloud Console
- Use Firebase Security Rules
- Monitor usage for anomalies

### Firebase API Key Restrictions

1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your API key
3. Under "Application restrictions":
   - Add your production domains
   - Add localhost for development
4. Under "API restrictions":
   - Restrict to only required APIs:
     - Identity Toolkit API
     - Firebase Authentication API
     - Cloud Firestore API
     - Cloud Storage API

---

## Backend Secrets (Firebase Functions)

### Firebase Functions Secrets Manager

Firebase Functions provides a secure secrets manager for backend secrets.

**✅ Use for**:
- OpenAI API keys
- Third-party API credentials
- Webhook secrets
- Service-to-service authentication tokens
- Any secret that should NEVER be exposed to clients

### Setup

1. **Set a Secret**:

```bash
cd functions
firebase functions:secrets:set OPENAI_API_KEY
# Paste the secret when prompted
```

2. **List Secrets**:

```bash
firebase functions:secrets:access
```

3. **Update a Secret**:

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

4. **Delete a Secret**:

```bash
firebase functions:secrets:destroy OPENAI_API_KEY
```

### Access in Functions

**Method 1: Environment Variables** (Recommended)

```typescript
import { defineSecret } from 'firebase-functions/params';

// Define the secret
const openaiApiKey = defineSecret('OPENAI_API_KEY');

// Use in function
export const myFunction = onRequest(
  { secrets: [openaiApiKey] },
  async (req, res) => {
    const apiKey = openaiApiKey.value();
    // Use the API key
  }
);
```

**Method 2: Direct Access**

```typescript
import { onRequest } from 'firebase-functions/v2/https';

export const myFunction = onRequest(async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  // Use the API key
});
```

### Local Development

For local testing, create `functions/.env` (not committed):

```bash
OPENAI_API_KEY=sk-proj-your-key-here
```

Then run:
```bash
firebase functions:shell
# or
npm run serve
```

---

## CI/CD Secrets (GitHub Actions)

### GitHub Repository Secrets

Store secrets used in GitHub Actions workflows.

### Setup

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Click "New repository secret"
3. Add each secret

### Required Secrets

```
FIREBASE_SERVICE_ACCOUNT
  - Full service account JSON
  - Used for Firebase deployment

VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
  - Firebase configuration for builds
```

### Access in Workflows

```yaml
- name: Deploy to Firebase
  env:
    FIREBASE_TOKEN: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
    VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
  run: |
    npm run build
    firebase deploy
```

---

## Local Development Setup

### Initial Setup

1. **Copy Example Environment File**:

```bash
cp .env.example .env.local
```

2. **Fill in Firebase Configuration**:

Get values from: https://console.firebase.google.com/project/YOUR_PROJECT/settings/general

```bash
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123
```

3. **Set Firebase Functions Secrets**:

```bash
cd functions
firebase functions:secrets:set OPENAI_API_KEY
# Paste your OpenAI API key
```

4. **Verify Setup**:

```bash
npm run dev
```

### Team Member Onboarding

New team members should:

1. Request access to Firebase project
2. Get `.env.local` template (not the actual file)
3. Fill in their own Firebase configuration
4. Set up Firebase Functions secrets locally
5. Never share `.env.local` files directly

---

## Secret Rotation

When a secret is compromised or needs rotation:

### 1. Revoke Old Secret

- **Firebase API Key**: Restrict in Cloud Console (don't delete - it's tied to your app)
- **OpenAI API Key**: Revoke in OpenAI dashboard
- **GitHub Token**: Revoke in GitHub settings

### 2. Generate New Secret

Create a new credential in the respective service.

### 3. Update All Locations

- [ ] Local `.env.local`
- [ ] Firebase Functions secrets (`firebase functions:secrets:set`)
- [ ] GitHub repository secrets
- [ ] CI/CD environment variables
- [ ] Production environment

### 4. Deploy Changes

```bash
# Update functions with new secret
cd functions
firebase deploy --only functions

# Verify application works
# Monitor for errors
```

### 5. Monitor

Watch for:
- Failed API calls with old credentials
- Unexpected 401/403 errors
- Unusual API usage patterns

### Rotation Schedule

**Recommended**:
- API keys: Every 90 days
- Service accounts: Every 6 months
- After team member departure: Immediately
- After suspected compromise: Immediately

---

## Security Best Practices

### 1. Principle of Least Privilege

Grant only the minimum permissions needed:
- Use separate API keys for dev/staging/production
- Limit Firebase service account roles
- Use Firebase App Check for client API security

### 2. Never Log Secrets

```typescript
// ❌ BAD
console.log('API Key:', process.env.API_KEY);

// ✅ GOOD
console.log('API Key configured:', !!process.env.API_KEY);
```

### 3. Use Secret Management Tools

- **Local**: Environment variables
- **Backend**: Firebase Functions Secrets
- **CI/CD**: GitHub Secrets
- **Production**: Firebase/Cloud Secrets Manager

### 4. Audit Access

Regularly review:
- Who has access to Firebase project
- GitHub repository collaborators
- Service account key usage
- API usage logs

### 5. Enable Monitoring

Set up alerts for:
- Unusual API usage patterns
- High API costs
- Failed authentication attempts
- Rate limit violations

### 6. Secure Communication

- Use HTTPS for all API calls
- Enable Firebase App Check
- Implement proper CORS policies
- Use secure WebSocket connections

### 7. Code Review

Before merging:
- Check for hardcoded secrets
- Verify `.gitignore` patterns
- Ensure pre-commit hooks pass
- Review environment variable usage

### 8. Incident Response Plan

If secrets are leaked:

1. **Immediate** (within 1 hour):
   - Revoke compromised credentials
   - Generate new credentials
   - Update production configuration

2. **Short-term** (within 24 hours):
   - Remove secrets from git history
   - Analyze impact and access logs
   - Update all affected systems

3. **Follow-up** (within 1 week):
   - Document incident
   - Update security procedures
   - Team security training
   - Implement additional safeguards

---

## Verification Checklist

Use this checklist to verify secure secrets management:

### Development

- [ ] `.env.local` exists and is in `.gitignore`
- [ ] No secrets in committed code
- [ ] Pre-commit hooks installed and working
- [ ] All scripts use environment variables
- [ ] No hardcoded credentials

### Firebase Functions

- [ ] Secrets set using `firebase functions:secrets:set`
- [ ] No secrets in functions code
- [ ] Local `.env` file in `.gitignore`
- [ ] Secrets properly accessed in functions

### CI/CD

- [ ] All required secrets configured in GitHub
- [ ] Workflows use secrets properly
- [ ] No secrets in workflow logs
- [ ] Service account has minimal permissions

### Monitoring

- [ ] API usage monitoring enabled
- [ ] Cost alerts configured
- [ ] Error tracking for authentication failures
- [ ] Regular access audits scheduled

---

## Resources

- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/basics)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_CheatSheet.html)
- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

---

## Support

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Contact the security team immediately
3. Email: security@yourcompany.com (replace with actual contact)
4. Provide details of the vulnerability
5. Allow time for remediation before disclosure

---

**Remember**: Security is everyone's responsibility. When in doubt, ask for a security review.
