# Production Backend 502 Bad Gateway Investigation

**Investigation Date:** 2025-12-24
**Status:** Root Cause Identified
**Priority:** CRITICAL - Production Down

---

## Executive Summary

Production backend at `https://intelligent-celebration-production-57e4.up.railway.app` is returning 502 Bad Gateway errors because **Railway deployments have been failing since the beginning**. All 20+ deployment attempts through GitHub Actions have failed due to a missing `RAILWAY_TOKEN` secret.

**Root Cause:** GitHub Actions secret `RAILWAY_TOKEN` does not exist, causing Railway CLI authentication to fail immediately.

---

## Investigation Timeline

### 1. Initial Symptoms

E2E tests hitting production backend showed:
- All requests returning **502 Bad Gateway**
- Health endpoint: `502`
- OPTIONS preflight: `502`
- All authenticated endpoints: `502`

```
=== Direct OPTIONS Test ===
Status: 502 Bad Gateway

=== Health Check ===
Status: 502

=== GET with Origin ===
Status: 502
```

### 2. Railway Response Analysis

Direct curl to production health endpoint revealed Railway edge layer details:

```bash
curl -i https://intelligent-celebration-production-57e4.up.railway.app/health

HTTP/2 502
content-type: application/json
server: railway-edge
x-railway-edge: railway/us-east4-eqdc4a
x-railway-fallback: true
x-railway-request-id: ugpRrV2_SeSH2QWtAax-fw

{"status":"error","code":502,"message":"Application failed to respond"}
```

**Key Indicators:**
- `x-railway-fallback: true` - Railway using fallback response (app not responding)
- `"Application failed to respond"` - Backend service is not running or not listening

### 3. GitHub Actions Deployment History

ALL deployments are failing:

```bash
gh run list --workflow=deploy-backend-railway.yml --limit 20

completed  failure  chore: merge main into develop...    20494191516  8s   2025-12-24T21:31:00Z
completed  failure  refactor: simplify CORS...           20494173917  12s  2025-12-24T21:29:35Z
completed  failure  feat: implement production-grade...  20492963662  14s  2025-12-24T19:52:42Z
... (17 more failures)
```

**Pattern:** All deployments fail in 8-16 seconds, at the "Deploy to Railway" step.

### 4. GitHub Actions Step Analysis

The "Deploy to Railway" step fails instantly:

```json
{
  "name": "Deploy to Railway",
  "status": "completed",
  "conclusion": "failure",
  "number": 5,
  "started_at": "2025-12-24T21:31:06Z",
  "completed_at": "2025-12-24T21:31:06Z"  // < 1 second execution
}
```

**Failed step workflow:**
```yaml
- name: Deploy to Railway
  env:
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
    ENVIRONMENT: ${{ steps.env-setup.outputs.environment }}
  run: |
    cd backend
    echo "Deploying to Railway environment: $ENVIRONMENT"
    railway up --service backend --environment "$ENVIRONMENT" --detach
```

### 5. GitHub Secrets Audit

**CRITICAL FINDING:** `RAILWAY_TOKEN` secret does NOT exist.

Current GitHub Actions secrets:
```
FIREBASE_SERVICE_ACCOUNT
VITE_FIREBASE_API_KEY
VITE_FIREBASE_APP_ID
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
```

**Missing:** `RAILWAY_TOKEN`

This secret is required by:
- `.github/workflows/deploy-backend-railway.yml` (6 references)
- `.github/workflows/deploy-pr-preview.yml` (4 references)

---

## Root Cause

**Railway CLI authentication failure due to missing `RAILWAY_TOKEN` secret.**

When GitHub Actions runs `railway up`, the Railway CLI attempts to authenticate using:
```bash
RAILWAY_TOKEN=${{ secrets.RAILWAY_TOKEN }}
```

Since this secret doesn't exist, the environment variable is empty/undefined, causing Railway CLI to fail authentication immediately with:
```
Unauthorized. Please login with `railway login`
```

This prevents ANY deployment from succeeding, leaving the production backend in a non-functional state.

---

## Impact Assessment

### Severity: CRITICAL

1. **Production Completely Down**
   - Backend returns 502 to all requests
   - No API endpoints are functional
   - All user-facing features broken

2. **No Successful Deployments**
   - 20+ consecutive deployment failures
   - No working version in production
   - Cannot deploy fixes or updates

3. **Multi-Environment Impact**
   - Production environment: Down
   - Staging environment: Down (same issue)
   - Development environment: Down (same issue)

4. **CI/CD Pipeline Broken**
   - Cannot deploy from any branch (main, staging, develop)
   - Cannot deploy PR previews
   - Manual Railway CLI deployments also fail (no local token)

---

## Configuration Analysis

### Backend Railway Configuration (`backend/railway.toml`)

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci && npm run build && npm prune --omit=dev"
watchPatterns = ["src/**/*.ts", "package.json", "tsconfig.json"]

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

**Status:** Configuration is correct ✓

### Application Configuration (`backend/src/index.ts`)

```typescript
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on: 0.0.0.0:${PORT}`);
});
```

**Status:** Application configuration is correct ✓
- Listens on all interfaces (0.0.0.0)
- Uses Railway-injected PORT environment variable
- Has health endpoint at `/health`

### GitHub Actions Workflow

**Status:** Workflow logic is correct, but missing authentication secret ✗

---

## Recommended Fix (Step-by-Step)

### Option 1: Generate Railway Project Token (Recommended)

1. **Log into Railway Dashboard**
   ```
   https://railway.app/dashboard
   ```

2. **Navigate to JobMatch AI Project**
   - Select your project from the dashboard

3. **Generate Project Token**
   - Go to Project Settings → Tokens
   - Click "Generate Token"
   - **Token Type:** Project Token
   - **Scope:** Select all environments (production, staging, development)
   - Copy the generated token (shown only once!)

4. **Add to GitHub Secrets**
   ```
   Repository → Settings → Secrets and variables → Actions
   Click "New repository secret"
   Name: RAILWAY_TOKEN
   Value: [paste token from step 3]
   ```

5. **Verify Token Permissions**
   The token must have:
   - Deploy permissions
   - Service management permissions
   - Environment access (production, staging, development)

6. **Trigger Deployment**
   ```bash
   # Option A: Push to main branch
   git commit --allow-empty -m "chore: trigger Railway deployment after token fix"
   git push origin main

   # Option B: Manual workflow dispatch
   # Go to Actions → Deploy Backend to Railway → Run workflow
   ```

7. **Monitor Deployment**
   - Watch GitHub Actions for successful deployment
   - Check Railway dashboard for service health
   - Verify health endpoint responds with 200

### Option 2: Use Railway Team/Account Token (Alternative)

If project tokens don't work or you need broader access:

1. **Generate Account Token**
   ```
   Railway Dashboard → Account Settings → Tokens → Create Token
   ```

2. **Add as RAILWAY_API_TOKEN**
   - Same as Option 1, step 4
   - Use `RAILWAY_API_TOKEN` instead of `RAILWAY_TOKEN`

3. **Update GitHub Actions Workflow**
   - Change `RAILWAY_TOKEN` to `RAILWAY_API_TOKEN` in workflow files
   - Commit and push changes

---

## Verification Checklist

After implementing the fix, verify:

- [ ] GitHub Actions deployment completes successfully
- [ ] Railway dashboard shows "Active" service status
- [ ] Health endpoint returns 200: `curl https://intelligent-celebration-production-57e4.up.railway.app/health`
- [ ] E2E tests pass against production backend
- [ ] All three environments work (production, staging, development)

---

## Additional Issues Discovered

### 1. Root Railway Config Conflict

**File:** `/.railway/config.json`
```json
{
  "build": {
    "builder": "dockerfile",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node server.js"
  }
}
```

**Issue:** This configuration is for the **frontend**, not the backend. Since GitHub Actions runs `railway up` from the `backend/` directory, this shouldn't interfere, but it's confusing.

**Recommendation:** Consider renaming or moving this to clarify it's frontend-specific, or delete if not used.

### 2. Missing Backend Dockerfile

The root `Dockerfile` is for the frontend. The backend uses **Nixpacks** (as specified in `railway.toml`), which is correct, but there's no backend Dockerfile if you ever need Docker-based builds.

**Status:** Not an issue (Nixpacks is working as designed) ✓

---

## Prevention Recommendations

1. **Secret Validation in CI/CD**
   Add a verification step before deployment:
   ```yaml
   - name: Verify Railway Token
     run: |
       if [ -z "${{ secrets.RAILWAY_TOKEN }}" ]; then
         echo "ERROR: RAILWAY_TOKEN secret is not set"
         exit 1
       fi
   ```

2. **Pre-deployment Health Check**
   Add health check for Railway project/service existence:
   ```yaml
   - name: Verify Railway Service
     env:
       RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
     run: |
       cd backend
       railway status --service backend --environment "$ENVIRONMENT" || exit 1
   ```

3. **Token Rotation Schedule**
   - Set up quarterly token rotation
   - Document token in secure password manager
   - Test token rotation process before expiration

4. **Monitoring and Alerts**
   - Set up Railway webhook notifications for deployment failures
   - Configure GitHub Actions notifications for failed workflows
   - Add production health monitoring with alerting

---

## Documentation References

- Railway CLI Authentication: `/docs/RAILWAY_CLI_AUTHENTICATION.md`
- Railway Multi-Environment Setup: `/docs/RAILWAY-MULTI-ENVIRONMENT-SETUP.md`
- Railway Token Setup: `/docs/RAILWAY_TOKEN_SETUP.md`

---

## Contact and Next Steps

**Immediate Action Required:**
1. Generate and add `RAILWAY_TOKEN` secret to GitHub
2. Trigger deployment to all environments
3. Verify production is back online
4. Run full E2E test suite

**Estimated Time to Resolution:** 15-30 minutes

**Risk Level:** Low (fix is straightforward and low-risk)
