# Cloudflare Pages Setup Guide - JobMatch AI Frontend

**Date:** 2025-12-27
**Status:** Ready for Implementation
**Branch:** develop (initial deployment)

---

## Overview

This guide walks you through connecting Cloudflare Pages to your GitHub repository and deploying the React/Vite frontend.

## Current Status

- ✅ **Build verified:** Frontend builds successfully in 9.22s
- ✅ **Output directory:** `dist/` (Vite default)
- ✅ **Backend connected:** Railway development backend ready
- ⚠️ **Cloudflare Pages:** Not connected to GitHub (shows "No Git connection")

---

## Step-by-Step Setup

### Step 1: Delete Placeholder Project (Recommended)

Since `jobmatch-ai-dev` has no Git connection:

1. Go to Cloudflare Dashboard: https://dash.cloudflare.com
2. Click **Workers & Pages** → Click **jobmatch-ai-dev**
3. Go to **Settings** tab → Scroll to bottom
4. Click **Delete project** → Confirm deletion

### Step 2: Create New Cloudflare Pages Project

1. In Cloudflare Dashboard, click **Workers & Pages**
2. Click **Create application** button
3. Select **Pages** tab
4. Click **Connect to Git**

#### 2a. Connect to GitHub (First Time Only)

If not already connected:
- Click **Connect GitHub**
- Authorize Cloudflare Pages in GitHub OAuth popup
- Select **Only select repositories** → Choose `cffrank/jobmatchAI`
- Click **Install & Authorize**

#### 2b. Select Repository

- From the list, select **cffrank/jobmatchAI**
- Click **Begin setup**

### Step 3: Configure Project Settings

On the setup page, enter:

#### Basic Settings
```
Project name: jobmatch-ai-dev
Production branch: develop
```

**Why `develop` as production?**
- You're testing Cloudflare in development first
- Staging/production still on Railway
- Later you'll change this to `main` after full migration

### Step 4: Configure Build Settings

```
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: (leave blank - use root)
```

**Node.js version:**
- Cloudflare uses Node.js 20.x by default
- Your project requires 22.12.0+ (see package.json)
- **Add this to environment variables in next step:**
  - `NODE_VERSION = 22.12.0`

### Step 5: Add Environment Variables

Click **Add variable** and add these 4 variables:

#### Required Variables

**1. NODE_VERSION** (Build-time only)
```
Variable name: NODE_VERSION
Value: 22.12.0
```
*This ensures Cloudflare uses Node.js 22.x during build*

**2. VITE_SUPABASE_URL**
```
Variable name: VITE_SUPABASE_URL
Value: https://wpupbucinufbaiphwogc.supabase.co
```

**3. VITE_SUPABASE_ANON_KEY**
```
Variable name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdXBidWNpbnVmYmFpcGh3b2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NjI1NjcsImV4cCI6MjA4MjIzODU2N30.LRfdYAz08eKp5oZoQJ7MbK-VCluud2YlIRw0GumcAp8
```

**4. VITE_BACKEND_URL**
```
Variable name: VITE_BACKEND_URL
Value: https://backend1-development.up.railway.app
```

#### Optional Variables (Can add later)

**5. VITE_LINKEDIN_CLIENT_ID** (for LinkedIn OAuth)
```
Variable name: VITE_LINKEDIN_CLIENT_ID
Value: your-linkedin-client-id-here
```

**6. VITE_ENV**
```
Variable name: VITE_ENV
Value: development
```

### Step 6: Save and Deploy

1. Click **Save and Deploy** button
2. Cloudflare will:
   - Clone your repository (`develop` branch)
   - Install dependencies (`npm install`)
   - Run build (`npm run build`)
   - Deploy to global edge network

**Expected build time:** 2-5 minutes

### Step 7: Monitor Deployment

Watch the build logs:
- You'll see npm install progress
- Vite build output
- Deployment upload progress

**Expected output:**
```
✓ 1952 modules transformed.
✓ built in 9.22s
Deployment complete!
```

### Step 8: Get Your Deployment URL

Once complete, you'll see:
```
Your site is live at:
https://jobmatch-ai-dev-xxx.pages.dev
```

**Copy this URL** - you'll test it in Step 10.

### Step 9: Configure Custom Domain (Optional)

If you want a custom domain:

1. Go to **Custom domains** tab
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `dev.jobmatch.ai`)
4. Follow DNS configuration steps
5. Wait for SSL certificate provisioning (automatic)

### Step 10: Verify Deployment

Open the Cloudflare Pages URL in your browser:

#### ✅ Success Checklist:

1. **Page loads:** React app renders correctly
2. **Supabase connection:** Authentication works
3. **Backend API:** Can fetch data from Railway
4. **No console errors:** Check browser DevTools (F12)

#### Test These Features:

- [ ] Sign up / Login
- [ ] View jobs
- [ ] Create application
- [ ] Upload resume (tests backend connection)
- [ ] AI generation features (tests OpenAI integration)

---

## Post-Deployment Configuration

### Configure Branch Deployments

1. Go to **Settings** tab in Cloudflare Pages
2. Scroll to **Builds & deployments**
3. Under **Branch deployments:**
   - **Production branch:** `develop` (already set)
   - **Preview branches:** Enable **All branches**
   - This enables automatic PR previews

### Set Up Deployment Notifications (Optional)

1. Go to **Settings** → **Notifications**
2. Add webhook for deployment status
3. Options:
   - Slack notifications
   - Discord webhook
   - Email alerts

---

## Environment Variable Management

### Current Setup (Development)

All variables point to **development** resources:
- Supabase: Development database (`wpupbucinufbaiphwogc`)
- Backend: Railway development environment

### Future Setup (Production Migration)

When you migrate staging/production to Cloudflare:

1. Go to **Settings** → **Environment variables**
2. Click on each variable
3. Set different values per environment:
   - **Production** (main branch): Production Supabase, Production backend
   - **Preview** (other branches): Development Supabase, Development backend

---

## Troubleshooting

### Build Fails with "Node.js version not supported"

**Solution:** Add `NODE_VERSION=22.12.0` environment variable

### Build Fails with "npm install" errors

**Solution:**
1. Check GitHub repository has `package.json` and `package-lock.json`
2. Verify `package-lock.json` is not corrupted
3. Try deleting and recreating the Pages project

### Deployment Succeeds but App Shows Blank Page

**Solution:**
1. Check browser console (F12) for errors
2. Verify environment variables are set correctly
3. Check that `dist/index.html` exists in build output
4. Verify CORS settings on Railway backend allow Cloudflare domain

### Environment Variables Not Loading

**Symptoms:**
- `import.meta.env.VITE_SUPABASE_URL` is undefined
- App can't connect to Supabase

**Solution:**
1. Verify variable names start with `VITE_` (required by Vite)
2. Redeploy after adding variables (changes require rebuild)
3. Check build logs to confirm variables are set

### CORS Errors When Calling Backend

**Symptoms:**
- Console shows: `Access to fetch at 'https://backend1-development.up.railway.app' has been blocked by CORS policy`

**Solution:**
1. Go to Railway backend environment variables
2. Update `CORS_ORIGIN` to include Cloudflare Pages URL:
   ```
   CORS_ORIGIN=https://jobmatch-ai-dev.pages.dev,https://jobmatch-ai-dev-xxx.pages.dev
   ```
3. Redeploy backend on Railway

### Deployment URL Changes Every Time

**Issue:** Cloudflare generates new URLs like `jobmatch-ai-dev-abc.pages.dev`

**Solution:**
- The base URL `jobmatch-ai-dev.pages.dev` is permanent
- Use this for CORS configuration
- Other URLs are deployment-specific previews

---

## Next Steps After Initial Deployment

### 1. Test Thoroughly

- [ ] Test all major features
- [ ] Verify database operations
- [ ] Check AI integrations
- [ ] Test file uploads
- [ ] Verify authentication flows

### 2. Update CORS on Railway Backend

Add Cloudflare Pages domain to allowed origins:

```bash
# In Railway backend environment variables
CORS_ORIGIN=https://jobmatch-ai-dev.pages.dev
```

### 3. Monitor Performance

- Check Cloudflare Analytics
- Compare with Railway performance
- Monitor edge network latency

### 4. Configure Staging (Later)

When ready to migrate staging:

1. Create new environment variables for staging
2. Point to Railway staging backend
3. Deploy `staging` branch to Cloudflare

### 5. Plan Production Migration

When Cloudflare development is stable:

1. Update production branch in Cloudflare Pages
2. Configure production environment variables
3. Set up custom domain
4. Test thoroughly before switching DNS

---

## Cloudflare Pages Features

### Automatic Features (No Configuration Needed)

- ✅ **Global CDN:** 300+ edge locations worldwide
- ✅ **SSL/TLS:** Automatic HTTPS certificates
- ✅ **DDoS protection:** Built-in at edge
- ✅ **HTTP/3 & QUIC:** Enabled by default
- ✅ **Brotli compression:** Automatic for static assets
- ✅ **Cache invalidation:** Automatic on new deployments

### Available Add-ons

- **Web Analytics:** Privacy-friendly analytics (free)
- **Access Control:** Password-protect preview deployments
- **Redirects:** Configure URL redirects via `_redirects` file
- **Custom headers:** Add via `_headers` file

---

## Cost & Limits

### Cloudflare Pages Free Tier

- **Builds:** 500 builds/month
- **Bandwidth:** Unlimited
- **Requests:** Unlimited
- **Build time:** 20 minutes max per build
- **Concurrent builds:** 1

**Your usage:**
- Build time: ~9 seconds ✅
- Estimated builds/month: ~50-100 (well within limit)

### Pro Tier ($20/month) - If Needed Later

- **Builds:** Unlimited
- **Concurrent builds:** 5
- **Build time:** 30 minutes max
- **Preview environments:** Unlimited

---

## Verification Checklist

After completing setup, verify:

- [ ] Cloudflare Pages connected to GitHub (`cffrank/jobmatchAI`)
- [ ] Production branch set to `develop`
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] 4 environment variables configured
- [ ] First deployment succeeded
- [ ] Site accessible at `.pages.dev` URL
- [ ] Supabase authentication works
- [ ] Backend API calls succeed (no CORS errors)
- [ ] All major features functional

---

## Maintenance

### Weekly Tasks
- Monitor deployment status
- Check Cloudflare Analytics
- Review build logs for warnings

### Monthly Tasks
- Review bandwidth usage
- Check for build failures
- Update environment variables if secrets rotated

### When Updating Dependencies
```bash
npm update
npm run build  # Test locally
git commit -am "chore: update dependencies"
git push origin develop
# Cloudflare auto-deploys
```

---

## Support Resources

### Cloudflare Documentation
- Pages Docs: https://developers.cloudflare.com/pages
- Build Configuration: https://developers.cloudflare.com/pages/configuration/build-configuration
- Environment Variables: https://developers.cloudflare.com/pages/configuration/environment-variables

### Troubleshooting
- Cloudflare Community: https://community.cloudflare.com
- Build logs in Cloudflare Dashboard
- Railway backend logs for API issues

---

## Quick Reference

### Cloudflare Pages URLs
- **Dashboard:** https://dash.cloudflare.com
- **Your project:** Workers & Pages → jobmatch-ai-dev
- **Deployment URL:** https://jobmatch-ai-dev.pages.dev

### Railway Backend URLs
- **Development:** https://backend1-development.up.railway.app

### Repository
- **GitHub:** https://github.com/cffrank/jobmatchAI
- **Branch:** develop (currently deploying to Cloudflare)

---

**Document Version:** 1.0
**Author:** Claude Code
**Last Updated:** 2025-12-27
**Related Docs:**
- `docs/RAILWAY-MULTI-ENVIRONMENT-SETUP.md` - Backend deployment
- `docs/GITHUB-ACTIONS-MULTI-ENV.md` - CI/CD workflows
- `CLAUDE.md` - Project overview
