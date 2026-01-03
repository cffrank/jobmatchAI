# Railway CLI Authentication Reference

## Quick Links

- **Setup Instructions**: `docs/RAILWAY_TOKEN_SETUP.md`
- **Security Guide**: `docs/RAILWAY_TOKEN_MANAGEMENT.md`
- **Verification Script**: `scripts/verify-railway-token.sh`
- **Deployment Verification**: `scripts/verify-railway-deployment.sh`

## Authentication Methods Summary

| Method | Command | Best For | Setup Time |
|--------|---------|----------|-----------|
| Browser Login | `railway login` | Local development | 1 minute |
| Browserless | `railway login --browserless` | SSH/headless | 3 minutes |
| Token (RAILWAY_TOKEN) | `export RAILWAY_TOKEN="..."` | CI/CD pipelines | 5 minutes |
| Token (RAILWAY_API_TOKEN) | `export RAILWAY_API_TOKEN="..."` | Multi-project | 5 minutes |

## Token Environment Variables

### RAILWAY_TOKEN (Recommended for JobMatch AI)
```bash
export RAILWAY_TOKEN="your-project-token"
railway up --service backend
```

**Scope**: Single project and environment
**Permissions**: Deploy, view logs, run commands
**Use Case**: CI/CD pipelines, project-specific deployments
**GitHub Secrets**: `RAILWAY_TOKEN` (recommended)

### RAILWAY_API_TOKEN (Account-wide)
```bash
export RAILWAY_API_TOKEN="your-account-token"
railway project list
```

**Scope**: All account projects
**Permissions**: Full account management
**Use Case**: Platform automation, multi-project management
**GitHub Secrets**: `RAILWAY_API_TOKEN` (if needed)

## Token Storage Locations

### For CI/CD (GitHub Actions)
```
Repository Settings
  → Secrets and variables
    → Actions
      → New repository secret
        Name: RAILWAY_TOKEN
        Value: [your-token]
```

Automatically masked in logs, rotatable without code changes.

### For Local Testing
```bash
# Temporary (session only)
export RAILWAY_TOKEN="your-token"

# From .env file
source .env && railway whoami

# Permanent (not recommended - use password manager instead)
# Add to ~/.bashrc or ~/.zshrc
# export RAILWAY_TOKEN="..."
```

### Secure Storage (Password Manager)
- 1Password: New Secure Note
- LastPass: New Secure Note
- Bitwarden: New Secure Note
- macOS Keychain: Add to Keychain
- Linux KeePass: Add to KeePass

## Creating a Token

### Step-by-Step
1. Go to https://railway.app/dashboard
2. Click profile icon → **Account**
3. Find **Tokens** or **API Tokens** section
4. Click **Create Token**
5. Name: "JobMatch AI CLI"
6. Scope: Personal Account
7. Click **Create**
8. **Copy immediately** (only shown once)
9. Store in password manager

### Token Naming Convention
For easy management, use names like:
- "JobMatch AI CLI"
- "JobMatch AI Deploy"
- "JobMatch AI GitHub Actions"
- "JobMatch AI Local Testing"

## Verification Commands

### Test Token is Set
```bash
# Check if token exists
echo $RAILWAY_TOKEN

# Check token length (should be non-empty)
echo ${#RAILWAY_TOKEN}

# If empty, set it
export RAILWAY_TOKEN="your-token-here"
```

### Test Token Authentication
```bash
# Verify account access
railway whoami

# Expected output:
# Account: your-email@example.com
# Team: Your Team (if applicable)

# List accessible projects
railway project list

# Check current project
railway status
```

### Test Token Permissions
```bash
# Deploy capability
cd backend
railway up --service backend --detach

# Logging capability
railway logs --tail 100

# Service status
railway status --service backend
```

## Verification Script Usage

### Check Token Environment
```bash
./scripts/verify-railway-token.sh check-token

# Output shows:
# - Token is set
# - Token length
# - Active variable name
```

### Test Token Authentication
```bash
./scripts/verify-railway-token.sh test-auth

# Output shows:
# - Account information
# - Available projects
# - Current project and environment
```

### Full Verification
```bash
./scripts/verify-railway-token.sh full-check

# Runs all checks:
# - Railway CLI installed
# - Token is set
# - Token authenticates
# - Token has proper scope
```

## Quick Troubleshooting

### "Token not found"
```bash
# Check if set
echo $RAILWAY_TOKEN

# If empty, set it
export RAILWAY_TOKEN="your-token-here"

# Create new token if lost
# https://railway.app/dashboard → Account → Tokens
```

### "Unauthorized" or "Invalid token"
```bash
# Token may be expired or invalid

# Solution:
# 1. Create new token: https://railway.app/dashboard
# 2. Update environment: export RAILWAY_TOKEN="new-token"
# 3. Test: railway whoami
# 4. Update GitHub secret if using CI/CD
```

### "Command requires authentication"
```bash
# No token set or using wrong variable name

# Check which variables are set
env | grep RAILWAY

# Set the correct one
export RAILWAY_TOKEN="your-token"  # for project
# OR
export RAILWAY_API_TOKEN="your-token"  # for account
```

### CI/CD Deployment Fails
```bash
# Check GitHub Actions logs for error
# Verify secret exists: Settings → Secrets and variables → Actions
# Verify secret name: RAILWAY_TOKEN
# Verify workflow file references it: ${{ secrets.RAILWAY_TOKEN }}

# If missing or wrong:
# 1. Go to Settings → Secrets and variables → Actions
# 2. Delete old RAILWAY_TOKEN if exists
# 3. Create new secret with current token
```

## Environment Variable Examples

### Setting in Different Shells

#### Bash
```bash
# Temporary (current session)
export RAILWAY_TOKEN="your-token-here"

# Permanent (add to ~/.bashrc)
echo 'export RAILWAY_TOKEN="your-token-here"' >> ~/.bashrc
source ~/.bashrc
```

#### Zsh
```bash
# Temporary (current session)
export RAILWAY_TOKEN="your-token-here"

# Permanent (add to ~/.zshrc)
echo 'export RAILWAY_TOKEN="your-token-here"' >> ~/.zshrc
source ~/.zshrc
```

#### Fish
```bash
# Temporary (current session)
set -x RAILWAY_TOKEN "your-token-here"

# Permanent (add to ~/.config/fish/config.fish)
set -Ux RAILWAY_TOKEN "your-token-here"
```

#### From .env File
```bash
# Create .env file
echo "RAILWAY_TOKEN=your-token-here" > .env

# Load in script
set -a
source .env
set +a

# Now use railway commands
railway whoami
```

## Token Rotation

### Monthly Rotation Procedure
```bash
# 1. Create new token
# Go to https://railway.app/dashboard → Account → Tokens
# Click "Create Token"

# 2. Test new token locally
export RAILWAY_TOKEN="new-token-here"
railway whoami

# 3. Update GitHub secret
# Settings → Secrets and variables → Actions
# Update RAILWAY_TOKEN with new value

# 4. Verify deployment works
# Push code or trigger workflow manually

# 5. Delete old token
# https://railway.app/dashboard → Account → Tokens
# Click delete on old token
```

### After Rotation
```bash
# Verify new token is working
railway whoami

# Check deployment history
railway deployment list

# Review activity in Railway dashboard
# https://railway.app/dashboard → Activity
```

## GitHub Actions Integration

### Workflow Configuration
File: `.github/workflows/deploy-backend-railway.yml`

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          cd backend
          railway up --service backend --detach
```

### GitHub Secret Setup
```
Repository Settings
  → Secrets and variables
    → Actions
      → New repository secret
        - Name: RAILWAY_TOKEN
        - Secret: [paste token from dashboard]
```

### Features
- Token is **masked** in logs (never displayed)
- Token is **encrypted** by GitHub
- Token is **rotatable** without code changes
- Token is **environment-specific** (if needed)

## Best Practices Summary

### Security
1. **Never commit** tokens to Git
2. **Use password manager** for secure storage
3. **Rotate monthly** or when compromised
4. **Use GitHub Secrets** for CI/CD
5. **Monitor activity** regularly

### Operations
1. **Use clear naming** for multiple tokens
2. **Document who has access** to tokens
3. **Test after rotation** before deleting old
4. **Keep logs for audit** purposes
5. **Backup token** in password manager

### Development
1. **Test locally** before CI/CD
2. **Use verification script** to validate setup
3. **Check logs** for authentication errors
4. **Update documentation** when setup changes
5. **Follow this guide** for consistency

## Decision Tree

**Need to authenticate?**
- Local development → `railway login` (interactive)
- SSH/headless → `railway login --browserless`
- CI/CD pipeline → `RAILWAY_TOKEN` environment variable
- Multi-project → `RAILWAY_API_TOKEN` environment variable

**Need to verify?**
- Check if token is set → `./scripts/verify-railway-token.sh check-token`
- Test authentication → `./scripts/verify-railway-token.sh test-auth`
- Full check → `./scripts/verify-railway-token.sh`

**Token not working?**
1. Check it's set: `echo $RAILWAY_TOKEN`
2. Test it: `railway whoami`
3. Create new one if invalid
4. Update GitHub secret
5. Run verification script

## Contact and Support

### Internal Resources
- **Setup Guide**: `docs/RAILWAY_TOKEN_SETUP.md`
- **Security Guide**: `docs/RAILWAY_TOKEN_MANAGEMENT.md`
- **Verification Script**: `scripts/verify-railway-token.sh`

### External Resources
- **Railway CLI Docs**: https://docs.railway.com/develop/cli
- **Railway Tokens**: https://docs.railway.com/develop/tokens
- **GitHub Secrets**: https://docs.github.com/en/actions/security-guides/encrypted-secrets

### Getting Help
1. Check "Troubleshooting" section above
2. Review Railway documentation
3. Check GitHub Actions logs
4. Review Railway dashboard activity
5. Contact Railway support: https://railway.app/support

---

**Version**: 1.0
**Last Updated**: 2025-12-24
**For**: JobMatch AI v1.0+

Quick Reference:
- Token Creation: https://railway.app/dashboard → Account → Tokens
- GitHub Secrets: Settings → Secrets and variables → Actions
- Verify Setup: `./scripts/verify-railway-token.sh`
- Deployment Logs: `railway logs --tail 100`
