# Railway Deployment - Quick Start Guide

Get JobMatch AI deployed to Railway in under 15 minutes.

## Prerequisites (5 minutes)

1. **Railway Account**
   - Sign up at [railway.app](https://railway.app) (free trial with $5 credit)
   - Use GitHub for authentication

2. **Required API Keys**
   - Supabase URL and keys (already have from previous setup)
   - OpenAI API key ([platform.openai.com](https://platform.openai.com))
   - SendGrid API key ([app.sendgrid.com](https://app.sendgrid.com))

3. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   railway --version
   ```

## Deployment (10 minutes)

### Option 1: Automated Scripts (Recommended)

We provide automated scripts that handle everything for you.

#### Step 1: Deploy Backend (5 minutes)

```bash
./scripts/railway-deploy-backend.sh
```

This script will:
- Login to Railway
- Create a new project
- Prompt for all environment variables
- Deploy the backend service
- Test the health endpoint
- Give you the backend URL

#### Step 2: Deploy Frontend (3 minutes)

```bash
./scripts/railway-deploy-frontend.sh
```

This script will:
- Create a separate project for frontend
- Prompt for environment variables (including backend URL from step 1)
- Deploy the frontend service
- Optionally update backend configuration
- Give you the frontend URL

#### Step 3: Test Your App (2 minutes)

1. Open the frontend URL in your browser
2. Create a test account
3. Try logging in
4. Test core features

**Done!** Your app is live on Railway.

---

### Option 2: Manual Deployment

If you prefer manual control:

#### Backend Deployment

```bash
cd backend
railway login
railway init
```

Set environment variables:

```bash
railway variables set SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
railway variables set SUPABASE_ANON_KEY=your-anon-key
railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
railway variables set OPENAI_API_KEY=your-openai-key
railway variables set SENDGRID_API_KEY=your-sendgrid-key
railway variables set SENDGRID_FROM_EMAIL=noreply@yourdomain.com
railway variables set PORT=3000
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

Deploy:

```bash
railway up
railway status  # Get backend URL
```

#### Frontend Deployment

```bash
cd ..
railway init  # Create new project
```

Set environment variables:

```bash
railway variables set VITE_SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
railway variables set VITE_SUPABASE_ANON_KEY=your-anon-key
railway variables set VITE_BACKEND_URL=https://backend-url-from-previous-step
railway variables set VITE_APP_NAME="JobMatch AI"
```

Deploy:

```bash
railway up
railway status  # Get frontend URL
```

#### Update Cross-References

```bash
cd backend
railway variables set APP_URL=https://frontend-url
railway up  # Redeploy
```

---

## Troubleshooting

### Build Fails

```bash
railway logs  # Check what went wrong
```

Common fixes:
- Verify all environment variables are set
- Run `npm run build` locally first
- Check TypeScript errors

### Can't Access Deployment

```bash
railway status  # Check if service is running
railway domain  # Get the domain
```

### CORS Errors

Update backend `APP_URL` to match frontend URL:

```bash
cd backend
railway variables set APP_URL=https://your-frontend-url
railway up
```

### Database Connection Issues

Verify Supabase credentials:

```bash
railway variables  # List all variables
```

Ensure:
- `SUPABASE_URL` is correct
- `SUPABASE_SERVICE_ROLE_KEY` is set (not anon key)

---

## Post-Deployment

### Monitor Your App

```bash
railway logs       # View logs
railway status     # Check health
railway open       # Open dashboard
```

### Cost Monitoring

- Railway Dashboard shows usage and costs
- Free tier: $5 credit
- Developer plan: $5/month (includes $5 credit)
- Typical cost for this app: $5-15/month

### Next Steps

1. **Custom Domain** (optional)
   ```bash
   railway domain add api.yourdomain.com
   ```

2. **Set Up Monitoring**
   - UptimeRobot for uptime monitoring
   - Sentry for error tracking

3. **Configure LinkedIn OAuth** (if needed)
   - Add redirect URIs in LinkedIn Developer Portal
   - Backend: `https://backend-url/api/auth/linkedin/callback`
   - Frontend: `https://frontend-url/auth/callback/linkedin`

---

## Quick Commands Reference

```bash
# Deploy
railway up

# View logs
railway logs

# Check status
railway status

# Set variable
railway variables set KEY=value

# List variables
railway variables

# Get domain
railway domain

# Open dashboard
railway open

# Switch project
railway link

# Logout
railway logout
```

---

## Need Help?

- **Full Documentation**: See `RAILWAY_DEPLOYMENT.md`
- **Checklist**: See `RAILWAY_DEPLOYMENT_CHECKLIST.md`
- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)

---

## Summary

**Deployment Time:** ~15 minutes

**What You Get:**
- Backend API at `https://backend-production-xxxx.up.railway.app`
- Frontend at `https://frontend-production-xxxx.up.railway.app`
- Automatic SSL/HTTPS
- Health monitoring
- Auto-deploys on git push (if using GitHub integration)

**Cost:**
- Free trial: $5 credit
- Developer plan: $5/month
- Typical usage: $5-15/month

**You're Done!** Your JobMatch AI app is live and ready to use.
