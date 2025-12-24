# Railway Environment Variables Management

This directory contains JSON templates for managing Railway environment variables across multiple environments.

## Quick Start

### 1. Create Your Environment JSON Files

```bash
# Copy templates and fill in actual values
cp development.json.example development.json
cp staging.json.example staging.json
cp production.json.example production.json

# Edit each file with your actual secrets
# NEVER commit these files to git (they're in .gitignore)
```

### 2. Set Railway Variables

```bash
# Development environment
../scripts/railway-set-vars.sh development backend development.json

# Staging environment
../scripts/railway-set-vars.sh staging backend staging.json

# Production environment
../scripts/railway-set-vars.sh production backend production.json
```

## File Structure

```
vars/
├── README.md                      # This file
├── development.json.example       # Template for development variables
├── staging.json.example           # Template for staging variables
├── production.json.example        # Template for production variables
├── development.json              # Your actual dev variables (gitignored)
├── staging.json                  # Your actual staging variables (gitignored)
└── production.json               # Your actual prod variables (gitignored)
```

## Security

**CRITICAL:** Never commit actual variable files to git!

- ✅ `*.json.example` files are safe (no secrets)
- ❌ `*.json` files contain secrets (gitignored)

The `.gitignore` file includes:
```
vars/*.json
```

## JSON Format

```json
{
  "NODE_ENV": "production",
  "APP_URL": "https://your-frontend.railway.app",
  "SUPABASE_URL": "https://project.supabase.co",
  "SUPABASE_ANON_KEY": "eyJh...",
  "SUPABASE_SERVICE_ROLE_KEY": "eyJh...",
  "OPENAI_API_KEY": "sk-...",
  "SENDGRID_API_KEY": "SG....",
  "JWT_SECRET": "your-secret-min-32-chars"
}
```

## Environment-Specific Values

### Development
- Supabase: Use dev project (`jobmatchai-dev`)
- APP_URL: Development frontend Railway URL
- JWT_SECRET: Different from production
- Can use test API keys where applicable

### Staging
- Supabase: Use staging project (`jobmatchai-staging`)
- APP_URL: Staging frontend Railway URL
- JWT_SECRET: Different from production
- Use production-like configuration

### Production
- Supabase: Production project (`jobmatchai-prod`)
- APP_URL: Production frontend Railway URL
- JWT_SECRET: Strong, unique secret (min 32 chars)
- All production API keys and secrets

## Common Variables

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `NODE_ENV` | `production` | `production` | `production` |
| `APP_URL` | Dev frontend URL | Staging frontend URL | Prod frontend URL |
| `SUPABASE_URL` | Dev Supabase | Staging Supabase | Prod Supabase |
| `JWT_SECRET` | Dev secret | Staging secret | Prod secret (unique!) |
| `LINKEDIN_REDIRECT_URI` | Dev backend URL | Staging backend URL | Prod backend URL |

## Script Usage

### Basic Usage
```bash
# Format: environment service json-file
../scripts/railway-set-vars.sh <environment> <service> <json-file>
```

### Examples
```bash
# Set all development variables
../scripts/railway-set-vars.sh development backend development.json

# Set all staging variables
../scripts/railway-set-vars.sh staging backend staging.json

# Set all production variables (be careful!)
../scripts/railway-set-vars.sh production backend production.json
```

### Requirements

The script requires:
- Railway CLI: `npm install -g @railway/cli`
- jq: `brew install jq` (Mac) or `apt install jq` (Linux)
- Railway token: Set `RAILWAY_TOKEN` environment variable

```bash
# Get Railway token
export RAILWAY_TOKEN=your-token-here
# Or get from: https://railway.app/account/tokens
```

### Script Output

The script will:
1. Validate inputs and check requirements
2. Count variables to be set
3. Set each variable one by one
4. Show success/failure for each
5. Display summary at the end

Example output:
```
==========================================
Railway Variables Upload
==========================================
Environment: development
Service:     backend
JSON File:   development.json
==========================================

Found 17 variables to set

[1/17] Setting: NODE_ENV
  ✓ Success

[2/17] Setting: APP_URL
  ✓ Success

...

==========================================
Summary
==========================================
Total:   17
Success: 17
Failed:  0
==========================================
✓ All variables set successfully!
```

## Alternative: Railway Dashboard

If you prefer manual setup:

1. Go to Railway dashboard → Your project
2. Select environment (development/staging/production)
3. Select service (backend)
4. Click "Variables" tab
5. Click "RAW Editor"
6. Paste your JSON file contents
7. Save

## Updating Variables

To update a variable:

1. Edit the JSON file
2. Run the script again
3. Railway will update existing variables

**Note:** The script will overwrite existing variables with the same name.

## Best Practices

### 1. Different Secrets Per Environment
```bash
# Generate unique secrets for each environment
openssl rand -base64 32  # For development JWT_SECRET
openssl rand -base64 32  # For staging JWT_SECRET
openssl rand -base64 32  # For production JWT_SECRET
```

### 2. Validate Before Setting
```bash
# Check JSON syntax before uploading
cat development.json | jq .
# Should output formatted JSON, not errors
```

### 3. Backup Production Variables
```bash
# Export production variables (Railway dashboard)
# Store securely (password manager, encrypted vault)
```

### 4. Review After Setting
```bash
# After setting variables, verify in Railway dashboard
# Ensure all variables are present and correct
```

## Troubleshooting

### "RAILWAY_TOKEN not set"
```bash
export RAILWAY_TOKEN=your-token-here
# Get from: https://railway.app/account/tokens
```

### "jq not installed"
```bash
# Mac
brew install jq

# Linux
sudo apt install jq
```

### "Railway CLI not installed"
```bash
npm install -g @railway/cli
```

### "Invalid JSON"
```bash
# Validate your JSON file
cat your-file.json | jq .
# Fix any syntax errors
```

### Variables Not Updating
- Railway caches variables
- Redeploy service after setting variables
- Check Railway dashboard to confirm changes

## Related Documentation

- [Railway Variables Guide](https://docs.railway.com/guides/variables)
- [Railway CLI Reference](https://docs.railway.com/reference/cli-api)
- [Multi-Environment Setup](../docs/RAILWAY-MULTI-ENVIRONMENT-SETUP.md)
- [Deployment Checklist](../MULTI_ENV_DEPLOYMENT_CHECKLIST.md)
