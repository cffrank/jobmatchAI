# Railway CLI Authentication Setup - START HERE

**Date**: 2025-12-24
**Project**: JobMatch AI
**Time to Complete**: 5-30 minutes

---

## What You Need to Do (Choose One)

### Option A: Quick Setup (5-15 minutes)
You just need to get the token working quickly.

**Follow these steps**:
1. Read: `docs/RAILWAY_TOKEN_SETUP.md` (5 min)
2. Create token at https://railway.app/dashboard (2 min)
3. Add to GitHub Actions (2 min)
4. Run verification: `./scripts/verify-railway-token.sh` (2 min)
5. Done! Deployment is automatic

### Option B: Complete Understanding (30-45 minutes)
You want to understand the entire system and security.

**Follow these steps**:
1. Read: `RAILWAY_AUTHENTICATION_COMPLETE.md` (10 min)
2. Read: `docs/RAILWAY_TOKEN_SETUP.md` (5 min)
3. Create and configure token (10 min)
4. Read: `docs/RAILWAY_TOKEN_MANAGEMENT.md` (15 min)
5. Set up monthly rotation reminder
6. Done! You understand the complete system

### Option C: Troubleshooting (varies)
Something isn't working.

**Follow these steps**:
1. Run: `./scripts/verify-railway-token.sh`
2. Look at the error message
3. Go to: `docs/RAILWAY_AUTHENTICATION_REFERENCE.md`
4. Find the "Troubleshooting" section
5. Follow the suggested fix
6. Re-run verification
7. Done!

---

## The 5-Minute Quick Start

If you're in a hurry:

```bash
# Step 1: Create token (2 min)
# Go to: https://railway.app/dashboard
# Profile → Account → Tokens → Create Token
# Copy the token

# Step 2: Add to GitHub (1 min)
# Settings → Secrets and variables → Actions
# New secret: RAILWAY_TOKEN = [paste token]

# Step 3: Verify (2 min)
./scripts/verify-railway-token.sh

# Step 4: Deploy (automatic)
# Push to main branch, watch GitHub Actions
```

Done! Your Railway CLI is authenticated.

---

## What Was Created

I've created comprehensive documentation and verification tools:

**Documentation** (read in this order):
1. `docs/RAILWAY_TOKEN_SETUP.md` - Quick setup instructions
2. `docs/RAILWAY_TOKEN_MANAGEMENT.md` - Security and rotation
3. `docs/RAILWAY_AUTHENTICATION_REFERENCE.md` - Complete reference
4. `docs/RAILWAY_COMPLETE_SETUP_INDEX.md` - Navigation index

**Verification Tools**:
1. `scripts/verify-railway-token.sh` - Token verification (NEW)
2. `scripts/verify-railway-deployment.sh` - Deployment verification (UPDATED)

**Summary Documents**:
1. `RAILWAY_AUTHENTICATION_SETUP_SUMMARY.md` - Overview
2. `RAILWAY_AUTHENTICATION_COMPLETE.md` - Complete summary
3. `RAILWAY_AUTHENTICATION_FILES_MANIFEST.md` - File index
4. `RAILWAY_QUICK_REFERENCE_CARD.md` - Quick reference

---

## Key Information

### Token Types

For JobMatch AI, use: `RAILWAY_TOKEN`
- Scope: Single project (JobMatch AI)
- Usage: CI/CD deployment
- Environment variable: `RAILWAY_TOKEN`
- GitHub secret name: `RAILWAY_TOKEN`

### Storage

Primary locations:
1. **Password Manager** - Store your token here (1Password, LastPass, etc.)
2. **GitHub Actions Secret** - For CI/CD deployment
3. **Environment Variable** - For local testing only (temporary)

Never store in:
- Git repositories
- .env files that are committed
- Plaintext notes
- Email or chat

### Verification

Quick verification:
```bash
./scripts/verify-railway-token.sh
```

Manual verification:
```bash
echo $RAILWAY_TOKEN
railway whoami
railway status
```

---

## Next Steps by Situation

### If You Haven't Created a Token Yet
Read: `docs/RAILWAY_TOKEN_SETUP.md` (5 minutes)
- Step-by-step instructions
- GitHub Actions setup
- Verification checklist

### If You Have a Token But Haven't Added It to GitHub
Go to:
1. Your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `RAILWAY_TOKEN`
5. Value: [paste your token]
6. Click "Add secret"
7. Done! (2 minutes)

### If You're Testing Locally
```bash
# Set token temporarily
export RAILWAY_TOKEN="your-token-here"

# Test
./scripts/verify-railway-token.sh

# Clean up when done
unset RAILWAY_TOKEN
```

### If Something Isn't Working
1. Run: `./scripts/verify-railway-token.sh`
2. Read the error message carefully
3. Check: `docs/RAILWAY_AUTHENTICATION_REFERENCE.md` - Troubleshooting
4. Try the suggested fix
5. Run verification again

### If You Want to Understand Everything
Read in order:
1. `RAILWAY_AUTHENTICATION_COMPLETE.md` (overview)
2. `docs/RAILWAY_TOKEN_SETUP.md` (quick setup)
3. `docs/RAILWAY_TOKEN_MANAGEMENT.md` (security details)

---

## Common Commands

```bash
# Check if token is set
echo $RAILWAY_TOKEN

# Verify authentication
railway whoami

# Full verification
./scripts/verify-railway-token.sh

# Deployment verification
./scripts/verify-railway-deployment.sh

# View deployment logs
railway logs --tail 100

# List projects
railway project list
```

---

## Monthly Tasks

Every month (set a calendar reminder):

1. Create new token at https://railway.app/dashboard
2. Test locally: `export RAILWAY_TOKEN="new" && railway whoami`
3. Update GitHub secret with new token
4. Deploy something to verify it works
5. Delete old token from railway.app dashboard

**Time**: About 10 minutes

---

## Security Checklist

Before considering setup complete:

- [ ] Token created in Railway dashboard
- [ ] Token stored in password manager (NOT in Git)
- [ ] Token added to GitHub secret: `RAILWAY_TOKEN`
- [ ] `.env` file (if created) added to `.gitignore`
- [ ] Token tested: `railway whoami`
- [ ] Verification script passed
- [ ] Deployment workflow succeeded
- [ ] Health check passed
- [ ] Monthly rotation reminder set

---

## Files Quick Reference

| Need | File | Time |
|------|------|------|
| Quick setup | `docs/RAILWAY_TOKEN_SETUP.md` | 5 min |
| Understand security | `docs/RAILWAY_TOKEN_MANAGEMENT.md` | 15 min |
| Complete reference | `docs/RAILWAY_AUTHENTICATION_REFERENCE.md` | reference |
| Navigate docs | `docs/RAILWAY_COMPLETE_SETUP_INDEX.md` | 5 min |
| Quick verification | `./scripts/verify-railway-token.sh` | 2 min |
| Print this | `RAILWAY_QUICK_REFERENCE_CARD.md` | - |

---

## What Happens After Setup

### Automatic Deployment
Once set up, deployment is automatic:
1. You push code to `main` branch
2. GitHub Actions workflow triggers
3. Workflow uses `RAILWAY_TOKEN` to authenticate
4. Backend deploys to Railway
5. Health check verifies it works
6. You're done!

### No More Manual Steps
- No manual authentication needed
- No need to run commands for deployment
- No need to manage credentials on your machine
- Token is secure in GitHub

### Security Benefits
- Token masked in logs (never displayed)
- GitHub manages secret rotation
- Only GitHub Actions has access
- No token exposure in code

---

## Getting Help

### Quick Questions
Check: `RAILWAY_QUICK_REFERENCE_CARD.md`

### Setup Help
Read: `docs/RAILWAY_TOKEN_SETUP.md`

### Troubleshooting
1. Run: `./scripts/verify-railway-token.sh`
2. Read: `docs/RAILWAY_AUTHENTICATION_REFERENCE.md` (Troubleshooting section)

### Security Questions
Read: `docs/RAILWAY_TOKEN_MANAGEMENT.md`

### Complete Understanding
Read: `RAILWAY_AUTHENTICATION_COMPLETE.md`

### Can't Find What You Need?
Go to: `docs/RAILWAY_COMPLETE_SETUP_INDEX.md` for navigation

---

## The Bottom Line

You need:
1. A Railway token (from https://railway.app/dashboard)
2. That token in GitHub Actions secret
3. Everything else is automatic

**Time to set up**: 5-15 minutes
**Time to understand**: 30-45 minutes
**Time to maintain**: 10 minutes per month

---

## Real Quick Start (TL;DR)

```
1. Go: https://railway.app/dashboard
2. Create token, copy it
3. Go: GitHub repo Settings → Secrets → Actions
4. New secret: RAILWAY_TOKEN = [paste token]
5. Run: ./scripts/verify-railway-token.sh
6. Done!
```

---

## Questions?

1. **How do I create a token?** → `docs/RAILWAY_TOKEN_SETUP.md`
2. **Where do I store the token?** → `docs/RAILWAY_TOKEN_MANAGEMENT.md`
3. **How do I verify it works?** → Run `./scripts/verify-railway-token.sh`
4. **What if it fails?** → `docs/RAILWAY_AUTHENTICATION_REFERENCE.md` - Troubleshooting
5. **I want to understand it all** → `RAILWAY_AUTHENTICATION_COMPLETE.md`
6. **Quick reference** → `RAILWAY_QUICK_REFERENCE_CARD.md`

---

## What's Different From Before?

Before: Manual deployment, manual authentication required
After: Automatic deployment with secure token authentication

Benefits:
✓ Faster deployments (automatic)
✓ More secure (token managed by GitHub)
✓ No manual steps
✓ No credentials on your machine
✓ Easy to rotate monthly
✓ Audit trail in GitHub Actions

---

## Next Action

Choose one:

**Option A** (Fastest): Read `docs/RAILWAY_TOKEN_SETUP.md` right now (5 minutes)

**Option B** (Complete): Read `RAILWAY_AUTHENTICATION_COMPLETE.md` first (10 minutes)

**Option C** (Troubleshooting): Run `./scripts/verify-railway-token.sh` first (2 minutes)

---

**Created**: 2025-12-24
**For**: JobMatch AI v1.0+
**Status**: Production Ready

You're ready to go. Pick an option above and get started!
