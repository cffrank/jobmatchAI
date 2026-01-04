# Railway CLI Token Authentication Setup

## Quick Start

This document provides step-by-step instructions for setting up Railway CLI authentication using a user token for the JobMatch AI project.

## Step 1: Create a Railway User Token

1. Log in to [Railway Dashboard](https://railway.app/dashboard)
2. Click your **profile icon** (top-right corner)
3. Select **Account** settings
4. Navigate to **API Tokens** or **Tokens** section
5. Click **Create Token** or **New Token**
6. Configure the token:
   - **Name**: "JobMatch AI CLI" (or similar)
   - **Scope**: Select "Personal Account" (for account-wide access)
   - **Permissions**: Ensure "Deploy" and "View Logs" are enabled
7. Click **Create**
8. **Important**: Copy the token immediately - it will only be shown once!
9. Store it in your password manager (1Password, LastPass, etc.)

## Step 2: Add Token to GitHub Actions

The workflow already uses the `RAILWAY_TOKEN` secret. To set it up:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Create secret:
   - **Name**: `RAILWAY_TOKEN`
   - **Secret**: Paste the token you copied from Railway
5. Click **Add secret**

Your GitHub Actions workflows can now deploy to Railway automatically.

## Step 3: Test Token Locally (Optional)

To verify your token works before CI deployment:

```bash
# Set the token in current session
export RAILWAY_TOKEN="your-token-here"

# Test authentication
railway whoami

# List projects
railway status

# Expected output:
# Account: your-email@example.com
# Team: (optional)
```

## Step 4: Verify Token in CI/CD

The deployment workflow automatically uses your token. Monitor deployment:

1. Push a change to the `backend/` directory
2. Go to GitHub repository → **Actions** tab
3. Watch **Deploy Backend to Railway** workflow
4. Check logs for successful authentication

Expected in logs (token is masked):
```
railway whoami
Account: your-email@example.com
```

## Token Types and Scopes

### Project Token (RAILWAY_TOKEN)
- **Used for**: Single project deployments
- **Scope**: One Railway project only
- **Best for**: CI/CD pipelines for specific services

### Account Token (RAILWAY_API_TOKEN)
- **Used for**: Multi-project management
- **Scope**: All projects in your account
- **Best for**: Platform-wide automation

For JobMatch AI, use **Account Token** set as `RAILWAY_TOKEN` environment variable.

## Verification Checklist

Before considering setup complete:

- [x] Token created in Railway dashboard
- [x] Token saved to password manager (never in Git)
- [x] Token added to GitHub secret `RAILWAY_TOKEN`
- [x] Workflow file references correct secret: `${{ secrets.RAILWAY_TOKEN }}`
- [x] `railway whoami` returns correct account when token is set
- [x] Deployment workflow completes successfully
- [x] Health check passes after deployment

## Token Rotation and Security

### Regular Rotation (Monthly)
```bash
# 1. Create new token in Railway dashboard
# 2. Add to GitHub Actions secret
# 3. Test with: railway whoami
# 4. Delete old token from Railway dashboard
```

### If Token is Compromised
```bash
# 1. Immediately delete token from Railway dashboard
# 2. Generate new token
# 3. Update GitHub Actions secret
# 4. Monitor Railway activity for unauthorized changes
```

## Environment Variables Reference

| Variable | Purpose | Scope | Used In |
|----------|---------|-------|---------|
| `RAILWAY_TOKEN` | Project/account deployment | Single project or account | CI/CD workflows, local testing |
| `RAILWAY_API_TOKEN` | Account-wide operations | All account projects | Platform automation (if needed) |

Only set `RAILWAY_TOKEN` for JobMatch AI deployment workflows.

## Troubleshooting

### Token Not Working in CI/CD

**Check GitHub Actions log** for error messages:
```bash
# In workflow logs:
Error: Unauthorized
# OR
Error: Invalid token
```

**Solutions**:
1. Verify secret name in workflow file matches: `RAILWAY_TOKEN`
2. Ensure token was copied completely (no extra spaces)
3. Create a new token if old one was deleted from Railway
4. Check token permissions in Railway dashboard

### Local Testing Fails

```bash
# Verify token is set
echo $RAILWAY_TOKEN

# If empty, set it
export RAILWAY_TOKEN="your-token-here"

# Test again
railway whoami
```

### "Project not linked" Error

```bash
# Ensure you're in the backend directory
cd backend

# Check for .railway/config.json
ls -la .railway/

# If missing, link the project
railway link --project jobmatch-ai --environment production
```

## Related Files

- Workflow: `.github/workflows/deploy-backend-railway.yml`
- Verification script: `scripts/verify-railway-deployment.sh`
- Railway config: `.railway/config.json`
- Backend config: `backend/railway.toml`

## Support Resources

- [Railway CLI Documentation](https://docs.railway.com/develop/cli)
- [Railway API Tokens Guide](https://docs.railway.com/develop/tokens)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

**Setup Date**: 2025-12-24
**Last Updated**: 2025-12-24
