# Deploy Firebase to Supabase Migration - Quick Start Guide

**Status:** ✅ Code Ready - Deploy Now
**Estimated Time:** 30 minutes
**Complexity:** Low (mostly configuration)

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Supabase project access (ID: `lrzhpnsykasqrousgmdh`)
- [ ] API keys ready:
  - OpenAI API key
  - SendGrid API key
  - Apify API key
  - LinkedIn OAuth credentials
- [ ] Production app URL

---

## Step-by-Step Deployment

### Step 1: Deploy Edge Functions (5 minutes)

**All functions are already written and ready to deploy!**

```bash
cd /home/carl/application-tracking/jobmatch-ai

# Deploy all functions at once
./deploy-edge-functions.sh

# OR deploy individually:
supabase functions deploy rate-limit --project-ref lrzhpnsykasqrousgmdh
supabase functions deploy send-email --project-ref lrzhpnsykasqrousgmdh
supabase functions deploy generate-application --project-ref lrzhpnsykasqrousgmdh
supabase functions deploy scrape-jobs --project-ref lrzhpnsykasqrousgmdh
supabase functions deploy linkedin-oauth --project-ref lrzhpnsykasqrousgmdh
```

**Expected Output:**
```
✅ rate-limit deployed successfully
✅ send-email deployed successfully
✅ generate-application deployed successfully
✅ scrape-jobs deployed successfully
✅ linkedin-oauth deployed successfully
```

---

### Step 2: Configure Edge Function Secrets (5 minutes)

**CRITICAL:** Functions won't work without these secrets.

```bash
# Set all secrets at once
supabase secrets set \
  OPENAI_API_KEY="sk-..." \
  SENDGRID_API_KEY="SG..." \
  SENDGRID_FROM_EMAIL="noreply@jobmatch.ai" \
  APIFY_API_KEY="apify_api_..." \
  LINKEDIN_CLIENT_ID="your-linkedin-client-id" \
  LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret" \
  APP_URL="https://your-production-url.com" \
  --project-ref lrzhpnsykasqrousgmdh
```

**Verify secrets were set:**
```bash
supabase secrets list --project-ref lrzhpnsykasqrousgmdh
```

---

### Step 3: Test Edge Functions (5 minutes)

**Test each function to ensure they work:**

#### 3.1 Test Rate Limit Function

```bash
curl -X POST \
  https://lrzhpnsykasqrousgmdh.supabase.co/functions/v1/rate-limit \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"operation": "ai_generation"}'
```

**Expected Response:**
```json
{
  "allowed": true,
  "remaining": 9,
  "limit": 10,
  "resetAt": "2025-01-20T..."
}
```

#### 3.2 Test Send Email Function

```bash
curl -X POST \
  https://lrzhpnsykasqrousgmdh.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<p>This is a test email</p>"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Email sent successfully"
}
```

---

### Step 4: Update Frontend Environment Variables (2 minutes)

**Edit `.env.production`:**

```bash
# Update production environment file
cat > .env.production << 'EOF'
# Supabase Configuration
VITE_SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Remove all Firebase variables (already commented out in .env.example)
# No longer needed:
# VITE_FIREBASE_API_KEY=
# VITE_FIREBASE_AUTH_DOMAIN=
# VITE_FIREBASE_PROJECT_ID=
# VITE_FIREBASE_STORAGE_BUCKET=
# VITE_FIREBASE_MESSAGING_SENDER_ID=
# VITE_FIREBASE_APP_ID=
EOF
```

---

### Step 5: Deploy Frontend (5 minutes)

**Build and deploy the updated frontend:**

```bash
# Build production bundle
npm run build

# Deploy to your hosting provider (Vercel, Netlify, etc.)
# Example for Vercel:
vercel --prod

# Or for Netlify:
netlify deploy --prod
```

---

### Step 6: Verify Migration Success (8 minutes)

**Test all critical functionality in production:**

#### 6.1 User Authentication ✅
- [ ] Sign up new user
- [ ] Sign in existing user
- [ ] Password reset
- [ ] LinkedIn OAuth

#### 6.2 AI Application Generation ✅
- [ ] Create a job listing
- [ ] Generate application with AI
- [ ] Verify cover letter and resume generated
- [ ] Check application saved to database

#### 6.3 Job Scraping ✅
- [ ] Search for jobs (LinkedIn)
- [ ] Search for jobs (Indeed)
- [ ] Verify jobs saved to database
- [ ] Check error handling for failed sources

#### 6.4 Email Sending ✅
- [ ] Send test email
- [ ] Verify email delivered
- [ ] Check email logged in database

#### 6.5 Rate Limiting ✅
- [ ] Trigger rate limit by exceeding quota
- [ ] Verify friendly error message shown
- [ ] Confirm limit resets after period

---

## Rollback Plan (If Needed)

**If something goes wrong, you can quickly rollback:**

### Option 1: Revert to Firebase Functions (Immediate)

```bash
# Firebase functions are still deployed and working
# Just revert the frontend code changes:
git checkout HEAD~1 src/hooks/useRateLimit.ts
git checkout HEAD~1 src/lib/aiGenerator.ts
git checkout HEAD~1 src/hooks/useJobScraping.ts

# Rebuild and redeploy
npm run build
vercel --prod  # or your deployment command
```

### Option 2: Fix Edge Function Issues

```bash
# View Edge Function logs
supabase functions logs rate-limit --project-ref lrzhpnsykasqrousgmdh
supabase functions logs send-email --project-ref lrzhpnsykasqrousgmdh
supabase functions logs generate-application --project-ref lrzhpnsykasqrousgmdh

# Redeploy specific function if needed
supabase functions deploy FUNCTION_NAME --project-ref lrzhpnsykasqrousgmdh
```

---

## Post-Deployment Checklist

After successful deployment:

### Immediate (Today)
- [ ] Monitor Edge Function invocations in Supabase dashboard
- [ ] Check error rates in Supabase logs
- [ ] Verify billing/usage limits working correctly
- [ ] Test all user-facing features

### Short-term (This Week)
- [ ] Update remaining 7 frontend files to remove Firebase imports
- [ ] Remove Firebase dependencies from package.json
- [ ] Delete `functions/` directory (after confirming everything works)
- [ ] Migrate legacy files from Firebase Storage to Supabase Storage
- [ ] Update documentation

### Long-term (This Month)
- [ ] Set up monitoring alerts for Edge Function failures
- [ ] Implement performance tracking
- [ ] Review and optimize database queries
- [ ] Consider adding Edge Function caching
- [ ] Conduct security audit

---

## Troubleshooting

### Edge Functions Not Working

**Check:**
1. Are secrets configured? (`supabase secrets list`)
2. Are functions deployed? (Check Supabase dashboard)
3. Are there CORS errors? (Check browser console)
4. Check function logs: `supabase functions logs FUNCTION_NAME`

### Rate Limiting Not Working

**Check:**
1. Usage limits table initialized? (Query Supabase database)
2. User authenticated? (Check auth token in request)
3. Function logs for errors

### AI Generation Failing

**Check:**
1. OpenAI API key valid?
2. User has complete profile (name, experience, skills)?
3. Job exists in database?
4. Check OpenAI API status: https://status.openai.com

### Job Scraping Failing

**Check:**
1. Apify API key valid?
2. Scraper actors available? (Check Apify dashboard)
3. Timeout set appropriately (currently 5 minutes)

---

## Support Resources

**Documentation:**
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Migration Plan: `/home/carl/application-tracking/jobmatch-ai/MIGRATION_EXECUTION_PLAN.md`
- Completion Report: `/home/carl/application-tracking/jobmatch-ai/FIREBASE_TO_SUPABASE_MIGRATION_COMPLETE.md`

**Supabase Dashboard:**
- Project: https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh
- Functions: https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/functions
- Logs: https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/logs

---

## Success Metrics

**You'll know the migration is successful when:**

✅ All 5 Edge Functions show "Active" status in Supabase dashboard
✅ Rate limiting works (try exceeding quota)
✅ AI application generation creates cover letters and resumes
✅ Job scraping returns results from LinkedIn and Indeed
✅ Emails are delivered via SendGrid
✅ No Firebase-related errors in browser console
✅ Database queries perform well (< 100ms for most queries)
✅ Monthly costs reduced by ~$55-90

---

## Ready to Deploy?

**Run this command to start:**

```bash
cd /home/carl/application-tracking/jobmatch-ai
./deploy-edge-functions.sh
```

**Then follow Steps 2-6 above.**

Good luck! The migration is 95% complete - you're almost there!

---

**Created:** December 20, 2025
**Status:** Ready for Production Deployment
**Estimated Deployment Time:** 30 minutes
