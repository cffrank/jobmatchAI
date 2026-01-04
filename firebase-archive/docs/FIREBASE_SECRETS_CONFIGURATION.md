# Firebase Functions Secrets Configuration Guide

**Last Updated:** December 19, 2025
**Firebase Project:** ai-career-os-139db
**Firebase CLI Version:** 15.1.0
**Authenticated User:** carl.f.frank@gmail.com

## Overview

This guide documents the required secrets and environment variables for the JobMatch AI Cloud Functions deployment. **DO NOT commit secrets to git** - all sensitive credentials must be configured through Firebase Functions Secret Manager.

## Current Status

### Active Firebase Project
```
Project ID: ai-career-os-139db
Active User: carl.f.frank@gmail.com
Authentication Status: Configured and authenticated
```

### Current Configuration
**LEGACY API (Deprecated - Migration Required)**
```json
{
  "openai": {
    "api_key": "sk-proj-***" (partially exposed - see security issues below)
  }
}
```

> ⚠️ **IMPORTANT:** Firebase is deprecating `functions.config()` API in March 2026. The codebase is using a mixed approach:
> - **secureProxy.ts**: Uses deprecated `functions.config().openai` and `functions.config().apify`
> - **scrapeJobs.ts**: Uses modern `process.env.APIFY_API_TOKEN` with secrets configuration
> - **sendApplicationEmail.ts**: Uses modern `process.env.SENDGRID_API_KEY` with secrets configuration

## Required Secrets

### 1. OpenAI API Key
**Service:** OpenAI GPT API
**Used By:** `scrapeJobs.ts`, `secureProxy.ts`
**Purpose:** AI-powered job matching and resume analysis

**Configuration Method (Modern - Recommended):**
```bash
# Note: Currently used by secureProxy.ts via deprecated functions.config()
# Will need migration to process.env pattern
firebase functions:config:set openai.key="sk-proj-YOUR_ACTUAL_KEY_HERE"
```

**Migration Note:** The code references `functions.config().openai.key` in `secureProxy.ts`. After March 2026, this will fail. Should be migrated to use `process.env.OPENAI_API_KEY` with secrets configuration.

**Obtaining the Key:**
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Sign in to your OpenAI account
3. Click "Create new secret key"
4. Copy the key (format: `sk-proj-...`)
5. **NEVER** commit this key to git

**Security:** This key should have:
- API spending limits configured in OpenAI dashboard
- IP address restrictions if possible
- Rotation scheduled every 90 days

---

### 2. Apify API Token
**Service:** Apify Job Scraping Actors
**Used By:** `scrapeJobs.ts`
**Purpose:** Web scraping LinkedIn and Indeed job listings

**Current Configuration Method:**
```bash
# Modern approach using Firebase Functions Secrets
# This is the correct pattern - already configured in code
firebase functions:config:set apify.key="YOUR_APIFY_API_TOKEN"
```

OR (Recommended - Aligns with code):
```bash
# As environment variable (modern Firebase Functions secrets)
firebase functions:secrets:set APIFY_API_TOKEN --data-file=token.txt
```

**Obtaining the Token:**
1. Create account at [Apify Platform](https://apify.com/)
2. Go to Settings → API tokens
3. Copy your API token
4. **NEVER** commit this token to git

**Used Actors:**
- `bebity/linkedin-jobs-scraper` - Scrapes LinkedIn job listings
- `misceres/indeed-scraper` - Scrapes Indeed job listings

**Rate Limiting:** Apify has usage limits based on your plan. Monitor:
- Free tier: 100 runs/month
- Each job search uses 1 run per source (2 runs if searching both LinkedIn + Indeed)
- Users are limited to 10 searches/hour in the app

**Security:**
- Rotate token every 90 days
- Monitor usage in Apify dashboard
- Set spending limits to prevent runaway costs

---

### 3. SendGrid API Key
**Service:** SendGrid Email Delivery
**Used By:** `sendApplicationEmail.ts`
**Purpose:** Sending application emails on behalf of users

**Current Configuration Method:**
```bash
# This is the correct pattern - already configured in code
firebase functions:secrets:set SENDGRID_API_KEY --data-file=sendgrid-key.txt
```

**Obtaining the Key:**
1. Create account at [SendGrid](https://sendgrid.com/)
2. Go to Settings → API Keys
3. Create new API Key with "Full Access" or restricted permissions
4. Copy the key (format: `SG.xxx...`)
5. **NEVER** commit this key to git

**Recommended Restricted Permissions:**
- `mail.send` - Send emails
- `mail_send.smtp` - SMTP access (if needed)

**Rate Limiting:** SendGrid enforces:
- Per-user rate limiting: 10 emails/hour per user (enforced in `sendApplicationEmail.ts`)
- Account-level limits depend on plan
- Monitor: Dashboard → Settings → Rate Limits

**Security:**
- Use restricted API key (not Full Access)
- Rotate key every 90 days
- Monitor sending activity in SendGrid dashboard
- Set IP whitelisting if available

---

### 4. LinkedIn OAuth (Optional - For Direct Login)
**Service:** LinkedIn OAuth Provider
**Used By:** Not currently implemented, but configured in `.env.example`
**Purpose:** Direct LinkedIn login (future enhancement)

**Configuration Method:**
```bash
firebase functions:config:set linkedin.clientId="YOUR_CLIENT_ID"
firebase functions:config:set linkedin.clientSecret="YOUR_CLIENT_SECRET"
```

**Obtaining Credentials:**
1. Go to [LinkedIn Developer Apps](https://www.linkedin.com/developers/apps)
2. Create new app
3. Go to Auth → Authorized redirect URLs
4. Add: `https://us-central1-ai-career-os-139db.cloudfunctions.net/linkedInCallback`
5. Copy Client ID and Client Secret
6. **NEVER** commit these to git

**Status:** Not yet implemented in functions. Can be added later.

---

## Configuration Steps

### Step 1: Prepare Your Secrets
Create a secure directory (NOT in git):
```bash
mkdir -p ~/.firebase-secrets
cd ~/.firebase-secrets

# Create files containing only the secret values
echo "sk-proj-YOUR_ACTUAL_OPENAI_KEY" > openai-key.txt
echo "YOUR_APIFY_TOKEN" > apify-token.txt
echo "SG.YOUR_SENDGRID_KEY" > sendgrid-key.txt

# Restrict file permissions
chmod 600 *.txt
```

### Step 2: Set Secrets in Firebase (Migration from Legacy Config)

**Option A: Using Legacy Config (Current - Deprecated)**
```bash
cd /home/carl/application-tracking/jobmatch-ai

# Set OpenAI key (legacy method)
firebase functions:config:set openai.key="sk-proj-YOUR_KEY"

# Set Apify key (legacy method)
firebase functions:config:set apify.key="YOUR_APIFY_TOKEN"

# Verify configuration
firebase functions:config:get
```

**Option B: Using Modern Secrets (Recommended)**
```bash
cd /home/carl/application-tracking/jobmatch-ai

# Set secrets using Firebase secrets manager
firebase functions:secrets:set OPENAI_API_KEY < ~/.firebase-secrets/openai-key.txt
firebase functions:secrets:set APIFY_API_TOKEN < ~/.firebase-secrets/apify-token.txt
firebase functions:secrets:set SENDGRID_API_KEY < ~/.firebase-secrets/sendgrid-key.txt

# Verify secrets are set
firebase functions:describe
```

### Step 3: Update Function Code (Required for Migration)
The code needs updates to use modern `process.env` pattern consistently:

**In `secureProxy.ts` (Lines 48, 136):**
```typescript
// BEFORE (Deprecated):
const apiKey = functions.config().openai?.key;

// AFTER (Modern):
const apiKey = process.env.OPENAI_API_KEY;
```

**Then add to function declaration:**
```typescript
export const proxyOpenAI = functions.https.onCall(
  {
    secrets: ['OPENAI_API_KEY'],  // Add this
  },
  async (data, context) => {
    // ...
  }
);
```

---

## Deployment Process

### Pre-Deployment Checklist
```bash
cd /home/carl/application-tracking/jobmatch-ai

# 1. Verify authentication
firebase login:list
# Expected: Logged in as carl.f.frank@gmail.com

# 2. Verify project
firebase use
# Expected: ai-career-os-139db

# 3. Check current secrets
firebase functions:config:get
# Document what's configured

# 4. Build functions
cd functions
npm install
npm run build
cd ..

# 5. Verify no hardcoded secrets
grep -r "sk-proj-" functions/src/  # Should return nothing
grep -r "SG\." functions/src/      # Should return nothing
grep -r "apify" functions/src/ | grep -v "apiKey" | grep -v "client"  # Should not contain actual tokens

# 6. Run linting
cd functions
npm run lint
cd ..
```

### Deployment Command
```bash
# Deploy with specific secrets configured
firebase deploy --only functions

# Watch deployment logs
firebase functions:log --tail
```

### Post-Deployment Verification
```bash
# Test OpenAI proxy function
firebase functions:log --function=proxyOpenAI

# Test Apify job scraping
firebase functions:log --function=scrapeJobs

# Test SendGrid email
firebase functions:log --function=sendApplicationEmail
```

---

## Local Development Setup

### Setting Up Local Environment

**Create `.env` file in functions directory:**
```bash
cd /home/carl/application-tracking/jobmatch-ai/functions

# Copy example
cp .env.example .env

# Edit .env and add actual keys
cat > .env << 'EOF'
# For local development only - NEVER commit
OPENAI_API_KEY=sk-proj-YOUR_LOCAL_TESTING_KEY
APIFY_API_TOKEN=YOUR_LOCAL_TESTING_TOKEN
SENDGRID_API_KEY=SG.YOUR_LOCAL_TESTING_KEY
EOF

# Secure the file
chmod 600 .env
```

**Start Functions Emulator:**
```bash
cd /home/carl/application-tracking/jobmatch-ai

# Install dependencies
npm install
cd functions
npm install
cd ..

# Start emulator with functions
firebase emulators:start --only functions

# In another terminal, test functions
firebase functions:shell
# Then type: proxyOpenAI({prompt: "test"})
```

---

## Security Best Practices

### Immediate Actions Required
- [ ] Remove API key from `.env.backup` file (check if committed)
- [ ] Regenerate any exposed keys immediately
- [ ] Enable IP whitelisting where available:
  - **OpenAI:** API key restrictions
  - **SendGrid:** IP whitelisting in dashboard
  - **Apify:** No IP restrictions available, use strong token management

### Ongoing Security
- [ ] Rotate all secrets every 90 days
- [ ] Monitor all API usage monthly
- [ ] Enable spending alerts on all services
- [ ] Use Cloud Audit Logs to track secret access:
  ```bash
  gcloud functions describe proxyOpenAI --region=us-central1 \
    --project=ai-career-os-139db
  ```
- [ ] Review Firebase Function logs weekly for errors/anomalies
- [ ] Keep Firebase CLI updated:
  ```bash
  firebase upgrade
  ```

### Git Security
The `.gitignore` properly excludes:
```
.env
.env.local
.env.backup
**/.env
*service-account*.json
*secrets*.txt
```

**Verify no secrets are committed:**
```bash
git log -p -S "sk-proj-" -- "*.ts" "*.json" ".env*"
git log -p -S "SG\." -- "*.ts" "*.json" ".env*"
git log -p -S "APIFY" -- "*.ts" "*.json" ".env*"
```

---

## Troubleshooting

### Issue: "Service configuration error" when calling functions
**Cause:** Secret not configured
**Solution:**
```bash
# Check configured secrets
firebase functions:config:get

# Set missing secret
firebase functions:config:set openai.key="YOUR_KEY"

# Redeploy
firebase deploy --only functions
```

### Issue: "Failed to scrape jobs" - Apify errors
**Cause:** Invalid Apify token or actor not found
**Solution:**
```bash
# Verify token is correct
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.apify.com/v2/users/me

# Check actor availability
# LinkedIn: https://apify.com/bebity/linkedin-jobs-scraper
# Indeed: https://apify.com/misceres/indeed-scraper
```

### Issue: "SendGrid error" when sending emails
**Cause:** Invalid API key or rate limit exceeded
**Solution:**
```bash
# Verify key format (should start with SG.)
firebase functions:config:get

# Check SendGrid dashboard for:
# - API key validity
# - Sending limits
# - Bounced/unsubscribed emails
```

### Issue: "Firebase Authentication required"
**Cause:** User not authenticated or token expired
**Solution:**
```bash
# In app, ensure:
# - User is logged in to Firebase
# - Auth token is valid
# - Function requires authentication

# In Cloud Functions:
if (!context.auth) {
  throw new functions.https.HttpsError('unauthenticated', 'Auth required');
}
```

---

## Migration Timeline to Modern Secrets (Before March 2026)

### Phase 1: Code Update (Now)
- [ ] Update `secureProxy.ts` to use `process.env` instead of `functions.config()`
- [ ] Add `secrets: ['OPENAI_API_KEY', 'APIFY_API_TOKEN']` to function declarations
- [ ] Test locally with emulator

### Phase 2: Configuration (Before March 2025)
- [ ] Set secrets using `firebase functions:secrets:set`
- [ ] Deploy updated functions
- [ ] Monitor logs for errors

### Phase 3: Cleanup (Before March 2026)
- [ ] Remove legacy `functions.config()` completely
- [ ] Remove Runtime Config API usage
- [ ] Final deployment and verification

---

## Environment-Specific Configuration

### Development
```bash
# Uses local .env file with test keys
firebase emulators:start --only functions
```

### Staging
```bash
# Uses configured secrets from Firebase
firebase deploy --only functions --project=ai-career-os-139db
```

### Production
```bash
# Same as staging - uses Firebase secrets
firebase deploy --only functions --project=ai-career-os-139db
```

---

## References

- [Firebase Functions Secrets Manager](https://firebase.google.com/docs/functions/config-env)
- [OpenAI API Keys](https://platform.openai.com/api-keys)
- [Apify Platform](https://apify.com/)
- [SendGrid API Keys](https://app.sendgrid.com/settings/api_keys)
- [Firebase CLI Commands](https://firebase.google.com/docs/cli)

---

## Support & Questions

If you encounter issues:
1. Check `firebase functions:log --tail` for detailed error messages
2. Verify secrets are configured: `firebase functions:config:get`
3. Test with emulator locally before deploying
4. Review relevant service documentation (OpenAI, Apify, SendGrid)

