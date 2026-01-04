# Cloudflare Workers 401/404 Errors - Diagnostic & Fix

**Date:** January 2, 2026
**Status:** ⚠️ DIAGNOSIS COMPLETE - FIX READY
**Worker:** jobmatch-ai-dev (development environment)
**URL:** https://jobmatch-ai-dev.carl-f-frank.workers.dev

---

## Issues Observed

### 1. ✅ 404 Not Found on `/api/profile` - FALSE ALARM

**Status:** NOT A BUG - Route exists and works correctly

**Investigation:**
- Route IS registered: `app.get('/', authenticateUser, async (c) => {...})` in `workers/api/routes/profile.ts:101`
- Route IS accessible: Test confirms 401 Unauthorized (not 404) when called without auth
- API documentation is incomplete: Shows PUT/PATCH/DELETE but omits GET (documentation bug only)

**Evidence:**
```bash
$ curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/profile
{
  "code": "MISSING_AUTH_HEADER",
  "message": "No authorization header provided",
  "statusCode": 401
}
```

**Conclusion:** Route exists. 404 was likely a user error (wrong URL or route path).

---

### 2. ⚠️ 401 Unauthorized on `/api/profile/work-experience` - REQUIRES VERIFICATION

**Possible Causes:**
1. **Deployed secrets mismatch** - Workers may still have old Supabase credentials (lrzhpnsykasqrousgmdh project)
2. **JWT token validation failing** - Frontend generates tokens for vkstdibhypprasyiswny, Workers validate against wrong project
3. **Expired token** - User session may have expired

**Current State:**
- ✅ Local `.dev.vars` updated to match frontend (vkstdibhypprasyiswny project)
- ❓ Deployed secrets unknown - need verification
- ✅ Routes registered correctly
- ✅ Authentication middleware active

---

## Configuration Verification

### Expected Configuration (All Environments)

**Supabase Project:** Development Branch (vkstdibhypprasyiswny)
- **URL:** https://vkstdibhypprasyiswny.supabase.co
- **Users:** 101 active users
- **Dashboard:** https://supabase.com/dashboard/project/vkstdibhypprasyiswny

**Required Secrets:**
1. `SUPABASE_URL` = https://vkstdibhypprasyiswny.supabase.co
2. `SUPABASE_ANON_KEY` = eyJhbGci...vkstdibhypprasyiswny...anon...
3. `SUPABASE_SERVICE_ROLE_KEY` = eyJhbGci...vkstdibhypprasyiswny...service_role...

### Current Configuration

**Frontend (`.env.local`):** ✅ CORRECT
```bash
VITE_SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...vkstdibhypprasyiswny...anon...
```

**Workers Local (`workers/.dev.vars`):** ✅ CORRECT (as of 2026-01-02)
```bash
SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...vkstdibhypprasyiswny...anon...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...vkstdibhypprasyiswny...service_role...
```

**Workers Deployed (Cloudflare Secrets):** ❓ UNKNOWN - NEEDS VERIFICATION
```bash
# Current secrets exist but values are masked:
SUPABASE_URL                    (secret_text)
SUPABASE_ANON_KEY              (secret_text)
SUPABASE_SERVICE_ROLE_KEY      (secret_text)

# Values may still be for old project (lrzhpnsykasqrousgmdh)
```

---

## Diagnosis Summary

| Component | Status | Configuration | Issue |
|-----------|--------|---------------|-------|
| Worker Deployment | ✅ Healthy | Running v1.0.0 | None |
| Route Registration | ✅ Working | GET /api/profile exists | None |
| Auth Middleware | ✅ Active | Returns 401 without token | None |
| Local Secrets | ✅ Correct | vkstdibhypprasyiswny | None |
| Deployed Secrets | ❓ Unknown | May be wrong project | **VERIFY** |
| JWT Validation | ❓ Unknown | May fail if secrets wrong | **TEST** |

**Root Cause Hypothesis:**
Deployed Workers secrets still reference old Supabase project (lrzhpnsykasqrousgmdh), causing JWT validation failures even though local `.dev.vars` was updated.

---

## Fix Instructions

### Step 1: Verify Current Deployed Secrets

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers
wrangler secret list --env development
```

**Expected Output:**
```json
[
  { "name": "SUPABASE_URL", "type": "secret_text" },
  { "name": "SUPABASE_ANON_KEY", "type": "secret_text" },
  { "name": "SUPABASE_SERVICE_ROLE_KEY", "type": "secret_text" }
]
```

**Note:** Values are masked for security. We can't verify values directly.

---

### Step 2: Update Deployed Secrets (Automated)

Run the automated fix script:

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers
./scripts/verify-and-fix-secrets.sh
```

**What it does:**
1. Reads correct values from `workers/.dev.vars`
2. Verifies local config matches expected Supabase project
3. Updates all 3 secrets in Cloudflare Workers (development environment)
4. Triggers automatic Worker redeployment

**Output:**
```
==================================================================
Cloudflare Workers Secret Verification & Fix
==================================================================

Environment: development
Worker: jobmatch-ai-dev
Expected Supabase: https://vkstdibhypprasyiswny.supabase.co

[1/3] Reading Local Configuration
✓ Local configuration loaded
✓ Local configuration matches expected Supabase project

[2/3] Checking Deployed Secrets
✓ SUPABASE_URL exists in deployed secrets
✓ SUPABASE_ANON_KEY exists in deployed secrets
✓ SUPABASE_SERVICE_ROLE_KEY exists in deployed secrets

[3/3] Updating Deployed Secrets
Proceed? (y/N)
```

**Press `y` to continue.**

---

### Step 3: Update Secrets Manually (Alternative)

If automated script fails, update manually:

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# Read values from .dev.vars
source .dev.vars

# Update each secret
echo "$SUPABASE_URL" | wrangler secret put SUPABASE_URL --env development
echo "$SUPABASE_ANON_KEY" | wrangler secret put SUPABASE_ANON_KEY --env development
echo "$SUPABASE_SERVICE_ROLE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env development
```

**Expected Output (per secret):**
```
🌀 Creating the secret for the Worker "jobmatch-ai-dev"
✨ Success! Uploaded secret SUPABASE_URL
```

**Wait 10-15 seconds** for Workers to redeploy with new secrets.

---

### Step 4: Verify Fix

Run the test script:

```bash
cd /home/carl/application-tracking/jobmatch-ai
./test-deployed-workers.sh
```

**Expected Results:**
```
✓ Health check passed
✓ API documentation accessible
✓ Correctly returns 401 Unauthorized (without token)
```

---

### Step 5: Test with Valid JWT Token

#### 5a. Get Token from Browser

1. Open http://localhost:5173 in browser
2. Login to the application
3. Open DevTools (F12)
4. Go to: **Application** → **Local Storage** → **http://localhost:5173**
5. Find key: `jobmatch-auth-token`
6. Copy the value (long JWT string starting with `eyJ...`)

#### 5b. Test Authenticated Request

```bash
# Replace <TOKEN> with actual JWT from browser
TOKEN='eyJhbGci...'

# Test GET /api/profile
curl -H "Authorization: Bearer $TOKEN" \
  https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/profile

# Test GET /api/profile/work-experience
curl -H "Authorization: Bearer $TOKEN" \
  https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/profile/work-experience
```

#### Expected Response (Success)

**GET /api/profile (200 OK):**
```json
{
  "message": "Profile fetched successfully",
  "profile": {
    "id": "user-id-here",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    ...
  }
}
```

**GET /api/profile/work-experience (200 OK):**
```json
{
  "message": "Work experience fetched successfully",
  "experiences": [
    {
      "id": "exp-id",
      "position": "Software Engineer",
      "company": "Acme Corp",
      ...
    }
  ]
}
```

#### Expected Response (Failure - Secrets Still Wrong)

**401 Unauthorized:**
```json
{
  "code": "INVALID_TOKEN",
  "message": "Invalid token",
  "statusCode": 401
}
```

**If you see 401 with valid token:** Secrets are still mismatched. Repeat Step 2 or 3.

---

## Staging & Production Environments

If development fix succeeds, apply to other environments:

### Staging Environment

```bash
cd workers

# Update secrets for staging
echo "$SUPABASE_URL" | wrangler secret put SUPABASE_URL --env staging
echo "$SUPABASE_ANON_KEY" | wrangler secret put SUPABASE_ANON_KEY --env staging
echo "$SUPABASE_SERVICE_ROLE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging

# Test
curl https://jobmatch-ai-staging.carl-f-frank.workers.dev/health
```

### Production Environment

```bash
cd workers

# Update secrets for production
echo "$SUPABASE_URL" | wrangler secret put SUPABASE_URL --env production
echo "$SUPABASE_ANON_KEY" | wrangler secret put SUPABASE_ANON_KEY --env production
echo "$SUPABASE_SERVICE_ROLE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production

# Test
curl https://jobmatch-ai-prod.carl-f-frank.workers.dev/health
```

---

## Troubleshooting

### Issue: Token still invalid after updating secrets

**Cause:** Old token cached by browser

**Fix:**
1. Logout from application
2. Clear browser localStorage
3. Login again (generates new token)
4. Test with new token

---

### Issue: Secrets update fails with permission error

**Cause:** Wrangler not authenticated or wrong account

**Fix:**
```bash
# Re-authenticate with Cloudflare
wrangler login

# Verify correct account
wrangler whoami

# Check Workers list
wrangler deployments list --env development
```

---

### Issue: Worker doesn't redeploy after secret update

**Cause:** Secrets update doesn't trigger instant redeploy

**Fix:**
1. Wait 30-60 seconds
2. Or force redeploy:
```bash
cd workers
npm run deploy:dev  # Or deploy:staging / deploy:prod
```

---

## Monitoring & Logs

### Check Workers Logs (Real-time)

```bash
cd workers
wrangler tail --env development
```

**Look for:**
```
[Auth] Authenticated user: <user-id> for GET /api/profile
```

**Or errors:**
```
Token verification failed: { error: 'Invalid token' }
```

### Check Workers Dashboard

1. Go to: https://dash.cloudflare.com/
2. Select your account
3. Workers & Pages → jobmatch-ai-dev
4. View deployment logs and metrics

---

## Success Criteria

Fix is successful when:

- ✅ Workers health check returns 200 OK
- ✅ Unauthenticated requests return 401 (not 404)
- ✅ **Authenticated requests return 200 OK with data**
- ✅ No JWT validation errors in Workers logs
- ✅ Frontend can fetch profile data without errors

---

## Prevention

To prevent recurrence:

1. **Always update secrets in all environments** when changing Supabase projects
2. **Test deployed Workers** after updating `.dev.vars`
3. **Document secret values** in secure password manager
4. **Automate secret updates** in CI/CD pipeline
5. **Monitor authentication errors** in Workers logs

---

## Files Modified

### Created
- `workers/scripts/verify-and-fix-secrets.sh` - Automated secret update script
- `test-deployed-workers.sh` - Automated deployment testing
- `docs/WORKERS_401_404_FIX.md` - This document

### Updated
- `workers/.dev.vars` - Updated to vkstdibhypprasyiswny project (2026-01-02)

### Cloudflare Secrets (Pending Update)
- `SUPABASE_URL` (development)
- `SUPABASE_ANON_KEY` (development)
- `SUPABASE_SERVICE_ROLE_KEY` (development)

---

**Next Action:** Run Step 2 (`./scripts/verify-and-fix-secrets.sh`) to update deployed secrets.
