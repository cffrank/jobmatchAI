# Quick Fix: Cloudflare Workers 401/404 Errors

**Issue:** Workers deployed but authentication failing
**Cause:** Deployed secrets may not match frontend Supabase project
**Fix Time:** 2 minutes

---

## TL;DR - Run These Commands

```bash
# 1. Update deployed secrets (AUTOMATED)
cd /home/carl/application-tracking/jobmatch-ai/workers
./scripts/verify-and-fix-secrets.sh

# Press 'y' when prompted

# 2. Wait 15 seconds for redeployment

# 3. Test (should see all green checkmarks)
cd ..
./test-deployed-workers.sh

# 4. Get JWT token from browser and test authenticated request
# (Instructions in output)
```

---

## What This Does

1. **Reads correct Supabase credentials** from `workers/.dev.vars`
2. **Updates 3 Cloudflare secrets** for development environment:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
3. **Triggers automatic Worker redeployment**
4. **Verifies deployment** with test suite

---

## Expected Results

### Before Fix
```
❌ GET /api/profile → 401 Unauthorized (with valid JWT)
❌ GET /api/profile/work-experience → 401 Unauthorized (with valid JWT)
```

### After Fix
```
✅ GET /api/profile → 200 OK (with profile data)
✅ GET /api/profile/work-experience → 200 OK (with experiences)
```

---

## Manual Alternative (If Script Fails)

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# Load environment variables
source .dev.vars

# Update each secret
echo "$SUPABASE_URL" | wrangler secret put SUPABASE_URL --env development
echo "$SUPABASE_ANON_KEY" | wrangler secret put SUPABASE_ANON_KEY --env development
echo "$SUPABASE_SERVICE_ROLE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env development
```

---

## Testing with Browser Token

1. Login at http://localhost:5173
2. DevTools (F12) → Application → Local Storage
3. Copy value of `jobmatch-auth-token`
4. Run:

```bash
TOKEN='<paste-token-here>'
curl -H "Authorization: Bearer $TOKEN" \
  https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/profile
```

**Expected:** 200 OK with profile JSON

---

## Troubleshooting

**Still getting 401?**
- Logout and login again (generates new token)
- Clear browser localStorage
- Wait 30 seconds for Workers to redeploy
- Check Workers logs: `wrangler tail --env development`

**Permission denied?**
- Re-authenticate: `wrangler login`
- Verify account: `wrangler whoami`

---

## Full Documentation

See `docs/WORKERS_401_404_FIX.md` for complete diagnostic and fix guide.

---

**Last Updated:** 2026-01-02
**Status:** Ready to fix - run commands above
