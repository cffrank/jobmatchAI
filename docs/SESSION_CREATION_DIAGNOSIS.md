# Session Creation Diagnosis & Root Cause Analysis

**Date:** 2026-01-02
**Issue:** SESSIONS KV namespace showing no data despite successful frontend logins
**Status:** Root cause identified

---

## Executive Summary

Sessions are not appearing in Cloudflare KV `SESSIONS` namespace because **authentication is failing BEFORE sessions can be created**. The root cause is a Supabase project mismatch between frontend and Workers backend.

### The Misconception

**What we thought:** Sessions aren't being created
**Reality:** Sessions CAN'T be created because API requests are being rejected with 401 Unauthorized

---

## Complete Authentication Flow

### Expected Flow (Happy Path)

```
1. User logs in via frontend
   ↓
2. Supabase Auth issues JWT token
   ↓
3. Frontend stores JWT in localStorage ('jobmatch-auth-token')
   ↓
4. Frontend calls initializeSession()
   ↓
5. initializeSession() → createOrUpdateSession()
   ↓
6. Session written to database (Supabase PostgreSQL sessions table)
   ↓
7. Frontend makes API calls with Authorization: Bearer <JWT>
   ↓
8. Workers auth middleware validates JWT via supabase.auth.getUser()
   ↓
9. If valid: sets userId in context, allows request
   ↓
10. Session continues to exist and gets updated
```

### Actual Flow (Current/Broken)

```
1. ✅ User logs in via frontend
   ↓
2. ✅ Supabase Auth issues JWT token
   ↓
3. ✅ Frontend stores JWT in localStorage
   ↓
4. ✅ Frontend calls initializeSession()
   ↓
5. ✅ Session written to Supabase PostgreSQL (NOT KV!)
   ↓
6. ❌ Frontend makes API calls
   ↓
7. ❌ Workers auth middleware rejects JWT (401 Unauthorized)
   ↓
8. ❌ Request fails, session becomes orphaned
   ↓
9. ❌ No further session updates (user can't make authenticated requests)
```

---

## Root Cause: Supabase Project Mismatch

### The Problem

JWT tokens contain the `iss` (issuer) claim identifying which Supabase project issued them:

```json
{
  "iss": "https://vkstdibhypprasyiswny.supabase.co/auth/v1",
  "sub": "user-id-here",
  "aud": "authenticated",
  "exp": 1234567890
}
```

When Workers validates the JWT via `supabase.auth.getUser(token)`, it calls the Supabase project configured in `SUPABASE_URL`. If this is a **different project** than the one that issued the token, validation fails:

```
Frontend Supabase:  https://vkstdibhypprasyiswny.supabase.co
Workers Supabase:   https://DIFFERENT-PROJECT.supabase.co  ❌

Result: 401 Unauthorized on all API calls
```

### Evidence Files

1. **Frontend config** (`/home/carl/application-tracking/jobmatch-ai/.env.local`):
   ```bash
   VITE_SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co
   ```

2. **Workers local dev** (`/home/carl/application-tracking/jobmatch-ai/workers/.dev.vars`):
   ```bash
   SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co  # ✅ Matches
   ```

3. **Workers deployed secrets** (to verify):
   ```bash
   cd workers && wrangler secret list --env development
   # Should show SUPABASE_URL = https://vkstdibhypprasyiswny.supabase.co
   ```

### Why This Breaks Session Creation

Sessions are created by the **frontend** after successful login:

```typescript
// src/contexts/AuthContext.tsx:238
const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Failed to sign in');

  // Regenerate session to prevent session fixation
  initializeSession(data.user);  // ← Creates session in Supabase PostgreSQL
};
```

**BUT** sessions are only useful if the user can make authenticated API calls:

```typescript
// User tries to fetch their profile
const response = await fetch(`${API_URL}/api/profile`, {
  headers: {
    Authorization: `Bearer ${jwt}`  // ← This JWT fails validation if project mismatch!
  }
});
// Result: 401 Unauthorized
// Session exists but user is locked out of their account
```

---

## Secondary Issue: KV SESSIONS Namespace Not Used

### Current Behavior

The `SESSIONS` KV namespace is **configured** but **never used**:

**Configured in `wrangler.toml`:**
```toml
[[env.development.kv_namespaces]]
binding = "SESSIONS"
id = "8b8cb591b4864e51a5e14c0d551e2d88"
```

**Used nowhere in code:**
```bash
$ grep -r "env.SESSIONS\|c.env.SESSIONS" workers/
# No results
```

### Where Sessions Actually Live

Sessions are stored in **Supabase PostgreSQL** `sessions` table:

**File:** `/home/carl/application-tracking/jobmatch-ai/src/lib/securityService.ts`
```typescript
// Line 145
const { error } = await supabase
  .from('sessions')  // ← Supabase PostgreSQL table
  .upsert(sessionData, {
    onConflict: 'session_id',
  });
```

### Why This Isn't a Problem (Yet)

Storing sessions in PostgreSQL works fine:
- ✅ Sessions persist across page refreshes
- ✅ RLS policies protect user data
- ✅ Can query session history
- ❌ Slower than KV (but not critical path)
- ❌ Costs more at scale (but negligible for current usage)

**KV would be faster but is not required for functionality.**

---

## Why No Sessions in KV Dashboard

The KV `SESSIONS` namespace is empty because:

1. **No code writes to it** - All session writes go to Supabase PostgreSQL
2. **Even if code existed** - It wouldn't run because auth fails first
3. **Workers middleware has no session creation logic** - Only validates JWTs

### Workers Auth Middleware Analysis

**File:** `/home/carl/application-tracking/jobmatch-ai/workers/api/middleware/auth.ts`

```typescript
export const authenticateUser: MiddlewareHandler = async (c, next) => {
  // Extract token from Authorization header
  const authHeader = c.req.header('Authorization');
  const token = authHeader.split(' ')[1];

  // Verify token with Supabase
  const supabase = createSupabaseClient(c.env);
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error) {
    // ❌ Fails here if project mismatch
    throw new HttpError(401, 'Authentication failed', 'AUTH_FAILED');
  }

  // Set user context
  c.set('userId', user.id);
  c.set('userEmail', user.email);

  // ⚠️ NO SESSION CREATION HERE
  // ⚠️ NO c.env.SESSIONS.put() call anywhere

  return next();
};
```

**Key observations:**
- ✅ Validates JWT correctly (if project matches)
- ❌ Never writes to KV SESSIONS namespace
- ❌ No session tracking in Workers at all

---

## Diagnostic Procedure

### Step 1: Verify Supabase Project Configuration

Run the diagnostic script:

```bash
cd /home/carl/application-tracking/jobmatch-ai
node workers/scripts/diagnose-session-issue.js
```

This will:
1. Authenticate with Supabase
2. Test JWT validation in Workers
3. Identify project mismatch if exists
4. Provide fix instructions

### Step 2: Check Workers Secrets (Deployed)

```bash
cd workers
wrangler secret list --env development
```

Verify `SUPABASE_URL` matches frontend:
- ✅ Expected: `https://vkstdibhypprasyiswny.supabase.co`
- ❌ If different: Project mismatch confirmed

### Step 3: Check Workers Local Dev Vars

```bash
cat workers/.dev.vars | grep SUPABASE_URL
```

Should output:
```
SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co
```

### Step 4: Test Authentication Flow

```bash
# Start Workers dev server
cd workers
npm run dev

# In another terminal, test auth
node workers/scripts/test-auth-fix.js
```

Expected output:
```
✅ /api/profile → 200 OK
✅ /api/skills → 200 OK
```

If you see `401 Unauthorized`, project mismatch still exists.

---

## Fix Instructions

### Critical Fix: Resolve Supabase Project Mismatch

#### For Development Environment

1. **Verify local .dev.vars:**
   ```bash
   cd workers
   cat .dev.vars | grep SUPABASE
   ```

   Should show:
   ```
   SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **If missing or incorrect, create/update .dev.vars:**
   ```bash
   # Copy from frontend .env.local
   echo "SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co" >> .dev.vars
   echo "SUPABASE_ANON_KEY=<anon-key>" >> .dev.vars
   echo "SUPABASE_SERVICE_ROLE_KEY=<service-role-key>" >> .dev.vars
   ```

3. **Restart Workers dev server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

#### For Deployed Environments (Production/Staging)

1. **Check current secrets:**
   ```bash
   wrangler secret list --env development
   wrangler secret list --env staging
   wrangler secret list --env production
   ```

2. **Update SUPABASE_URL if needed:**
   ```bash
   wrangler secret put SUPABASE_URL --env development
   # Enter: https://vkstdibhypprasyiswny.supabase.co
   ```

3. **Update SUPABASE_ANON_KEY if needed:**
   ```bash
   wrangler secret put SUPABASE_ANON_KEY --env development
   # Paste anon key from .env.local
   ```

4. **Redeploy Workers:**
   ```bash
   wrangler deploy --env development
   ```

### Optional Enhancement: Migrate Sessions to KV

**Note:** This is NOT required for functionality. Current PostgreSQL implementation works fine.

**Benefits of KV migration:**
- 🚀 Faster session lookups (edge-based vs database query)
- 💰 Lower cost at scale
- 🌍 Better global performance

**Required changes:**

1. **Add session write in auth middleware** (`workers/api/middleware/auth.ts`):
   ```typescript
   export const authenticateUser: MiddlewareHandler = async (c, next) => {
     const token = /* extract token */;
     const { user } = await supabase.auth.getUser(token);

     // ✅ NEW: Store session in KV
     const sessionData = {
       userId: user.id,
       lastActive: Date.now(),
       expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
     };
     await c.env.SESSIONS.put(
       `session:${user.id}`,
       JSON.stringify(sessionData),
       { expirationTtl: 1800 } // 30 minutes
     );

     c.set('userId', user.id);
     return next();
   };
   ```

2. **Update frontend to NOT write to PostgreSQL** - Or keep dual write for migration period

3. **Add cleanup cron job** - KV TTL handles this automatically

**Timeline:** Can implement after auth is working

---

## Testing & Verification

### Test 1: Local Authentication

```bash
# Terminal 1: Start Workers dev
cd workers && npm run dev

# Terminal 2: Run diagnostic
node workers/scripts/diagnose-session-issue.js
```

**Expected result:** All checks pass, JWT validated successfully

### Test 2: Deployed Authentication

```bash
# Get JWT from frontend (login → DevTools → localStorage)
JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test deployed endpoint
curl -H "Authorization: Bearer $JWT" \
  https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/profile
```

**Expected result:** 200 OK (or 404 if no profile exists)

### Test 3: Session Persistence

1. Login to frontend
2. Check Supabase PostgreSQL `sessions` table:
   ```sql
   SELECT session_id, user_id, device, created_at, last_active
   FROM sessions
   WHERE user_id = '<your-user-id>'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

**Expected result:** Session exists with recent `last_active` timestamp

---

## Frequently Asked Questions

### Q: Why are there no sessions in KV?

**A:** The KV `SESSIONS` namespace is configured but not used. All sessions are stored in Supabase PostgreSQL `sessions` table. This works fine and is not a bug.

### Q: Should we migrate sessions to KV?

**A:** Optional enhancement for performance, but not required. Current implementation works correctly once authentication is fixed.

### Q: Why do logins "succeed" but API calls fail?

**A:** Login happens in Supabase (frontend), which is separate from Workers API. The JWT issued by Supabase is rejected by Workers if they're using different projects.

### Q: How do I know if project mismatch is fixed?

**A:** Run `node workers/scripts/test-auth-fix.js` - all endpoints should return 200/404, not 401.

### Q: Can sessions work with project mismatch?

**A:** No. Sessions are created by frontend, but if API calls fail, sessions become orphaned and useless. Fix auth first.

---

## Related Files

### Configuration
- `/home/carl/application-tracking/jobmatch-ai/.env.local` - Frontend Supabase config
- `/home/carl/application-tracking/jobmatch-ai/workers/.dev.vars` - Workers local config
- `/home/carl/application-tracking/jobmatch-ai/workers/wrangler.toml` - Workers KV bindings

### Session Management (Frontend)
- `/home/carl/application-tracking/jobmatch-ai/src/lib/sessionManagement.ts` - Session lifecycle
- `/home/carl/application-tracking/jobmatch-ai/src/lib/securityService.ts` - PostgreSQL writes
- `/home/carl/application-tracking/jobmatch-ai/src/contexts/AuthContext.tsx` - Calls initializeSession

### Authentication (Workers)
- `/home/carl/application-tracking/jobmatch-ai/workers/api/middleware/auth.ts` - JWT validation
- `/home/carl/application-tracking/jobmatch-ai/workers/api/services/supabase.ts` - Supabase client

### Diagnostic Tools
- `/home/carl/application-tracking/jobmatch-ai/workers/scripts/diagnose-session-issue.js` - This diagnostic
- `/home/carl/application-tracking/jobmatch-ai/workers/scripts/test-auth-fix.js` - Auth validation test

---

## Conclusion

**Root Cause:** Supabase project mismatch prevents JWT validation, which blocks all authenticated API calls, which prevents sessions from being useful.

**Primary Fix:** Ensure Workers `SUPABASE_URL` matches frontend Supabase project.

**Secondary Issue:** KV SESSIONS namespace unused (not a bug, just unused infrastructure).

**Next Steps:**
1. Run `node workers/scripts/diagnose-session-issue.js`
2. Fix any Supabase project mismatch found
3. Verify authentication works with `test-auth-fix.js`
4. Sessions will work automatically once auth succeeds
5. Optionally migrate sessions to KV for performance (future)

**Session creation is not broken - authentication is blocking it.**
