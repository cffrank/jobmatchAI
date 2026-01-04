# JobMatch AI - Cloudflare Workers Deployment Guide

**Created**: 2025-12-28
**Status**: ✅ Ready for Deployment

---

## 📋 Prerequisites Checklist

- [x] Wrangler CLI installed (v4.54.0)
- [x] Dependencies installed (`npm install` completed)
- [x] Environment variables configured (`.dev.vars` created)
- [x] Syntax errors fixed
- [ ] Cloudflare account created
- [ ] Cloudflare account logged in via Wrangler

---

## 🚀 Deployment Steps

### Step 1: Local Testing (Optional but Recommended)

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# Start the development server
npm run dev
# or
wrangler dev --port 8787

# The server will start at: http://localhost:8787
# Test the health endpoint: curl http://localhost:8787/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-28T...",
  "environment": "development"
}
```

**Press Ctrl+C to stop the dev server** when done testing.

---

### Step 2: Login to Cloudflare

```bash
wrangler login
```

This will:
1. Open your browser
2. Ask you to authorize Wrangler
3. Save your credentials locally

---

### Step 3: Configure Cloudflare Secrets

These secrets are stored securely in Cloudflare (not in your code):

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# Required secrets
wrangler secret put SUPABASE_URL
# Paste: https://lrzhpnsykasqrousgmdh.supabase.co

wrangler secret put SUPABASE_ANON_KEY
# Paste: <your-supabase-anon-key-from-supabase-dashboard>

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste: <your-supabase-service-role-key-from-supabase-dashboard>

wrangler secret put OPENAI_API_KEY
# Paste: <your-openai-api-key>

wrangler secret put APP_URL
# For development: http://localhost:5173
# For production: https://your-frontend-domain.com

# Optional secrets (uncomment if you have them)
# wrangler secret put SENDGRID_API_KEY
# wrangler secret put SENDGRID_FROM_EMAIL
# wrangler secret put LINKEDIN_CLIENT_ID
# wrangler secret put LINKEDIN_CLIENT_SECRET
# wrangler secret put LINKEDIN_REDIRECT_URI

wrangler secret put APIFY_API_TOKEN
# Paste: <your-apify-api-token>
```

---

### Step 4: Deploy to Staging

```bash
# Deploy to staging environment
npm run deploy:staging

# or directly
wrangler deploy --env staging
```

**What happens**:
- Code is bundled and optimized
- Uploaded to Cloudflare's edge network
- Cron Triggers are configured
- Secrets are attached
- You get a URL like: `https://jobmatch-ai-staging.your-subdomain.workers.dev`

---

### Step 5: Test Staging Deployment

```bash
# Get your staging URL from the deployment output, then test:

# Health check
curl https://jobmatch-ai-staging.your-subdomain.workers.dev/health

# API documentation (dev mode only)
curl https://jobmatch-ai-staging.your-subdomain.workers.dev/api

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "...",
#   "environment": "staging"
# }
```

**Test Critical Endpoints**:
1. Health check: `/health`
2. Resume parsing: `POST /api/resume/parse` (requires authentication)
3. AI generation: `POST /api/applications/generate` (requires authentication)

---

### Step 6: Deploy to Production

Once staging is tested and working:

```bash
# Deploy to production environment
npm run deploy:production

# or directly
wrangler deploy --env production
```

**Production URL**: `https://jobmatch-ai.your-subdomain.workers.dev`

---

## 🔧 Configuration

### Environment Variables in wrangler.toml

The `wrangler.toml` file has three environments configured:

1. **Development** (default) - for `wrangler dev`
2. **Staging** (`--env staging`) - for testing before production
3. **Production** (`--env production`) - for live users

Each environment can have different:
- Worker names
- Routes
- Environment variables
- Cron schedules

---

## 📊 Monitoring & Logs

### View Live Logs

```bash
# Tail logs in real-time
wrangler tail

# Tail logs for specific environment
wrangler tail --env production

# Filter logs
wrangler tail --env production --status error
```

### Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to: **Workers & Pages** → **Your Worker**
3. View:
   - Request analytics
   - Error rates
   - CPU usage
   - Success rates
   - Invocation logs

---

## 🔐 Security Checklist

- [x] Secrets stored in Cloudflare (not in code)
- [x] `.dev.vars` added to `.gitignore`
- [x] Service role key only used for admin operations
- [x] JWT verification on all authenticated endpoints
- [x] Rate limiting implemented
- [x] CORS configured with APP_URL
- [x] Input validation using Zod schemas

---

## 🐛 Troubleshooting

### Issue: "wrangler: command not found"

**Solution**:
```bash
npm install -g wrangler
```

### Issue: "Error 1101: Worker threw exception"

**Solution**:
1. Check Cloudflare dashboard logs
2. Run `wrangler tail --env production` to see real-time errors
3. Verify all secrets are configured correctly

### Issue: CORS errors from frontend

**Solution**:
1. Update `APP_URL` secret to match your frontend URL:
   ```bash
   wrangler secret put APP_URL
   # Enter: https://your-frontend-domain.com
   ```
2. Redeploy: `npm run deploy:production`

### Issue: Authentication failures

**Solution**:
1. Verify Supabase keys are correct:
   ```bash
   # List secrets
   wrangler secret list

   # Update if needed
   wrangler secret put SUPABASE_ANON_KEY
   ```
2. Check that frontend is sending `Authorization: Bearer <token>` header

### Issue: Rate limit errors

**Solution**:
Rate limits are configured in `middleware/rateLimiter.ts`:
- Email: 10/hour
- AI generation: 20/hour
- Exports: 30/hour
- Global IP: 100/minute

To adjust, edit the file and redeploy.

---

## 📈 Next Steps After Deployment

1. **Update Frontend Configuration**
   ```env
   VITE_BACKEND_URL=https://jobmatch-ai.your-subdomain.workers.dev
   ```

2. **Test All Features**
   - Resume upload & parsing
   - AI application generation
   - Email sending
   - LinkedIn OAuth
   - Job management

3. **Monitor Performance**
   - Check Cloudflare dashboard
   - Monitor error rates
   - Verify scheduled jobs are running
   - Review cost and usage

4. **Optional Enhancements**
   - Set up custom domain
   - Add Sentry for error tracking
   - Implement comprehensive testing
   - Migrate to Workers AI (95% cost savings)

---

## 📞 Support

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **Hono Framework**: https://hono.dev/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/

---

## ✅ Deployment Checklist

**Pre-Deployment**:
- [x] Wrangler installed
- [x] Dependencies installed
- [x] Environment variables configured
- [x] Syntax errors fixed
- [ ] Local testing complete
- [ ] Cloudflare account created

**Deployment**:
- [ ] Logged into Cloudflare via Wrangler
- [ ] Secrets configured in Cloudflare
- [ ] Deployed to staging
- [ ] Staging tested successfully
- [ ] Deployed to production
- [ ] Production tested successfully

**Post-Deployment**:
- [ ] Frontend updated with new API URL
- [ ] End-to-end testing complete
- [ ] Monitoring configured
- [ ] Team notified

---

**Status**: Ready for deployment!
**Next Command**: `wrangler login`
