# Fix: Supabase Project Mismatch (401 Unauthorized Errors)

**Date:** January 2, 2026
**Status:** 🔴 CRITICAL - Authentication broken in development
**Impact:** All API calls returning 401 Unauthorized after login

---

## Problem Summary

Frontend and Workers backend are using **different Supabase projects**, causing JWT validation to fail:

- **Frontend:** `https://vkstdibhypprasyiswny.supabase.co` (101 users)
- **Workers:** `https://lrzhpnsykasqrousgmdh.supabase.co` (different project)

**Result:** JWT tokens signed by frontend's project cannot be validated by Workers → 401 Unauthorized

---

## Root Cause

When a user logs in:
1. Frontend authenticates with Supabase project A (`vkstdibhypprasyiswny`)
2. Supabase generates JWT signed with **project A's secret key**
3. Frontend sends JWT to Workers API
4. Workers validate JWT using **project B's secret key** (`lrzhpnsykasqrousgmdh`)
5. ❌ Validation fails (wrong secret key) → 401 Unauthorized

**Evidence:**
```javascript
// Browser console shows successful login
[Session] New session initialized: {userId: '1dd6f37b-eef6-4840-8148-02eeffc529e1', ...}
[Security] Event logged: Login success

// But all API calls fail
GET /api/profile 401 (Unauthorized)
GET /api/profile/work-experience 401 (Unauthorized)
GET /api/profile/education 401 (Unauthorized)
GET /api/skills 401 (Unauthorized)
GET /api/resume 401 (Unauthorized)
```

---

## Solution: Update Workers to Match Frontend

**Recommended:** Update Workers to use frontend's Supabase project (preserves 101 existing users).

### Option 1: Automated Script (Recommended)

**Step 1:** Get SERVICE_ROLE_KEY from Supabase Dashboard

1. Visit: https://supabase.com/dashboard/project/vkstdibhypprasyiswny/settings/api
2. Scroll to "Project API keys"
3. Copy the **service_role** key (NOT the anon key)
   - Should start with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Is a long JWT token (several hundred characters)

**Step 2:** Run fix script

```bash
cd workers

# Make script executable
chmod +x scripts/fix-supabase-mismatch.sh

# Run with your SERVICE_ROLE_KEY
./scripts/fix-supabase-mismatch.sh eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Step 3:** Restart Workers dev server

```bash
# Stop current dev server (Ctrl+C)
npm run dev
```

**Step 4:** Reload frontend and test

1. Open browser to http://localhost:5173
2. Login
3. Check browser DevTools Network tab
4. ✅ All API calls should return 200 OK (not 401)

---

### Option 2: Manual Update

**Update `workers/.dev.vars`:**

1. Get SERVICE_ROLE_KEY from Supabase dashboard (see Option 1, Step 1)

2. Edit `workers/.dev.vars`:
   ```bash
   # FROM (current - wrong project):
   SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemhwbnN5a2FzcXJvdXNnbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTkxMDcsImV4cCI6MjA4MTgzNTEwN30.aKqsPCJb-EwkYeuD1Zmv_FXQUyKLEEG5pXIKEiSX9ZE
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_gg4QrTYInH96FqySfouuKA_1bH0Fj6u

   # TO (correct - matches frontend):
   SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrc3RkaWJoeXBwcmFzeWlzd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTE4NDAsImV4cCI6MjA4MjcyNzg0MH0.hPn1GVfmNAuHk3-VcqSw1khJChhSYZ5TRwePTUl553E
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key-here>
   ```

3. Restart Workers dev server:
   ```bash
   cd workers
   npm run dev
   ```

**Update Cloudflare Workers secrets (for deployed environments):**

```bash
cd workers

# Development environment
wrangler secret put SUPABASE_URL --env development
# Paste: https://vkstdibhypprasyiswny.supabase.co

wrangler secret put SUPABASE_ANON_KEY --env development
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrc3RkaWJoeXBwcmFzeWlzd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTE4NDAsImV4cCI6MjA4MjcyNzg0MH0.hPn1GVfmNAuHk3-VcqSw1khJChhSYZ5TRwePTUl553E

wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env development
# Paste: <your-service-role-key>
```

---

## Verification Steps

After applying the fix:

### 1. Check Workers Logs

```bash
cd workers
npm run dev
```

Look for:
```
[Auth] Successfully verified JWT for user: 1dd6f37b-eef6-4840-8148-02eeffc529e1
```

### 2. Test with curl

```bash
# Login via frontend, then copy JWT from browser DevTools Application tab
# localStorage -> jobmatch-auth-token

TOKEN="<your-jwt-token>"

# Test API call
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8787/api/profile

# Should return 200 OK with user profile data (not 401)
```

### 3. Check Browser DevTools

**Network tab:**
- ✅ All `/api/*` requests should return **200 OK**
- ❌ No more **401 Unauthorized** errors

**Console tab:**
- ✅ `[Security] Session created/updated`
- ✅ `[Security] Event logged: Login success`
- ❌ No JWT validation errors

---

## Why This Happened

**Likely cause:** During Cloudflare migration, Workers were configured with a different Supabase project than the frontend.

**Files involved:**
- Frontend: `.env.local` (uses `vkstdibhypprasyiswny`)
- Workers: `workers/.dev.vars` (was using `lrzhpnsykasqrousgmdh`)

**Prevention:** Always verify Supabase URLs match between frontend and backend during configuration.

---

## Alternative: Use D1 Instead of Supabase Auth

**Long-term solution:** Since we've migrated data to D1, we could:
1. Migrate authentication to Cloudflare Workers Auth or custom JWT
2. Eliminate Supabase dependency entirely
3. Use D1 for auth session storage

**Pros:**
- ✅ 100% Cloudflare-native
- ✅ No cross-project issues
- ✅ Potential cost savings

**Cons:**
- ❌ 2-3 weeks additional work
- ❌ Risk of auth bugs
- ❌ Need to rebuild OAuth flows

**Recommendation:** Stick with Supabase Auth for now (proven, secure, working). Consider migration to Workers Auth as future optimization.

---

## Troubleshooting

### Issue: Still getting 401 after fix

**Check:**
1. Did you restart Workers dev server? (`npm run dev` in workers/)
2. Did you clear browser localStorage? (DevTools → Application → Local Storage → Clear All)
3. Did you logout and login again in frontend?
4. Is the SERVICE_ROLE_KEY correct? (Verify in Supabase dashboard)

### Issue: "Invalid Supabase URL"

**Check:**
- URL should NOT have trailing slash
- Format: `https://[project-ref].supabase.co`
- Example: `https://vkstdibhypprasyiswny.supabase.co` ✅
- NOT: `https://vkstdibhypprasyiswny.supabase.co/` ❌

### Issue: "Supabase service not found"

**Check:**
- SUPABASE_URL is set in `.dev.vars`
- SUPABASE_ANON_KEY is set in `.dev.vars`
- SUPABASE_SERVICE_ROLE_KEY is set in `.dev.vars`
- All three values match the frontend's Supabase project

---

## Success Metrics

✅ **Fixed when:**
- All API calls return 200 OK (not 401)
- User can view profile data after login
- Browser console shows no authorization errors
- Workers logs show successful JWT verification

---

**Fix Created:** 2026-01-02
**Priority:** P0 - CRITICAL
**Estimated Time:** 10 minutes (if SERVICE_ROLE_KEY available)
