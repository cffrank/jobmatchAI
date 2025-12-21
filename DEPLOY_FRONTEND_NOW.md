# Deploy Frontend to Railway - Step-by-Step Guide

**Estimated time:** 10 minutes

---

## Prerequisites Check

✅ Railway CLI installed (version 4.16.1)
✅ Frontend Railway config exists (`railway.toml`)
✅ Supabase credentials in `.env.local`

---

## Step 1: Login to Railway (2 minutes)

Open your terminal and run:

```bash
railway login
```

This will:
1. Open a browser window
2. Ask you to sign in with GitHub (or create account)
3. Authorize the Railway CLI
4. Return to terminal with "Logged in as [your-email]"

**Don't have a Railway account?**
- Sign up at https://railway.app
- Use your GitHub account (easiest)
- Free trial includes $5 credit

---

## Step 2: Create Environment Variables File (3 minutes)

Create `.env.production` with your production values:

```bash
# Frontend Production Environment Variables

# Supabase Configuration
VITE_SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Backend API URL (we'll update this after backend deployment)
VITE_BACKEND_URL=https://your-backend-url.railway.app

# LinkedIn OAuth (optional - can configure later)
VITE_LINKEDIN_CLIENT_ID=your-linkedin-client-id
VITE_LINKEDIN_REDIRECT_URI=https://your-frontend-url.railway.app/auth/callback/linkedin
```

**Get your Supabase Anon Key:**
1. Go to https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/settings/api
2. Copy the `anon` `public` key
3. Paste it in `.env.production`

---

## Step 3: Test Build Locally (2 minutes)

Make sure your frontend builds successfully:

```bash
# Load production environment variables
source .env.production

# Test build
npm run build
```

Expected output: `✓ built in XXXms`

If you get errors, fix them before deploying.

---

## Step 4: Initialize Railway Project (1 minute)

```bash
# Initialize Railway project for frontend
railway init
```

You'll be prompted:
- **Project name:** `jobmatch-ai-frontend` (or your choice)
- **Link to existing project?** Choose "Create new project"

---

## Step 5: Set Environment Variables (2 minutes)

Set all environment variables in Railway:

```bash
# Supabase URL
railway variables set VITE_SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co

# Supabase Anon Key (get from Supabase Dashboard > Settings > API)
railway variables set VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here

# Backend URL (temporary - we'll update after backend deployment)
railway variables set VITE_BACKEND_URL=https://placeholder-backend.railway.app

# LinkedIn OAuth (optional)
railway variables set VITE_LINKEDIN_CLIENT_ID=your-linkedin-client-id
railway variables set VITE_LINKEDIN_REDIRECT_URI=https://your-frontend-url.railway.app/auth/callback/linkedin
```

---

## Step 6: Deploy Frontend (2 minutes)

Deploy to Railway:

```bash
railway up
```

This will:
1. Upload your code
2. Install dependencies (`npm install`)
3. Build the frontend (`npm run build`)
4. Start the server (`npx serve dist -s`)
5. Give you a deployment URL

**Deployment Output:**
```
✓ Deployment successful
✓ Build completed
✓ Service deployed

Your frontend is live at:
https://jobmatch-ai-frontend-production-xxxx.up.railway.app
```

**Copy this URL!** You'll need it to:
- Update the backend CORS settings
- Configure LinkedIn OAuth redirect URI

---

## Step 7: Get Your Frontend URL (1 minute)

Get your deployment URL:

```bash
railway status
```

Or visit Railway dashboard:
```bash
railway open
```

Your frontend URL will be shown as:
`https://jobmatch-ai-frontend-production-xxxx.up.railway.app`

---

## Step 8: Update Backend URL (after backend deployment)

Once your backend is deployed, update the frontend environment variable:

```bash
# Update backend URL to real deployment URL
railway variables set VITE_BACKEND_URL=https://your-actual-backend-url.railway.app

# Redeploy to apply changes
railway up
```

---

## Verification Checklist

After deployment, verify:

- [ ] Frontend URL loads in browser
- [ ] No console errors in browser DevTools
- [ ] Can see the login/signup page
- [ ] Static assets (images, CSS) load correctly

---

## Troubleshooting

### Build Fails

**Error:** "TypeScript compilation errors"
```bash
# Fix locally first
npm run build

# Then redeploy
railway up
```

### Environment Variables Missing

**Error:** "VITE_SUPABASE_URL is not defined"
```bash
# Check current variables
railway variables

# Set missing variable
railway variables set VITE_SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co

# Redeploy
railway up
```

### 404 Errors on Routes

This means SPA routing isn't configured. Check that:
- `railway.toml` has `startCommand = "npx serve dist -s -p $PORT"`
- The `-s` flag enables SPA mode

### Deployment Stuck

```bash
# Cancel and retry
Ctrl+C

# Check Railway dashboard for logs
railway open
```

---

## Cost Information

**Railway Pricing:**
- Free trial: $5 credit (good for 1-2 weeks)
- Developer plan: $5/month (includes $5 credit)
- Frontend estimated cost: $2-3/month

**Usage:**
- Deployments are free
- You pay for active runtime and resources
- Frontend uses minimal resources (mostly static file serving)

---

## Alternative: Deploy to Vercel (Free)

If you want to save money, deploy frontend to Vercel instead:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts to connect GitHub and deploy
```

Vercel free tier includes:
- Unlimited deployments
- Custom domains
- Automatic HTTPS
- Global CDN

---

## Next Steps After Frontend Deployment

1. **Deploy Backend** - Run `./scripts/railway-deploy-backend.sh`
2. **Update Backend URL** - Set `VITE_BACKEND_URL` to real backend URL
3. **Configure LinkedIn OAuth** - Update redirect URIs
4. **Test Full Application** - Create account, test features
5. **Set Up Custom Domain** (optional)

---

## Quick Reference Commands

```bash
# Login
railway login

# Check status
railway status

# View logs
railway logs

# Open dashboard
railway open

# List projects
railway list

# Delete deployment
railway delete

# Update environment variable
railway variables set KEY=value

# Redeploy
railway up
```

---

## Support

**Railway Documentation:** https://docs.railway.app
**Railway Discord:** https://discord.gg/railway
**Railway Status:** https://status.railway.app

---

**Ready to deploy?** Start with Step 1 above!
