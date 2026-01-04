# Quick Fix Steps - Apply Now Button HTTP 405 Error

**Time Required:** 10 minutes
**Issue:** Missing environment variables causing malformed API URLs

---

## Step 1: Fix Cloudflare Pages Environment Variables (5 minutes)

### 1.1 Navigate to Cloudflare Dashboard
```
URL: https://dash.cloudflare.com
→ Workers & Pages
→ Click "jobmatch-ai-dev"
→ Settings tab
→ Environment variables section
```

### 1.2 Add Missing Variable
Click **Add variable** and enter:
```
Variable name: VITE_BACKEND_URL
Value: https://backend1-development.up.railway.app
```

**Important:** Make sure there are NO trailing slashes!
- ✅ Correct: `https://backend1-development.up.railway.app`
- ❌ Wrong: `https://backend1-development.up.railway.app/`

### 1.3 Verify All Required Variables
You should have these 4 variables configured:

| Variable Name | Value | Status |
|---------------|-------|--------|
| `NODE_VERSION` | `22.12.0` | ⚠️ Check exists |
| `VITE_SUPABASE_URL` | `https://wpupbucinufbaiphwogc.supabase.co` | ⚠️ Check exists |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ⚠️ Check exists |
| `VITE_BACKEND_URL` | `https://backend1-development.up.railway.app` | ❌ MISSING - ADD THIS |

### 1.4 Redeploy to Apply Changes
**Critical:** Environment variables only take effect after rebuild!

```
1. Click "Deployments" tab
2. Find the latest deployment (top of list)
3. Click the "..." menu button
4. Click "Retry deployment"
5. Wait for build to complete (2-5 minutes)
```

**Expected build output:**
```
✓ 1952 modules transformed.
✓ built in 9-12s
Deployment complete!
```

---

## Step 2: Fix Railway Backend CORS (5 minutes)

### 2.1 Navigate to Railway Dashboard
```
URL: https://railway.app/project
→ Select your project
→ Click "backend1-development" service
→ Variables tab
```

### 2.2 Add ALLOWED_ORIGINS Variable
Click **New Variable** and enter:
```
Variable name: ALLOWED_ORIGINS
Value: https://f19550db.jobmatch-ai-dev.pages.dev
```

**Note:** If you need to allow multiple frontends (local + Cloudflare), use comma-separated values:
```
Value: https://f19550db.jobmatch-ai-dev.pages.dev,http://localhost:5173
```

### 2.3 Deploy Changes
Railway will automatically redeploy when you add/change variables.

**Wait for deployment to complete:**
- Look for green "Active" status
- Should take 1-2 minutes

---

## Step 3: Verify Fixes (2 minutes)

### 3.1 Check Frontend Environment Variables
1. Open your Cloudflare Pages URL in browser:
   ```
   https://f19550db.jobmatch-ai-dev.pages.dev
   ```

2. Open browser DevTools (F12)

3. Go to Console tab and run:
   ```javascript
   console.log(import.meta.env.VITE_BACKEND_URL)
   ```

**Expected output:** `https://backend1-development.up.railway.app`
**If undefined:** Redeploy didn't complete or variable not set correctly

### 3.2 Test Apply Now Button
1. Navigate to a job listing on the site
2. Click "Apply Now" button
3. Check Network tab in DevTools (F12)

**Look for request to:**
```
URL: https://backend1-development.up.railway.app/api/applications/generate
Method: POST
Status: 201 Created (or 200 OK)
```

**Success indicators:**
- ✅ URL is properly formed (starts with https://)
- ✅ Response contains application data
- ✅ No CORS errors in console
- ✅ No 405 Method Not Allowed errors

### 3.3 Check CORS Headers (Optional)
In Network tab:
1. Click the `/api/applications/generate` request
2. Go to Headers section
3. Look for Response Headers:

**Expected:**
```
Access-Control-Allow-Origin: https://f19550db.jobmatch-ai-dev.pages.dev
Access-Control-Allow-Credentials: true
```

---

## Troubleshooting

### Issue: Still getting 405 errors

**Possible causes:**
1. Cloudflare Pages didn't rebuild
   - Solution: Force another deployment retry

2. Environment variable has typo
   - Solution: Double-check spelling in Cloudflare dashboard

3. Browser cache
   - Solution: Hard refresh (Ctrl+Shift+R) or open in incognito

### Issue: CORS errors

**Error message:** "Access to fetch at '...' has been blocked by CORS policy"

**Solution:**
1. Verify `ALLOWED_ORIGINS` is set correctly in Railway
2. Check Railway deployment logs for CORS warnings
3. Make sure Cloudflare Pages URL matches exactly (no trailing slash)

### Issue: Environment variable shows as undefined

**Possible causes:**
1. Didn't redeploy after adding variable
   - Solution: Retry deployment in Cloudflare

2. Variable name typo (case-sensitive!)
   - Must be: `VITE_BACKEND_URL` (all caps, with VITE_ prefix)

3. Using `process.env` instead of `import.meta.env`
   - Vite uses `import.meta.env`, not `process.env`

---

## Quick Verification Checklist

After completing all steps, verify:

- [ ] Cloudflare Pages has `VITE_BACKEND_URL` variable set
- [ ] Cloudflare Pages redeployed successfully
- [ ] Railway backend has `ALLOWED_ORIGINS` variable set
- [ ] Railway backend redeployed (green "Active" status)
- [ ] Browser console shows correct backend URL
- [ ] "Apply Now" button makes request to correct URL
- [ ] Response status is 201/200, not 405
- [ ] No CORS errors in console
- [ ] Application generation works end-to-end

---

## Success Criteria

When everything is working correctly:

1. **Console check:**
   ```javascript
   import.meta.env.VITE_BACKEND_URL
   // → "https://backend1-development.up.railway.app"
   ```

2. **Network tab:**
   ```
   Request URL: https://backend1-development.up.railway.app/api/applications/generate
   Status: 201 Created
   Response: {id: "...", jobId: "...", variants: [...]}
   ```

3. **User experience:**
   - Click "Apply Now" → Loading spinner appears
   - After 10-30 seconds → See generated resume/cover letter
   - No error messages or failed requests

---

## Rollback Plan (If Issues Persist)

If the fixes cause other problems:

### Cloudflare Pages:
1. Go to Deployments tab
2. Find the previous working deployment
3. Click "..." → "Rollback to this deployment"

### Railway Backend:
1. Go to Variables tab
2. Click "..." on `ALLOWED_ORIGINS` variable
3. Click "Remove"
4. Service will redeploy with previous CORS config

---

## Next Steps After Fix

Once the "Apply Now" button is working:

1. **Test other features:**
   - Job scraping
   - Resume upload
   - Email sending
   - LinkedIn OAuth

2. **Update documentation:**
   - Add `VITE_BACKEND_URL` to deployment guides
   - Document `ALLOWED_ORIGINS` in Railway setup

3. **Monitor for issues:**
   - Check Cloudflare Pages analytics
   - Review Railway logs for errors
   - Set up error tracking (Sentry, etc.)

---

## Need Help?

If issues persist after following all steps:

1. Check Railway backend logs:
   ```
   Railway Dashboard → backend1-development → Logs tab
   Look for CORS warnings or 405 errors
   ```

2. Check Cloudflare Pages build logs:
   ```
   Cloudflare Dashboard → jobmatch-ai-dev → Deployments → Click latest → View logs
   Look for build errors or missing environment variables
   ```

3. Review the detailed analysis:
   - See: `APPLY_NOW_BUTTON_FIX.md` for technical details
   - See: `docs/CLOUDFLARE_PAGES_SETUP.md` for full setup guide

---

**Last Updated:** 2025-12-27
**Status:** Ready to Deploy
