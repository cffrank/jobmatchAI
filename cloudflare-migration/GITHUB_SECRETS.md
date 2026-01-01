# GitHub Secrets for Cloudflare Workers Deployment

This document lists all GitHub Secrets required for CI/CD deployment of JobMatch AI to Cloudflare Workers across three environments (development, staging, production).

## Setup Instructions

1. Go to GitHub repository: `https://github.com/YOUR_ORG/jobmatch-ai`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each secret listed below

## Required Secrets (14 total)

### 1. Cloudflare Deployment

**`CLOUDFLARE_API_TOKEN`**
- **Purpose:** Authenticate Wrangler CLI for deployments
- **How to obtain:**
  1. Go to Cloudflare Dashboard → My Profile → API Tokens
  2. Click "Create Token"
  3. Use template: "Edit Cloudflare Workers"
  4. Select Account: Your Cloudflare account
  5. Select Zone Resources: All zones (or specific zones)
  6. Create token and copy immediately (shown only once)
- **Permissions needed:**
  - Account: Cloudflare Workers Scripts (Edit)
  - Account: Workers KV Storage (Edit)
  - Account: Workers R2 Storage (Edit)
  - Account: D1 (Edit)
  - Zone: Workers Routes (Edit)

**`CLOUDFLARE_ACCOUNT_ID`**
- **Purpose:** Identify your Cloudflare account for deployments
- **How to obtain:**
  1. Go to Cloudflare Dashboard
  2. Select any domain/zone
  3. Scroll down right sidebar to "API" section
  4. Copy "Account ID"
- **Format:** 32-character hexadecimal string (e.g., `280c58ea17d9fe3235c33bd0a52a256b`)

### 2. Supabase Configuration

**`SUPABASE_URL`**
- **Purpose:** Supabase project URL for database and storage access
- **How to obtain:**
  1. Go to Supabase Dashboard → Project Settings → API
  2. Copy "Project URL"
- **Format:** `https://YOUR_PROJECT.supabase.co`

**`SUPABASE_ANON_KEY`**
- **Purpose:** Public anon key for client-side operations (respects RLS)
- **How to obtain:**
  1. Go to Supabase Dashboard → Project Settings → API
  2. Copy "anon public" key
- **Security:** Safe to expose in frontend, respects Row Level Security policies

**`SUPABASE_SERVICE_ROLE_KEY`**
- **Purpose:** Admin key for backend operations (bypasses RLS)
- **How to obtain:**
  1. Go to Supabase Dashboard → Project Settings → API
  2. Copy "service_role secret" key
- **Security:** CRITICAL - Keep secret, never expose in frontend, bypasses all RLS policies

### 3. OpenAI Configuration

**`OPENAI_API_KEY`**
- **Purpose:** OpenAI API access for GPT-4 and Vision API
- **How to obtain:**
  1. Go to OpenAI Platform → API Keys
  2. Create new secret key
  3. Copy immediately (shown only once)
- **Required for:** Resume generation, cover letters, job compatibility analysis
- **Billing:** Usage-based billing, ensure spending limits are set

### 4. SendGrid Configuration (Optional)

**`SENDGRID_API_KEY`**
- **Purpose:** SendGrid API for email sending functionality
- **How to obtain:**
  1. Go to SendGrid Dashboard → Settings → API Keys
  2. Create API Key with "Mail Send" permission
  3. Copy immediately (shown only once)
- **Required for:** Email functionality (optional feature)

**`SENDGRID_FROM_EMAIL`**
- **Purpose:** Default sender email address for SendGrid
- **How to obtain:** Configure verified sender in SendGrid Dashboard
- **Format:** `noreply@yourdomain.com`
- **Requirements:** Must be verified in SendGrid

### 5. LinkedIn OAuth Configuration (Optional)

**`LINKEDIN_CLIENT_ID`**
- **Purpose:** LinkedIn OAuth client ID for profile import
- **How to obtain:**
  1. Go to LinkedIn Developers → My Apps
  2. Create new app or use existing
  3. Copy "Client ID"
- **Required for:** LinkedIn profile import (optional feature)

**`LINKEDIN_CLIENT_SECRET`**
- **Purpose:** LinkedIn OAuth client secret
- **How to obtain:**
  1. Go to LinkedIn Developers → My Apps → Your App
  2. Go to "Auth" tab
  3. Copy "Client Secret"
- **Security:** Keep secret, never expose in frontend

**`LINKEDIN_REDIRECT_URI`**
- **Purpose:** OAuth callback URL for LinkedIn authentication
- **Format:** `https://YOUR_WORKERS_URL/api/auth/linkedin/callback`
- **Requirements:** Must match exactly in LinkedIn Developer Console

### 6. Apify Configuration (Optional)

**`APIFY_API_TOKEN`**
- **Purpose:** Apify API for job scraping from LinkedIn/Indeed
- **How to obtain:**
  1. Go to Apify Console → Settings → Integrations
  2. Create new API token
  3. Copy token
- **Required for:** Automated job scraping (optional feature)

### 7. Application Configuration

**`APP_URL`**
- **Purpose:** Frontend application URL for CORS configuration
- **Values by environment:**
  - Development: `http://localhost:5173`
  - Staging: `https://staging.jobmatch-ai.com`
  - Production: `https://jobmatch-ai.com`
- **Usage:** CORS origin whitelisting, OAuth redirects

**`AI_GATEWAY_SLUG`** (Optional, but recommended)
- **Purpose:** Cloudflare AI Gateway name for OpenAI request caching
- **How to obtain:**
  1. Go to Cloudflare Dashboard → AI → AI Gateway
  2. Create new gateway named "jobmatch-ai"
  3. Use gateway name as value
- **Value:** `jobmatch-ai`
- **Benefits:** 60-80% cost reduction via response caching

## Environment-Specific Secrets

Some secrets may vary by environment. Use GitHub Environments to set different values:

1. Go to **Settings** → **Environments**
2. Create environments: `development`, `staging`, `production`
3. Add environment-specific secrets:
   - `APP_URL` (different per environment)
   - `SUPABASE_URL` (if using separate Supabase projects per environment)

## Security Best Practices

1. **Rotation Schedule:**
   - Critical secrets (service role key, OpenAI): Every 90 days
   - Standard secrets (API tokens): Every 180 days
   - Long-lived secrets (JWT signing): Annually

2. **Access Control:**
   - Only repository admins should have access to secrets
   - Use environment protection rules to require approvals for production

3. **Monitoring:**
   - Enable API usage alerts in OpenAI/SendGrid/Apify
   - Monitor Cloudflare Workers analytics for unusual activity
   - Set up spending limits on paid services

4. **Backup:**
   - Store secrets in a secure password manager (1Password, LastPass)
   - Document which team member has access to each service

## Verification

After adding all secrets, verify in GitHub Actions:

1. Go to **Actions** tab
2. Manually trigger a workflow run
3. Check logs for authentication errors
4. Verify deployment succeeds for all environments

## Troubleshooting

### Common Issues

**1. "CLOUDFLARE_API_TOKEN is not valid"**
- Token may have expired or been revoked
- Recreate token with correct permissions (see above)

**2. "SUPABASE_SERVICE_ROLE_KEY is invalid"**
- Double-check you copied the "service_role secret" not "anon public"
- Ensure no extra spaces or newlines

**3. "OpenAI API key unauthorized"**
- Verify billing is enabled on OpenAI account
- Check spending limits haven't been exceeded
- Ensure key has access to required models (GPT-4, Vision API)

**4. "CORS error when testing deployed Worker"**
- Verify `APP_URL` matches your frontend URL exactly
- Include protocol (https://) and no trailing slash

## Next Steps

After configuring all secrets:

1. ✅ Commit and push code changes
2. ✅ GitHub Actions will automatically deploy to Cloudflare Workers
3. ✅ Test deployment at: `https://jobmatch-ai-dev.YOUR_SUBDOMAIN.workers.dev`
4. ✅ Monitor logs: `wrangler tail --env development`

## Cost Monitoring

Set up billing alerts in each service:

- **Cloudflare:** Set spending limits in Workers dashboard
- **OpenAI:** Set monthly spending limits in Usage section
- **SendGrid:** Monitor email quota (10k free tier)
- **Apify:** Set actor run limits

**Estimated monthly costs:**
- Development: ~$2-3/month (mainly OpenAI)
- Staging: ~$5-10/month
- Production: ~$50-100/month (depending on usage)

Compare to current Railway costs: $81/month → Estimated Cloudflare savings: **93%**
