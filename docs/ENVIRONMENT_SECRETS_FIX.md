# Environment Secrets Fix Guide

## Problem
Deployed site at https://jobmatch-ai-dev.pages.dev is using the old Supabase URL despite repository secret updates.

## Root Cause
**GitHub Actions uses ENVIRONMENT SECRETS which override repository secrets.**

The workflow file (`.github/workflows/cloudflare-deploy.yml:643`) specifies:
```yaml
environment:
  name: development  # This triggers environment-specific secrets
```

When a job uses an `environment`, GitHub Actions prioritizes secrets from that environment over repository-level secrets.

## Evidence
1. **Environment secret is stale:**
   - `development.SUPABASE_URL` updated: 2026-01-02 05:25:35Z
   - Repository `SUPABASE_URL` updated: 2026-01-02 05:31:56Z
   - Environment secret is 6 minutes older = contains old value

2. **Bundle hash proves wrong URL:**
   - Deployed bundle: `index-Co9mxEZp.js` (old URL)
   - Local build with correct URL: `index-DVPlaAJ-.js`
   - Vite generates deterministic hashes, so different hash = different input

3. **Deployed JavaScript confirms:**
   ```bash
   $ curl https://jobmatch-ai-dev.pages.dev/assets/index-Co9mxEZp.js | grep supabase
   https://reydhyovetjupyxhfayo.supabase.co  # OLD URL ❌
   ```

## The Fix

### Step 1: Update Development Environment Secrets

1. Go to: https://github.com/cffrank/jobmatchAI/settings/environments
2. Click on **"development"** environment
3. Update these secrets:

   **SUPABASE_URL:**
   ```
   https://wpupbucinufbaiphwogc.supabase.co
   ```

   **SUPABASE_ANON_KEY:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdXBidWNpbnVmYmFpcGh3b2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3MzMzMzEsImV4cCI6MjA1MTMwOTMzMX0.mnUONVTFnCCwdcLGQQw1AHpxKv49xFI2yP3HXbNx4Pw
   ```

### Step 2: Update Staging Environment Secrets

1. Click on **"staging"** environment
2. Update the same secrets (staging uses the same Supabase project):

   **SUPABASE_URL:**
   ```
   https://wpupbucinufbaiphwogc.supabase.co
   ```

   **SUPABASE_ANON_KEY:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdXBidWNpbnVmYmFpcGh3b2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU3MzMzMzEsImV4cCI6MjA1MTMwOTMzMX0.mnUONVTFnCCwdcLGQQw1AHpxKv49xFI2yP3HXbNx4Pw
   ```

### Step 3: Verify Production Environment (Optional)

Production should already have the correct values. Verify:

**SUPABASE_URL:**
```
https://lrzhpnsykasqrousgmdh.supabase.co
```

**SUPABASE_ANON_KEY:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemhwbnN5a2FzcXJvdXNnbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM4NzMzNTUsImV4cCI6MjA0OTQ0OTM1NX0.4GcCU7l5l28JW-WJEn_u8kW6Faw6Qyu3r_tz9NeWbLo
```

### Step 4: Trigger Deployment

Push an empty commit to trigger deployment:
```bash
git commit --allow-empty -m "chore: trigger deployment with updated environment secrets"
git push origin develop
```

### Step 5: Verify Deployment

1. **Check bundle hash changed:**
   ```bash
   curl -s https://jobmatch-ai-dev.pages.dev/ | grep -o "index-[^\"']*.js"
   ```
   Should show a DIFFERENT filename than `index-Co9mxEZp.js`

2. **Check Supabase URL updated:**
   ```bash
   curl -s https://jobmatch-ai-dev.pages.dev/assets/index-*.js | grep -o "https://[^\"']*supabase[^\"']*"
   ```
   Should show: `https://wpupbucinufbaiphwogc.supabase.co`

3. **Test authentication:**
   - Open https://jobmatch-ai-dev.pages.dev
   - Try to log in
   - Should work (no `ERR_NAME_NOT_RESOLVED`)

## Alternative Solutions

### Option 2: Remove Environment from Workflow
If you don't need environment-specific secrets, you can remove the environment block from the workflow:

Edit `.github/workflows/cloudflare-deploy.yml` and DELETE lines 642-644:
```yaml
environment:
  name: ${{ github.event_name == 'workflow_dispatch' ... }}
  url: ${{ github.ref_name == 'develop' && 'https://...' }}
```

**Pros:** Simpler, uses repository secrets
**Cons:** Loses deployment environment tracking and protection rules

### Option 3: Delete Environment
Delete the "development" environment entirely via GitHub UI.

**Pros:** Forces use of repository secrets
**Cons:** Loses all deployment history

## Understanding GitHub Secrets Hierarchy

```
┌─────────────────────────────────────┐
│  Repository Secrets (lowest)         │  ← Updated, but not used
└─────────────────────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Environment Secrets (highest)       │  ← Used when job specifies environment
└─────────────────────────────────────┘
```

When a GitHub Actions job specifies an `environment`, secrets are resolved in this order:
1. **Environment secrets** (highest priority)
2. **Repository secrets** (only if not found in environment)

This is why updating repository secrets didn't work - the environment secrets took precedence.

## Why Previous Fixes Failed

1. **Commit 459340a** - Updated REPOSITORY secrets (ignored)
2. **Commit 352ce2f** - Triggered deploy (still used environment secrets)
3. **Commit 727c8d6** - Changed source code (but env vars were wrong, so same hash was generated)

All deployments succeeded but used the WRONG secrets from the environment!

## Lessons Learned

1. **Environment secrets ALWAYS override repository secrets** when a job uses an `environment`
2. Empty commits don't fix configuration issues
3. Vite generates **deterministic bundle hashes** - same input produces same output
4. Always verify which secrets your workflow is actually using
5. Use environment secrets for proper multi-environment deployments (dev/staging/prod)

## Related Files

- **Workflow:** `.github/workflows/cloudflare-deploy.yml`
- **Config:** `src/lib/config.ts`
- **Supabase client:** `src/lib/supabase.ts`
- **GitHub Environments:** https://github.com/cffrank/jobmatchAI/settings/environments
- **Repository Secrets:** https://github.com/cffrank/jobmatchAI/settings/secrets/actions

## References

- [GitHub Docs: Environment Secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-an-environment)
- [GitHub Docs: Using Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Vite: Build Caching](https://vite.dev/guide/build.html#public-base-path)
