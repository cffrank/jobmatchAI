# Cloudflare Dashboard - Secret Update Guide

Step-by-step guide to verify and fix the `SUPABASE_URL` secret using the Cloudflare Dashboard.

---

## When to Use This Guide

Use the Cloudflare Dashboard to update secrets if:
- You prefer a visual interface over CLI
- You need to verify the exact value of a secret
- The `wrangler` CLI is not working
- You want to see all secrets at once

---

## Step 1: Navigate to Worker Settings

1. **Open Cloudflare Dashboard**:
   - URL: https://dash.cloudflare.com/
   - Log in with your Cloudflare account

2. **Navigate to Workers & Pages**:
   - Click on **Workers & Pages** in the left sidebar
   - Or go directly to: https://dash.cloudflare.com/?to=/:account/workers-and-pages

3. **Select Your Worker**:
   - Find and click: **jobmatch-ai-dev**
   - You should see the Worker overview page

4. **Open Settings Tab**:
   - Click the **Settings** tab at the top
   - This shows all configuration options

---

## Step 2: Locate Environment Variables

1. **Scroll Down to Variables Section**:
   - Look for: **Environment Variables and Secrets**
   - This section shows all configured variables and secrets

2. **Switch to Development Environment**:
   - At the top of the Variables section, you'll see environment tabs
   - Click: **development** (if you're fixing the dev environment)
   - Note: Each environment (development, staging, production) has separate secrets

3. **Find SUPABASE_URL**:
   - Scroll through the list of secrets
   - Look for: `SUPABASE_URL`
   - It should have type: **Secret** (encrypted, not plain text)

---

## Step 3: View Current Secret Value

**Important**: For security, Cloudflare encrypts secrets. You have two options:

### Option A: Edit to View (Recommended)

1. **Click Edit Button**:
   - Find `SUPABASE_URL` in the list
   - Click the **Edit** button (pencil icon)

2. **View Current Value**:
   - You'll see the current secret value in a text input
   - This is the ACTUAL value being used by the Worker
   - Check if it matches: `https://wpupbucinufbaiphwogc.supabase.co`

3. **Common Issues to Look For**:
   - ❌ Missing `https://` at the beginning
   - ❌ Extra spaces before or after the URL
   - ❌ Trailing slash: `https://wpupbucinufbaiphwogc.supabase.co/`
   - ❌ Wrong URL entirely

### Option B: Delete and Recreate

If you can't edit or prefer a fresh start:

1. **Delete Existing Secret**:
   - Click the **Delete** button (trash icon) next to `SUPABASE_URL`
   - Confirm deletion

2. **Add New Secret**:
   - Click: **Add Variable**
   - Variable name: `SUPABASE_URL`
   - Type: **Secret** (encrypted)
   - Value: See Step 4 below

---

## Step 4: Update Secret Value

### If Editing Existing Secret:

1. **Clear Current Value**:
   - Select all text in the input field
   - Delete it

2. **Enter Correct Value**:
   - Copy this EXACT value (triple-click to select all):
     ```
     https://wpupbucinufbaiphwogc.supabase.co
     ```
   - Paste into the input field
   - **Critical**: Make sure there are NO extra spaces or characters

3. **Verify Before Saving**:
   - The value should be EXACTLY 43 characters
   - It should start with `https://`
   - It should end with `.co` (no trailing `/`)
   - No spaces before or after

4. **Click Save**:
   - Click the **Save** button
   - You should see a success message

### If Creating New Secret:

1. **Click "Add Variable"**:
   - At the top of the Variables section
   - Or at the bottom of the secret list

2. **Fill in Details**:
   - **Variable name**: `SUPABASE_URL`
   - **Type**: Select **Secret** (the encrypted option)
   - **Value**: Paste `https://wpupbucinufbaiphwogc.supabase.co`

3. **Click "Add Variable"** or **"Save"**

---

## Step 5: Verify Other Required Secrets

While you're in the Dashboard, verify these secrets also exist:

| Secret Name | Environment | Required |
|-------------|-------------|----------|
| `SUPABASE_URL` | development | ✅ Yes |
| `SUPABASE_ANON_KEY` | development | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | development | ✅ Yes |
| `OPENAI_API_KEY` | development | ✅ Yes |
| `APP_URL` | development | ✅ Yes |
| `APIFY_API_TOKEN` | development | ⚠️ Optional |
| `AI_GATEWAY_SLUG` | development | ⚠️ Optional |
| `CLOUDFLARE_ACCOUNT_ID` | development | ⚠️ Optional |

**For each secret**, verify:
- It exists in the **development** environment
- It has type **Secret** (not plain text variable)
- It has a value set (you'll see "•••••" if encrypted)

**If any are missing**, click **Add Variable** and create them.

---

## Step 6: Trigger Redeployment

**CRITICAL**: After updating secrets, you MUST redeploy the Worker for changes to take effect!

### Option A: Redeploy via Dashboard (Easiest)

1. **Go to Deployments Tab**:
   - Click the **Deployments** tab at the top
   - You'll see a list of previous deployments

2. **Find Latest Deployment**:
   - The most recent one should be at the top
   - Note the deployment ID and timestamp

3. **Trigger Redeploy**:
   - Unfortunately, Cloudflare Dashboard doesn't have a direct "Redeploy" button
   - You'll need to use CLI (see Option B) or make a code change

### Option B: Redeploy via CLI (Recommended)

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers
wrangler deploy --env development
```

This will:
- Upload the latest Worker code
- Apply all secret changes
- Create a new deployment
- Update the live Worker in ~10 seconds

**Wait for confirmation**:
```
✨ Success!
Deployed jobmatch-ai-dev
  https://jobmatch-ai-dev.carl-f-frank.workers.dev
```

---

## Step 7: Test the Fix

### Test 1: Health Check

**Using Browser**:
1. Open: https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
2. You should see:
   ```json
   {
     "status": "healthy",
     "timestamp": "2025-12-29T...",
     "environment": "development"
   }
   ```

**Using Command Line**:
```bash
curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
```

### Test 2: Frontend Authentication

1. **Open Frontend**:
   - URL: https://jobmatch-ai-dev.pages.dev
   - Or your local development URL

2. **Try to Log In**:
   - Use your Supabase credentials
   - Or create a new account

3. **Check Browser Console**:
   - Press F12 to open DevTools
   - Go to **Console** tab
   - Look for any errors mentioning "Invalid supabaseUrl"

4. **Check Network Tab**:
   - Go to **Network** tab in DevTools
   - Filter by: **Fetch/XHR**
   - Look at requests to `jobmatch-ai-dev.carl-f-frank.workers.dev`
   - They should return 200 or 401 (auth required), NOT 500

### Test 3: API Endpoint

**Test an authenticated endpoint**:
```bash
curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/applications
```

Expected response:
```json
{
  "code": "MISSING_AUTH_HEADER",
  "message": "No authorization header provided",
  "statusCode": 401
}
```

This is CORRECT - it means the Worker is running and Supabase client was created successfully!

**If you still see 500 errors or "Invalid supabaseUrl"**, the secret is still malformed.

---

## Step 8: Verify in Real-Time Logs

1. **Open Real-Time Logs in Dashboard**:
   - Go to your Worker: **jobmatch-ai-dev**
   - Click: **Real-time Logs** tab
   - Or click: **Begin log stream**

2. **Make a Test Request**:
   - While logs are streaming, open a new browser tab
   - Visit: https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
   - Or try to log in on the frontend

3. **Watch for Errors**:
   - Look for red error messages
   - Search for: "Invalid supabaseUrl"
   - If you see it, the secret is STILL malformed

4. **If No Errors**:
   - You should see normal request logs
   - Status codes: 200, 401 (expected for auth endpoints)
   - No mention of Supabase URL errors

---

## Correct Values Reference

Copy these EXACT values when updating secrets in the Dashboard:

### Development Environment

```
SUPABASE_URL
https://wpupbucinufbaiphwogc.supabase.co
```

```
APP_URL
https://jobmatch-ai-dev.pages.dev
```

### Staging Environment

```
SUPABASE_URL
https://lrzhpnsykasqrousgmdh.supabase.co
```

```
APP_URL
https://jobmatch-ai-staging.pages.dev
```

### Production Environment

```
SUPABASE_URL
https://lrzhpnsykasqrousgmdh.supabase.co
```

```
APP_URL
https://jobmatch-ai-production.pages.dev
```

---

## Common Dashboard UI Mistakes

### ❌ Mistake 1: Editing Wrong Environment

**Problem**: You edit `SUPABASE_URL` in **production** but the error is in **development**

**Solution**:
- Always check which environment tab is selected
- Secrets are environment-specific!
- Development ≠ Staging ≠ Production

### ❌ Mistake 2: Creating as Plain Text Variable

**Problem**: Creating `SUPABASE_URL` as a **Variable** instead of a **Secret**

**Solution**:
- When clicking "Add Variable", select **Type: Secret**
- Secrets are encrypted, Variables are not
- You should see "•••••" instead of the actual value in the list

### ❌ Mistake 3: Copy-Paste Adds Invisible Characters

**Problem**: Copying from documentation or other sources adds spaces or newlines

**Solution**:
1. Paste value into a plain text editor first (Notepad, TextEdit)
2. Verify it looks correct with no extra spaces
3. Copy from text editor
4. Paste into Cloudflare Dashboard field

### ❌ Mistake 4: Forgetting to Save

**Problem**: Editing the value but clicking "Cancel" or closing the browser

**Solution**:
- Always click the **Save** button after editing
- Wait for the success message
- The value should disappear and show "•••••"

### ❌ Mistake 5: Not Redeploying After Update

**Problem**: Secret is updated but Worker still uses old value

**Solution**:
- Secrets are only loaded during Worker deployment
- After updating ANY secret, always redeploy:
  ```bash
  wrangler deploy --env development
  ```

---

## Dashboard vs CLI - Which to Use?

### Use Dashboard When:
- ✅ You want to see all secrets at once
- ✅ You need to verify exact value of a secret
- ✅ You're more comfortable with visual interfaces
- ✅ You need to compare secrets across environments

### Use CLI When:
- ✅ You're updating multiple secrets
- ✅ You want to automate secret management
- ✅ You're already working in the terminal
- ✅ You need to ensure exact formatting (no hidden characters)

**Recommendation**: Use CLI for setting secrets, Dashboard for verification.

---

## Troubleshooting Dashboard Issues

### Can't Find Worker

**Problem**: `jobmatch-ai-dev` doesn't appear in Workers list

**Possible Causes**:
- Wrong Cloudflare account
- Worker belongs to a different team/account
- Worker was deleted

**Solution**:
1. Check account selector (top right of Dashboard)
2. Verify you're in the correct account
3. Check Worker name matches exactly

### Secret Value Not Saving

**Problem**: Click Save but value doesn't update

**Possible Causes**:
- Browser extension blocking
- Ad blocker interfering
- Cloudflare Dashboard bug

**Solution**:
1. Try in Incognito/Private browsing mode
2. Disable browser extensions temporarily
3. Use CLI instead: `wrangler secret put`

### Deployment Tab Shows Old Deployments

**Problem**: Can't see recent deployment after saving secrets

**Why**: Saving secrets doesn't auto-deploy

**Solution**: Deploy manually via CLI:
```bash
wrangler deploy --env development
```

---

## Quick Checklist for Dashboard Update

Before leaving the Dashboard, verify:

- [ ] `SUPABASE_URL` is set to: `https://wpupbucinufbaiphwogc.supabase.co`
- [ ] Value has NO trailing spaces or slashes
- [ ] Value starts with `https://` (not `http://`)
- [ ] Secret type is **Secret** (encrypted), not Variable
- [ ] Correct environment is selected (development/staging/production)
- [ ] All other required secrets exist
- [ ] Clicked **Save** after editing
- [ ] Saw success confirmation message
- [ ] Redeployed Worker via CLI
- [ ] Tested health endpoint and got 200 OK

---

## Summary

**To fix SUPABASE_URL via Dashboard**:

1. Go to: https://dash.cloudflare.com/
2. Click: **Workers & Pages** → **jobmatch-ai-dev**
3. Click: **Settings** tab
4. Find: **Environment Variables and Secrets**
5. Select: **development** environment
6. Click: **Edit** on `SUPABASE_URL`
7. Enter: `https://wpupbucinufbaiphwogc.supabase.co` (exactly)
8. Click: **Save**
9. Run: `wrangler deploy --env development`
10. Test: `curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health`

**Result**: ✅ No more "Invalid supabaseUrl" errors!

---

**Last Updated**: 2025-12-29
**Environment**: Development
**Worker**: jobmatch-ai-dev
