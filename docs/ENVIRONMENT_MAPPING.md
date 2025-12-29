# Environment Mapping - Supabase Branches & GitHub Environments

**Created:** 2025-12-29
**Purpose:** Document the complete environment mapping between GitHub, Supabase, and Cloudflare

---

## Overview

JobMatch AI uses a **three-tier environment strategy** with isolated databases, backends, and frontends for each stage:

```
┌──────────────┬────────────────────────┬──────────────────────────┬──────────────────────────┐
│ GitHub       │ Supabase Branch        │ Cloudflare Backend       │ Cloudflare Frontend      │
├──────────────┼────────────────────────┼──────────────────────────┼──────────────────────────┤
│ develop      │ development            │ jobmatch-ai-dev          │ jobmatch-ai-dev          │
│              │ wpupbucinufbaiphwogc   │ (Workers)                │ (Pages)                  │
├──────────────┼────────────────────────┼──────────────────────────┼──────────────────────────┤
│ staging      │ staging                │ jobmatch-ai-staging      │ jobmatch-ai-staging      │
│              │ awupxbzzabtzqowjcnsa   │ (Workers)                │ (Pages)                  │
├──────────────┼────────────────────────┼──────────────────────────┼──────────────────────────┤
│ main         │ main                   │ jobmatch-ai-prod         │ jobmatch-ai-production   │
│              │ lrzhpnsykasqrousgmdh   │ (Workers)                │ (Pages)                  │
└──────────────┴────────────────────────┴──────────────────────────┴──────────────────────────┘
```

---

## Supabase Branch Details

### Development Branch
- **Branch Name:** development
- **Project Ref:** wpupbucinufbaiphwogc
- **URL:** https://wpupbucinufbaiphwogc.supabase.co
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdXBidWNpbnVmYmFpcGh3b2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NjI1NjcsImV4cCI6MjA4MjIzODU2N30.LRfdYAz08eKp5oZoQJ7MbK-VCluud2YlIRw0GumcAp8`
- **Publishable Key:** `sb_publishable_h6erYLL-Ye6oD7pNyWLGBw_GYbxQ4OA`
- **Purpose:** Active development, feature testing
- **Status:** ACTIVE_HEALTHY

### Staging Branch
- **Branch Name:** staging
- **Project Ref:** awupxbzzabtzqowjcnsa
- **URL:** https://awupxbzzabtzqowjcnsa.supabase.co
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dXB4Ynp6YWJ0enFvd2pjbnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2Njc5NDAsImV4cCI6MjA4MjI0Mzk0MH0.Rxpwhhy7_oreAO-c_6yflzKNdXqgGxsiOl6aQ-2Hs9s`
- **Publishable Key:** `sb_publishable__PjFqmdL9TfgNP8oV_P_fw_gXs4ZaI0`
- **Purpose:** Pre-production testing, QA validation
- **Status:** ACTIVE_HEALTHY

### Production Branch (Main)
- **Branch Name:** main
- **Project Ref:** lrzhpnsykasqrousgmdh
- **URL:** https://lrzhpnsykasqrousgmdh.supabase.co
- **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemhwbnN5a2FzcXJvdXNnbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTkxMDcsImV4cCI6MjA4MTgzNTEwN30.aKqsPCJb-EwkYeuD1Zmv_FXQUyKLEEG5pXIKEiSX9ZE`
- **Publishable Key:** `sb_publishable_QCbc132gXy457Z8OBZpCyw_G9aOU96h`
- **Purpose:** Live production environment
- **Status:** ACTIVE_HEALTHY

---

## Cloudflare Deployment URLs

### Development
- **Frontend:** https://jobmatch-ai-dev.pages.dev
- **Backend:** https://jobmatch-ai-dev.carl-f-frank.workers.dev
- **Deploys from:** `develop` branch
- **Database:** development (wpupbucinufbaiphwogc)

### Staging
- **Frontend:** https://jobmatch-ai-staging.pages.dev
- **Backend:** https://jobmatch-ai-staging.carl-f-frank.workers.dev
- **Deploys from:** `staging` branch
- **Database:** staging (awupxbzzabtzqowjcnsa)

### Production
- **Frontend:** https://jobmatch-ai-production.pages.dev
- **Backend:** https://jobmatch-ai-prod.carl-f-frank.workers.dev
- **Deploys from:** `main` branch
- **Database:** main (lrzhpnsykasqrousgmdh)

---

## GitHub Environments Setup

### Create Environments

1. Go to: **Repository → Settings → Environments**
2. Create three environments:
   - `development`
   - `staging`
   - `production`

### Environment Protection Rules (Recommended)

**Development:**
- No protection rules (allow all branches)
- No required reviewers

**Staging:**
- Deployment branch: `staging` only
- Optional: 1 required reviewer

**Production:**
- Deployment branch: `main` only
- Required reviewers: 1-2 team members
- Wait timer: 5 minutes (optional safety buffer)

---

## GitHub Environment Secrets

### How to Add Environment Secrets

1. **Repository → Settings → Environments**
2. Click on environment name (e.g., `development`)
3. Click **"Add secret"**
4. Add secrets below

### Development Environment Secrets

```bash
Name: SUPABASE_URL
Value: https://wpupbucinufbaiphwogc.supabase.co

Name: SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdXBidWNpbnVmYmFpcGh3b2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NjI1NjcsImV4cCI6MjA4MjIzODU2N30.LRfdYAz08eKp5oZoQJ7MbK-VCluud2YlIRw0GumcAp8

Name: SUPABASE_PUBLISHABLE_KEY
Value: sb_publishable_h6erYLL-Ye6oD7pNyWLGBw_GYbxQ4OA

Name: SUPABASE_SERVICE_ROLE_KEY
Value: (Get from Supabase Dashboard → development → Settings → API)
```

### Staging Environment Secrets

```bash
Name: SUPABASE_URL
Value: https://awupxbzzabtzqowjcnsa.supabase.co

Name: SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dXB4Ynp6YWJ0enFvd2pjbnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2Njc5NDAsImV4cCI6MjA4MjI0Mzk0MH0.Rxpwhhy7_oreAO-c_6yflzKNdXqgGxsiOl6aQ-2Hs9s

Name: SUPABASE_PUBLISHABLE_KEY
Value: sb_publishable__PjFqmdL9TfgNP8oV_P_fw_gXs4ZaI0

Name: SUPABASE_SERVICE_ROLE_KEY
Value: (Get from Supabase Dashboard → staging → Settings → API)
```

### Production Environment Secrets

```bash
Name: SUPABASE_URL
Value: https://lrzhpnsykasqrousgmdh.supabase.co

Name: SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemhwbnN5a2FzcXJvdXNnbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTkxMDcsImV4cCI6MjA4MTgzNTEwN30.aKqsPCJb-EwkYeuD1Zmv_FXQUyKLEEG5pXIKEiSX9ZE

Name: SUPABASE_PUBLISHABLE_KEY
Value: sb_publishable_QCbc132gXy457Z8OBZpCyw_G9aOU96h

Name: SUPABASE_SERVICE_ROLE_KEY
Value: (Get from Supabase Dashboard → main → Settings → API)
```

### Repository-Level Secrets (Shared Across All Environments)

These secrets are the same across all environments:

```bash
Name: CLOUDFLARE_API_TOKEN
Value: (Your Cloudflare API token - see CLOUDFLARE_API_TOKEN_SETUP.md)

Name: CLOUDFLARE_ACCOUNT_ID
Value: 280c58ea17d9fe3235c33bd0a52a256b
```

---

## Cloudflare Workers Secrets

Each Cloudflare Worker environment needs its own secrets configured via Wrangler CLI:

### Development Workers Secrets

```bash
cd workers
npx wrangler secret put SUPABASE_URL --env development
# Paste: https://wpupbucinufbaiphwogc.supabase.co

npx wrangler secret put SUPABASE_ANON_KEY --env development
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdXBidWNpbnVmYmFpcGh3b2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NjI1NjcsImV4cCI6MjA4MjIzODU2N30.LRfdYAz08eKp5oZoQJ7MbK-VCluud2YlIRw0GumcAp8

npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env development
# Paste: (Get from Supabase Dashboard → development → Settings → API)

npx wrangler secret put APP_URL --env development
# Paste: https://jobmatch-ai-dev.pages.dev

npx wrangler secret put OPENAI_API_KEY --env development
# Paste: (Your OpenAI API key)

npx wrangler secret put APIFY_API_TOKEN --env development
# Paste: (Your Apify API token)
```

### Staging Workers Secrets

```bash
cd workers
npx wrangler secret put SUPABASE_URL --env staging
# Paste: https://awupxbzzabtzqowjcnsa.supabase.co

npx wrangler secret put SUPABASE_ANON_KEY --env staging
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dXB4Ynp6YWJ0enFvd2pjbnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2Njc5NDAsImV4cCI6MjA4MjI0Mzk0MH0.Rxpwhhy7_oreAO-c_6yflzKNdXqgGxsiOl6aQ-2Hs9s

npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging
# Paste: (Get from Supabase Dashboard → staging → Settings → API)

npx wrangler secret put APP_URL --env staging
# Paste: https://jobmatch-ai-staging.pages.dev

npx wrangler secret put OPENAI_API_KEY --env staging
# Paste: (Your OpenAI API key)

npx wrangler secret put APIFY_API_TOKEN --env staging
# Paste: (Your Apify API token)
```

### Production Workers Secrets

```bash
cd workers
npx wrangler secret put SUPABASE_URL --env production
# Paste: https://lrzhpnsykasqrousgmdh.supabase.co

npx wrangler secret put SUPABASE_ANON_KEY --env production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemhwbnN5a2FzcXJvdXNnbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTkxMDcsImV4cCI6MjA4MTgzNTEwN30.aKqsPCJb-EwkYeuD1Zmv_FXQUyKLEEG5pXIKEiSX9ZE

npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
# Paste: (Get from Supabase Dashboard → main → Settings → API)

npx wrangler secret put APP_URL --env production
# Paste: https://jobmatch-ai-production.pages.dev

npx wrangler secret put OPENAI_API_KEY --env production
# Paste: (Your OpenAI API key)

npx wrangler secret put APIFY_API_TOKEN --env production
# Paste: (Your Apify API token)
```

---

## Data Flow

### Development Flow
```
Developer pushes to 'develop' branch
    ↓
GitHub Actions runs tests
    ↓
Tests use development Supabase (wpupbucinufbaiphwogc)
    ↓
Deploy to Cloudflare development
    ↓
Frontend (Pages): jobmatch-ai-dev.pages.dev
Backend (Workers): jobmatch-ai-dev.carl-f-frank.workers.dev
    ↓
Both connect to development Supabase branch
```

### Staging Flow
```
Merge 'develop' → 'staging'
    ↓
GitHub Actions runs tests
    ↓
Tests use staging Supabase (awupxbzzabtzqowjcnsa)
    ↓
Deploy to Cloudflare staging
    ↓
Frontend (Pages): jobmatch-ai-staging.pages.dev
Backend (Workers): jobmatch-ai-staging.carl-f-frank.workers.dev
    ↓
Both connect to staging Supabase branch
```

### Production Flow
```
Merge 'staging' → 'main'
    ↓
GitHub Actions runs tests
    ↓
Tests use production Supabase (lrzhpnsykasqrousgmdh)
    ↓
Deploy to Cloudflare production
    ↓
Frontend (Pages): jobmatch-ai-production.pages.dev
Backend (Workers): jobmatch-ai-prod.carl-f-frank.workers.dev
    ↓
Both connect to production Supabase branch
```

---

## Migration Workflow

### Apply Schema Changes

```bash
# 1. Test in development first
git checkout develop
# Make schema changes in supabase/migrations/
git commit -m "feat: add new table"
git push origin develop
# Deployment runs, migrations apply to development branch

# 2. Test and verify in development
# Visit: https://jobmatch-ai-dev.pages.dev
# Verify schema changes work

# 3. Promote to staging
git checkout staging
git merge develop
git push origin staging
# Deployment runs, migrations apply to staging branch

# 4. QA testing in staging
# Visit: https://jobmatch-ai-staging.pages.dev
# Full QA validation

# 5. Promote to production
git checkout main
git merge staging
git push origin main
# Deployment runs, migrations apply to production branch
```

---

## Troubleshooting

### Issue: "Database connection failed"

**Check:**
1. Verify environment-specific secrets in GitHub Environments
2. Verify Workers secrets: `npx wrangler secret list --env production`
3. Test Supabase connection: `curl https://lrzhpnsykasqrousgmdh.supabase.co/rest/v1/`

### Issue: "Wrong database data showing"

**Cause:** Likely using wrong Supabase URL for environment

**Check:**
1. GitHub Environment secrets match correct Supabase branch
2. Cloudflare Workers secrets: `npx wrangler secret list --env staging`
3. Review deployment logs for which URL was used in build

### Issue: "Migrations not applying"

**Check:**
1. Verify migrations exist in `supabase/migrations/`
2. Check Supabase branch status: Some branches show `MIGRATIONS_FAILED`
3. Manually apply: See Supabase dashboard or use Supabase CLI

---

## Summary

✅ **Three isolated environments:**
- Development: Fast iteration, feature testing
- Staging: Pre-production QA, integration testing
- Production: Live user traffic

✅ **Each environment has:**
- Dedicated Supabase branch (isolated database)
- Dedicated Cloudflare Workers (isolated backend)
- Dedicated Cloudflare Pages (isolated frontend)
- Environment-specific secrets

✅ **Proper promotion flow:**
develop → staging → main (with testing at each stage)

---

**Next Steps:**
1. Create GitHub Environments (development, staging, production)
2. Add environment-specific secrets to each
3. Add Cloudflare API token to repository secrets
4. Configure Workers secrets via Wrangler CLI
5. Test deployment pipeline

See `CLOUDFLARE_CI_CD_SETUP.md` for deployment workflow details.
