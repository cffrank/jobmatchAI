# Fix SUPABASE_URL Secret - Quick Action Guide

**Error**: "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL"

**Solution**: 3 simple steps to fix the secret

---

## TL;DR - Quick Fix

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# Step 1: Update the secret with exact format
echo -n "https://wpupbucinufbaiphwogc.supabase.co" | \
  wrangler secret put SUPABASE_URL --env development

# Step 2: Redeploy the Worker
wrangler deploy --env development

# Step 3: Test
curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
```

That's it! ✅

---

## What's the Problem?

The `SUPABASE_URL` environment secret in Cloudflare Workers is likely malformed. Common issues:

❌ Missing `https://` prefix
❌ Trailing whitespace or newline
❌ Wrong URL format
❌ Copied with invisible characters

The Supabase JavaScript client validates the URL and rejects it if it's not a valid HTTPS URL.

---

## Step-by-Step Fix

### Step 1: Update SUPABASE_URL Secret

**Option A: Using Command Line (Recommended)**

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# For development environment
echo -n "https://wpupbucinufbaiphwogc.supabase.co" | \
  wrangler secret put SUPABASE_URL --env development
```

**Important**: The `-n` flag in `echo` prevents adding a newline character!

**Option B: Using Cloudflare Dashboard**

1. Go to: https://dash.cloudflare.com/
2. Navigate to: **Workers & Pages** → **jobmatch-ai-dev** → **Settings**
3. Scroll to: **Environment Variables and Secrets**
4. Find: `SUPABASE_URL` under **development**
5. Click: **Edit**
6. Replace with (copy exactly, no spaces):
   ```
   https://wpupbucinufbaiphwogc.supabase.co
   ```
7. Click: **Save**

### Step 2: Redeploy Worker

After updating the secret, you MUST redeploy:

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers
wrangler deploy --env development
```

Expected output:
```
✨ Success! Uploaded secret SUPABASE_URL
🌀 Building...
Total Upload: XX.XX KiB / gzip: XX.XX KiB
Deployed jobmatch-ai-dev
  https://jobmatch-ai-dev.carl-f-frank.workers.dev
```

### Step 3: Verify the Fix

**Test 1: Health Check**
```bash
curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
```

Expected:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-29T...",
  "environment": "development"
}
```

**Test 2: Try Frontend Login**

1. Open: https://jobmatch-ai-dev.pages.dev
2. Try to log in
3. Check browser console - should see successful API calls
4. No "Invalid supabaseUrl" errors

---

## Verification Script

Run this script to check if everything is configured correctly:

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers
./verify-secrets.sh development
```

This will:
- ✅ Check all required secrets exist
- ✅ Test the health endpoint
- ✅ Verify Worker deployment

---

## Correct Values for Each Environment

### Development
```bash
SUPABASE_URL=https://wpupbucinufbaiphwogc.supabase.co
APP_URL=https://jobmatch-ai-dev.pages.dev
```

### Staging
```bash
SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
APP_URL=https://jobmatch-ai-staging.pages.dev
```

### Production
```bash
SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
APP_URL=https://jobmatch-ai-production.pages.dev
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Missing Protocol
```bash
# WRONG
wpupbucinufbaiphwogc.supabase.co
```
```bash
# CORRECT
https://wpupbucinufbaiphwogc.supabase.co
```

### ❌ Mistake 2: Trailing Slash
```bash
# WRONG
https://wpupbucinufbaiphwogc.supabase.co/
```
```bash
# CORRECT
https://wpupbucinufbaiphwogc.supabase.co
```

### ❌ Mistake 3: Whitespace
```bash
# WRONG (space at end)
https://wpupbucinufbaiphwogc.supabase.co
```
```bash
# CORRECT
https://wpupbucinufbaiphwogc.supabase.co
```

### ❌ Mistake 4: Newline Character
```bash
# WRONG (using echo without -n)
echo "https://wpupbucinufbaiphwogc.supabase.co" | wrangler secret put SUPABASE_URL
```
```bash
# CORRECT (using echo -n)
echo -n "https://wpupbucinufbaiphwogc.supabase.co" | wrangler secret put SUPABASE_URL
```

### ❌ Mistake 5: Forgetting to Redeploy
```bash
# NOT ENOUGH - secret won't take effect until deploy
wrangler secret put SUPABASE_URL --env development
```
```bash
# CORRECT - always redeploy after updating secrets
wrangler secret put SUPABASE_URL --env development
wrangler deploy --env development
```

---

## Troubleshooting

### Problem: "Secret updated but error persists"

**Solution**: Force a fresh deployment
```bash
wrangler deploy --env development --force
```

### Problem: "Can't verify if secret is correct"

**Solution**: Secrets are encrypted and cannot be read. Instead, test functionality:
```bash
# Test that Worker can connect to Supabase
curl -H "Authorization: Bearer test" \
  https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/applications
```

If you get a 401 error about invalid token (not invalid URL), then SUPABASE_URL is correct.

### Problem: "Error happens only sometimes"

**Solution**: May be hitting cached old deployment. Clear cache:
```bash
# Update secret
echo -n "https://wpupbucinufbaiphwogc.supabase.co" | \
  wrangler secret put SUPABASE_URL --env development

# Force new deployment
wrangler deploy --env development --force

# Wait 30 seconds for global propagation
sleep 30

# Test again
curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
```

### Problem: "Local dev works but deployed doesn't"

**Diagnosis**: Your `.dev.vars` file is correct but Cloudflare secret is wrong.

**Solution**: Compare values:
```bash
# Check local .dev.vars
grep SUPABASE_URL .dev.vars

# Should output:
# SUPABASE_URL=https://wpupbucinufbaiphwogc.supabase.co

# Update Cloudflare secret to match
echo -n "https://wpupbucinufbaiphwogc.supabase.co" | \
  wrangler secret put SUPABASE_URL --env development
```

---

## Still Not Working?

If the error persists after following all steps:

1. **Check Supabase Status**:
   - Visit: https://status.supabase.com/
   - Ensure the platform is operational

2. **Verify Project Exists**:
   - Open: https://supabase.com/dashboard/projects
   - Confirm `wpupbucinufbaiphwogc` project exists and is active

3. **Watch Live Logs**:
   ```bash
   wrangler tail --env development --format pretty
   ```
   Then trigger the error and look for details

4. **Test Different Endpoint**:
   ```bash
   # Test API documentation endpoint (doesn't need auth)
   curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/api
   ```

5. **Check Other Secrets**:
   ```bash
   # Verify all secrets are set
   wrangler secret list --env development
   ```

---

## Need More Help?

- **Full Diagnosis**: See `AUTHENTICATION_ERROR_DIAGNOSIS.md`
- **Detailed Fix Guide**: See `SUPABASE_URL_FIX.md`
- **Verification Script**: Run `./verify-secrets.sh development`

---

## Summary

**Problem**: SUPABASE_URL secret is malformed
**Root Cause**: Missing `https://`, whitespace, or special characters
**Solution**: Update secret with exact format and redeploy

**Fix Commands**:
```bash
cd /home/carl/application-tracking/jobmatch-ai/workers
echo -n "https://wpupbucinufbaiphwogc.supabase.co" | wrangler secret put SUPABASE_URL --env development
wrangler deploy --env development
curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
```

**Expected Result**: ✅ Worker responds with 200 OK and no "Invalid supabaseUrl" errors

---

**Last Updated**: 2025-12-29
**Environment**: Development
**Worker**: jobmatch-ai-dev
**Correct SUPABASE_URL**: https://wpupbucinufbaiphwogc.supabase.co
