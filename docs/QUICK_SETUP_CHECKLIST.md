# Quick Setup Checklist - Cloudflare CI/CD with Environment-Specific Secrets

**Purpose:** Step-by-step checklist to configure GitHub Environments and deploy to Cloudflare

---

## ✅ Pre-Flight Checklist

- [ ] You have access to Supabase dashboard
- [ ] You have access to Cloudflare account
- [ ] You have access to GitHub repository settings
- [ ] You have Wrangler CLI installed (`npm install -g wrangler`)

---

## Step 1: Create GitHub Environments

### 1.1 Navigate to Environments

1. Go to: https://github.com/cffrank/jobmatchAI/settings/environments
2. You should see some existing Railway environments

### 1.2 Create Three Environments

Click **"New environment"** for each:

#### Environment: `development`
- **Name:** development
- **Protection rules:** None (allow any branch)
- **Deployment branches:** All branches
- Click **"Configure environment"**

#### Environment: `staging`
- **Name:** staging
- **Protection rules:** Optional (1 reviewer)
- **Deployment branches:** Selected branches → `staging`
- Click **"Configure environment"**

#### Environment: `production`
- **Name:** production
- **Protection rules:** Required (1-2 reviewers recommended)
- **Deployment branches:** Selected branches → `main`
- **Wait timer:** 5 minutes (optional safety buffer)
- Click **"Configure environment"**

---

## Step 2: Add Repository-Level Secrets

These secrets are shared across ALL environments:

### 2.1 Go to Repository Secrets

https://github.com/cffrank/jobmatchAI/settings/secrets/actions

### 2.2 Add Cloudflare Secrets

Click **"New repository secret"**:

#### `CLOUDFLARE_API_TOKEN`
```
Name: CLOUDFLARE_API_TOKEN
Value: (Create at https://dash.cloudflare.com/profile/api-tokens)
```

**How to create:**
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token" → "Create Custom Token"
3. Token name: `GitHub Actions - JobMatch AI`
4. Permissions:
   - Account → Cloudflare Pages → Edit
   - Account → Workers Scripts → Edit
5. Account Resources: All accounts
6. Create token → Copy immediately

#### `CLOUDFLARE_ACCOUNT_ID`
```
Name: CLOUDFLARE_ACCOUNT_ID
Value: 280c58ea17d9fe3235c33bd0a52a256b
```

**How to find:**
- Go to: https://dash.cloudflare.com/
- Click any zone
- Look in URL or right sidebar for "Account ID"

---

## Step 3: Add Development Environment Secrets

### 3.1 Navigate to Development Environment

https://github.com/cffrank/jobmatchAI/settings/environments/1234/edit
(Or: Repository → Settings → Environments → Click "development")

### 3.2 Add Environment Secrets

Click **"Add secret"** for each:

#### `SUPABASE_URL`
```
Name: SUPABASE_URL
Value: https://wpupbucinufbaiphwogc.supabase.co
```

#### `SUPABASE_ANON_KEY`
```
Name: SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdXBidWNpbnVmYmFpcGh3b2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NjI1NjcsImV4cCI6MjA4MjIzODU2N30.LRfdYAz08eKp5oZoQJ7MbK-VCluud2YlIRw0GumcAp8
```

#### `SUPABASE_SERVICE_ROLE_KEY`
```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: (Get from Supabase Dashboard)
```

**How to get:**
1. Go to: https://supabase.com/dashboard/project/wpupbucinufbaiphwogc/settings/api
2. Copy "service_role" secret key
3. Paste as value

---

## Step 4: Add Staging Environment Secrets

### 4.1 Navigate to Staging Environment

Repository → Settings → Environments → Click "staging"

### 4.2 Add Environment Secrets

#### `SUPABASE_URL`
```
Name: SUPABASE_URL
Value: https://awupxbzzabtzqowjcnsa.supabase.co
```

#### `SUPABASE_ANON_KEY`
```
Name: SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3dXB4Ynp6YWJ0enFvd2pjbnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2Njc5NDAsImV4cCI6MjA4MjI0Mzk0MH0.Rxpwhhy7_oreAO-c_6yflzKNdXqgGxsiOl6aQ-2Hs9s
```

#### `SUPABASE_SERVICE_ROLE_KEY`
```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: (Get from Supabase Dashboard)
```

**How to get:**
1. Go to: https://supabase.com/dashboard/project/awupxbzzabtzqowjcnsa/settings/api
2. Copy "service_role" secret key
3. Paste as value

---

## Step 5: Add Production Environment Secrets

### 5.1 Navigate to Production Environment

Repository → Settings → Environments → Click "production"

### 5.2 Add Environment Secrets

#### `SUPABASE_URL`
```
Name: SUPABASE_URL
Value: https://lrzhpnsykasqrousgmdh.supabase.co
```

#### `SUPABASE_ANON_KEY`
```
Name: SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemhwbnN5a2FzcXJvdXNnbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTkxMDcsImV4cCI6MjA4MTgzNTEwN30.aKqsPCJb-EwkYeuD1Zmv_FXQUyKLEEG5pXIKEiSX9ZE
```

#### `SUPABASE_SERVICE_ROLE_KEY`
```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: (Get from Supabase Dashboard)
```

**How to get:**
1. Go to: https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/settings/api
2. Copy "service_role" secret key
3. Paste as value

---

## Step 6: Configure Cloudflare Workers Secrets

These secrets are stored IN Cloudflare Workers (not GitHub):

### 6.1 Login to Cloudflare

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers
npx wrangler login
```

### 6.2 Add Development Workers Secrets

```bash
# Supabase
npx wrangler secret put SUPABASE_URL --env development
# Paste: https://wpupbucinufbaiphwogc.supabase.co

npx wrangler secret put SUPABASE_ANON_KEY --env development
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdXBidWNpbnVmYmFpcGh3b2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NjI1NjcsImV4cCI6MjA4MjIzODU2N30.LRfdYAz08eKp5oZoQJ7MbK-VCluud2YlIRw0GumcAp8

npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env development
# Paste: (Get from Supabase Dashboard → development → Settings → API)

# App URL
npx wrangler secret put APP_URL --env development
# Paste: https://jobmatch-ai-dev.pages.dev

# OpenAI
npx wrangler secret put OPENAI_API_KEY --env development
# Paste: (Your OpenAI API key)

# Apify
npx wrangler secret put APIFY_API_TOKEN --env development
# Paste: (Your Apify API token)
```

### 6.3 Add Staging Workers Secrets

```bash
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

### 6.4 Add Production Workers Secrets

```bash
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

## Step 7: Test the Deployment

### 7.1 Push to Development

```bash
git checkout develop
git add .
git commit -m "feat: configure environment-specific CI/CD"
git push origin develop
```

### 7.2 Watch GitHub Actions

1. Go to: https://github.com/cffrank/jobmatchAI/actions
2. Find workflow: "Deploy to Cloudflare Pages"
3. Watch it run:
   - ✅ Run Tests
   - ✅ Deploy Frontend (uses development environment)
   - ✅ Deploy Backend (uses development environment)

### 7.3 Verify Deployment

```bash
# Frontend
curl https://jobmatch-ai-dev.pages.dev

# Backend
curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
```

Expected health response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-29T...",
  "environment": "development"
}
```

---

## ✅ Final Checklist

### GitHub Secrets Configured:
- [ ] Repository secret: `CLOUDFLARE_API_TOKEN`
- [ ] Repository secret: `CLOUDFLARE_ACCOUNT_ID`
- [ ] Development environment: 3 secrets (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Staging environment: 3 secrets (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Production environment: 3 secrets (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)

### Cloudflare Workers Secrets Configured:
- [ ] Development: 6 secrets
- [ ] Staging: 6 secrets
- [ ] Production: 6 secrets

### Deployments Working:
- [ ] Push to `develop` triggers deployment to development
- [ ] Push to `staging` triggers deployment to staging
- [ ] Push to `main` triggers deployment to production
- [ ] Frontend connects to correct Supabase branch
- [ ] Backend connects to correct Supabase branch

---

## 🎉 Success Criteria

When everything is working:

1. **Push to `develop`**:
   - Tests run with development Supabase
   - Deploys to: jobmatch-ai-dev.pages.dev
   - Backend uses: https://wpupbucinufbaiphwogc.supabase.co

2. **Push to `staging`**:
   - Tests run with staging Supabase
   - Deploys to: jobmatch-ai-staging.pages.dev
   - Backend uses: https://awupxbzzabtzqowjcnsa.supabase.co

3. **Push to `main`**:
   - Tests run with production Supabase
   - Deploys to: jobmatch-ai-production.pages.dev
   - Backend uses: https://lrzhpnsykasqrousgmdh.supabase.co

---

## 📚 Reference Docs

- `docs/ENVIRONMENT_MAPPING.md` - Complete environment mapping
- `docs/CLOUDFLARE_CI_CD_SETUP.md` - Full CI/CD documentation
- `docs/CLOUDFLARE_API_TOKEN_SETUP.md` - Cloudflare token setup guide
- `workers/DEPLOYMENT_GUIDE.md` - Cloudflare Workers deployment guide

---

**Estimated Time:** 30-45 minutes
**Difficulty:** Intermediate
**Next Steps:** Test all three environments, verify data isolation
