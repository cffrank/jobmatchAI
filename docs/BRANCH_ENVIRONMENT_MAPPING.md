# Branch to Environment Mapping

**Last Updated:** 2026-01-01

## Quick Reference

| Branch | Environment | Frontend URL | Backend URL | Supabase Branch |
|--------|------------|--------------|-------------|-----------------|
| `develop` | development | https://jobmatch-ai-dev.pages.dev | https://jobmatch-ai-dev.carl-f-frank.workers.dev | staging (wpupbucinufbaiphwogc) |
| `staging` | staging | https://jobmatch-ai-staging.pages.dev | https://jobmatch-ai-staging.carl-f-frank.workers.dev | staging (wpupbucinufbaiphwogc) |
| `main` | production | https://jobmatch-ai-production.pages.dev | https://jobmatch-ai-prod.carl-f-frank.workers.dev | main (lrzhpnsykasqrousgmdh) |

## Deployment Workflow

```
feature/x → develop → staging → main
            ↓         ↓          ↓
          dev env  staging   production
```

### Automatic Deployments

Pushing to any of these branches automatically triggers deployment via GitHub Actions:

**Workflow:** `.github/workflows/cloudflare-deploy.yml`

**Steps:**
1. Lint (frontend + backend)
2. Run Tests (type check + unit tests)
3. Provision Infrastructure (KV, R2, Vectorize, D1)
4. Deploy Frontend (Cloudflare Pages)
5. Deploy Backend (Cloudflare Workers)

**Timeline:** 10-15 minutes from push to live

### Protected Branch Rules

| Branch | PR Required | Approval Required | Tests Must Pass |
|--------|-------------|-------------------|-----------------|
| `main` | ✅ Yes | ✅ Yes | ✅ Yes |
| `staging` | ✅ Yes | ✅ Yes | ✅ Yes |
| `develop` | ✅ Yes | ❌ No | ✅ Yes |

**Never push directly to protected branches.** Always create PRs.

## Environment Details

### Development Environment

**Purpose:** Integration testing of new features from develop branch

**Branch:** `develop`

**Infrastructure:**
- **Cloudflare Pages Project:** jobmatch-ai-dev
- **Cloudflare Workers:** jobmatch-ai-dev.carl-f-frank.workers.dev
- **D1 Database:** DB (development environment)
- **KV Namespaces:** 6 namespaces (JOB_ANALYSIS_CACHE, SESSIONS, etc.)
- **R2 Buckets:**
  - jobmatch-ai-dev-avatars
  - jobmatch-ai-dev-resumes
  - jobmatch-ai-dev-exports
- **Vectorize Index:** jobmatch-ai-dev (768 dimensions)
- **AI Gateway:** jobmatch-ai-gateway-dev (shared with staging)

**Supabase:**
- **Branch:** staging (wpupbucinufbaiphwogc)
- **Database URL:** Same as production (lrzhpnsykasqrousgmdh)
- **Auth:** Shared with staging
- **Storage:** Separate buckets via path prefix

**Use Cases:**
- Testing feature branches after merging to develop
- Continuous integration testing
- Demo features to stakeholders before staging
- Developer experimentation

### Staging Environment

**Purpose:** Pre-production testing before deploying to main

**Branch:** `staging`

**Infrastructure:**
- **Cloudflare Pages Project:** jobmatch-ai-staging
- **Cloudflare Workers:** jobmatch-ai-staging.carl-f-frank.workers.dev
- **D1 Database:** DB (staging environment)
- **KV Namespaces:** 6 namespaces (JOB_ANALYSIS_CACHE, SESSIONS, etc.)
- **R2 Buckets:**
  - jobmatch-ai-staging-avatars
  - jobmatch-ai-staging-resumes
  - jobmatch-ai-staging-exports
- **Vectorize Index:** jobmatch-ai-staging (768 dimensions)
- **AI Gateway:** jobmatch-ai-gateway-dev (shared with development)

**Supabase:**
- **Branch:** staging (wpupbucinufbaiphwogc)
- **Database URL:** Same as production (lrzhpnsykasqrousgmdh)
- **Auth:** Shared with development
- **Storage:** Separate buckets via path prefix

**Use Cases:**
- Final testing before production release
- User acceptance testing (UAT)
- Performance testing with production-like data
- Security testing
- Client demos and approvals

### Production Environment

**Purpose:** Live application serving real users

**Branch:** `main`

**Infrastructure:**
- **Cloudflare Pages Project:** jobmatch-ai-production
- **Cloudflare Workers:** jobmatch-ai-prod.carl-f-frank.workers.dev
- **D1 Database:** DB (production environment)
- **KV Namespaces:** 6 namespaces (JOB_ANALYSIS_CACHE, SESSIONS, etc.)
- **R2 Buckets:**
  - jobmatch-ai-prod-avatars
  - jobmatch-ai-prod-resumes
  - jobmatch-ai-prod-exports
- **Vectorize Index:** jobmatch-ai-prod (768 dimensions)
- **AI Gateway:** jobmatch-ai-gateway-dev (shared, but production has priority)

**Supabase:**
- **Branch:** main (lrzhpnsykasqrousgmdh)
- **Database URL:** lrzhpnsykasqrousgmdh
- **Auth:** Production auth configuration
- **Storage:** Production buckets

**Use Cases:**
- Live user traffic
- Real business operations
- Production data
- Critical uptime requirements

## Git Workflow

### Creating a New Feature

```bash
# Start from develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: your feature description"

# Push to remote
git push origin feature/your-feature-name

# Create PR to develop
# Go to GitHub → Create Pull Request → Base: develop
```

### Deploying to Development

```bash
# After PR is approved and merged to develop
# GitHub Actions automatically deploys to development environment

# Monitor deployment
# Go to: https://github.com/YOUR_ORG/jobmatch-ai/actions

# Verify deployment
curl https://jobmatch-ai-dev.pages.dev
curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
```

### Deploying to Staging

```bash
# Create PR from develop to staging
git checkout staging
git pull origin staging

# Merge develop
git merge develop

# Push to trigger deployment
git push origin staging

# Or create PR on GitHub
# Go to GitHub → Create Pull Request → Base: staging, Compare: develop

# After PR approved and merged
# GitHub Actions automatically deploys to staging environment

# Verify deployment
curl https://jobmatch-ai-staging.pages.dev
curl https://jobmatch-ai-staging.carl-f-frank.workers.dev/health
```

### Deploying to Production

```bash
# Create PR from staging to main
git checkout main
git pull origin main

# Merge staging
git merge staging

# Push to trigger deployment
git push origin main

# Or create PR on GitHub
# Go to GitHub → Create Pull Request → Base: main, Compare: staging

# After PR approved and merged
# GitHub Actions automatically deploys to production environment

# Verify deployment
curl https://jobmatch-ai-production.pages.dev
curl https://jobmatch-ai-prod.carl-f-frank.workers.dev/health
```

## Environment Variables

### GitHub Secrets (Shared Across All Environments)

**Required:**
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with full permissions
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
- `SUPABASE_URL` - Supabase project URL (production)
- `SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

**Optional:**
- `SLACK_WEBHOOK_URL` - Slack notifications for deployments
- `OPENAI_API_KEY` - For AI feature testing
- `SENDGRID_API_KEY` - For email testing
- `APIFY_API_TOKEN` - For job scraping tests

### Environment-Specific Configuration

Configuration is managed in workflow via environment mapping:

**Development:**
```bash
VITE_API_URL=https://jobmatch-ai-dev.carl-f-frank.workers.dev
VITE_USE_WORKERS_API=true
VITE_CLOUDFLARE_PAGES=true
```

**Staging:**
```bash
VITE_API_URL=https://jobmatch-ai-staging.carl-f-frank.workers.dev
VITE_USE_WORKERS_API=true
VITE_CLOUDFLARE_PAGES=true
```

**Production:**
```bash
VITE_API_URL=https://jobmatch-ai-prod.carl-f-frank.workers.dev
VITE_USE_WORKERS_API=true
VITE_CLOUDFLARE_PAGES=true
```

## Monitoring and Logs

### GitHub Actions Logs

**URL:** https://github.com/YOUR_ORG/jobmatch-ai/actions

**What to Monitor:**
- Workflow run status (success/failure)
- Lint and test results
- D1 migration status
- Deployment completion
- Slack notifications (if configured)

### Cloudflare Pages Logs

**URL:** https://dash.cloudflare.com/pages

**Projects:**
- jobmatch-ai-dev (development)
- jobmatch-ai-staging (staging)
- jobmatch-ai-production (production)

**What to Monitor:**
- Build status
- Build logs
- Deployment history
- Custom domain configuration

### Cloudflare Workers Logs

**Development:**
```bash
cd workers
npx wrangler tail --env development
```

**Staging:**
```bash
cd workers
npx wrangler tail --env staging
```

**Production:**
```bash
cd workers
npx wrangler tail --env production
```

### Cloudflare D1 Logs

**Check migration history:**
```bash
cd workers

# Development
npx wrangler d1 execute DB --env development --remote \
  --command "SELECT * FROM d1_migrations ORDER BY id;"

# Staging
npx wrangler d1 execute DB --env staging --remote \
  --command "SELECT * FROM d1_migrations ORDER BY id;"

# Production
npx wrangler d1 execute DB --env production --remote \
  --command "SELECT * FROM d1_migrations ORDER BY id;"
```

## Troubleshooting

### Deployment Fails

**Check:**
1. GitHub Actions logs for error details
2. Lint errors (frontend + backend)
3. Test failures (type check + unit tests)
4. D1 migration failures
5. Cloudflare API token permissions

**Common Fixes:**
- Fix ESLint errors: `npm run lint -- --fix`
- Fix TypeScript errors: `npm run build:check`
- Fix failing tests: `npm run test`
- Check migration syntax: Review `.sql` files
- Verify GitHub secrets are set

### Site is Down After Deployment

**Check:**
1. Cloudflare Pages build status
2. Cloudflare Workers deployment status
3. D1 database connection
4. Environment variables in Cloudflare dashboard

**Common Fixes:**
- Re-run deployment: Push empty commit `git commit --allow-empty -m "chore: trigger redeploy"`
- Check build logs for missing dependencies
- Verify environment variables are correct
- Check CORS configuration in Workers

### Database Issues

**Check:**
1. D1 migration status in workflow logs
2. Supabase branch configuration
3. RLS policies in Supabase

**Common Fixes:**
- Re-run migrations: `npx wrangler d1 migrations apply DB --env [environment] --remote`
- Check Supabase dashboard for branch status
- Verify RLS policies allow access

## Related Documentation

- **CLAUDE.md** - Project overview and development guide
- **STAGING_DEPLOYMENT_ENABLED.md** - Staging branch deployment fix summary
- **docs/STAGING_BRANCH_DEPLOYMENT_FIX.md** - Detailed troubleshooting guide
- **docs/ENVIRONMENT_MAPPING.md** - Environment configuration details
- **docs/GITHUB_SECRETS_SETUP.md** - GitHub secrets configuration
- **docs/cloudflare-migration/CLOUDFLARE_WORKERS_SETUP.md** - Cloudflare setup guide

## Quick Commands

```bash
# Check current branch
git branch

# Check branch status
git status

# Pull latest changes
git pull origin [branch-name]

# Create feature branch
git checkout -b feature/name

# Push to remote
git push origin [branch-name]

# Test frontend locally
npm run dev

# Test backend locally
cd backend && npm run dev

# Run E2E tests against environment
FRONTEND_URL=https://jobmatch-ai-dev.pages.dev \
BACKEND_URL=https://jobmatch-ai-dev.carl-f-frank.workers.dev \
npm run test:e2e
```
