# Railway Deployment Troubleshooting Guide

## Current Status
- **Issue**: Backend returning 502 errors across all environments
- **Last Change**: Removed `npm prune --omit=dev` from build command (commit d6d0748)
- **Configuration**: Using Nixpacks builder with `npm ci && npx tsc` build command

## What to Check in Railway Dashboard

### 1. Verify Build Configuration
Navigate to: **Railway Dashboard → Backend Service → Settings**

Confirm these settings:
- ✅ **Builder**: NIXPACKS (not Dockerfile)
- ✅ **Root Directory**: `backend` (not `/backend`, not empty)
- ✅ **Custom Build Command**: EMPTY/CLEARED (let railway.toml control it)
- ✅ **Custom Start Command**: EMPTY/CLEARED (let railway.toml control it)
- ✅ **Watch Paths**:
  ```
  src/**/*.ts
  package.json
  tsconfig.json
  ```

### 2. Check Latest Deployment Status
Navigate to: **Railway Dashboard → Backend Service → Deployments**

Look for the most recent deployment and check:
- **Status**: Should be "Success" or "Active" (not "Failed" or "Crashed")
- **Build Logs**: Click on the deployment to view build logs

### 3. Expected Build Log Output

The build logs should show:
```
═══════════════════════════════════════════════════════════
║ Nixpacks build started                                  ║
═══════════════════════════════════════════════════════════
║ build │ npm ci && npx tsc                              ║
═══════════════════════════════════════════════════════════
```

**Key indicators of success:**
- ✅ Shows `npm ci && npx tsc` (not the old command with npm prune)
- ✅ npm ci completes successfully
- ✅ TypeScript compilation succeeds (no TS errors)
- ✅ Build phase completes without EBUSY errors
- ✅ No errors about `/app/node_modules/.cache`

**Red flags:**
- ❌ Still shows old build command with `npm prune`
- ❌ EBUSY errors during build
- ❌ TypeScript compilation errors
- ❌ "Could not find root directory" errors

### 4. Check Application Logs
Navigate to: **Railway Dashboard → Backend Service → Deployments → [Latest] → Logs**

Look for:
- **Application Start**: Should see "Server running on port XXXX"
- **Health Check**: Should see health check requests
- **Errors**: Look for any runtime errors, port binding issues, or crashes

Common issues:
- Port not binding correctly (check if `PORT` environment variable is set)
- Missing environment variables (SUPABASE_URL, SUPABASE_KEY, etc.)
- Application crashes on startup

### 5. Environment Variables
Navigate to: **Railway Dashboard → Backend Service → Variables**

Ensure these are set for each environment:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `NODE_ENV` (should be auto-set by Railway)
- `PORT` (should be auto-set by Railway)

## Common Issues and Solutions

### Issue 1: Build still shows old command
**Symptom**: Build logs show `npm ci && npm run build && npm prune --omit=dev`
**Solution**:
1. The railway.toml changes haven't been picked up
2. Try triggering a manual redeploy: Deployments → Three dots → Redeploy
3. Or push an empty commit: `git commit --allow-empty -m "trigger rebuild" && git push`

### Issue 2: EBUSY cache conflict still occurring
**Symptom**: Build logs show `EBUSY: resource busy or locked, rmdir '/app/node_modules/.cache'`
**Solution**:
1. This should be resolved by removing `npm prune`
2. If still occurring, check Railway Dashboard → Settings → Custom Build Command is empty

### Issue 3: TypeScript compilation errors
**Symptom**: Build logs show TypeScript errors during `npx tsc`
**Solution**:
1. Run `npm run build` locally to see the errors
2. Fix TypeScript errors in the codebase
3. Commit and push fixes

### Issue 4: Application crashes on startup
**Symptom**: Build succeeds but deployment logs show crashes
**Solution**:
1. Check application logs for specific error messages
2. Verify all required environment variables are set
3. Check if the start command is correct: `npm start` → `node dist/index.js`

### Issue 5: Health check timeout
**Symptom**: Deployment logs show "Health check failed"
**Solution**:
1. Verify the health endpoint exists at `/health`
2. Check if the app is listening on the correct port (from `PORT` env var)
3. Increase health check timeout in railway.toml if needed (currently 300s)

## Testing the Deployment

Once the deployment shows as "Active" in Railway Dashboard:

1. **Test Health Endpoint**:
   ```bash
   curl https://jobmatchai-backend-development.up.railway.app/health
   ```
   Expected response: `{"status":"ok","timestamp":"..."}`

2. **Test a Simple API Endpoint**:
   ```bash
   curl https://jobmatchai-backend-development.up.railway.app/api/jobs
   ```

3. **Check Response Headers**:
   ```bash
   curl -I https://jobmatchai-backend-development.up.railway.app/health
   ```
   Should return HTTP 200, not 502

## Next Steps

1. **Check Railway Dashboard** using the steps above
2. **Share the Build Logs**: Copy the build logs from the latest deployment
3. **Share the Application Logs**: Copy any error messages from the deployment logs
4. **Verify Configuration**: Confirm all settings match the checklist in section 1

## Files Modified
- `backend/railway.toml` - Build configuration (latest: removed npm prune)
- Railway Dashboard Settings - Builder, Root Directory, Commands, Watch Paths

## Latest Commits
- `d6d0748` - fix: remove npm prune to avoid EBUSY error with Railway cache mount
- `a65f6f9` - fix: use npx tsc directly to avoid vitest cache conflicts
- `232d9b5` - fix: disable Railway build cache to resolve EBUSY error
