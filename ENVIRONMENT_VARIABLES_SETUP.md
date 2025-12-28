# Environment Variables Setup - URGENT

**Status:** ❌ Required environment variables are NOT configured
**Impact:** Apply Now button is broken (HTTP 405 errors)

---

## Step 1: Configure Cloudflare Pages Environment Variables

### **URL to open:**
https://dash.cloudflare.com → Workers & Pages → jobmatch-ai-dev → Settings → Environment variables

### **Add this variable:**

| Variable Name | Value |
|---------------|-------|
| `VITE_BACKEND_URL` | `https://backend1-development.up.railway.app` |

**Important:**
- No trailing slash!
- Must be exactly: `https://backend1-development.up.railway.app`

### **After adding the variable:**

1. Go to: Deployments tab
2. Click the "..." menu on the latest deployment
3. Click "Retry deployment"
4. Wait 2-5 minutes for rebuild

**Why this is needed:**
- Vite embeds environment variables at build time
- Without this, the app uses `http://localhost:3001` as fallback
- Browser treats it as relative URL → creates malformed URLs
- Result: HTTP 405 errors

---

## Step 2: Configure Railway Backend CORS

### **URL to open:**
https://railway.app/project → backend1-development → Variables

### **Add this variable:**

| Variable Name | Value |
|---------------|-------|
| `ALLOWED_ORIGINS` | `https://f19550db.jobmatch-ai-dev.pages.dev` |

**Important:**
- No trailing slash!
- Must match your Cloudflare Pages URL exactly

### **Railway will auto-redeploy** when you save the variable.

---

## Step 3: Verify the Fix

After both deployments complete (5-10 minutes total):

1. **Open browser console** (F12)
2. **Run this command:**
   ```javascript
   console.log(import.meta.env.VITE_BACKEND_URL)
   ```
3. **Expected output:** `"https://backend1-development.up.railway.app"`
4. **If you see:** `undefined` or `http://localhost:3001` → Cloudflare didn't redeploy yet

---

## Current Status

### ❌ Not Working Yet:
- Apply Now button (HTTP 405 errors)
- All backend API calls failing

### ✅ Working:
- Database migration applied
- Compatibility fields ready
- Analytics icon visible
- Notifications page working

---

## Quick Test After Setup

Once environment variables are configured:

1. Click "Apply Now" on a job
2. Should see loading spinner
3. Should generate resume/cover letter (10-30 seconds)
4. No 405 errors in console

---

**Time to complete:** 5 minutes setup + 5 minutes deployment = 10 minutes total
**Current blocking issue:** Missing environment variables
