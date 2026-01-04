# Railway Token Management Guide

## Overview

This document provides comprehensive guidelines for managing Railway authentication tokens for the JobMatch AI project, including creation, storage, rotation, and security best practices.

## Token Creation

### Step 1: Access Railway Dashboard
1. Navigate to [https://railway.app/dashboard](https://railway.app/dashboard)
2. Log in with your Railway account
3. Click your **profile icon** in the top-right corner
4. Select **Account**

### Step 2: Generate New Token
1. Navigate to **API Tokens** or **Tokens** section
2. Click **Create Token** or **New Token** button
3. Configure token settings:
   - **Token Name**: "JobMatch AI CLI" (descriptive name)
   - **Scope**: Personal Account (for JobMatch AI)
   - **Expiration**: Optional (railway may default to no expiration)
4. Click **Create**

### Step 3: Copy Token Immediately
- The token will only be displayed once
- Copy it immediately to clipboard
- Store it in your password manager before closing
- Do NOT save in plaintext files or Git repositories

## Token Storage

### Secure Storage Locations

#### Password Manager (Recommended)
Store token in your preferred password manager:
- **1Password**: Secure Note with token value
- **LastPass**: Secure Note
- **Bitwarden**: Secure Note
- **macOS Keychain**: Add to Keychain
- **Linux KeePass**: Add to KeePass database

#### GitHub Actions Secrets (For CI/CD)
1. Go to repository **Settings**
2. Navigate to **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Create secret:
   - **Name**: `RAILWAY_TOKEN`
   - **Secret**: Paste token from password manager
5. Click **Add secret**

#### Environment Variables (For Local Testing Only)
For temporary local testing:
```bash
# In terminal session
export RAILWAY_TOKEN="your-token-here"

# Test authentication
railway whoami

# Unset when done
unset RAILWAY_TOKEN
```

### Insecure Storage Locations (DO NOT USE)

- Plain text files (`.env`, `.txt`, etc.)
- Code comments or documentation
- Email or chat messages
- Browser history or autofill
- Commit messages or Git history
- Shared documents or spreadsheets

## Token Security Best Practices

### 1. Access Control
- Store token with other critical credentials
- Limit who has access to the token
- Use password manager permissions to restrict access
- Document who has token access in your team

### 2. Rotation Schedule
- **Frequency**: Rotate monthly or quarterly
- **Procedure**:
  1. Generate new token in Railway dashboard
  2. Add new token to GitHub Actions secret
  3. Wait for next deployment to verify it works
  4. Delete old token from Railway dashboard
  5. Verify no failed deployments due to missing token

### 3. Monitoring and Auditing
- Check Railway dashboard for suspicious deployment activity
- Review GitHub Actions workflow logs monthly
- Look for failed authentication attempts
- Monitor project resource changes

### 4. Incident Response
If token is compromised:
1. **Immediately delete** the token from Railway dashboard
2. **Revoke** in GitHub Actions by updating secret
3. **Generate new** token in Railway dashboard
4. **Update** all references (GitHub secret, documentation, etc.)
5. **Verify** deployment works with new token
6. **Audit** Railway project for unauthorized changes
7. **Document** the incident and timeline

## Token Usage

### In CI/CD Workflows
The token is already configured in deployment workflows:

**File**: `.github/workflows/deploy-backend-railway.yml`
```yaml
env:
  RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

This automatically:
- Authenticates deployment commands
- Masks token in logs (never displays)
- Uses secure secret management
- Rotates with GitHub secret updates

### Local Testing
For local development and testing:
```bash
# Set token temporarily
export RAILWAY_TOKEN="your-token-here"

# Test authentication
railway whoami

# Run deployment test
cd backend
railway up --service backend --detach

# Unset token when done
unset RAILWAY_TOKEN
```

### Verification Script
Use the dedicated verification script to test token:
```bash
# Check token is set
./scripts/verify-railway-token.sh check-token

# Test authentication
./scripts/verify-railway-token.sh test-auth

# Full verification
./scripts/verify-railway-token.sh
```

## Token Types and Permissions

### RAILWAY_TOKEN (Project Token)
- **Scope**: Single project deployments
- **Permissions**: Deploy, view logs, access project
- **Cannot**: Create projects, manage account
- **Best for**: CI/CD pipelines
- **Environment variable**: `RAILWAY_TOKEN`

### RAILWAY_API_TOKEN (Account Token)
- **Scope**: All account projects
- **Permissions**: Full account management
- **Variants**: Personal or team-scoped
- **Best for**: Platform automation
- **Environment variable**: `RAILWAY_API_TOKEN`

For JobMatch AI, use `RAILWAY_TOKEN` as primary authentication method.

## Verification Commands

### Test Token Authentication
```bash
# Set token
export RAILWAY_TOKEN="your-token-here"

# Verify account access
railway whoami

# Expected output:
# Account: your-email@example.com
# Team: (optional)
```

### Check Token Permissions
```bash
# List accessible projects
railway project list

# Show current project info
railway status

# View deployment logs
cd backend
railway logs
```

### Verify in CI/CD
1. Push change to trigger workflow
2. Go to Actions tab
3. Check workflow logs for:
   ```
   railway whoami
   Account: your-email@example.com
   ```
   (Token is masked in logs)

## Troubleshooting

### Token Not Set in Environment
```bash
# Check if token is available
echo $RAILWAY_TOKEN

# If empty, set it
export RAILWAY_TOKEN="your-token-here"

# If using .env file
set -a
source .env
set +a
```

### "Unauthorized" Error
```bash
# Verify token is correct
echo ${#RAILWAY_TOKEN}  # Shows length only

# Create new token:
# 1. Go to https://railway.app/dashboard
# 2. Account → Tokens → Create Token
# 3. Copy and update GitHub secret

# Test new token
railway whoami
```

### "Invalid token" Error
```bash
# Token format is incorrect or corrupted
# Solutions:
# 1. Verify token was copied completely
# 2. Check for extra spaces: echo "$RAILWAY_TOKEN" | wc -c
# 3. Create new token if old one is invalid
# 4. Update GitHub secret with new token
```

### CI/CD Deployment Fails with Auth Error
1. Check GitHub Actions logs for error message
2. Verify `RAILWAY_TOKEN` secret exists:
   - Settings → Secrets and variables → Actions
   - Should show `RAILWAY_TOKEN` in the list
3. Verify workflow uses correct secret name:
   - File: `.github/workflows/deploy-backend-railway.yml`
   - Should have: `RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}`
4. If secret is missing or wrong:
   - Delete old secret (if exists)
   - Create new secret with token
   - Wait for next deployment

## Documentation and References

### Related Guides
- `docs/RAILWAY_TOKEN_SETUP.md` - Quick setup instructions
- `docs/RAILWAY_CLI_AUTHENTICATION.md` - Detailed authentication guide
- `docs/RAILWAY_SETUP_GUIDE.md` - Complete Railway project setup

### Verification Tools
- `scripts/verify-railway-token.sh` - Token verification script
- `scripts/verify-railway-deployment.sh` - Deployment verification script

### External Resources
- [Railway CLI Documentation](https://docs.railway.com/develop/cli)
- [Railway API Tokens](https://docs.railway.com/develop/tokens)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## Checklist for Token Setup

Use this checklist to ensure proper token management:

### Initial Setup
- [ ] Token created in Railway dashboard
- [ ] Token copied to password manager
- [ ] Token added to GitHub Actions secret `RAILWAY_TOKEN`
- [ ] Token tested with: `railway whoami`
- [ ] Deployment workflow completes successfully

### Ongoing Management
- [ ] Token rotation scheduled (monthly)
- [ ] Activity monitored for suspicious changes
- [ ] Access documented (who has token)
- [ ] Incident response procedures known
- [ ] Documentation updated with new token info

### Security
- [ ] Token never committed to Git
- [ ] Token not in plaintext files
- [ ] Token not shared via email or chat
- [ ] Only GitHub secret and password manager store token
- [ ] Old tokens deleted after rotation

## Summary

Proper token management ensures:
- **Security**: Token is stored securely and not exposed
- **Reliability**: Deployments work consistently
- **Auditability**: You can track who has access
- **Recoverability**: Quick rotation if compromised

For questions or issues:
1. Check this guide's troubleshooting section
2. Review Railway documentation: https://docs.railway.com/develop/cli
3. Check GitHub Actions logs for deployment errors
4. Contact Railway support: https://railway.app/support

---

**Document Version**: 1.0
**Last Updated**: 2025-12-24
**Applies To**: JobMatch AI v1.0+
