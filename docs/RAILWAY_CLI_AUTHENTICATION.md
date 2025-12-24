# Railway CLI Authentication Guide

This document provides comprehensive guidance on authenticating the Railway CLI for the JobMatch AI project using a user token.

## Overview

Railway CLI supports multiple authentication methods for different use cases:

1. **Browser-based Login** (`railway login`) - Interactive, user-friendly, for local development
2. **Browserless Login** (`railway login --browserless`) - For environments without browser access
3. **Token-based Authentication** - For CI/CD pipelines and automated environments

This guide focuses on **token-based authentication**, which is recommended for automated deployments and CI/CD pipelines.

---

## Token Types

Railway supports two types of tokens, each with specific use cases:

### 1. Project Tokens (RAILWAY_TOKEN)

- **Scope**: Single project and environment
- **Use Case**: Project-specific deployments, accessing project resources
- **Permissions**: Deploy code, redeploy, view logs, manage services within a specific project
- **Environment Variable**: `RAILWAY_TOKEN`
- **Limitations**: Cannot create new projects or link to other workspaces

### 2. Account/Team Tokens (RAILWAY_API_TOKEN)

- **Scope**: All projects in your account or team workspace
- **Use Case**: General CLI operations, cross-project management, user authentication
- **Token Types**:
  - **Personal Account Token**: Access to all your resources and teams
  - **Team Token**: Access to projects within a specific workspace only
- **Environment Variable**: `RAILWAY_API_TOKEN`
- **Permissions**: Full CLI access including user authentication (`railway whoami`)

### Token Precedence

**Important**: When both tokens are set, `RAILWAY_TOKEN` takes precedence over `RAILWAY_API_TOKEN`.

---

## How Railway CLI Stores Authentication

### Configuration Directory

Railway CLI stores authentication credentials in the user's home directory:

```
~/.railway/config.json
```

This file contains:
- Cached authentication tokens
- Project links
- Environment preferences
- User credentials

### Important Security Note

- The config file contains sensitive authentication tokens
- It is stored in plain text in your home directory
- **Never commit this file to version control**
- **Never share this file with others**
- Ensure proper file permissions (typically 600)

### Environment Variable Override

When using automation or CI/CD, you can bypass the local config file by setting environment variables directly:

```bash
RAILWAY_TOKEN=your_token_here railway status
RAILWAY_API_TOKEN=your_token_here railway whoami
```

---

## Setting Up Token-Based Authentication

### Step 1: Generate a Railway Token

#### Via Railway Dashboard

1. Go to [railway.com](https://railway.com)
2. Log in to your account
3. Navigate to **Account Settings** (click your avatar → Settings)
4. Click on **Tokens** or **API Tokens**
5. Click **New Token** or **Generate Token**
6. **Name your token** (e.g., "JobMatch AI Deployment")
7. Choose token type:
   - **Account Token** (if managing multiple projects)
   - **Team Token** (if within a specific workspace)
8. Copy the generated token immediately
9. Store it securely (see Step 2)

#### Token Format

Generated tokens typically look like:

```
rwe_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 2: Store the Token Securely

#### Option A: Environment File (Recommended for Development)

Create a `.env` file in your project root (or home directory):

```bash
# ~/.bashrc, ~/.zshrc, or project .env
export RAILWAY_API_TOKEN="rwe_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Then load it in your shell:

```bash
source ~/.env
# or in your shell config file
```

**Important**: Add to `.gitignore` if in project directory:

```
# .gitignore
.env
.env.local
```

#### Option B: Shell Configuration (Recommended for Persistence)

Add to your shell configuration file (`~/.bashrc`, `~/.zshrc`, `~/.bash_profile`, etc.):

```bash
# Railway CLI Authentication
export RAILWAY_API_TOKEN="rwe_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Then reload your shell:

```bash
# For bash
source ~/.bashrc

# For zsh
source ~/.zshrc

# Or restart terminal
```

#### Option C: Environment Variables at Command Time

Run commands with inline token:

```bash
RAILWAY_API_TOKEN="rwe_xxxxxxxxxxxxxxxxxxxxxxxxxxxx" railway whoami
```

#### Option D: CI/CD Pipeline Secrets

For GitHub Actions, GitLab CI, or other CI/CD platforms:

1. Go to your repository settings
2. Add a **Secret** or **Environment Variable**:
   - Name: `RAILWAY_API_TOKEN` or `RAILWAY_TOKEN`
   - Value: Your token
3. Reference it in your pipeline:

```yaml
# GitHub Actions
env:
  RAILWAY_API_TOKEN: ${{ secrets.RAILWAY_API_TOKEN }}
```

```yaml
# GitLab CI
variables:
  RAILWAY_API_TOKEN: $RAILWAY_API_TOKEN
```

### Step 3: Verify Token Works

#### Quick Verification

```bash
# Check if token is accessible
echo $RAILWAY_API_TOKEN

# This should output your token (or be empty if not set)
```

#### Verify Authentication Status

```bash
# Check who you're authenticated as
railway whoami
```

Expected output:

```
your-email@example.com
```

#### List Your Projects

```bash
# List all projects you can access
railway list
```

This should display your Railway projects.

#### Link to a Specific Project

```bash
# Navigate to your project directory
cd /path/to/jobmatch-ai

# Link to your Railway project
railway link <project-id>

# Verify the link
railway status
```

---

## Using Tokens with Scripts

### In Bash Scripts

The verification script and deployment scripts can use token authentication:

```bash
#!/bin/bash

# Load token from environment
if [ -z "$RAILWAY_API_TOKEN" ]; then
    echo "Error: RAILWAY_API_TOKEN not set"
    exit 1
fi

# Use railway CLI
railway whoami
railway status
```

### In GitHub Actions

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

env:
  RAILWAY_API_TOKEN: ${{ secrets.RAILWAY_API_TOKEN }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy
        run: |
          npm install -g @railway/cli
          railway up
```

### In GitLab CI

```yaml
deploy_to_railway:
  stage: deploy
  image: node:18
  variables:
    RAILWAY_API_TOKEN: $RAILWAY_API_TOKEN
  script:
    - npm install -g @railway/cli
    - railway up
  only:
    - main
```

---

## Security Best Practices

### 1. Token Lifecycle Management

- **Generate**: Create tokens with specific names for tracking
- **Use**: Store securely in environment variables or CI/CD secrets
- **Rotate**: Regularly regenerate tokens (monthly recommended)
- **Revoke**: Delete old tokens immediately after rotation
- **Monitor**: Track which tokens are in use

### 2. Token Scoping

- Use **Project Tokens** for project-specific automation
- Use **Account Tokens** only when necessary for multiple projects
- Use **Team Tokens** when working in team workspaces
- Avoid sharing tokens between different applications

### 3. Storage Security

- Never commit tokens to version control
- Use `.gitignore` to exclude `.env` files
- Use CI/CD secret management instead of environment files
- Keep tokens in separate config files not tracked by git
- Use proper file permissions (600 for `.env` files):

```bash
chmod 600 ~/.env
chmod 600 ~/.railway/config.json
```

### 4. Compromise Response

If you suspect a token is compromised:

1. Immediately revoke the token in Railway dashboard
2. Generate a new token
3. Update all references to the old token
4. Check deployment logs for unauthorized access
5. Review recent deployments and changes

---

## Troubleshooting

### Issue: "Not authenticated" or "Permission denied"

**Causes**:
- Token environment variable not set
- Token is invalid or expired
- Token doesn't have required permissions

**Solutions**:

```bash
# Verify token is set
echo $RAILWAY_API_TOKEN

# Verify token is valid
railway whoami

# Check token permissions
railway list
```

### Issue: "Railway CLI is not authenticated"

**Cause**: Neither browser login credentials nor token is available

**Solutions**:

```bash
# Option 1: Use browser login
railway login

# Option 2: Set token environment variable
export RAILWAY_API_TOKEN="rwe_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
railway whoami
```

### Issue: "Failed to authenticate" in CI/CD

**Causes**:
- Secret not configured in CI/CD platform
- Token has expired
- Token lacks required permissions

**Solutions**:

1. Verify secret is added to CI/CD platform
2. Check secret is passed to job correctly:

```bash
# In CI/CD script
if [ -z "$RAILWAY_API_TOKEN" ]; then
    echo "Error: RAILWAY_API_TOKEN not set in CI/CD secrets"
    exit 1
fi
```

3. Test token locally:

```bash
RAILWAY_API_TOKEN="your_token" railway whoami
```

4. Generate new token with full permissions

### Issue: "Token expired"

**Solution**: Generate a new token and update all references

### Issue: "Project not found" or "Not authorized to access project"

**Causes**:
- Using wrong project ID
- Token doesn't have access to project
- Project was deleted

**Solutions**:

```bash
# List accessible projects
railway list

# Link to correct project
railway link <correct-project-id>
```

---

## Verification Script Updates

The `verify-railway-deployment.sh` script has been updated to support token-based authentication:

```bash
# The script will check:
# 1. Railway CLI is installed
# 2. Either:
#    a) Browser login credentials exist (from railway login)
#    b) RAILWAY_API_TOKEN environment variable is set
# 3. Authentication is valid (railway whoami succeeds)

./scripts/verify-railway-deployment.sh check-cli
```

Expected output when authenticated with token:

```
Railway CLI Check
=====================================

✓ Railway CLI is installed
ℹ Version: 4.16.1 (or newer)
✓ Railway CLI is authenticated
✓ Current user: your-email@example.com
```

---

## Next Steps

1. **Generate a Token**: Follow Step 1 above
2. **Store Securely**: Choose one of the storage options in Step 2
3. **Verify**: Run Step 3 verification commands
4. **Update Scripts**: Update deployment scripts to use token (optional, for CI/CD)
5. **Test Deployment**: Run verification script to confirm authentication works
6. **Deploy**: Use deployment scripts with token-based authentication

---

## References

- [Railway CLI Documentation](https://docs.railway.com/guides/cli)
- [Railway Public API Documentation](https://docs.railway.com/guides/public-api)
- [Using the Public API](https://docs.railway.com/reference/public-api)

---

## Frequently Asked Questions

### Q: Should I use RAILWAY_TOKEN or RAILWAY_API_TOKEN?

**A**: It depends on your use case:
- **Project-specific deployments**: Use `RAILWAY_TOKEN` (project token)
- **General CLI operations**: Use `RAILWAY_API_TOKEN` (account token)
- **Both set**: `RAILWAY_TOKEN` takes precedence

For JobMatch AI, we recommend `RAILWAY_API_TOKEN` for flexibility across frontend and backend services.

### Q: Can I use the same token everywhere?

**A**: Yes, but it's not recommended. Generate different tokens for:
- Local development
- CI/CD pipelines
- Different team members
- Different projects

This improves security and simplifies token rotation.

### Q: How often should I rotate tokens?

**A**: Industry best practices recommend:
- Monthly for production tokens
- Quarterly for development tokens
- Immediately if compromised

### Q: Can I use browser login and token authentication simultaneously?

**A**: Yes. The CLI will try to use the token first, then fall back to browser login credentials. Having both provides flexibility.

### Q: How do I know which tokens are in use?

**A**: The Railway dashboard shows:
- Active tokens
- Last used date/time
- Token name
- Associated permissions

Review regularly and revoke unused tokens.

### Q: What happens if I revoke a token?

**A**: All subsequent Railway CLI commands using that token will fail with an authentication error. Update your scripts and CI/CD pipelines immediately with a new token.

---

## Support

For issues with Railway CLI authentication:

1. Check this guide's Troubleshooting section
2. Review [Railway CLI Documentation](https://docs.railway.com/guides/cli)
3. Contact Railway support at [railway.com](https://railway.com)
4. Check GitHub issues: [railwayapp/cli](https://github.com/railwayapp/cli)

---

**Last Updated**: December 24, 2024
**Version**: 1.0
**Railway CLI**: 4.16.1+
