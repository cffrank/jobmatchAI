# Railway CLI Authentication Instructions

## Quick Authentication

Run this command in your terminal:

```bash
railway login
```

This will:
1. Open your browser
2. Ask you to authorize the CLI
3. Save authentication locally

## After Authentication

Once authenticated, I can run these commands to check deployment status:

```bash
# Check overall status
railway status

# View deployment logs
railway logs --environment development

# List all deployments
railway logs --help
```

## Alternative: Share Deployment Info Manually

If CLI authentication isn't working, please share from Railway Dashboard:

1. **Go to**: Railway Dashboard → Backend Service → Development → Deployments
2. **Click on**: The most recent deployment
3. **Copy**: The build logs and deployment logs
4. **Share**: Paste them here

## What I Need to See

Specifically looking for:
- ✅ Build command being used (`npm ci && npx tsc` without npm prune)
- ✅ Any error messages during build
- ✅ Application startup logs
- ✅ Whether the app is listening on the PORT environment variable
