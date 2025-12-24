# GitHub Branch Protection Setup Guide

**Last Updated:** December 24, 2025
**Status:** Production Ready
**Repository:** cffrank/jobmatchAI

---

## Overview

This guide provides step-by-step instructions for configuring GitHub branch protection rules to ensure safe multi-environment deployments.

## Why Branch Protection?

Branch protection prevents:
- Direct pushes to production bypassing tests
- Merging broken code that fails CI/CD
- Accidental force pushes that rewrite history
- Deploying without peer review
- Production incidents from untested code

## Protection Strategy

### Three-Tier Protection

1. **main (production)** - Maximum protection
2. **staging (pre-production)** - Strong protection
3. **develop (integration)** - Moderate protection

---

## Setup Instructions

### Access Branch Protection Settings

1. Go to https://github.com/cffrank/jobmatchAI
2. Click **Settings** (top navigation)
3. Click **Branches** (left sidebar)
4. Click **Add branch protection rule**

---

## Main Branch Protection (Production)

### Step 1: Create Rule for Main

1. In "Branch name pattern", enter: `main`
2. Configure the following settings:

### Step 2: Configure Protection Settings

**Require pull request before merging:**
- ✅ Enable this checkbox
- **Required approvals:** 1
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require review from Code Owners (if CODEOWNERS file exists)
- ❌ Require approval of the most recent reviewable push (optional, strict mode)

**Require status checks to pass before merging:**
- ✅ Enable this checkbox
- ✅ Require branches to be up to date before merging
- Add required status checks (search and select):
  - `Backend Tests`
  - `Frontend Tests`
  - `E2E Tests`
  - `Deploy Backend` (optional - ensures staging was deployed successfully)

**Require conversation resolution before merging:**
- ✅ Enable this checkbox (ensures all PR comments are addressed)

**Require signed commits:**
- ❌ Leave unchecked (optional, adds complexity)

**Require linear history:**
- ✅ Enable this checkbox (prevents merge commits, keeps history clean)
- Alternative: Leave unchecked if team prefers merge commits

**Require deployments to succeed before merging:**
- ❌ Leave unchecked (not applicable for GitHub deployments)

**Lock branch:**
- ❌ Leave unchecked (would prevent all pushes)

**Do not allow bypassing the above settings:**
- ✅ Enable this checkbox (enforces rules even for admins)
- Alternative: Leave unchecked if you want admin override capability

**Restrict who can push to matching branches:**
- ❌ Leave unchecked (too restrictive for small teams)
- Alternative: Enable and add specific team members if needed

**Allow force pushes:**
- ❌ Leave unchecked (never allow force push to main)

**Allow deletions:**
- ❌ Leave unchecked (never allow branch deletion)

### Step 3: Save Protection Rule

Click **Create** or **Save changes**

---

## Staging Branch Protection (Pre-Production)

### Step 1: Create Rule for Staging

1. Click **Add branch protection rule** again
2. In "Branch name pattern", enter: `staging`

### Step 2: Configure Protection Settings

**Require pull request before merging:**
- ✅ Enable this checkbox
- **Required approvals:** 1 (can be 0 for solo dev, but 1 recommended)
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ❌ Require review from Code Owners

**Require status checks to pass before merging:**
- ✅ Enable this checkbox
- ✅ Require branches to be up to date before merging
- Add required status checks:
  - `Backend Tests`
  - `Frontend Tests`
  - `E2E Tests`

**Require conversation resolution before merging:**
- ✅ Enable this checkbox

**Require linear history:**
- ✅ Enable this checkbox

**Do not allow bypassing the above settings:**
- ❌ Leave unchecked (allow admin bypass for staging)

**Allow force pushes:**
- ❌ Leave unchecked

**Allow deletions:**
- ❌ Leave unchecked

### Step 3: Save Protection Rule

Click **Create**

---

## Develop Branch Protection (Integration)

### Step 1: Create Rule for Develop

1. Click **Add branch protection rule** again
2. In "Branch name pattern", enter: `develop`

### Step 2: Configure Protection Settings

**Require pull request before merging:**
- ✅ Enable this checkbox
- **Required approvals:** 0 (for solo dev) or 1 (for teams)
- ❌ Dismiss stale pull request approvals when new commits are pushed
- ❌ Require review from Code Owners

**Require status checks to pass before merging:**
- ✅ Enable this checkbox
- ❌ Require branches to be up to date before merging (too strict for develop)
- Add required status checks:
  - `Backend Tests`
  - `Frontend Tests`

**Require conversation resolution before merging:**
- ❌ Leave unchecked (too strict for develop)

**Require linear history:**
- ❌ Leave unchecked (allow merge commits for develop)

**Do not allow bypassing the above settings:**
- ❌ Leave unchecked (allow admin bypass for develop)

**Allow force pushes:**
- ❌ Leave unchecked

**Allow deletions:**
- ❌ Leave unchecked

### Step 3: Save Protection Rule

Click **Create**

---

## Verification

### Verify Protection Rules Are Active

1. Go to Settings → Branches
2. You should see three branch protection rules:
   ```
   Branch protection rules (3)
   ├── main - 1 approval, 3 status checks required
   ├── staging - 1 approval, 3 status checks required
   └── develop - 3 status checks required
   ```

### Test Protection Rules

#### Test Main Branch Protection

```bash
# This should FAIL (direct push blocked)
git checkout main
echo "test" >> README.md
git add README.md
git commit -m "test: direct push to main"
git push origin main
# Expected: Error: protected branch update failed

# This should SUCCEED (via PR)
git checkout -b test/protection-check
echo "test" >> README.md
git add README.md
git commit -m "test: verify branch protection"
git push origin test/protection-check
gh pr create --base main --title "Test: Branch Protection"
# Then merge via GitHub UI after tests pass
```

#### Test Staging Branch Protection

```bash
# Direct push should fail
git checkout staging
echo "test" >> README.md
git add README.md
git commit -m "test: direct push to staging"
git push origin staging
# Expected: Error

# PR should work
git checkout -b test/staging-protection
git push origin test/staging-protection
gh pr create --base staging --title "Test: Staging Protection"
```

#### Test Develop Branch Protection

```bash
# Direct push should fail
git checkout develop
echo "test" >> README.md
git add README.md
git commit -m "test: direct push to develop"
git push origin develop
# Expected: Error

# PR should work (even without approval if configured for 0 approvals)
git checkout -b test/develop-protection
git push origin test/develop-protection
gh pr create --base develop --title "Test: Develop Protection"
```

---

## Status Check Names

The status check names must match exactly what GitHub Actions reports. Here's how to find them:

### Method 1: Check Actions Tab

1. Go to repository → Actions tab
2. Click on a recent workflow run
3. Look at the job names:
   - "Backend Tests" → status check name
   - "Frontend Tests" → status check name
   - "E2E Tests" → status check name
   - "Deploy Backend" → status check name

### Method 2: Check Workflow Files

Look at `jobs.<job-id>.name` in workflow files:

**.github/workflows/test.yml:**
```yaml
jobs:
  backend-tests:
    name: Backend Tests  # ← This is the status check name
```

**.github/workflows/deploy-backend-railway.yml:**
```yaml
jobs:
  deploy:
    name: Deploy Backend  # ← This is the status check name
```

### Common Status Checks

For JobMatch AI project:
- `Backend Tests` (from test.yml)
- `Frontend Tests` (from test.yml)
- `E2E Tests` (from test.yml)
- `Deploy Backend` (from deploy-backend-railway.yml)

---

## CODEOWNERS File (Optional)

If you want to require specific people to review certain files, create a CODEOWNERS file:

### Create CODEOWNERS

```bash
# Create file
cat > .github/CODEOWNERS << 'EOF'
# Code ownership for JobMatch AI

# Default owners for everything
* @cffrank

# Backend requires backend specialist review
/backend/ @cffrank

# Database changes require careful review
/supabase/ @cffrank

# CI/CD changes require DevOps review
/.github/workflows/ @cffrank

# Production environment variables
/.env.production* @cffrank
EOF

git add .github/CODEOWNERS
git commit -m "docs: add CODEOWNERS file for code review"
git push origin main
```

---

## Team Workflow After Protection

### Developer Workflow

```bash
# 1. Start from develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/new-feature

# 3. Make changes
# ... code, commit, push ...
git push origin feature/new-feature

# 4. Create PR to develop (can self-merge if 0 approvals required)
gh pr create --base develop --title "feat: new feature"

# 5. After PR merge, develop auto-deploys to development environment
# Test in development environment

# 6. When ready for staging, create PR: develop → staging
git checkout staging
git pull origin staging
gh pr create --base staging --head develop --title "Release: promote to staging"

# 7. After approval and merge, staging auto-deploys to staging environment
# QA team tests in staging

# 8. When QA passes, create PR: staging → main
gh pr create --base main --head staging --title "Release: deploy to production"

# 9. After approval and merge, main auto-deploys to production
```

### Solo Developer Workflow (Simplified)

If you're working solo and have 0 approvals required:

```bash
# Quick merge to develop
git checkout develop
git merge feature/new-feature
git push origin develop
# Auto-deploys to development

# Quick merge to staging (after testing in dev)
git checkout staging
git merge develop
git push origin staging
# Auto-deploys to staging

# Quick merge to main (after QA in staging)
git checkout main
git merge staging
git push origin main
# Auto-deploys to production
```

Note: Even with 0 approvals, you still need to create PRs (branch protection blocks direct pushes).

---

## Bypassing Protection (Emergency Use Only)

### When to Bypass

Only in true emergencies:
- Production is down and immediate hotfix needed
- Critical security vulnerability
- Data loss prevention

### How to Bypass (If Allowed)

If you unchecked "Do not allow bypassing the above settings":

1. You can push directly if you're an admin
2. Use with extreme caution
3. Document why bypass was necessary
4. Create follow-up PR to show what was changed

### Recommended: Never Allow Bypass

For production applications, it's safer to:
- Keep protection strict (no bypass allowed)
- Use Railway dashboard rollback for emergencies
- Fix forward with emergency PR (get fast approval)

---

## Troubleshooting

### PR Can't Merge - Status Checks Not Passing

**Solution:**
1. Check GitHub Actions tab for failing workflow
2. Fix the issue in your branch
3. Push new commit - checks will re-run
4. Wait for green checkmarks

### PR Can't Merge - Approvals Required

**Solution:**
1. Request review from team member
2. Address review feedback
3. Get approval
4. Merge will unlock

### PR Can't Merge - Conflicts

**Solution:**
```bash
# Update your branch with latest from target
git checkout feature/your-branch
git fetch origin
git merge origin/main  # or origin/staging or origin/develop
# Resolve conflicts
git commit
git push origin feature/your-branch
```

### Status Check Not Showing Up

**Solution:**
1. Ensure workflow has run at least once
2. Check workflow name matches exactly (case-sensitive)
3. Wait a few minutes after first run
4. Edit branch protection rule and re-select status checks

### Can't Add Status Check to Branch Protection

**Solution:**
- Status check must have run at least once
- Make a commit to trigger workflows
- Wait for workflows to complete
- Refresh branch protection page
- Status checks should now appear in autocomplete

---

## Security Considerations

### Why These Settings Matter

| Setting | Why It Matters | Impact if Disabled |
|---------|---------------|-------------------|
| Require PR | Prevents direct pushes | Could push broken code to prod |
| Require approvals | Peer review catches bugs | Solo dev might miss issues |
| Require status checks | Automated testing | Could deploy failing tests |
| Require up to date | Prevents stale merges | Could merge outdated code |
| No force push | Protects history | Could lose commits |
| No deletion | Protects branch | Could accidentally delete prod |
| No bypass | Enforces rules | Could skip all protections |

### Recommended for Production Apps

For money-making applications:
- ✅ Always require status checks
- ✅ Always require PRs
- ✅ Require at least 1 approval for main
- ✅ Never allow force push
- ✅ Never allow branch deletion
- ✅ Enable "Do not allow bypassing" for main

---

## Adjusting Over Time

### Start Conservative, Relax Later

**Week 1:**
- Strict protection on all branches
- 1 approval required everywhere
- All status checks required

**Week 2-4:**
- Keep strict protection on main
- Relax staging (0 approvals if solo dev)
- Relax develop (fewer required checks)

**Ongoing:**
- Monitor what's too strict
- Adjust based on team feedback
- Keep main protection strict always

---

## Quick Reference Card

### Branch Protection Summary

| Branch | PR Required | Approvals | Status Checks | Force Push | Bypass |
|--------|------------|-----------|---------------|-----------|--------|
| main | ✅ Yes | 1 | Backend, Frontend, E2E | ❌ No | ❌ No |
| staging | ✅ Yes | 1 | Backend, Frontend, E2E | ❌ No | ✅ Yes |
| develop | ✅ Yes | 0-1 | Backend, Frontend | ❌ No | ✅ Yes |

### Workflow After Protection

```
Feature branch → PR to develop → Auto-deploy to development
                                         ↓
              Develop → PR to staging → Auto-deploy to staging
                                         ↓
              Staging → PR to main → Auto-deploy to production
```

---

## Next Steps

After configuring branch protection:

1. **Test the protection rules** (try to push directly to main)
2. **Update team documentation** (README, CONTRIBUTING)
3. **Train team on new workflow**
4. **Create first test PR** (verify everything works)
5. **Monitor and adjust** (too strict? too loose?)

---

**Document Version:** 1.0
**Author:** Project Manager AI
**Related Docs:**
- `docs/RAILWAY-MULTI-ENVIRONMENT-SETUP.md`
- `docs/GITHUB-ACTIONS-MULTI-ENV.md`
- `docs/DEPLOYMENT-WORKFLOW-EXPLAINED.md`
