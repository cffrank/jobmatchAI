# Session Debugging - Quick Start Guide

**Quick answer:** Sessions ARE being created in Supabase PostgreSQL, not Cloudflare KV.

---

## 🚀 Quick Check (30 seconds)

Run this to verify your configuration:

```bash
node workers/scripts/check-supabase-config.cjs
```

**If it says "Configuration looks good"** → Local dev is configured correctly.

---

## 🔍 Why No Sessions in KV?

**Short answer:** The KV `SESSIONS` namespace is configured but never used in the code.

**Where sessions actually are:** Supabase PostgreSQL `sessions` table

**Is this a problem?** No, PostgreSQL works fine. KV would be faster but isn't required.

---

## 🐛 Common Issue: 401 Unauthorized Errors

If API calls return 401 even after login:

### Check 1: Frontend and Workers Use Same Supabase Project

```bash
# See what both are using
node workers/scripts/check-supabase-config.cjs

# Should show both using: https://vkstdibhypprasyiswny.supabase.co
```

### Check 2: Deployed Workers Secrets

```bash
cd workers
wrangler secret list --env development

# Should show SUPABASE_URL = https://vkstdibhypprasyiswny.supabase.co
```

### Check 3: Test with Real JWT

```bash
# 1. Login to frontend (http://localhost:5173)
# 2. Open DevTools → Application → Local Storage
# 3. Copy value of 'jobmatch-auth-token'
# 4. Test:

curl -H "Authorization: Bearer <YOUR_JWT>" \
  http://localhost:8787/api/profile
```

**Expected:** 200 OK or 404 (NOT 401)

---

## 📊 Where to Find Sessions

### Option 1: Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project (vkstdibhypprasyiswny)
3. SQL Editor → Run:

```sql
SELECT session_id, user_id, device, created_at, last_active
FROM sessions
ORDER BY created_at DESC
LIMIT 10;
```

### Option 2: Check KV (Will be empty)

```bash
# Development namespace
wrangler kv:key list --namespace-id=8b8cb591b4864e51a5e14c0d551e2d88

# Expected: [] (empty) - sessions aren't stored here
```

---

## 🔧 Quick Fixes

### If Local Auth Fails (401)

```bash
# 1. Check .dev.vars exists
cat workers/.dev.vars

# 2. Should contain:
# SUPABASE_URL=https://vkstdibhypprasyiswny.supabase.co
# SUPABASE_ANON_KEY=eyJhbGci...

# 3. If missing, copy from .env.local:
grep VITE_SUPABASE .env.local

# 4. Restart Workers
cd workers && npm run dev
```

### If Deployed Auth Fails (401)

```bash
# Update deployed secrets
cd workers
wrangler secret put SUPABASE_URL --env development
# Enter: https://vkstdibhypprasyiswny.supabase.co

wrangler secret put SUPABASE_ANON_KEY --env development
# Paste anon key from .env.local

# Redeploy
wrangler deploy --env development
```

---

## 📖 Full Documentation

For complete analysis, see:

- **Summary:** `docs/SESSION_ISSUE_SUMMARY.md`
- **Full Analysis:** `docs/SESSION_CREATION_DIAGNOSIS.md`
- **Config Checker:** `workers/scripts/check-supabase-config.cjs`

---

## ✅ Verification Checklist

```bash
# 1. Config matches
node workers/scripts/check-supabase-config.cjs
# → Should say "Configuration looks good"

# 2. Login works
# Go to http://localhost:5173 and login
# → Should succeed, no errors

# 3. API calls work
# Get JWT from localStorage, then:
curl -H "Authorization: Bearer <JWT>" http://localhost:8787/api/profile
# → Should NOT return 401

# 4. Sessions exist in PostgreSQL
# Supabase dashboard → SQL Editor → SELECT FROM sessions
# → Should show recent sessions
```

If all checks pass, sessions are working correctly!

---

**Remember:** Sessions in PostgreSQL ≠ broken. KV is just unused infrastructure.
