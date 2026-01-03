# Railway CLI Authentication Setup - Complete Package

**Date Created**: 2025-12-24
**Project**: JobMatch AI
**Status**: Complete and Production Ready

---

## Overview

This package provides comprehensive documentation and tools for Railway CLI authentication using user tokens for the JobMatch AI project. Everything you need to set up, manage, and troubleshoot Railway authentication is included.

---

## What Was Created

### Documentation Files

1. **docs/RAILWAY_TOKEN_SETUP.md** (5-10 min read)
   - Quick step-by-step token creation
   - GitHub Actions secret setup
   - Verification checklist
   - Troubleshooting quick reference
   - **Start here for quick setup**

2. **docs/RAILWAY_TOKEN_MANAGEMENT.md** (15-20 min read)
   - Detailed token creation and storage
   - Secure storage locations (password manager, GitHub)
   - Token rotation procedures
   - Monitoring and auditing guidelines
   - Incident response for compromised tokens
   - Comprehensive troubleshooting
   - **Read this for security details**

3. **docs/RAILWAY_AUTHENTICATION_REFERENCE.md** (Reference)
   - Complete authentication reference
   - All authentication methods
   - Environment variable guide
   - Verification commands
   - Troubleshooting decision tree
   - GitHub Actions integration
   - Best practices summary
   - **Use this as a comprehensive reference**

4. **docs/RAILWAY_COMPLETE_SETUP_INDEX.md** (Navigation)
   - Central index for all Railway documentation
   - Quick navigation by use case
   - Setup sequence
   - Document relationships
   - Maintenance schedule
   - **Use this to navigate the documentation**

5. **RAILWAY_AUTHENTICATION_SETUP_SUMMARY.md** (This directory)
   - Overview of what was created
   - How to use the documentation
   - Key concepts
   - Security checklist
   - Quick commands reference

### Script Files

6. **scripts/verify-railway-token.sh** (New)
   - Verify token is set in environment
   - Test token authentication
   - Check token scope and permissions
   - Full verification with diagnostics
   - **Usage**: `./scripts/verify-railway-token.sh [check-token|test-auth|verify-scope|full-check]`

### Updated Files

7. **scripts/verify-railway-deployment.sh** (Updated)
   - Enhanced to show token authentication method
   - Improved error messages with token setup guidance
   - Clear instructions for three authentication methods
   - Better troubleshooting information
   - **Backward compatible - all existing commands work**

---

## Quick Start (5 Minutes)

### Step 1: Create Your Token
1. Go to https://railway.app/dashboard
2. Click your profile icon → **Account**
3. Navigate to **Tokens** or **API Tokens**
4. Click **Create Token**
5. Name it "JobMatch AI CLI"
6. Copy the token immediately
7. Store it in your password manager

### Step 2: Add Token to GitHub Actions
1. Go to your GitHub repository
2. Settings → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `RAILWAY_TOKEN`
5. Value: Paste the token from Step 1
6. Click **Add secret**

### Step 3: Verify Setup
```bash
./scripts/verify-railway-token.sh
```

Expected output: "All token checks passed!"

### Step 4: Deploy
Push a change to the `main` branch and monitor the GitHub Actions workflow.

---

## Documentation Navigation

### If You Need To...

| Goal | Document | Time |
|------|----------|------|
| Create and use a Railway token | `docs/RAILWAY_TOKEN_SETUP.md` | 5 min |
| Understand all authentication options | `docs/RAILWAY_AUTHENTICATION_REFERENCE.md` | 10 min |
| Manage tokens securely and rotate them | `docs/RAILWAY_TOKEN_MANAGEMENT.md` | 15 min |
| Find the right guide for your situation | `docs/RAILWAY_COMPLETE_SETUP_INDEX.md` | varies |
| Verify your setup is working | Run `./scripts/verify-railway-token.sh` | 2 min |
| Understand the complete process | This file | 10 min |

---

## Key Concepts

### Token Types

| Type | Variable | Scope | Best For |
|------|----------|-------|----------|
| Project Token | `RAILWAY_TOKEN` | Single project | CI/CD pipelines (JobMatch AI) |
| Account Token | `RAILWAY_API_TOKEN` | All projects | Multi-project automation |

**For JobMatch AI**: Use `RAILWAY_TOKEN` exclusively.

### Storage Locations

| Location | Security | When To Use |
|----------|----------|-----------|
| Password Manager (1Password, LastPass, etc.) | Excellent | Primary token storage |
| GitHub Actions Secret | Excellent | CI/CD pipelines |
| Environment Variable (temporary) | Good | Local testing only |
| .env file (never) | Poor | DO NOT USE |

### Authentication Methods

| Method | Command | Setup Time | Best For |
|--------|---------|-----------|----------|
| Browser Login | `railway login` | 1 min | Local development |
| Browserless | `railway login --browserless` | 3 min | SSH/headless environments |
| Token Variable | `export RAILWAY_TOKEN="..."` | 5 min | CI/CD pipelines (recommended) |

---

## Security Checklist

Before considering setup complete:

**Token Creation and Storage**
- [ ] Token created in Railway dashboard
- [ ] Token copied to clipboard immediately
- [ ] Token stored in password manager (NOT in plaintext files)
- [ ] .env file added to .gitignore (if created)

**GitHub Actions Setup**
- [ ] Token added to GitHub secret: `RAILWAY_TOKEN`
- [ ] Repository Settings verified
- [ ] Workflow file uses: `${{ secrets.RAILWAY_TOKEN }}`

**Verification**
- [ ] Token tested locally: `railway whoami`
- [ ] Verification script passed: `./scripts/verify-railway-token.sh`
- [ ] Deployment workflow completed successfully
- [ ] Health check passed after deployment

**Ongoing Security**
- [ ] Token rotation scheduled (monthly)
- [ ] Access to token documented
- [ ] Activity monitored in Railway dashboard
- [ ] Incident response plan understood

---

## Quick Commands Reference

### Token Verification
```bash
# Check if token is set
echo $RAILWAY_TOKEN

# Verify authentication
railway whoami

# Full verification script
./scripts/verify-railway-token.sh full-check
```

### Setting Token for Testing
```bash
# Temporary (current session only)
export RAILWAY_TOKEN="your-token-here"

# From .env file
set -a
source .env
set +a

# Verify it works
railway status
```

### Deployment
```bash
# Automatic (push to main triggers workflow)
git push origin main

# Manual (if needed)
cd backend
railway up --service backend --detach

# View logs
railway logs --tail 100
```

### Verification Scripts
```bash
# Check token is set
./scripts/verify-railway-token.sh check-token

# Test authentication
./scripts/verify-railway-token.sh test-auth

# Full verification
./scripts/verify-railway-token.sh full-check

# Deployment verification
./scripts/verify-railway-deployment.sh full-check
```

---

## Troubleshooting Quick Reference

### Token Not Found in Environment
```bash
# Check if token is set
echo $RAILWAY_TOKEN

# If empty, set it
export RAILWAY_TOKEN="your-token-here"

# Verify it's set now
railway whoami
```

### "Unauthorized" or "Invalid token" Error
- Create new token: https://railway.app/dashboard → Account → Tokens
- Update GitHub secret with new token
- Test locally: `railway whoami`

### GitHub Actions Deployment Fails
1. Check GitHub Actions logs for error message
2. Verify secret exists: Settings → Secrets and variables → Actions
3. Verify secret name: `RAILWAY_TOKEN`
4. Verify workflow uses: `${{ secrets.RAILWAY_TOKEN }}`

### Verification Script Fails
```bash
# Run step-by-step verification
./scripts/verify-railway-token.sh check-token    # Is token set?
./scripts/verify-railway-token.sh test-auth      # Does it work?
./scripts/verify-railway-token.sh verify-scope   # Does it have permissions?
```

For more detailed troubleshooting, see `docs/RAILWAY_AUTHENTICATION_REFERENCE.md`.

---

## Setup Sequence (Complete)

If starting from scratch, follow this sequence:

1. **Create Token** (5 minutes)
   - Read: `docs/RAILWAY_TOKEN_SETUP.md` (skip if experienced)
   - Navigate: https://railway.app/dashboard
   - Create token in Account → Tokens
   - Copy to password manager

2. **Add to GitHub** (2 minutes)
   - Repository Settings → Secrets and variables → Actions
   - New secret: `RAILWAY_TOKEN` with your token value

3. **Configure Environment** (15 minutes)
   - Read: `docs/RAILWAY_SETUP_GUIDE.md`
   - Add 15+ environment variables in Railway dashboard
   - Each variable from your GitHub secrets

4. **Verify Setup** (5 minutes)
   - Run: `./scripts/verify-railway-token.sh`
   - Should pass all checks
   - Run: `./scripts/verify-railway-deployment.sh`
   - Should pass all checks

5. **Test Deployment** (varies by service)
   - Push change to main branch
   - Go to GitHub Actions tab
   - Monitor "Deploy Backend to Railway" workflow
   - Verify health check passes

**Total Time**: ~30 minutes (one-time setup)

---

## Monthly Maintenance

### Token Rotation (Monthly)
1. Create new token: https://railway.app/dashboard
2. Test locally: `export RAILWAY_TOKEN="new-token" && railway whoami`
3. Update GitHub secret with new token
4. Verify deployment succeeds
5. Delete old token from Railway dashboard

### Activity Review
- Check Railway dashboard for unexpected activity
- Review GitHub Actions logs for errors
- Monitor deployment success rate

### Documentation Updates
- Update if procedures change
- Review security guidelines
- Test verification scripts

---

## Related Documentation

### In This Package
- `docs/RAILWAY_TOKEN_SETUP.md` - Quick setup
- `docs/RAILWAY_TOKEN_MANAGEMENT.md` - Security and rotation
- `docs/RAILWAY_AUTHENTICATION_REFERENCE.md` - Complete reference
- `docs/RAILWAY_COMPLETE_SETUP_INDEX.md` - Navigation index
- `docs/RAILWAY_SETUP_GUIDE.md` - Environment variables
- `scripts/verify-railway-token.sh` - Token verification
- `scripts/verify-railway-deployment.sh` - Deployment verification

### External Resources
- [Railway CLI Documentation](https://docs.railway.com/develop/cli)
- [Railway API Tokens](https://docs.railway.com/develop/tokens)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

## Support

If you need help:

1. **For quick setup**: Read `docs/RAILWAY_TOKEN_SETUP.md`
2. **For security questions**: Read `docs/RAILWAY_TOKEN_MANAGEMENT.md`
3. **For troubleshooting**: See troubleshooting section in any guide
4. **To verify setup**: Run `./scripts/verify-railway-token.sh`
5. **For complete reference**: Read `docs/RAILWAY_AUTHENTICATION_REFERENCE.md`

---

## Summary

This package provides:

✓ **Step-by-step instructions** for token creation and setup
✓ **Security guidelines** for token storage and rotation
✓ **Verification scripts** to test your setup
✓ **Complete reference documentation** for all authentication methods
✓ **Troubleshooting guides** for common issues
✓ **Best practices** for production use
✓ **Maintenance procedures** for ongoing security

**Total Documentation**: ~8,000 words across 5 documents
**Verification Scripts**: 2 (1 new, 1 updated)
**Setup Time**: 5-30 minutes depending on starting point
**Status**: Complete and production-ready

---

## Next Steps

1. **If you haven't created a token yet**:
   - Go to: `docs/RAILWAY_TOKEN_SETUP.md`
   - Takes about 5 minutes

2. **If you have a token but haven't added it to GitHub**:
   - Follow Step 2 in `docs/RAILWAY_TOKEN_SETUP.md`
   - Takes about 2 minutes

3. **If you're testing locally**:
   - Run: `./scripts/verify-railway-token.sh`
   - Provides diagnostic output
   - Suggests next steps based on failures

4. **If everything is set up**:
   - Push code to trigger deployment
   - Monitor GitHub Actions
   - Verify health check passes
   - You now have automated deployment!

---

**Version**: 1.0
**Created**: 2025-12-24
**Project**: JobMatch AI v1.0+
**Status**: Complete and Production Ready

**Next Review**: 2025-01-24
