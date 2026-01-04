# Cloudflare Workers SUPABASE_URL Error Fix

**Error**: `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.`

**Status**: Troubleshooting Guide

---

## Problem

The Cloudflare Worker is returning 500 errors when trying to authenticate requests with the error:

```
Unexpected authentication error: Error: Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.
```

This error occurs in `/home/carl/application-tracking/jobmatch-ai/workers/api/services/supabase.ts` when creating a Supabase client:

```typescript
export function createSupabaseClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    // ... config
  });
}
```

The `@supabase/supabase-js` library is validating the `SUPABASE_URL` and rejecting it because:
1. It doesn't start with `https://` or `http://`
2. It has whitespace or invalid characters
3. It's malformed or empty

---

## Root Cause

The `SUPABASE_URL` secret in Cloudflare Workers is either:
- Missing the `https://` protocol prefix
- Has leading/trailing whitespace
- Is incorrectly formatted
- Contains line breaks or special characters

**Common mistakes:**
```bash
# ❌ WRONG - Missing protocol
wpupbucinufbaiphwogc.supabase.co

# ❌ WRONG - Trailing whitespace
https://wpupbucinufbaiphwogc.supabase.co

# ❌ WRONG - Line break at end
https://wpupbucinufbaiphwogc.supabase.co\n

# ✅ CORRECT - Clean URL with https://
https://wpupbucinufbaiphwogc.supabase.co
```

---

## Fix Instructions

### Step 1: Verify Secret Format in Cloudflare Dashboard

1. **Open Cloudflare Dashboard**:
   - Go to: https://dash.cloudflare.com/
   - Navigate to: **Workers & Pages** > **jobmatch-ai-dev**

2. **Check Settings > Variables**:
   - Click on the **Settings** tab
   - Scroll to **Environment Variables and Secrets**
   - Look for `SUPABASE_URL` in the **development** environment

3. **Verify the Value**:
   - Click **Edit** (or decrypt) to view the secret
   - The value MUST be **exactly**:
     ```
     https://wpupbucinufbaiphwogc.supabase.co
     ```
   - Check for:
     - ✅ Starts with `https://` (NOT `http://`)
     - ✅ No spaces before or after
     - ✅ No line breaks or special characters
     - ✅ Ends with `.supabase.co` (no trailing slash)

### Step 2: Update the Secret (If Incorrect)

If the secret is malformed, update it using **wrangler CLI** (recommended):

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# Set the secret correctly
echo -n "https://wpupbucinufbaiphwogc.supabase.co" | wrangler secret put SUPABASE_URL --env development
```

**Important**: Use `echo -n` (no newline) to prevent adding a trailing newline character!

**Alternative: Use Cloudflare Dashboard**

1. In the Dashboard, click **Edit** next to `SUPABASE_URL`
2. Delete the current value
3. Copy this EXACT value (no extra spaces):
   ```
   https://wpupbucinufbaiphwogc.supabase.co
   ```
4. Paste it carefully
5. Click **Save**

### Step 3: Redeploy the Worker

After updating the secret, you MUST redeploy for changes to take effect:

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers
wrangler deploy --env development
```

### Step 4: Test the Fix

Test the health endpoint to verify the fix:

```bash
curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-29T...",
  "version": "1.0.0",
  "environment": "development",
  "runtime": "Cloudflare Workers"
}
```

Test an authenticated endpoint (if you have a valid token):

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/applications
```

### Step 5: Check Worker Logs

If errors persist, check the real-time logs:

```bash
wrangler tail --env development
```

Then make a test request from the frontend or using curl. Look for:
- ✅ No more "Invalid supabaseUrl" errors
- ✅ Successful Supabase client creation
- ✅ Authentication working correctly

---

## Verification Checklist

Use this checklist to verify the fix:

- [ ] `SUPABASE_URL` secret exists in Cloudflare Dashboard
- [ ] Secret value is exactly: `https://wpupbucinufbaiphwogc.supabase.co`
- [ ] Value starts with `https://` (NOT `http://`)
- [ ] No leading or trailing whitespace
- [ ] No line breaks or special characters
- [ ] Worker has been redeployed after secret update
- [ ] Health endpoint returns 200 OK
- [ ] Authentication errors are resolved
- [ ] Worker logs show no "Invalid supabaseUrl" errors

---

## Common Pitfalls

### 1. Using Dashboard Copy-Paste

**Problem**: When copying from Supabase dashboard or `.env` files, you may accidentally include:
- Extra spaces
- Line breaks
- Invisible characters

**Solution**: Always verify with `echo -n` and paste into a text editor first to check for hidden characters.

### 2. Forgetting to Redeploy

**Problem**: Secrets are only loaded when the Worker is deployed. Changing a secret doesn't automatically update running instances.

**Solution**: Always run `wrangler deploy --env development` after updating secrets.

### 3. Using HTTP Instead of HTTPS

**Problem**: Supabase only accepts HTTPS connections. Using `http://` will fail.

**Solution**: Always use `https://` prefix.

### 4. Trailing Slash

**Problem**: Some URLs may include a trailing slash: `https://wpupbucinufbaiphwogc.supabase.co/`

**Solution**: Remove the trailing slash. Supabase URLs should not end with `/`.

---

## Environment-Specific URLs

Make sure you're using the correct Supabase URL for each environment:

### Development
```
SUPABASE_URL=https://wpupbucinufbaiphwogc.supabase.co
```

### Staging
```
SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
```

### Production
```
SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
# (or a separate production project if you have one)
```

---

## Debugging Steps

If the error persists after following the fix instructions:

### 1. Verify Secret is Set Correctly

```bash
# List all secrets to confirm SUPABASE_URL exists
wrangler secret list --env development
```

Expected output should include:
```json
{
  "name": "SUPABASE_URL",
  "type": "secret_text"
}
```

### 2. Test Secret in Local Development

Create a `.dev.vars` file for local testing:

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers
cat > .dev.vars << 'EOF'
SUPABASE_URL=https://wpupbucinufbaiphwogc.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
OPENAI_API_KEY=your-openai-key-here
APP_URL=http://localhost:5173
ENVIRONMENT=development
EOF
```

Then test locally:
```bash
wrangler dev --env development
```

If local works but deployed doesn't, it confirms the secret is malformed.

### 3. Add Debugging Log

Temporarily add a debug log to verify what value is being received:

```typescript
// In api/services/supabase.ts
export function createSupabaseClient(env: Env): SupabaseClient {
  console.log('SUPABASE_URL value:', JSON.stringify(env.SUPABASE_URL));
  console.log('SUPABASE_URL length:', env.SUPABASE_URL?.length);
  console.log('SUPABASE_URL starts with https:', env.SUPABASE_URL?.startsWith('https://'));

  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
```

Deploy and check logs:
```bash
wrangler deploy --env development
wrangler tail --env development
```

Look for:
- `SUPABASE_URL value: "https://wpupbucinufbaiphwogc.supabase.co"`
- `SUPABASE_URL length: 43` (should be 43 characters)
- `SUPABASE_URL starts with https: true`

If any of these are wrong, the secret is malformed.

---

## Quick Fix Script

Use this script to set all required secrets correctly:

```bash
#!/bin/bash
# File: /home/carl/application-tracking/jobmatch-ai/workers/set-dev-secrets.sh

cd /home/carl/application-tracking/jobmatch-ai/workers

echo "Setting development secrets for Cloudflare Workers..."

# IMPORTANT: Update these values with your actual credentials
SUPABASE_URL="https://wpupbucinufbaiphwogc.supabase.co"
SUPABASE_ANON_KEY="YOUR_ANON_KEY_HERE"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY_HERE"
OPENAI_API_KEY="YOUR_OPENAI_KEY_HERE"
APIFY_API_TOKEN="YOUR_APIFY_TOKEN_HERE"
APP_URL="https://jobmatch-ai-dev.pages.dev"

# Set each secret (use -n to prevent newlines)
echo -n "$SUPABASE_URL" | wrangler secret put SUPABASE_URL --env development
echo -n "$SUPABASE_ANON_KEY" | wrangler secret put SUPABASE_ANON_KEY --env development
echo -n "$SUPABASE_SERVICE_ROLE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env development
echo -n "$OPENAI_API_KEY" | wrangler secret put OPENAI_API_KEY --env development
echo -n "$APIFY_API_TOKEN" | wrangler secret put APIFY_API_TOKEN --env development
echo -n "$APP_URL" | wrangler secret put APP_URL --env development

echo "✅ All secrets set. Now deploying..."
wrangler deploy --env development

echo "✅ Deployment complete. Testing health endpoint..."
curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
```

**Usage:**
1. Update the values in the script with your actual credentials
2. Make it executable: `chmod +x set-dev-secrets.sh`
3. Run it: `./set-dev-secrets.sh`

---

## Related Files

- **Supabase Client**: `/home/carl/application-tracking/jobmatch-ai/workers/api/services/supabase.ts`
- **Auth Middleware**: `/home/carl/application-tracking/jobmatch-ai/workers/api/middleware/auth.ts`
- **Environment Types**: `/home/carl/application-tracking/jobmatch-ai/workers/api/types.ts`
- **Wrangler Config**: `/home/carl/application-tracking/jobmatch-ai/workers/wrangler.toml`
- **Example Vars**: `/home/carl/application-tracking/jobmatch-ai/workers/.dev.vars.example`

---

## Support

If you continue to experience issues after following this guide:

1. **Check Supabase Status**: https://status.supabase.com/
2. **Verify Network Access**: Ensure Cloudflare can reach Supabase (usually no issues)
3. **Review Worker Logs**: `wrangler tail --env development` for detailed errors
4. **Test Locally First**: Use `wrangler dev` to isolate deployment vs. code issues

---

**Last Updated**: 2025-12-29
**Environment**: Development
**Worker Name**: `jobmatch-ai-dev`
**Expected SUPABASE_URL**: `https://wpupbucinufbaiphwogc.supabase.co`
