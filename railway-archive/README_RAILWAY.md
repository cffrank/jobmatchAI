# Railway Deployment - README

Quick reference for deploying JobMatch AI to Railway.

## Files Overview

| File | Purpose |
|------|---------|
| `QUICK_START_RAILWAY.md` | **START HERE** - 15-minute deployment guide |
| `RAILWAY_DEPLOYMENT.md` | Complete reference documentation (600+ lines) |
| `RAILWAY_DEPLOYMENT_CHECKLIST.md` | Step-by-step checklist |
| `RAILWAY_SETUP_COMPLETE.md` | Configuration summary and architecture |
| `backend/railway.toml` | Backend service configuration |
| `railway.toml` | Frontend service configuration |
| `.env.production.example` | Frontend environment variables template |
| `backend/.env.example` | Backend environment variables template |
| `scripts/railway-deploy-backend.sh` | Automated backend deployment |
| `scripts/railway-deploy-frontend.sh` | Automated frontend deployment |

## Fastest Path to Deployment

```bash
# 1. Install Railway CLI (one time)
npm install -g @railway/cli

# 2. Run automated deployment scripts
./scripts/railway-deploy-backend.sh   # Follow prompts
./scripts/railway-deploy-frontend.sh  # Follow prompts

# 3. Done! Your app is live.
```

## What You'll Need

### Must Have
- Railway account (sign up at [railway.app](https://railway.app))
- Supabase credentials (URL, anon key, service role key)
- OpenAI API key
- SendGrid API key + verified sender email

### Optional
- LinkedIn OAuth credentials (for LinkedIn login)
- Apify API token (for job scraping)

## Deployment Methods

### Method 1: Automated Scripts (Easiest)
Use the shell scripts in `scripts/` directory. They handle everything automatically.

### Method 2: Railway CLI (Flexible)
Manual deployment using Railway CLI commands. See `RAILWAY_DEPLOYMENT.md` for details.

### Method 3: GitHub Integration (Auto-Deploy)
Connect your GitHub repo to Railway for automatic deployments on push.

## Architecture

Two separate Railway services:

1. **Backend** (`backend/`)
   - Express.js API server
   - Port 3000
   - Health check at `/health`
   - Connects to Supabase PostgreSQL

2. **Frontend** (root directory)
   - Vite React static site
   - Served with `npx serve`
   - Calls backend API
   - Connects to Supabase for auth

## Cost

- **Free trial:** $5 credit
- **Developer plan:** $5/month (includes $5 credit)
- **Expected cost:** $5-15/month for both services

## Quick Commands

```bash
railway up              # Deploy current directory
railway logs            # View logs
railway status          # Check deployment status
railway domain          # Get deployment URL
railway variables       # List environment variables
railway variables set KEY=value  # Set variable
```

## Common Issues

### Build fails
```bash
# Test locally first
npm run build
```

### Can't access deployment
```bash
railway status  # Check if running
railway domain  # Get the URL
```

### CORS errors
```bash
# Update backend APP_URL to frontend URL
cd backend
railway variables set APP_URL=https://your-frontend.railway.app
railway up
```

## Support

- Read `QUICK_START_RAILWAY.md` for step-by-step guide
- Check `RAILWAY_DEPLOYMENT.md` for detailed documentation
- Use `RAILWAY_DEPLOYMENT_CHECKLIST.md` to ensure nothing is missed
- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)

## Next Steps After Deployment

1. Test all features (signup, login, job search, AI generation)
2. Configure LinkedIn OAuth redirect URIs (if applicable)
3. Set up monitoring (UptimeRobot, Sentry)
4. Add custom domain (optional)
5. Configure automated backups

---

**Ready to deploy?** Start with `QUICK_START_RAILWAY.md` →
