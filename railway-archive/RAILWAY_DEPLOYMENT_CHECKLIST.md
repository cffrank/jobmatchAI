# Railway Deployment Checklist

Use this checklist to ensure a smooth deployment of JobMatch AI to Railway.

## Pre-Deployment

### Prerequisites
- [ ] PostgreSQL schema deployed to Supabase
- [ ] Supabase project created and active
- [ ] Code pushed to GitHub repository
- [ ] All local tests passing (`npm run build` in both root and backend)
- [ ] Railway account created (sign up at railway.app)

### Credentials Ready
- [ ] Supabase URL (from Supabase Dashboard > Settings > API)
- [ ] Supabase Anon Key (from Supabase Dashboard > Settings > API)
- [ ] Supabase Service Role Key (from Supabase Dashboard > Settings > API)
- [ ] OpenAI API Key (from platform.openai.com)
- [ ] SendGrid API Key (from app.sendgrid.com)
- [ ] SendGrid verified sender email
- [ ] LinkedIn Client ID (optional, from linkedin.com/developers)
- [ ] LinkedIn Client Secret (optional)
- [ ] Apify API Token (optional, from console.apify.com)
- [ ] JWT Secret (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

---

## Backend Deployment

### Setup
- [ ] Install Railway CLI (`npm install -g @railway/cli`)
- [ ] Login to Railway (`railway login`)
- [ ] Navigate to backend directory (`cd backend`)
- [ ] Initialize Railway project (`railway init`)

### Environment Variables
Set these variables in Railway (via CLI or Dashboard):

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `SENDGRID_API_KEY`
- [ ] `SENDGRID_FROM_EMAIL`
- [ ] `LINKEDIN_CLIENT_ID` (optional)
- [ ] `LINKEDIN_CLIENT_SECRET` (optional)
- [ ] `APIFY_API_TOKEN` (optional)
- [ ] `PORT=3000`
- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET`

### Deploy
- [ ] Deploy backend (`railway up`)
- [ ] Wait for deployment to complete
- [ ] Get backend URL (`railway status` or Railway Dashboard)
- [ ] Save backend URL for frontend configuration
- [ ] Test health endpoint: `curl https://your-backend-url/health`

### Verify
- [ ] Backend is accessible
- [ ] Health check returns 200 OK
- [ ] Logs show no errors (`railway logs`)
- [ ] Database connection successful

---

## Frontend Deployment

### Setup
- [ ] Navigate to root directory (`cd ..`)
- [ ] Initialize new Railway project (`railway init`)
- [ ] Choose different project name from backend

### Environment Variables
Set these variables in Railway:

- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_BACKEND_URL` (use backend Railway URL from previous step)
- [ ] `VITE_LINKEDIN_CLIENT_ID` (optional)
- [ ] `VITE_APP_NAME=JobMatch AI`

### Deploy
- [ ] Deploy frontend (`railway up`)
- [ ] Wait for deployment to complete
- [ ] Get frontend URL (`railway status` or Railway Dashboard)
- [ ] Save frontend URL

### Verify
- [ ] Frontend is accessible in browser
- [ ] Login page loads correctly
- [ ] No console errors in browser DevTools
- [ ] Supabase connection working

---

## Cross-Reference Updates

### Update Backend
- [ ] Set `APP_URL` to frontend Railway URL
- [ ] Set `LINKEDIN_REDIRECT_URI` to `https://backend-url/api/auth/linkedin/callback`
- [ ] Redeploy backend (`railway up`)

### Update Frontend
- [ ] Verify `VITE_BACKEND_URL` points to backend Railway URL
- [ ] Set `VITE_LINKEDIN_REDIRECT_URI` to `https://frontend-url/auth/callback/linkedin`
- [ ] Redeploy frontend if variables changed

---

## Post-Deployment Configuration

### LinkedIn OAuth (if applicable)
- [ ] Go to LinkedIn Developer Portal
- [ ] Add backend callback URL to Redirect URLs
- [ ] Add frontend callback URL to Redirect URLs
- [ ] Test LinkedIn login flow

### Testing
- [ ] Create test user account
- [ ] Login with test account
- [ ] Edit user profile
- [ ] Search for jobs
- [ ] Generate application (tests OpenAI integration)
- [ ] Send test email (tests SendGrid integration)
- [ ] Export application as PDF/DOCX
- [ ] Test LinkedIn OAuth (if configured)

### Monitoring
- [ ] Check Railway logs for errors
- [ ] Monitor resource usage in Railway Dashboard
- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure error tracking (Sentry, optional)

---

## Optional Enhancements

### Custom Domains
- [ ] Purchase domain name
- [ ] Add backend custom domain in Railway
- [ ] Add frontend custom domain in Railway
- [ ] Configure DNS CNAME records
- [ ] Update environment variables with new domains
- [ ] Update LinkedIn OAuth redirect URIs
- [ ] Redeploy services

### Performance
- [ ] Enable Supabase connection pooling
- [ ] Add Redis cache (Railway add-on)
- [ ] Optimize database indexes
- [ ] Enable CDN for static assets

### Security
- [ ] Rotate all secrets regularly
- [ ] Enable 2FA on Railway account
- [ ] Enable 2FA on Supabase account
- [ ] Review CORS settings
- [ ] Set up rate limit alerts
- [ ] Configure automated backups

---

## Troubleshooting Quick Checks

If something doesn't work:

### Backend Issues
- [ ] Check logs: `railway logs`
- [ ] Verify all environment variables are set
- [ ] Test health endpoint: `curl https://backend-url/health`
- [ ] Check Supabase connection
- [ ] Verify CORS configuration includes frontend URL

### Frontend Issues
- [ ] Check browser console for errors
- [ ] Verify `VITE_` prefixed variables are set
- [ ] Check Network tab for failed API requests
- [ ] Verify `VITE_BACKEND_URL` is correct
- [ ] Test Supabase connection independently

### Common Fixes
- [ ] Redeploy after setting variables
- [ ] Clear browser cache
- [ ] Check Railway service status
- [ ] Verify Supabase project is active
- [ ] Check API key validity

---

## Deployment Complete!

Once all items are checked:

- [ ] Document deployment URLs
- [ ] Update README with production URLs
- [ ] Share credentials securely with team
- [ ] Schedule regular health checks
- [ ] Set up monitoring alerts
- [ ] Plan for regular backups

---

## Quick Reference

**Backend URL:** `https://backend-production-xxxx.up.railway.app`
**Frontend URL:** `https://frontend-production-xxxx.up.railway.app`

**Railway CLI:**
- Deploy: `railway up`
- Logs: `railway logs`
- Variables: `railway variables`
- Status: `railway status`

**Testing:**
- Health: `curl https://backend-url/health`
- Frontend: Open in browser

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Version:** _______________
