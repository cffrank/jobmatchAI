# Firebase Functions Environment Configuration

This document explains how to configure environment variables and secrets for Firebase Cloud Functions in the JobMatch AI application.

---

## Overview

Firebase Functions (2nd generation) uses **Google Cloud Secret Manager** for sensitive environment variables like API keys and credentials. This is more secure than the legacy `firebase functions:config` approach.

**Key Concepts:**
- **Secrets** are stored in Google Cloud Secret Manager
- Functions reference secrets in their configuration
- Secrets are injected at runtime as environment variables
- Secrets are never stored in code or version control

---

## Required Secrets

### Production Environment

#### 1. OPENAI_API_KEY (Required)

The OpenAI API key used for AI-powered resume and cover letter generation.

**How to obtain:**
1. Sign up at https://platform.openai.com/
2. Go to API Keys section
3. Create a new secret key
4. Enable billing (required for GPT-4 models)

**How to set:**
```bash
firebase functions:secrets:set OPENAI_API_KEY
# When prompted, paste your sk-... key
```

**Verify:**
```bash
firebase functions:secrets:access OPENAI_API_KEY
```

**Used by:**
- `generateApplication` function (resume/cover letter generation)

**Cost considerations:**
- GPT-4o-mini: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Average resume generation: ~$0.03-0.05 per generation
- 1,000 generations/month: ~$30-50

---

## Optional Secrets (Future Features)

### 2. LinkedIn OAuth Credentials

For importing user profile data from LinkedIn.

**How to obtain:**
1. Create LinkedIn Developer App at https://www.linkedin.com/developers/
2. Get Client ID and Client Secret
3. Configure redirect URI: `https://us-central1-ai-career-os-139db.cloudfunctions.net/linkedInCallback`

**How to set:**
```bash
firebase functions:secrets:set LINKEDIN_CLIENT_ID
firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
```

**Used by:**
- `linkedInCallback` function (OAuth flow handler)
- Profile import feature

### 3. Stripe Credentials

For subscription billing and payment processing.

**How to obtain:**
1. Sign up at https://stripe.com/
2. Get API keys from Dashboard > Developers > API keys
3. Use test keys for development, live keys for production
4. Get webhook secret from Developers > Webhooks

**How to set:**
```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

**Used by:**
- `stripeWebhook` function (payment webhook handler)
- Subscription management

### 4. SendGrid/Email Service Credentials

For sending transactional emails (verification, notifications, etc.).

**How to obtain (SendGrid):**
1. Sign up at https://sendgrid.com/
2. Create API key in Settings > API Keys
3. Verify sender identity

**How to set:**
```bash
firebase functions:secrets:set SENDGRID_API_KEY
```

**Alternative email services:**
- AWS SES: `firebase functions:secrets:set AWS_SES_ACCESS_KEY_ID` and `AWS_SES_SECRET_ACCESS_KEY`
- Mailgun: `firebase functions:secrets:set MAILGUN_API_KEY`

**Used by:**
- `sendReminderEmail` function
- Email notification features

---

## Setting Secrets

### Using Firebase CLI

**Set a new secret:**
```bash
firebase functions:secrets:set SECRET_NAME
# Enter the secret value when prompted
```

**Set from file:**
```bash
cat secret.txt | firebase functions:secrets:set SECRET_NAME
```

**Set with value inline (not recommended - visible in shell history):**
```bash
echo "secret-value" | firebase functions:secrets:set SECRET_NAME
```

### Managing Secrets

**List all secrets:**
```bash
firebase functions:secrets:list
```

**View secret metadata (not the actual value):**
```bash
firebase functions:secrets:describe SECRET_NAME
```

**Access secret value (requires permissions):**
```bash
firebase functions:secrets:access SECRET_NAME
```

**Update a secret:**
```bash
firebase functions:secrets:set SECRET_NAME --force
```

**Delete a secret:**
```bash
firebase functions:secrets:destroy SECRET_NAME
```

---

## Referencing Secrets in Functions

Secrets are referenced in the function configuration and injected as environment variables.

**Example from `functions/index.js`:**

```javascript
const {onCall} = require('firebase-functions/v2/https');

exports.generateApplication = onCall(
  {
    timeoutSeconds: 120,
    memory: '512MiB',
    secrets: ['OPENAI_API_KEY']  // Secret is injected at runtime
  },
  async (request) => {
    // Access secret via environment variable
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Use the API key
    const openai = new OpenAI({ apiKey });
    // ...
  }
);
```

**Key points:**
- Secrets are listed in the `secrets` array in function config
- Access secrets via `process.env.SECRET_NAME`
- Always validate that secrets exist before using them
- Never log secret values

---

## Local Development

For local development using Firebase Emulator, secrets are loaded from a local `.env` file.

### Setup Local Secrets

1. Create `functions/.env` file:
   ```bash
   cd functions
   cp .env.example .env
   ```

2. Add your development secrets to `functions/.env`:
   ```env
   # OpenAI API Key for local development
   OPENAI_API_KEY=sk-...

   # LinkedIn OAuth (optional)
   LINKEDIN_CLIENT_ID=your-client-id
   LINKEDIN_CLIENT_SECRET=your-client-secret

   # Stripe (optional, use test keys)
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...

   # SendGrid (optional)
   SENDGRID_API_KEY=SG...
   ```

3. Add `functions/.env` to `.gitignore`:
   ```bash
   echo "functions/.env" >> .gitignore
   ```

### Running Emulator with Secrets

```bash
# Start emulator (automatically loads functions/.env)
firebase emulators:start

# Or start only functions emulator
firebase emulators:start --only functions
```

The emulator automatically loads environment variables from `functions/.env`.

---

## Security Best Practices

### 1. Never Commit Secrets to Git

- Add `.env` files to `.gitignore`
- Use `.env.example` as a template (without actual values)
- Never hardcode secrets in code

### 2. Use Separate Keys for Development and Production

- Development: Use test/sandbox API keys
- Production: Use production API keys with usage limits

### 3. Rotate Secrets Regularly

```bash
# Update secret with new value
firebase functions:secrets:set OPENAI_API_KEY --force

# Re-deploy functions to use new secret
firebase deploy --only functions
```

### 4. Limit Secret Access

- Use least-privilege IAM roles
- Only grant secret access to required functions
- Review secret access logs in Google Cloud Console

### 5. Monitor Secret Usage

- Set up billing alerts for API usage
- Monitor function logs for unauthorized access attempts
- Use API key restrictions where possible (IP whitelist, domain restrictions)

---

## Troubleshooting

### Secret Not Found Error

**Problem:**
```
Error: Secret OPENAI_API_KEY is not found
```

**Solution:**
```bash
# Verify secret exists
firebase functions:secrets:list

# If not found, set it
firebase functions:secrets:set OPENAI_API_KEY

# Re-deploy function
firebase deploy --only functions:generateApplication
```

### Permission Denied Error

**Problem:**
```
Error: Permission denied accessing secret
```

**Solution:**
1. Verify you have correct Firebase project permissions
2. Check that Secret Manager API is enabled:
   ```bash
   gcloud services enable secretmanager.googleapis.com --project=ai-career-os-139db
   ```
3. Re-authenticate Firebase CLI:
   ```bash
   firebase logout
   firebase login
   ```

### Secret Not Available in Function

**Problem:** `process.env.OPENAI_API_KEY` is undefined

**Solution:**
1. Verify secret is referenced in function config:
   ```javascript
   exports.myFunction = onCall({ secrets: ['OPENAI_API_KEY'] }, ...)
   ```
2. Re-deploy function:
   ```bash
   firebase deploy --only functions
   ```
3. Check function logs:
   ```bash
   firebase functions:log
   ```

### Local Emulator Can't Load Secrets

**Problem:** Secrets are undefined when using emulator

**Solution:**
1. Create `functions/.env` file with development secrets
2. Restart emulator:
   ```bash
   firebase emulators:start
   ```
3. Verify `.env` file is in the correct location (`functions/.env`, not root `.env`)

---

## Secret Manager Pricing

**Google Cloud Secret Manager costs:**
- Secret versions: $0.06 per secret version per month
- Access operations: $0.03 per 10,000 operations

**Typical costs for this project:**
- ~5 secrets = $0.30/month
- ~10,000 function invocations = $0.03/month
- **Total: ~$0.33/month**

Much cheaper than the API usage costs (OpenAI, Stripe, etc.).

---

## Migration from Legacy Config

If you previously used `firebase functions:config:set`, migrate to Secret Manager:

**Old approach (deprecated):**
```bash
firebase functions:config:set openai.api_key="sk-..."
```

**New approach (recommended):**
```bash
firebase functions:secrets:set OPENAI_API_KEY
```

**Why migrate:**
- Better security (encrypted at rest)
- IAM-based access control
- Easier rotation
- Works with Cloud Functions 2nd generation

**Migration steps:**
1. Get existing config values:
   ```bash
   firebase functions:config:get
   ```
2. Set as secrets:
   ```bash
   firebase functions:secrets:set OPENAI_API_KEY
   ```
3. Update function code to use `process.env.OPENAI_API_KEY`
4. Re-deploy functions

---

## Additional Resources

- [Firebase Functions Secrets Documentation](https://firebase.google.com/docs/functions/config-env#secret-manager)
- [Google Cloud Secret Manager](https://cloud.google.com/secret-manager)
- [Firebase Functions 2nd Gen Guide](https://firebase.google.com/docs/functions/2nd-gen-differences)
- [OpenAI API Best Practices](https://platform.openai.com/docs/guides/production-best-practices)

---

**Last Updated:** December 19, 2025
