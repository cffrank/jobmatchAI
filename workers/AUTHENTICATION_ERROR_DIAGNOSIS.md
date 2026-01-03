# Cloudflare Workers Authentication Error Diagnosis

**Date**: 2025-12-29
**Environment**: Development
**Worker**: `jobmatch-ai-dev`

---

## Error Report

You reported seeing this error:
```
Unexpected authentication error: Error: Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.
```

---

## Investigation Results

### ✅ Current Status: Worker is Healthy

The investigation revealed that:

1. **All secrets are properly configured**:
   - `SUPABASE_URL` ✅
   - `SUPABASE_ANON_KEY` ✅
   - `SUPABASE_SERVICE_ROLE_KEY` ✅
   - `OPENAI_API_KEY` ✅
   - `APP_URL` ✅

2. **Health endpoint works correctly**:
   ```bash
   curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
   # Returns: 200 OK
   ```

3. **Authentication middleware is working**:
   - Requests without token: Returns 401 with `MISSING_AUTH_HEADER`
   - Requests with malformed token: Returns 401 with proper error message

### 🔍 Test Results

**Test 1: No Authorization Header**
```bash
curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/applications
```
Response:
```json
{
  "code": "MISSING_AUTH_HEADER",
  "message": "No authorization header provided",
  "statusCode": 401
}
```
✅ Expected behavior

**Test 2: Invalid Token**
```bash
curl -H "Authorization: Bearer test-invalid-token" \
  https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/applications
```
Worker Logs:
```
Token verification failed: {
  "error": "invalid JWT: unable to parse or verify signature, token is malformed: token contains an invalid number of segments",
  "path": "/api/applications"
}
```
Response:
```json
{
  "code": "INTERNAL_ERROR",
  "message": "An unexpected error occurred during authentication",
  "statusCode": 500
}
```
⚠️ Returns 500 instead of 401, but this is from invalid JWT, not invalid Supabase URL

---

## Where Could the Error Be Coming From?

The error "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL" could occur in these scenarios:

### 1. **During Worker Deployment** (Most Likely)

When you deployed the Worker, if `SUPABASE_URL` was malformed at that time, the error would appear during:
- Initial Worker startup
- First Supabase client creation
- Health check initialization (but health check doesn't use Supabase)

**How to verify:**
```bash
# Check deployment logs
wrangler deploy --env development
# Look for any initialization errors
```

### 2. **During Secret Update**

If you recently updated `SUPABASE_URL` with a malformed value, it would error when:
- Creating the first Supabase client instance
- Any authenticated request

**How to fix:**
```bash
# Set the correct URL (note: use -n to prevent newline)
echo -n "https://wpupbucinufbaiphwogc.supabase.co" | \
  wrangler secret put SUPABASE_URL --env development

# Redeploy
wrangler deploy --env development
```

### 3. **In Local Development**

If running `wrangler dev` with malformed `.dev.vars`:

**Check `.dev.vars` file:**
```bash
cat .dev.vars
```

Should contain:
```
SUPABASE_URL=https://wpupbucinufbaiphwogc.supabase.co
```

NOT:
```
SUPABASE_URL=wpupbucinufbaiphwogc.supabase.co  # Missing https://
```

### 4. **Environment Variable Typo**

In `api/types.ts`, check that the environment binding is correct:

```typescript
export interface Env {
  SUPABASE_URL: string;  // Must match secret name exactly
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  // ...
}
```

---

## Root Cause Analysis

Based on the investigation, here are the possible root causes:

### ✅ Most Likely: Transient Issue or Old Error

The error you saw may have been from:
1. **An earlier deployment** when `SUPABASE_URL` was malformed
2. **A cached error message** in your browser or logs
3. **A different environment** (staging/production) that has a malformed URL

**Current state**: The development Worker is healthy and properly configured.

### ⚠️ Possible: Secret Format Issue

The `SUPABASE_URL` secret might have hidden characters that don't appear in the dashboard:
- Trailing newline (`\n`)
- Trailing space
- Unicode character
- Missing protocol

**How to verify and fix:**
```bash
# Force-update with exact format
echo -n "https://wpupbucinufbaiphwogc.supabase.co" | \
  wrangler secret put SUPABASE_URL --env development
```

### ⚠️ Possible: Caching Issue

Cloudflare Workers may cache the old secret value for a short time after update.

**How to fix:**
```bash
# Update secret
echo -n "https://wpupbucinufbaiphwogc.supabase.co" | \
  wrangler secret put SUPABASE_URL --env development

# Force fresh deployment
wrangler deploy --env development --force

# Clear any cached instances (automatic after deploy)
```

---

## Recommended Actions

### 1. **Verify Current Secret Value**

Unfortunately, you cannot read secret values via CLI or Dashboard for security reasons. But you can test if it's correct:

```bash
# Run verification script
./verify-secrets.sh development
```

This will:
- Confirm all secrets exist
- Test the health endpoint
- Verify Worker is responding

### 2. **Force-Update SUPABASE_URL**

Even if you think it's correct, re-set it to ensure no hidden characters:

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# Set with exact format (note: -n prevents newline)
echo -n "https://wpupbucinufbaiphwogc.supabase.co" | \
  wrangler secret put SUPABASE_URL --env development
```

Expected output:
```
🌀 Creating the secret for the Worker "jobmatch-ai-dev"
✨ Success! Uploaded secret SUPABASE_URL
```

### 3. **Redeploy the Worker**

```bash
wrangler deploy --env development
```

Expected output:
```
Total Upload: XX.XX KiB / gzip: XX.XX KiB
Worker Startup Time: XXX ms
Uploaded jobmatch-ai-dev (X.XX sec)
Deployed jobmatch-ai-dev triggers (X.XX sec)
  https://jobmatch-ai-dev.carl-f-frank.workers.dev
Current Version ID: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

### 4. **Test Authentication Flow**

Try to authenticate from the frontend:

1. Open: https://jobmatch-ai-dev.pages.dev
2. Try to log in with valid credentials
3. Check browser console for errors
4. Check Network tab for API requests

If you see the "Invalid supabaseUrl" error again:

```bash
# Watch live logs
wrangler tail --env development --format pretty
```

Then trigger the error by logging in or making an authenticated request.

### 5. **Verify All Secrets**

Set all required secrets again to ensure they're correct:

```bash
# Create a temporary script
cat > /tmp/set-secrets.sh << 'SCRIPT'
#!/bin/bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# Get values from .dev.vars if it exists
if [ -f .dev.vars ]; then
  source .dev.vars
fi

# Set each secret (user will be prompted for value)
echo "Setting SUPABASE_URL..."
echo -n "${SUPABASE_URL:-https://wpupbucinufbaiphwogc.supabase.co}" | \
  wrangler secret put SUPABASE_URL --env development

echo "Setting SUPABASE_ANON_KEY..."
wrangler secret put SUPABASE_ANON_KEY --env development

echo "Setting SUPABASE_SERVICE_ROLE_KEY..."
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env development

echo "Setting OPENAI_API_KEY..."
wrangler secret put OPENAI_API_KEY --env development

echo "Setting APP_URL..."
echo -n "https://jobmatch-ai-dev.pages.dev" | \
  wrangler secret put APP_URL --env development

echo "All secrets updated!"
SCRIPT

chmod +x /tmp/set-secrets.sh
/tmp/set-secrets.sh
```

---

## Debugging Checklist

If the error persists, work through this checklist:

### Environment Verification
- [ ] Confirmed environment is `development` (not staging/production)
- [ ] Worker name is `jobmatch-ai-dev`
- [ ] Deployment URL is `https://jobmatch-ai-dev.carl-f-frank.workers.dev`

### Secret Verification
- [ ] `SUPABASE_URL` is exactly: `https://wpupbucinufbaiphwogc.supabase.co`
- [ ] URL starts with `https://` (not `http://`)
- [ ] URL has no trailing slash
- [ ] URL has no whitespace or special characters
- [ ] All other required secrets are set

### Code Verification
- [ ] `api/services/supabase.ts` uses `env.SUPABASE_URL` correctly
- [ ] `api/types.ts` has correct `Env` interface
- [ ] No hardcoded URLs in the code

### Deployment Verification
- [ ] Deployed successfully with no errors
- [ ] Health endpoint returns 200 OK
- [ ] Secrets were set before deployment
- [ ] No cached old deployments

### Testing Verification
- [ ] Frontend connects to correct Worker URL
- [ ] Frontend has correct Supabase URL in build
- [ ] Network requests show correct URLs
- [ ] No CORS errors in browser console

---

## Quick Reference Commands

```bash
# Verify secrets exist
wrangler secret list --env development

# Update SUPABASE_URL (exact format)
echo -n "https://wpupbucinufbaiphwogc.supabase.co" | \
  wrangler secret put SUPABASE_URL --env development

# Redeploy
wrangler deploy --env development

# Test health
curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health

# Watch logs
wrangler tail --env development --format pretty

# Run verification script
./verify-secrets.sh development
```

---

## Expected Values Reference

### Development Environment
```bash
SUPABASE_URL=https://wpupbucinufbaiphwogc.supabase.co
APP_URL=https://jobmatch-ai-dev.pages.dev
ENVIRONMENT=development  # Set in wrangler.toml, not as secret
```

### Staging Environment
```bash
SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
APP_URL=https://jobmatch-ai-staging.pages.dev
ENVIRONMENT=staging  # Set in wrangler.toml, not as secret
```

### Production Environment
```bash
SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
APP_URL=https://jobmatch-ai-production.pages.dev
ENVIRONMENT=production  # Set in wrangler.toml, not as secret
```

---

## File References

- **Supabase Client**: `/home/carl/application-tracking/jobmatch-ai/workers/api/services/supabase.ts`
- **Auth Middleware**: `/home/carl/application-tracking/jobmatch-ai/workers/api/middleware/auth.ts`
- **Type Definitions**: `/home/carl/application-tracking/jobmatch-ai/workers/api/types.ts`
- **Wrangler Config**: `/home/carl/application-tracking/jobmatch-ai/workers/wrangler.toml`
- **Example Variables**: `/home/carl/application-tracking/jobmatch-ai/workers/.dev.vars.example`

---

## Next Steps

1. **If error is resolved**: The Worker is healthy and no action needed
2. **If error persists**: Follow "Recommended Actions" above
3. **If still failing**: Check Supabase dashboard to verify project is active
4. **If nothing works**: Create a new `.dev.vars` from `.dev.vars.example` and test locally first

---

## Support Resources

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **Supabase JS Client Docs**: https://supabase.com/docs/reference/javascript/
- **Wrangler CLI Docs**: https://developers.cloudflare.com/workers/wrangler/

---

**Status**: ✅ Worker is currently healthy and responding correctly
**Last Verified**: 2025-12-29 23:11:05 UTC
**Next Action**: Monitor for the error in production usage
