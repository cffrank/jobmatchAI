# Cloudflare Pages - GitHub Integration & Configuration

**Date:** 2025-12-31
**Purpose:** Complete setup guide for Cloudflare Pages with GitHub repo integration
**Status:** Ready for implementation

---

## Overview

Cloudflare Pages hosts your React frontend at the edge. This guide covers:

1. **GitHub Integration** - Automatic deployments from GitHub repo
2. **Build Configuration** - npm build settings
3. **Environment Variables** - Per-environment configuration
4. **Branch Deployments** - Different URLs for different branches
5. **Custom Domains** - Optional custom domain setup

---

## Current Setup Status

Your Pages projects are already created:
```
development:  jobmatch-ai-dev           (uses develop branch)
staging:      jobmatch-ai-staging       (uses staging branch)
production:   jobmatch-ai-production    (uses main branch)
```

Alternative: Use GitHub Actions for deployments (see `CLOUDFLARE_CICD_PIPELINE.md`)

---

## Two Deployment Options

### Option 1: Built-in Git Integration (Simpler) ✅

Cloudflare Pages automatically builds and deploys when you push to GitHub.

**Pros:**
- ✅ Zero CI/CD configuration
- ✅ Automatic deployments on push
- ✅ Built-in GitHub integration
- ✅ Minimal setup

**Cons:**
- ❌ Limited control over build process
- ❌ Harder to run tests before deploy
- ❌ Can't coordinate with Workers deployments
- ❌ Less visibility into failures

**When to Use:** Simple projects with minimal testing

### Option 2: GitHub Actions Workflow (Recommended) ⭐

You control the entire build and deployment process via GitHub Actions.

**Pros:**
- ✅ Full control over build pipeline
- ✅ Run tests before deployment
- ✅ Coordinate frontend + backend deployment
- ✅ Better error handling and logging
- ✅ Manual approval gates

**Cons:**
- ⚠️ Requires GitHub Actions setup
- ⚠️ More configuration

**When to Use:** Production apps, teams, complex pipelines

**Recommendation:** ✅ **Use GitHub Actions (Option 2)** - already set up in your project

---

## Option 1: Built-in Git Integration Setup

If you want automatic Git deployments (simpler, no GitHub Actions needed):

### Step 1: Connect GitHub Repo to Cloudflare Pages

**In Cloudflare Dashboard:**

1. Go to **Workers & Pages**
2. Click **Pages**
3. Click **Create application**
4. Select **Connect to Git**
5. Authenticate with GitHub
6. Select repository: **application-tracking/jobmatch-ai**
7. Click **Begin setup**

### Step 2: Configure Build Settings

**Build configuration:**
```
Production branch:  main
Framework preset:   React
Build command:      npm run build
Build output dir:   dist
Node.js version:    22
```

**Environment variables:**
```
VITE_API_URL = https://jobmatch-ai-prod.workers.dev
VITE_SUPABASE_URL = https://lrzhpnsykasqrousgmdh.supabase.co
VITE_SUPABASE_ANON_KEY = (from Supabase Dashboard)
VITE_USE_WORKERS_API = true
VITE_CLOUDFLARE_PAGES = true
```

### Step 3: Deploy

Click **Save and deploy**

**Result:** Every push to `main` triggers automatic build and deployment

### Step 4: Setup Preview Deployments

**In Cloudflare Pages Settings:**

1. Go to **Pages** → **jobmatch-ai-production**
2. Click **Settings**
3. Scroll to **Builds & deployments**
4. Enable **Preview deployments**
   - Default: Deploy all pull requests
   - Each PR gets a unique preview URL

### Step 5: Test Deployment

Push to `main` and verify:
```bash
# Check deployment status
curl https://jobmatch-ai-production.pages.dev
# Should return HTML (not 404)

# Check API connectivity
curl https://jobmatch-ai-prod.workers.dev/health
# Should return {"status": "healthy"}
```

---

## Option 2: GitHub Actions Workflow (Recommended)

**Status:** Already configured in your project

**File:** `.github/workflows/cloudflare-deploy.yml`

This workflow handles Pages deployment automatically when you push to develop/staging/main.

### How It Works

1. **Push to branch**
   ```bash
   git push origin develop
   ```

2. **GitHub Actions triggers**
   - Runs tests (TypeScript, ESLint)
   - Builds frontend: `npm run build`
   - Deploys to Cloudflare Pages

3. **Frontend available at**
   ```
   https://jobmatch-ai-dev.pages.dev
   ```

**Advantages over Git integration:**
- ✅ Run tests before deployment (blocks bad deploys)
- ✅ Coordinate with Workers backend deployment
- ✅ Better control and visibility
- ✅ Manual deployment option

---

## Environment Variable Setup

### Where to Set Variables

**Option 1: Cloudflare Dashboard** (Built-in Git integration)
```
Pages → jobmatch-ai-production → Settings → Environment variables
```

**Option 2: GitHub Secrets** (GitHub Actions workflow)
```
Repository → Settings → Secrets and variables → Actions
```

### Required Variables

#### Build Time (Frontend Build)
```
VITE_API_URL
  Development:  https://jobmatch-ai-dev.workers.dev
  Staging:      https://jobmatch-ai-staging.workers.dev
  Production:   https://jobmatch-ai-prod.workers.dev

VITE_SUPABASE_URL
  All environments: https://lrzhpnsykasqrousgmdh.supabase.co

VITE_SUPABASE_ANON_KEY
  Supabase Dashboard → Project Settings → API → anon public key

VITE_USE_WORKERS_API
  All environments: "true"

VITE_CLOUDFLARE_PAGES
  All environments: "true"
```

### Environment Variables in wrangler-pages.toml

Your `wrangler-pages.toml` already declares these:

```toml
[env.production.vars]
VITE_API_URL = "https://jobmatch-ai-prod.workers.dev"
VITE_SUPABASE_URL = "https://lrzhpnsykasqrousgmdh.supabase.co"
VITE_SUPABASE_ANON_KEY = "your-production-anon-key"
VITE_USE_WORKERS_API = "true"
VITE_CLOUDFLARE_PAGES = "true"

[env.staging.vars]
VITE_API_URL = "https://jobmatch-ai-staging.workers.dev"
# ... etc
```

### Setting Variables via GitHub Secrets

If using GitHub Actions (recommended):

1. Go to **Repository → Settings → Secrets and variables → Actions**
2. Create repository secret: `SUPABASE_URL`
3. Create repository secret: `SUPABASE_ANON_KEY`

Workflow reads them:
```yaml
env:
  VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

---

## Branch Configuration

### Production Branch (main)
```
Repository: application-tracking/jobmatch-ai
Branch: main
Deployment: https://jobmatch-ai-production.pages.dev
```

### Staging Branch (staging)
```
Repository: application-tracking/jobmatch-ai
Branch: staging
Deployment: https://jobmatch-ai-staging.pages.dev
```

### Development Branch (develop)
```
Repository: application-tracking/jobmatch-ai
Branch: develop
Deployment: https://jobmatch-ai-dev.pages.dev
```

**In Cloudflare Dashboard:**

For each Pages project:
1. Go to **Pages → Project**
2. Click **Settings**
3. Scroll to **Git configuration**
4. Verify **Production branch** is correct:
   - jobmatch-ai-dev → develop
   - jobmatch-ai-staging → staging
   - jobmatch-ai-production → main

---

## Build Configuration

### Build Command

```bash
npm run build
```

**What it does:**
1. Installs dependencies: `npm ci`
2. TypeScript type check
3. Vite bundles React code
4. Outputs to `dist/` directory

### Build Output Directory

```
dist/
```

This is where your bundled React app lives. Cloudflare Pages serves from this directory.

### Node.js Version

**Set to: 22.x**

Matches your project's Node.js requirement.

**In Cloudflare Dashboard:**
1. **Pages → Project → Settings**
2. Scroll to **Build settings**
3. **Node.js version: 22**

### Root Directory

**Set to: /** (default - no subdirectory)

Your frontend code is in the root, not a subdirectory.

---

## Custom Domains (Optional)

Once deployed, you can add custom domains.

### Setup Custom Domain

**In Cloudflare Dashboard:**

1. Go to **Pages → jobmatch-ai-production**
2. Click **Custom domains**
3. Click **Add custom domain**
4. Enter domain: **jobmatch.ai** (or subdomain)
5. Add DNS records:
   - Type: CNAME
   - Name: api
   - Value: jobmatch-ai-prod.pages.dev
6. Cloudflare automatically sets up HTTPS/SSL

### DNS Configuration

If you own jobmatch.ai:

1. Point nameservers to Cloudflare:
   ```
   ns1.cloudflare.com
   ns2.cloudflare.com
   ```

2. Or add CNAME records to your registrar:
   ```
   api.jobmatch.ai CNAME jobmatch-ai-prod.pages.dev
   ```

3. Wait for DNS propagation (can take 24-48 hours)

---

## Preview Deployments

### Enable PR Previews

Every pull request gets its own temporary deployment URL.

**In Cloudflare Dashboard:**

1. **Pages → Project → Settings**
2. **Builds & deployments**
3. Enable **Preview deployments**
4. Select: **Deploy all pull requests**

**Result:**
- PR #123 → `pr-123.jobmatch-ai-production.pages.dev`
- Automatically deleted when PR closes

### Preview Environment Variables

PR previews use same variables as production by default.

To use different vars for PRs:
1. **Settings → Environment variables**
2. Add `preview` environment
3. Set different vars for previews

---

## Deployment Status & Monitoring

### GitHub Integration Status

If using built-in Git integration:

1. Go to **Pages → Project**
2. Click **Deployments** tab
3. See list of all deployments with:
   - Status (success/failed)
   - Branch name
   - Commit hash
   - Deployment time

### Check Deployment via CLI

```bash
# Using Wrangler
npx wrangler pages list jobmatch-ai-production

# Using Cloudflare API
curl https://api.cloudflare.com/client/v4/accounts/{accountId}/pages/projects \
  -H "Authorization: Bearer {token}"
```

### Monitor Performance

**In Cloudflare Dashboard:**

1. **Pages → Project → Analytics**
2. View:
   - Request count
   - Bandwidth usage
   - Error rates
   - Geographic distribution

---

## Troubleshooting

### Issue: "Build failed" in Cloudflare Dashboard

**Possible causes:**
1. Build command failed (npm run build)
2. Missing dependencies
3. TypeScript errors
4. Environment variables missing at build time

**Solution:**
```bash
# Test build locally
npm ci
npm run build

# Check for errors
npm run build:check

# Check lint
npm run lint
```

### Issue: "Deployment succeeded but shows blank page"

**Possible causes:**
1. React app failed to initialize
2. API calls failing (VITE_API_URL wrong)
3. Supabase connection issues
4. Static files not served correctly

**Solution:**
```bash
# Test locally
npm run dev
npm run preview

# Check browser console for errors
# Open deployed site → F12 → Console tab

# Verify API connectivity
curl https://jobmatch-ai-prod.workers.dev/health
```

### Issue: "Environment variables not available in build"

**If using Cloudflare Dashboard:**
1. Go to **Pages → Project → Settings**
2. **Environment variables** section
3. Add VITE_* variables
4. Redeploy (manual trigger)

**If using GitHub Actions:**
1. Go to **Repository → Settings → Secrets**
2. Add secrets
3. Push code to trigger workflow

### Issue: "Domain shows 'not found' error"

**Possible causes:**
1. DNS propagation not complete
2. CNAME record wrong
3. Domain not verified

**Solution:**
```bash
# Check DNS propagation
dig api.jobmatch.ai

# Should show CNAME to pages.dev domain
# Can take 24-48 hours to propagate

# Force Cloudflare DNS refresh
# Go to Cloudflare Dashboard → DNS
# Click "Review nameservers"
```

---

## Performance Optimization

### Caching

Cloudflare Pages automatically caches:
- Static assets (JS, CSS, images)
- HTML pages
- API responses (if Cache-Control headers set)

**Cache settings:**
```
/api/* → No cache (dynamic)
/static/* → 1 year cache
/*.js → 1 year cache
/*.css → 1 year cache
/ → 1 hour cache (HTML)
```

### Compression

Cloudflare automatically compresses:
- HTML
- CSS
- JavaScript
- JSON responses

### Content Delivery

Cloudflare Pages content delivered from 300+ edge locations worldwide.

**Automatic benefits:**
- Global CDN distribution
- Instant cache invalidation
- DDoS protection
- SSL/TLS encryption

---

## Security Headers

Cloudflare Pages automatically adds security headers:

```
Content-Security-Policy: default-src 'self'
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### Additional Security

To add more headers, use a Cloudflare Worker:

```typescript
// In your Workers project
export default {
  async fetch(request) {
    const response = await fetch(request);

    // Add custom headers
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-Custom-Header', 'value');

    return newResponse;
  }
};
```

---

## Deployment Checklist

- [ ] GitHub repo connected to Cloudflare Pages
- [ ] Production branch set to `main`
- [ ] Build command set to `npm run build`
- [ ] Build output directory set to `dist/`
- [ ] Node.js version set to 22
- [ ] Environment variables set:
  - [ ] VITE_API_URL
  - [ ] VITE_SUPABASE_URL
  - [ ] VITE_SUPABASE_ANON_KEY
- [ ] Test deployment succeeds
- [ ] Frontend loads at deployed URL
- [ ] API connectivity works
- [ ] Preview deployments enabled (optional)
- [ ] Custom domain configured (optional)

---

## Next Steps

1. **For Git Integration (Simpler):**
   - Connect GitHub repo in Cloudflare dashboard
   - Set environment variables
   - Test deployment

2. **For GitHub Actions (Recommended):**
   - Configure GitHub secrets
   - Existing workflow handles deployment
   - Test by pushing to develop

3. **Monitor & Optimize:**
   - Check Cloudflare analytics
   - Monitor error rates
   - Optimize build performance

---

## References

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Git Integration Guide](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Build Configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Environment Variables](https://developers.cloudflare.com/pages/functions/environmental-variables/)
- [Custom Domains](https://developers.cloudflare.com/pages/configuration/custom-domain/)

---

**Status:** ✅ Ready to deploy
