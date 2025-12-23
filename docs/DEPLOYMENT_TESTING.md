# Deployment Testing Checklist

Pre-deployment and post-deployment testing to prevent issues like CORS errors, missing environment variables, and authentication failures.

## Pre-Deployment Checklist

### 1. Run All Tests Locally

```bash
# Backend tests
cd backend
npm run test:coverage

# Frontend tests
npm run build:check
npm run lint

# E2E tests
npm run test:e2e
```

All tests must pass before deploying.

### 2. Verify Environment Variables

**Backend** (Railway):
```bash
# Required
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
APIFY_API_TOKEN

# Optional
SENDGRID_API_KEY
LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET
```

**Frontend** (Railway):
```bash
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_API_URL  # Must match backend URL
```

Verify in Railway dashboard before deployment.

### 3. Check CORS Configuration

Ensure `APP_URL` in backend matches frontend URL:

```bash
# Backend .env
APP_URL=https://jobmatchai-production.up.railway.app
```

### 4. Run Deployment Readiness Check

```bash
./check-deployment-ready.sh
```

## Deployment Process

### 1. Deploy Backend First

```bash
# Push to Railway (auto-deploy)
git push origin main

# Or manual deploy
railway up --service backend
```

### 2. Wait for Backend Health Check

```bash
# Manual check
curl https://intelligent-celebration-production-57e4.up.railway.app/health

# Or use wait-on
npx wait-on https://intelligent-celebration-production-57e4.up.railway.app/health --timeout 60000
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-23T...",
  "version": "1.0.3",
  "environment": "production"
}
```

### 3. Verify CORS Before Frontend Deployment

```bash
curl -i -X OPTIONS \
  -H "Origin: https://jobmatchai-production.up.railway.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  https://intelligent-celebration-production-57e4.up.railway.app/api/applications/generate
```

Must see:
- `access-control-allow-origin: https://jobmatchai-production.up.railway.app`
- `access-control-allow-methods: ... POST ...`
- `access-control-allow-headers: ... authorization ...`

### 4. Deploy Frontend

```bash
git push origin main  # Auto-deploy
# Or
railway up --service frontend
```

## Post-Deployment Verification

### Automated Verification

Run the comprehensive verification script:

```bash
./scripts/verify-railway-deployment.sh
```

This checks:
- Backend health endpoint (200 OK)
- CORS headers on health endpoint
- OPTIONS preflight for /api/applications/generate
- Authorization header allowed
- Environment configuration
- Frontend accessibility (200 OK)
- Unauthenticated request handling (401)

### Manual Verification

#### 1. Backend Health

```bash
curl https://intelligent-celebration-production-57e4.up.railway.app/health
```

#### 2. Frontend Loading

Visit: https://jobmatchai-production.up.railway.app

- Page loads without errors
- Login button visible
- No CORS errors in browser console (F12)

#### 3. Login Flow

1. Click "Sign In"
2. Enter credentials
3. Check browser console for CORS errors
4. Verify successful authentication

#### 4. Job Application Generation (Critical Flow)

1. Navigate to Jobs
2. Click on a job
3. Click "Generate Application"
4. Check browser console:
   - No CORS errors
   - No 401 authentication errors
   - Application generates successfully

### GitHub Actions Verification

Trigger the deployment verification workflow:

```bash
# Via GitHub UI: Actions → Railway Deployment Verification → Run workflow

# Or via GitHub CLI
gh workflow run railway-deploy-verify.yml
```

## Common Deployment Issues

### Issue 1: CORS Errors

**Symptoms**:
- Browser console: "Access to fetch has been blocked by CORS policy"
- OPTIONS requests return 401 or no CORS headers

**Solutions**:
1. Verify `APP_URL` in backend matches frontend URL
2. Check OPTIONS bypass in auth middleware:
   ```typescript
   if (req.method === 'OPTIONS') {
     next();
     return;
   }
   ```
3. Ensure CORS middleware is before auth middleware
4. Run CORS test: `npm run test:integration -- cors.test.ts`

**Verification**:
```bash
curl -i -X OPTIONS \
  -H "Origin: https://jobmatchai-production.up.railway.app" \
  https://intelligent-celebration-production-57e4.up.railway.app/api/applications/generate
```

### Issue 2: Missing Environment Variables

**Symptoms**:
- Backend crashes on startup
- Railway logs show "undefined" errors
- Health check unreachable

**Solutions**:
1. Check Railway dashboard: Service → Variables
2. Ensure all required variables are set
3. Redeploy after adding variables
4. Run env test: `npm run test:integration -- environment.test.ts`

**Verification**:
```bash
# Check backend logs
railway logs --service backend

# Look for startup errors related to missing env vars
```

### Issue 3: Authentication Failures

**Symptoms**:
- All requests return 401
- Valid tokens rejected
- OPTIONS requests blocked

**Solutions**:
1. Verify SUPABASE_ANON_KEY in backend matches frontend
2. Check token format in frontend (Bearer token)
3. Ensure OPTIONS bypass is working
4. Run auth test: `npm run test:unit -- middleware.test.ts`

**Verification**:
```bash
# Test with valid token from Supabase
TOKEN="your-token-here"
curl -H "Authorization: Bearer $TOKEN" \
  https://intelligent-celebration-production-57e4.up.railway.app/api/jobs
```

### Issue 4: Backend Not Starting

**Symptoms**:
- Railway shows "Crashed"
- Health check times out
- No logs after "Starting..."

**Solutions**:
1. Check Railway build logs for errors
2. Verify `package.json` scripts:
   - `"build": "tsc"`
   - `"start": "node dist/index.js"`
3. Ensure all dependencies are in `dependencies` (not `devDependencies`)
4. Check Node version: `"engines": { "node": ">=18.0.0" }`

**Verification**:
```bash
# Local build test
cd backend
npm run build
npm start
# Should start without errors
```

### Issue 5: Frontend Build Failures

**Symptoms**:
- Railway build fails
- TypeScript errors
- Environment variable access errors

**Solutions**:
1. Run local build: `npm run build`
2. Fix TypeScript errors: `npm run build:check`
3. Ensure env vars are prefixed with `VITE_`
4. Check vite.config.ts for correct configuration

**Verification**:
```bash
# Local build test
npm run build
npm run preview
# Visit http://localhost:4173
```

## Rollback Procedure

If deployment fails:

### 1. Immediate Rollback (Railway)

```bash
# Via Railway CLI
railway rollback --service backend
railway rollback --service frontend

# Or via Railway Dashboard
# Service → Deployments → Click previous deployment → Redeploy
```

### 2. Verify Rollback

```bash
./scripts/verify-railway-deployment.sh
```

### 3. Fix Issue Locally

1. Identify the issue from logs
2. Write a failing test
3. Fix the code
4. Verify tests pass
5. Commit and redeploy

## Continuous Monitoring

### Health Check Monitoring

Set up a monitoring service (e.g., UptimeRobot, Pingdom):

- URL: `https://intelligent-celebration-production-57e4.up.railway.app/health`
- Interval: 5 minutes
- Alert if: Status ≠ 200 or response doesn't contain "healthy"

### Railway Logs

Monitor logs for errors:

```bash
# Backend logs
railway logs --service backend --follow

# Frontend logs
railway logs --service frontend --follow
```

### GitHub Actions

Enable notifications for failed workflows:
- Repository Settings → Notifications
- Email on workflow failure

## Testing in Staging Environment

Before production deployment, test in staging:

```bash
# Set staging URLs
export BACKEND_URL=https://staging-backend.railway.app
export FRONTEND_URL=https://staging-frontend.railway.app

# Run verification
./scripts/verify-railway-deployment.sh

# Run E2E tests
npm run test:e2e
```

## Security Considerations

### Pre-Deployment Security Checks

```bash
# Audit dependencies
npm audit
cd backend && npm audit

# Run security tests
npm run security:scan

# Check for exposed secrets
git secrets --scan
```

### Post-Deployment Security Verification

1. Verify HTTPS is enforced
2. Check CSP headers
3. Verify rate limiting is active
4. Test authentication edge cases
5. Verify CORS only allows trusted origins

## Documentation Updates

After successful deployment, update:

1. `DEPLOYMENT_SUMMARY_YYYY-MM-DD.md` - Deployment notes
2. `CHANGELOG.md` - Version changes
3. Railway dashboard - Update service descriptions
4. Team communication - Notify of deployment

## Emergency Contacts

- **Railway Issues**: Check Railway status page
- **Supabase Issues**: Check Supabase status page
- **OpenAI Issues**: Check OpenAI status page
- **Team Lead**: [Contact information]

## Resources

- [Testing Strategy](/docs/TESTING_STRATEGY.md)
- [Backend Testing Guide](/backend/README_TESTING.md)
- [Railway Documentation](https://docs.railway.app)
- [Deployment Scripts](/scripts/)
