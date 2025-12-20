# Firebase Functions Secrets Management

This guide explains how to configure and manage secrets for Cloud Functions in the JobMatch AI application.

## Table of Contents

1. [Overview](#overview)
2. [Required Secrets](#required-secrets)
3. [Setting Up Secrets](#setting-up-secrets)
4. [Using Secrets in Functions](#using-secrets-in-functions)
5. [Secret Rotation](#secret-rotation)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

## Overview

Firebase Functions uses Google Secret Manager to securely store sensitive credentials like API keys. Secrets are encrypted at rest and only accessible by authorized functions.

**Key Benefits**:
- Secrets never stored in code
- Automatic encryption
- Fine-grained access control
- Audit logging
- Version management

## Required Secrets

JobMatch AI requires the following secrets for Cloud Functions:

| Secret Name | Description | Used By | Required |
|------------|-------------|---------|----------|
| `SENDGRID_API_KEY` | SendGrid email API key | `sendApplicationEmail` | Yes |
| `OPENAI_API_KEY` | OpenAI API key | AI features | Yes |
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth client ID | `linkedInAuth`, `linkedInCallback` | Yes |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth secret | `linkedInCallback` | Yes |

## Setting Up Secrets

### Prerequisites

1. **Firebase CLI installed**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Authenticated to Firebase**:
   ```bash
   firebase login
   ```

3. **Project selected**:
   ```bash
   firebase use ai-career-os-139db
   ```

### Method 1: Interactive Setup (Recommended)

This method prompts you for each secret value:

```bash
# Navigate to project root
cd /path/to/jobmatch-ai

# Set SendGrid API key
firebase functions:secrets:set SENDGRID_API_KEY
# When prompted, paste your SendGrid API key (starts with SG.)

# Set OpenAI API key
firebase functions:secrets:set OPENAI_API_KEY
# When prompted, paste your OpenAI API key (starts with sk-proj-)

# Set LinkedIn OAuth credentials
firebase functions:secrets:set LINKEDIN_CLIENT_ID
# When prompted, paste your LinkedIn client ID

firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
# When prompted, paste your LinkedIn client secret
```

### Method 2: From File

If you have secrets in files (useful for automation):

```bash
# From file content
cat sendgrid-key.txt | firebase functions:secrets:set SENDGRID_API_KEY

# Or specify directly
echo "SG.your-key-here" | firebase functions:secrets:set SENDGRID_API_KEY
```

### Method 3: Inline (Less Secure)

```bash
firebase functions:secrets:set SENDGRID_API_KEY --data-file <(echo "SG.your-key-here")
```

**Warning**: This method may leave secrets in shell history. Use Method 1 for production.

### Verifying Secrets

List all configured secrets:

```bash
firebase functions:secrets:access --all
```

Check if a specific secret exists:

```bash
firebase functions:secrets:access SENDGRID_API_KEY --version latest
```

## Obtaining Secret Values

### SendGrid API Key

1. **Log in to SendGrid**:
   - Go to https://app.sendgrid.com
   - Log in with your account

2. **Create API Key**:
   - Navigate to Settings > API Keys
   - Click "Create API Key"
   - Name: `JobMatch AI Production`
   - Permission Level: Select "Full Access" or "Restricted Access"
     - If Restricted: Enable "Mail Send" permission
   - Click "Create & View"
   - **Copy the API key immediately** (shown only once)

3. **Set in Firebase**:
   ```bash
   firebase functions:secrets:set SENDGRID_API_KEY
   # Paste the key starting with SG.
   ```

**Key format**: `SG.xxxxxxxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`

### OpenAI API Key

1. **Log in to OpenAI**:
   - Go to https://platform.openai.com
   - Log in or create account

2. **Create API Key**:
   - Navigate to API Keys section
   - Click "Create new secret key"
   - Name: `JobMatch AI Production`
   - Copy the key immediately

3. **Set in Firebase**:
   ```bash
   firebase functions:secrets:set OPENAI_API_KEY
   # Paste the key starting with sk-proj-
   ```

**Key format**: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### LinkedIn OAuth Credentials

1. **Log in to LinkedIn Developers**:
   - Go to https://www.linkedin.com/developers/apps
   - Log in with LinkedIn account

2. **Create or Select App**:
   - Click "Create app" or select existing app
   - Fill in app details if creating new

3. **Get Credentials**:
   - Go to "Auth" tab
   - Copy "Client ID"
   - Copy "Client Secret"

4. **Configure Redirect URL**:
   - Add redirect URL: `https://us-central1-ai-career-os-139db.cloudfunctions.net/linkedInCallback`
   - Save changes

5. **Set in Firebase**:
   ```bash
   firebase functions:secrets:set LINKEDIN_CLIENT_ID
   # Paste client ID

   firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
   # Paste client secret
   ```

## Using Secrets in Functions

### Declaring Secret Dependencies

In your function definition, specify which secrets are needed:

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

// Define secrets
const sendgridApiKey = defineSecret('SENDGRID_API_KEY');
const openaiApiKey = defineSecret('OPENAI_API_KEY');

// Use in function
export const sendEmail = onRequest(
  {
    secrets: [sendgridApiKey], // Declare secret dependency
  },
  async (req, res) => {
    const apiKey = sendgridApiKey.value(); // Access secret value

    // Use the API key
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(apiKey);

    // ... rest of function
  }
);
```

### Accessing Multiple Secrets

```typescript
const linkedInClientId = defineSecret('LINKEDIN_CLIENT_ID');
const linkedInClientSecret = defineSecret('LINKEDIN_CLIENT_SECRET');

export const linkedInAuth = onRequest(
  {
    secrets: [linkedInClientId, linkedInClientSecret],
  },
  async (req, res) => {
    const clientId = linkedInClientId.value();
    const clientSecret = linkedInClientSecret.value();

    // Use credentials for OAuth
  }
);
```

### Current Implementation

In `functions/src/index.ts`, secrets are already configured:

```typescript
// Secrets are defined at the top
const sendgridApiKey = defineSecret('SENDGRID_API_KEY');
const openaiApiKey = defineSecret('OPENAI_API_KEY');
const linkedinClientId = defineSecret('LINKEDIN_CLIENT_ID');
const linkedinClientSecret = defineSecret('LINKEDIN_CLIENT_SECRET');

// Functions declare their dependencies
export const sendApplicationEmail = onCall(
  {
    secrets: [sendgridApiKey],
  },
  async (request) => {
    const apiKey = sendgridApiKey.value();
    // ... implementation
  }
);
```

## Secret Rotation

### When to Rotate

Rotate secrets:
- Every 90 days (recommended)
- When employee with access leaves
- After suspected compromise
- After security incident

### Rotation Process

1. **Create New Secret Value**:
   - Generate new API key in service (SendGrid, OpenAI, etc.)
   - Keep old key active temporarily

2. **Update Firebase Secret**:
   ```bash
   firebase functions:secrets:set SENDGRID_API_KEY
   # Enter new API key
   ```

3. **Deploy Functions**:
   ```bash
   cd functions
   npm run build
   cd ..
   firebase deploy --only functions
   ```

4. **Verify New Secret Works**:
   - Test affected functions
   - Check Firebase logs for errors
   - Verify email sending, OAuth, etc.

5. **Revoke Old Secret**:
   - Delete old API key from service
   - Monitor for errors
   - Rollback if issues occur

### Zero-Downtime Rotation

For critical services:

1. Both old and new keys work during transition
2. Deploy function with new secret
3. Verify function works with new secret
4. Revoke old secret only after verification

## Troubleshooting

### Error: "Secret SENDGRID_API_KEY is not accessible"

**Cause**: Secret not set or functions not granted access.

**Solution**:
```bash
# Set the secret
firebase functions:secrets:set SENDGRID_API_KEY

# Redeploy functions
firebase deploy --only functions
```

### Error: "Invalid API key"

**Cause**: Secret value is incorrect or expired.

**Solution**:
1. Generate new API key from service
2. Update secret:
   ```bash
   firebase functions:secrets:set SENDGRID_API_KEY
   ```
3. Redeploy functions

### Functions Not Using Latest Secret

**Cause**: Functions need to be redeployed after secret update.

**Solution**:
```bash
firebase deploy --only functions
```

### Cannot Access Secrets Locally

**Cause**: Local development needs different setup.

**Solution**:

For local development, use `.env` file (already in `.gitignore`):

```bash
# In functions/ directory
cp .env.example .env

# Edit .env with actual values
SENDGRID_API_KEY=SG.your-key-here
OPENAI_API_KEY=sk-proj-your-key-here
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret
```

Then run emulators:
```bash
firebase emulators:start
```

### Secret Not Appearing in Logs

**Expected**: Secret values are automatically redacted from logs.

**Solution**: This is correct security behavior. Secrets should never appear in logs.

### Permission Denied Setting Secret

**Cause**: Insufficient permissions.

**Solution**:
1. Verify you're logged in:
   ```bash
   firebase login
   ```
2. Check project permissions:
   - You need "Firebase Admin" or "Secret Manager Admin" role
   - Contact project owner to grant access

## Best Practices

### Security

1. **Never commit secrets to git**:
   - Use `.gitignore` for `.env` files
   - Use Firebase Secrets for production
   - Use environment variables for development

2. **Use least privilege**:
   - Grant functions only necessary secrets
   - Don't share secrets across unrelated functions

3. **Rotate regularly**:
   - Set calendar reminders for 90-day rotation
   - Document rotation dates

4. **Monitor usage**:
   - Check Cloud Functions logs regularly
   - Set up alerts for authentication failures
   - Monitor API usage in service dashboards

### Development

1. **Local vs Production**:
   ```
   Local:       Use .env file (never commit)
   Production:  Use Firebase Secrets
   ```

2. **Testing**:
   - Use separate API keys for development
   - Use SendGrid sandbox mode for testing
   - Use OpenAI with lower rate limits

3. **Documentation**:
   - Document which functions use which secrets
   - Note any special configuration
   - Keep this guide updated

### Deployment

1. **Verify before deploy**:
   ```bash
   # Check secrets exist
   firebase functions:secrets:access --all

   # Build locally first
   cd functions
   npm run build
   ```

2. **Monitor after deploy**:
   - Watch function logs
   - Check error rates
   - Verify secret-dependent features work

3. **Rollback plan**:
   - Keep old secret versions accessible
   - Know how to quickly switch back
   - Test rollback procedure

## Secret Lifecycle

```
1. CREATE
   ├─ Obtain from service (SendGrid, OpenAI, etc.)
   └─ Set in Firebase: firebase functions:secrets:set

2. USE
   ├─ Define in function code: defineSecret()
   ├─ Declare dependency: secrets: [secretName]
   └─ Access value: secretName.value()

3. ROTATE (every 90 days)
   ├─ Create new key in service
   ├─ Update Firebase secret
   ├─ Deploy functions
   ├─ Verify functionality
   └─ Revoke old key

4. REVOKE
   ├─ Delete from service
   ├─ (Optional) Delete from Firebase
   └─ Deploy if needed
```

## Quick Reference

### Common Commands

```bash
# List all secrets
firebase functions:secrets:access --all

# Set a secret
firebase functions:secrets:set SECRET_NAME

# View secret metadata (not value)
firebase functions:secrets:describe SECRET_NAME

# Delete a secret
firebase functions:secrets:destroy SECRET_NAME

# Update a secret
firebase functions:secrets:set SECRET_NAME
```

### Required Secrets Checklist

Before deploying to production:

- [ ] `SENDGRID_API_KEY` set and verified
- [ ] `OPENAI_API_KEY` set and verified
- [ ] `LINKEDIN_CLIENT_ID` set and verified
- [ ] `LINKEDIN_CLIENT_SECRET` set and verified
- [ ] All secrets tested in local emulator
- [ ] Deployment successful with secrets
- [ ] Functions using secrets are working
- [ ] Secrets documented in team wiki

## Additional Resources

- [Firebase Functions Secrets Documentation](https://firebase.google.com/docs/functions/config-env#secret-manager)
- [Google Secret Manager](https://cloud.google.com/secret-manager/docs)
- [SendGrid API Keys](https://docs.sendgrid.com/ui/account-and-settings/api-keys)
- [OpenAI API Keys](https://platform.openai.com/docs/api-reference/authentication)
- [LinkedIn OAuth](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication)

---

**Last Updated**: 2025-12-20
**Document Owner**: Backend Team
**Review Frequency**: When secrets are added or rotated
