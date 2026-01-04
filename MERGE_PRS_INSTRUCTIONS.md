# Instructions to Merge PRs with Failing Tests

## Current Situation

You have 3 PRs that need to be merged:
- PR #21: Sync develop with main
- PR #20: Railway variables automation
- PR #19: CORS simplification

All have failing frontend tests (193 TypeScript errors from incomplete Supabase migration).

## Option 1: Temporarily Disable Branch Protection (Fastest)

### For Develop Branch:

1. Go to: https://github.com/cffrank/jobmatchAI/settings/rules
2. Find the rule for `develop` branch
3. Click "Edit"
4. Scroll to "Bypass list"
5. Add yourself as allowed to bypass
6. Save changes
7. Merge PR #21: https://github.com/cffrank/jobmatchAI/pull/21
8. Remove yourself from bypass list
9. Save changes

### For Main Branch (for PRs #19 and #20):

1. Go to: https://github.com/cffrank/jobmatchAI/settings/rules
2. Find the rule for `main` branch
3. Click "Edit"
4. Scroll to "Bypass list"
5. Add yourself as allowed to bypass
6. Save changes
7. Merge PR #19: https://github.com/cffrank/jobmatchAI/pull/19
8. Merge PR #20: https://github.com/cffrank/jobmatchAI/pull/20
9. Remove yourself from bypass list
10. Save changes

## Option 2: Fix Frontend Tests First

Fix the 193 TypeScript errors by regenerating Supabase types:

```bash
# Get your production Supabase project ref
# From: https://app.supabase.com/project/YOUR_PROJECT/settings/api

# Generate types
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/supabase.ts

# Commit and push
git add src/types/supabase.ts
git commit -m "fix: regenerate Supabase types from production schema"
git push

# Then PRs should pass tests
```

## Option 3: Merge via GitHub Web UI

Some organization/repository settings allow admins to merge despite failing checks via the web UI:

1. Go to PR #21: https://github.com/cffrank/jobmatchAI/pull/21
2. Look for "Merge pull request" button
3. If you see "Merge without waiting for requirements", click it
4. Repeat for PR #19 and #20

## Recommended Approach

**Use Option 1** - It's the fastest and these PRs contain code already on main (just syncing branches).

After merging:
1. Fix the frontend TypeScript errors (regenerate Supabase types)
2. Going forward, all new PRs will need passing tests

## Why Tests Are Failing

- Backend tests: ✅ PASS (51 tests)
- Frontend tests: ❌ FAIL (193 TypeScript errors)
- E2E tests: ❌ FAIL (dependent on frontend build)

The frontend errors are from incomplete Firebase → Supabase migration. Database types don't match the actual Supabase schema.

## Commands to Run After Merging

```bash
# 1. Merge PR #21 (via web UI with bypass)
# This syncs develop with main

# 2. Merge PR #19 (CORS simplification)
# 3. Merge PR #20 (Railway automation)

# 4. Update local branches
git checkout develop
git pull origin develop

git checkout staging
git pull origin staging
git merge develop
# (Will need PR to staging)

git checkout main
git pull origin main

# 5. Fix TypeScript errors by regenerating Supabase types
# See Option 2 above
```

## Summary

- **Immediate**: Use web UI bypass to merge PRs
- **Next**: Fix frontend TypeScript errors (regenerate Supabase types)
- **Going forward**: All PRs must pass tests before merge
