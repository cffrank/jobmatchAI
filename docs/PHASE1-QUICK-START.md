# Phase 1 Railway Migration - Quick Start Guide

**Time Required:** 15 minutes
**Status:** Ready to execute
**Impact:** -1.5-2 minutes per deployment

---

## What's Done (No Action Needed)

✅ Workflow optimized - removed variable setting from CLI
✅ Health check optimized - 30s → 15s startup, 10 → 5 retries
✅ Setup guide created with full instructions
✅ Verification script created for testing
✅ All documentation updated

---

## What You Need to Do (15 Minutes)

### Step 1: Open Railway Dashboard
```
https://railway.app/dashboard
→ Sign in → Select JobMatch AI project → Click Backend service
```

### Step 2: Navigate to Variables
```
Backend service → Variables tab (or Settings → Variables)
```

### Step 3: Add 15 Environment Variables

Get values from GitHub → Settings → Secrets and variables → Actions

**Required (13):**
1. `SUPABASE_URL` - Copy from GitHub secret
2. `SUPABASE_ANON_KEY` - Copy from GitHub secret
3. `SUPABASE_SERVICE_ROLE_KEY` - Copy from GitHub secret
4. `OPENAI_API_KEY` - Copy from GitHub secret
5. `SENDGRID_API_KEY` - Copy from GitHub secret
6. `SENDGRID_FROM_EMAIL` - Copy from GitHub secret
7. `JWT_SECRET` - Copy from GitHub secret
8. `LINKEDIN_CLIENT_ID` - Copy from GitHub secret
9. `LINKEDIN_CLIENT_SECRET` - Copy from GitHub secret
10. `LINKEDIN_REDIRECT_URI` - Copy from GitHub secret
11. `APIFY_API_TOKEN` - Copy from GitHub secret (optional)
12. `NODE_ENV` - Type: `production`
13. `PORT` - Type: `3000`

**For each variable:**
- Click "+ Add Variable"
- Enter name and value
- Click "Add"
- Repeat

### Step 4: Verify Setup
```bash
cd /home/carl/application-tracking/jobmatch-ai
./scripts/verify-railway-deployment.sh
```

Expected: All checks pass (green checkmarks)

### Step 5: Test Deployment

**Option A - Automatic (Recommended)**
```bash
# Push a change to trigger deployment
git commit --allow-empty -m "test: verify phase 1 deployment"
git push origin main

# Monitor:
# GitHub → Actions → Deploy Backend to Railway (watch the run)
# OR: Railway dashboard → Backend → Deployments (watch status)
# Expected: Completes in 2-3 minutes
```

**Option B - Manual Trigger**
- GitHub → Actions → Deploy Backend to Railway
- Click "Run workflow" → "Run workflow"
- Watch it run (should complete in 2-3 minutes)

---

## Verify Success

After deployment:
- [ ] Deployment completed in 2-3 minutes (not 3-5)
- [ ] Status shows SUCCESS
- [ ] Health check passed
- [ ] No visible redeploy cycles

```bash
# Test health endpoint
curl https://[your-backend-url].railway.app/health
# Should return JSON response
```

---

## If Something Goes Wrong

**Deployment still slow (3-5 minutes)?**
- Check Railway dashboard deployments for redeploy cycles
- Run: `./scripts/verify-railway-deployment.sh`
- Check logs for missing variables

**Health check fails?**
- Verify all 15 variables are added
- Check variable names are spelled correctly
- Check Railway logs for error messages

**Variable not sticking?**
- Refresh Railway dashboard (F5)
- Verify value was pasted completely (not truncated)
- Check for extra spaces or special characters

**Need to rollback?**
- Railway dashboard → Backend → Deployments
- Click three dots on last working deployment → "Rollback"
- Done (30 seconds)

---

## Documentation

**For step-by-step details:**
`docs/RAILWAY_SETUP_GUIDE.md`

**For full context and future phases:**
`docs/RAILWAY-MIGRATION-ANALYSIS.md`

**For complete Phase 1 overview:**
`docs/PHASE1-RAILWAY-MIGRATION-COMPLETE.md`

**For testing:**
`scripts/verify-railway-deployment.sh`

---

## Timeline Expectations

- **Setup:** 10 minutes (adding variables)
- **First deployment:** 2-3 minutes
- **Verification:** 2 minutes (script + testing)
- **Total:** ~15 minutes

---

## Next Phases (Optional - Future)

Phase 2 (Week 1-2): PR environment automation
Phase 3 (Week 2-3): Full git-integrated deployments
Phase 4 (Month 2+): Cost monitoring

See `docs/RAILWAY-MIGRATION-ANALYSIS.md` Section 5 for details.

---

## Quick Checklist

```
SETUP PHASE:
[ ] Log into Railway dashboard
[ ] Open Backend service → Variables
[ ] Add SUPABASE_URL
[ ] Add SUPABASE_ANON_KEY
[ ] Add SUPABASE_SERVICE_ROLE_KEY
[ ] Add OPENAI_API_KEY
[ ] Add SENDGRID_API_KEY
[ ] Add SENDGRID_FROM_EMAIL
[ ] Add JWT_SECRET
[ ] Add LINKEDIN_CLIENT_ID
[ ] Add LINKEDIN_CLIENT_SECRET
[ ] Add LINKEDIN_REDIRECT_URI
[ ] Add APIFY_API_TOKEN
[ ] Add NODE_ENV (production)
[ ] Add PORT (3000)

VERIFICATION PHASE:
[ ] Run ./scripts/verify-railway-deployment.sh
[ ] All checks pass
[ ] Health endpoint responds

TESTING PHASE:
[ ] Push test commit or manually trigger workflow
[ ] Monitor deployment (2-3 minutes expected)
[ ] Verify status shows SUCCESS
[ ] Check health endpoint: /health
```

---

**Ready?** Go to https://railway.app/dashboard and start!
**Questions?** See the full documentation above or `docs/RAILWAY_SETUP_GUIDE.md`
