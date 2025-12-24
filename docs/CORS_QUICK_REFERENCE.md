# CORS Testing - Quick Reference Card

## 🚀 Run This First

```bash
npm run test:production-cors
```

**Output in 10 seconds:**
- ✅ or ❌ for each test
- Exact error messages
- What to fix

## 📋 All Test Commands

```bash
# Fastest (Node.js)
npm run test:production-cors

# Visual (Browser)
npm run test:e2e:cors:headed

# Comprehensive (Vitest)
cd backend && npm run test:production

# Manual (curl)
npm run debug:cors

# Interactive UI
npm run test:e2e:ui
```

## 🔍 What's Tested

| Test | What It Checks | Why It Matters |
|------|----------------|----------------|
| **Health Check** | Is backend running? | If this fails (502), nothing else works |
| **OPTIONS Preflight** | Do CORS headers exist? | **CRITICAL** - #1 cause of CORS errors |
| **CORS Origin** | Is origin correct? | Wrong origin = blocked by browser |
| **All Endpoints** | Do all APIs work? | Ensures CORS on every route |
| **Security** | Evil origins blocked? | Prevents unauthorized access |
| **Auth** | 401 has CORS headers? | Ensures errors include CORS |
| **Environment** | Is prod configured? | Dev settings won't work in prod |

## 🩺 Quick Diagnosis

### Symptom: "CORS policy blocked"

**Run:**
```bash
npm run test:production-cors
```

**Look at "Test 3: OPTIONS Preflight"**

#### If you see:
```
❌ Status: 502
❌ No CORS headers
```
**Problem:** Backend is down
**Fix:** Check Railway logs, fix startup errors

#### If you see:
```
✅ Status: 204
❌ No access-control-allow-origin header
```
**Problem:** CORS not configured
**Fix:** Check `app.use(cors())` in `backend/src/index.ts`

#### If you see:
```
✅ Status: 204
✅ Has CORS headers
❌ Wrong origin: https://wrong-url.com
```
**Problem:** Origin mismatch
**Fix:** Update `allowedOrigins` or `APP_URL` env var

#### If you see:
```
✅ Status: 204
✅ Correct CORS headers
```
**Problem:** Not in backend, check frontend
**Fix:** Clear cache, check auth tokens, verify frontend code

## 🛠️ Common Fixes

### Fix 1: Backend Down (502)

```bash
# Check Railway logs
Railway Dashboard → Backend → Deployments → Logs

# Test locally
cd backend
npm run build
NODE_ENV=production npm start

# Should show:
# ✅ JobMatch AI Backend Server
# ✅ Port: 3000
# ✅ Environment: production
```

### Fix 2: CORS Not Configured

Check `backend/src/index.ts` has:
```typescript
app.use(cors(corsOptions)); // Must be BEFORE routes
```

### Fix 3: Wrong Origin

Update `backend/src/index.ts`:
```typescript
const allowedOrigins = [
  'https://jobmatchai-production.up.railway.app', // Add your URL
];
```

Or set Railway env var:
```
APP_URL=https://jobmatchai-production.up.railway.app
```

### Fix 4: Environment Issues

Check Railway has:
```
NODE_ENV=production
APP_URL=https://jobmatchai-production.up.railway.app
SUPABASE_URL=...
OPENAI_API_KEY=...
```

## 📁 File Locations

```
Tests:
  backend/tests/api/production.test.ts
  tests/e2e/production-cors.spec.ts
  scripts/test-production-cors.ts
  scripts/debug-cors.sh

Docs:
  docs/CORS_DEBUGGING_GUIDE.md
  docs/CORS_TEST_RESULTS.md
  TESTING_CORS.md
```

## 🎯 Current Status

**Last Test:** 2025-12-23

**Result:** ❌ Backend down (502)

**Next:** Fix backend startup

## 💡 Pro Tips

### Tip 1: Use Headed Mode
```bash
npm run test:e2e:cors:headed
```
Watch browser make requests in real-time.

### Tip 2: Check OPTIONS First
The OPTIONS preflight is the most important test.
If it fails, everything fails.

### Tip 3: Test Locally First
```bash
cd backend
npm run build
npm start
# Then in another terminal:
curl http://localhost:3000/health
```

### Tip 4: Cache Kills CORS
Clear browser cache or use incognito when testing.

### Tip 5: Exact URLs Matter
```
✅ https://example.com
❌ https://example.com/
❌ https://Example.com
❌ http://example.com
```

## 🔗 Quick Links

- [Quick Start](../TESTING_CORS.md)
- [Full Guide](CORS_DEBUGGING_GUIDE.md)
- [Test Results](CORS_TEST_RESULTS.md)
- [Index](CORS_TESTING_INDEX.md)

## ✅ Success Looks Like

```
Tests Passed: 7/7

✅ Health Check: Status 200
✅ OPTIONS Preflight: Status 204, CORS headers present
✅ All tests passed!
```

## 🆘 If Stuck

1. Run: `npm run test:production-cors > debug.log 2>&1`
2. Check Railway logs
3. Share both logs for help

---

**Remember:** Run `npm run test:production-cors` first!
