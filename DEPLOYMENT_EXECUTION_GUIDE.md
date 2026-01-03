# Deployment Execution Guide
**Date:** 2026-01-03
**Phase:** Session Management, Security Events, OAuth Migration
**Estimated Time:** 2-3 hours (including validation)

---

## Quick Reference

### Environment URLs
| Environment | Frontend | Backend API | D1 Database |
|-------------|----------|-------------|-------------|
| Development | https://jobmatch-ai-dev.pages.dev | https://jobmatch-ai-dev.carl-f-frank.workers.dev | jobmatch-dev |
| Staging | https://jobmatch-ai-staging.pages.dev | https://jobmatch-ai-staging.carl-f-frank.workers.dev | jobmatch-staging |
| Production | https://jobmatch-ai-production.pages.dev | https://jobmatch-ai-prod.carl-f-frank.workers.dev | jobmatch-prod |

### Key Commands
```bash
# Check migration status
cd workers && npx wrangler d1 migrations list DB --env <environment> --remote

# Apply migrations
npx wrangler d1 migrations apply DB --env <environment> --remote

# Deploy Workers
npx wrangler deploy --env <environment>

# Monitor logs
npx wrangler tail --env <environment>

# Test health endpoint
curl https://jobmatch-ai-<env>.carl-f-frank.workers.dev/health
```

---

## Phase 1: Development Environment Deployment

### Step 1: Pre-Deployment Verification (5 minutes)

```bash
# 1. Ensure you're on develop branch
git checkout develop
git pull origin develop

# 2. Verify code is clean
git status

# 3. Check recent commits
git log -5 --oneline

# Expected commits:
# 62c34de - Phase 3: OAuth profile sync migration
# 70581a4 - Phase 2: Security events migration
# c229858 - Phase 1: Session management migration
```

**Verification Checklist:**
- [ ] On `develop` branch
- [ ] Working tree clean
- [ ] Recent migration commits present
- [ ] No uncommitted changes

### Step 2: Apply D1 Migrations to Development (10 minutes)

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# View pending migrations
npx wrangler d1 migrations list DB --env development --remote

# Expected output:
# Migrations to be applied:
# - 0001_initial_schema.sql
# - 0003_add_gap_analyses.sql

# Apply migrations
npx wrangler d1 migrations apply DB --env development --remote

# Expected output:
# ✅ Successfully applied 0001_initial_schema.sql
# ✅ Successfully applied 0003_add_gap_analyses.sql
```

**⚠️ CRITICAL: Watch for errors during migration**
- SQL syntax errors → Fix migration file and reapply
- Foreign key violations → Check table dependencies
- Connection timeout → Retry migration

**If migration fails:**
```bash
# 1. Check error message carefully
# 2. Fix migration SQL file if syntax error
# 3. If corrupted, recreate database:
npx wrangler d1 database delete jobmatch-dev
npx wrangler d1 database create jobmatch-dev
# 4. Update wrangler.toml with new database ID
# 5. Reapply all migrations
```

**Verify migrations applied:**
```bash
# Check migration history
npx wrangler d1 migrations list DB --env development --remote

# Expected: "No migrations to apply"

# Test database connectivity
npx wrangler d1 execute DB --env development --remote \
  --command "SELECT COUNT(*) as table_count FROM sqlite_master WHERE type='table';"

# Expected: ~30 tables (26 main + 3 FTS + 1 migration tracking)

# Verify sessions table doesn't exist (KV-based, not D1)
npx wrangler d1 execute DB --env development --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions';"

# Expected: No rows (sessions in KV, not D1)

# Verify security_events table exists
npx wrangler d1 execute DB --env development --remote \
  --command "SELECT COUNT(*) FROM security_events;"

# Expected: 0 (empty table, ready for use)

# Verify gap_analyses table exists
npx wrangler d1 execute DB --env development --remote \
  --command "SELECT COUNT(*) FROM gap_analyses;"

# Expected: 0 (empty table, ready for use)
```

**Success Criteria:**
- [ ] All migrations applied without errors
- [ ] ~30 tables exist in D1 database
- [ ] `security_events` table exists and empty
- [ ] `gap_analyses` table exists and empty
- [ ] No `sessions` table (uses KV instead)

### Step 3: Deploy to Development via GitHub Actions (15 minutes)

```bash
# Option A: Trigger automatic deployment (recommended)
git push origin develop

# Option B: Manual workflow dispatch
# Go to: https://github.com/<username>/jobmatch-ai/actions
# Select: "Deploy to Cloudflare"
# Click: "Run workflow" → Select "development"

# Monitor deployment in GitHub Actions
# https://github.com/<username>/jobmatch-ai/actions
```

**GitHub Actions will:**
1. ✅ Lint code (frontend + backend)
2. ✅ Run type checks
3. ✅ Run unit tests
4. ✅ Validate D1 migrations (already applied manually)
5. ✅ Deploy Workers to Cloudflare
6. ✅ Deploy Frontend to Cloudflare Pages
7. ✅ Send Slack notification

**Watch for:**
- Build failures (fix code and re-push)
- Test failures (fix tests and re-push)
- Deployment failures (check logs)
- Slack notification (success/failure)

**Deployment URLs:**
- GitHub Actions: https://github.com/<username>/jobmatch-ai/actions
- Slack: #deployments channel
- Cloudflare Dashboard: https://dash.cloudflare.com/

**Success Criteria:**
- [ ] GitHub Actions workflow completes successfully
- [ ] Workers deployed (green checkmark)
- [ ] Frontend deployed (green checkmark)
- [ ] Slack notification received (success)
- [ ] No errors in workflow logs

### Step 4: Post-Deployment Validation (30 minutes)

#### 4.1 Health Check

```bash
# Test Workers health endpoint
curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health

# Expected response:
# {"status":"ok","timestamp":"2026-01-03T..."}

# Test Frontend
curl -I https://jobmatch-ai-dev.pages.dev

# Expected: HTTP/2 200
```

**Success Criteria:**
- [ ] Workers health endpoint returns 200 OK
- [ ] Frontend returns 200 OK
- [ ] No 502/503 errors

#### 4.2 Session Management Validation

**Test Flow:**
1. Open browser: https://jobmatch-ai-dev.pages.dev
2. Open DevTools → Network tab
3. Filter: `jobmatch-ai-dev.carl-f-frank.workers.dev`
4. Login with test credentials

**Expected Network Calls:**
```
✅ POST /api/sessions (201 Created)
   Request: { user_id, session_id, device_info... }
   Response: { success: true, session: {...} }

✅ PATCH /api/sessions/:sessionId (200 OK)
   Request: { last_active }
   Response: { success: true }

✅ GET /api/sessions (200 OK)
   Response: { sessions: [...] }
```

**Forbidden Network Calls:**
```
❌ POST https://*.supabase.co/rest/v1/sessions
   (If you see this, migration failed - rollback immediately)
```

**Manual Test Steps:**
```bash
# 1. Login to app
# 2. Navigate to Account → Security Settings
# 3. View "Active Sessions" list
# 4. Click "Revoke" on a session
# 5. Verify session removed from list

# Check DevTools Network tab:
# ✅ GET /api/sessions (list sessions)
# ✅ DELETE /api/sessions/:sessionId (revoke)
```

**Success Criteria:**
- [ ] Login creates session via Workers API
- [ ] Session persists across page reloads
- [ ] Active sessions list displays correctly
- [ ] Session revocation works
- [ ] No Supabase `/rest/v1/sessions` calls

#### 4.3 Security Events Validation

**Test Flow:**
1. Login to app
2. Navigate to Security Settings
3. View "Recent Activity" section

**Expected Network Calls:**
```
✅ POST /api/security-events (201 Created)
   Request: { action: 'login', status: 'success', ... }
   Response: { success: true, event: {...} }

✅ GET /api/security-events?limit=20 (200 OK)
   Response: { events: [...] }
```

**Manual Test Steps:**
```bash
# 1. Login to app
# 2. Logout
# 3. Login again
# 4. Navigate to Security Settings → Recent Activity
# 5. Verify login/logout events logged

# Check DevTools Network tab:
# ✅ POST /api/security-events (on login)
# ✅ POST /api/security-events (on logout)
# ✅ GET /api/security-events (on viewing activity)
```

**Success Criteria:**
- [ ] Login event logged via Workers API
- [ ] Logout event logged via Workers API
- [ ] Recent activity displays correctly
- [ ] No Supabase `/rest/v1/security_events` calls

#### 4.4 OAuth Profile Sync Validation

**Test Flow:**
1. Logout from app
2. Click "Sign in with LinkedIn"
3. Complete OAuth flow (or use test account)

**Expected Network Calls (First-time user):**
```
✅ GET /api/users/:userId/exists (200 OK)
   Response: { exists: false }

✅ POST /api/users/oauth-profile (201 Created)
   Request: { user_id, email, first_name, last_name, photo_url, linkedin_url }
   Response: { success: true, user: {...} }
```

**Expected Network Calls (Existing user):**
```
✅ GET /api/users/:userId/exists (200 OK)
   Response: { exists: true }

✅ PATCH /api/users/:userId/oauth-enrich (200 OK)
   Request: { first_name, last_name, photo_url, linkedin_url }
   Response: { success: true, user: {...} }
```

**Manual Test Steps:**
```bash
# 1. Create new test account via LinkedIn OAuth
# 2. Verify profile created with LinkedIn data
# 3. Logout and login again
# 4. Verify profile enriched (not overwritten)

# Check DevTools Network tab:
# ✅ GET /api/users/:userId/exists
# ✅ POST /api/users/oauth-profile OR PATCH /api/users/:userId/oauth-enrich
```

**Success Criteria:**
- [ ] First-time OAuth creates profile via Workers API
- [ ] Existing user OAuth enriches profile
- [ ] LinkedIn photo synced correctly
- [ ] LinkedIn URL synced correctly
- [ ] No Supabase `/rest/v1/users` calls (except auth)

#### 4.5 Gap Analysis Validation

**Test Flow:**
1. Navigate to Application Generator
2. Start gap analysis
3. Answer questions
4. View results

**Expected Network Calls:**
```
✅ POST /api/gap-analyses (201 Created)
   Request: { user_id, gap_count, urgency, ... }
   Response: { success: true, analysis: {...} }

✅ GET /api/gap-analyses (200 OK)
   Response: { analyses: [...] }

✅ GET /api/gap-analyses/:id (200 OK)
   Response: { analysis: {...}, answers: [...] }
```

**Success Criteria:**
- [ ] Gap analysis creation works
- [ ] Gap analysis list displays
- [ ] Gap analysis details display
- [ ] No Supabase `/rest/v1/gap_analyses` calls

### Step 5: Monitor for Errors (1-2 hours passive)

```bash
# Start live monitoring
cd /home/carl/application-tracking/jobmatch-ai/workers
npx wrangler tail --env development

# Watch for:
# ❌ 500 errors
# ❌ D1 query errors ("no such table", "syntax error")
# ❌ KV operation errors
# ❌ Auth middleware errors (401/403)
# ✅ Successful API calls (200, 201, 204)
```

**Monitoring Checklist:**
- [ ] No 500 errors in first hour
- [ ] No D1 database errors
- [ ] No KV operation errors
- [ ] Session creation working (200-300ms avg)
- [ ] Security event logging working
- [ ] OAuth profile sync working

**If errors detected:**
1. Copy error message
2. Check D1 database schema
3. Check KV namespace configuration
4. Review Workers route implementation
5. If critical: Execute rollback (see Rollback Plan)

---

## Phase 2: Staging Environment Deployment

### Prerequisites
- [ ] Development environment deployed successfully
- [ ] All validation tests passing in development
- [ ] No errors in development for 24 hours
- [ ] User acceptance testing completed

### Step 1: Merge to Staging Branch (5 minutes)

```bash
# 1. Checkout staging branch
git checkout staging

# 2. Merge develop into staging
git merge develop

# 3. Push to trigger deployment
git push origin staging
```

### Step 2: Apply D1 Migrations to Staging (10 minutes)

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# Apply migrations
npx wrangler d1 migrations apply DB --env staging --remote

# Verify
npx wrangler d1 migrations list DB --env staging --remote
# Expected: "No migrations to apply"
```

### Step 3: Validate Staging Deployment (30 minutes)

**Repeat all validation steps from Development:**
- [ ] Health check passes
- [ ] Session management works
- [ ] Security events logging works
- [ ] OAuth profile sync works
- [ ] Gap analysis works
- [ ] No Supabase database violations

**Staging URLs:**
- Frontend: https://jobmatch-ai-staging.pages.dev
- API: https://jobmatch-ai-staging.carl-f-frank.workers.dev

---

## Phase 3: Production Environment Deployment

### Prerequisites
- [ ] Staging environment deployed successfully
- [ ] All validation tests passing in staging
- [ ] No errors in staging for 24 hours
- [ ] Stakeholder approval obtained

### Step 1: Merge to Main Branch (5 minutes)

```bash
# 1. Checkout main branch
git checkout main

# 2. Merge staging into main
git merge staging

# 3. Push to trigger deployment
git push origin main
```

### Step 2: Apply D1 Migrations to Production (10 minutes)

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# Apply migrations
npx wrangler d1 migrations apply DB --env production --remote

# Verify
npx wrangler d1 migrations list DB --env production --remote
# Expected: "No migrations to apply"
```

### Step 3: Validate Production Deployment (1 hour)

**Critical Validation Steps:**
- [ ] Health check passes
- [ ] Login flow works for real users
- [ ] Session persistence works
- [ ] No error spike in first 30 minutes
- [ ] Slack notifications received
- [ ] Monitor user feedback channels

**Production URLs:**
- Frontend: https://jobmatch-ai-production.pages.dev
- API: https://jobmatch-ai-prod.carl-f-frank.workers.dev

### Step 4: Production Monitoring (24 hours)

```bash
# Monitor production logs
cd /home/carl/application-tracking/jobmatch-ai/workers
npx wrangler tail --env production

# Watch for:
# - Error rate spikes
# - Slow response times
# - D1 query failures
# - Session creation failures
```

**24-Hour Monitoring Checklist:**
- [ ] Error rate < 0.1%
- [ ] No critical user issues reported
- [ ] Session management working for all users
- [ ] OAuth login working
- [ ] Performance metrics within SLA

---

## Rollback Procedures

### Emergency Rollback (Production Critical Issue)

**Time to Rollback:** ~5 minutes

```bash
# 1. Identify last known good commit
git log --oneline -10

# 2. Revert to last stable version
git revert <problematic-commit>

# 3. Force deploy previous version
cd workers
npx wrangler deploy --env production

# 4. Verify rollback
curl https://jobmatch-ai-prod.carl-f-frank.workers.dev/health

# 5. Notify stakeholders via Slack
```

### Partial Rollback (Specific Feature)

If only one API endpoint is failing:

```bash
# 1. Disable problematic route in Workers
# Edit: workers/api/index.ts
# Comment out failing route

# 2. Re-deploy Workers
cd workers
npx wrangler deploy --env production

# 3. Frontend will gracefully degrade
# (Add feature flag if needed)
```

### Database Rollback (D1 Migration Issue)

**⚠️ WARNING: This is destructive and should be last resort**

```bash
# 1. Export existing data (if any)
npx wrangler d1 execute DB --env production --remote \
  --command "SELECT * FROM users;" > users_backup.json

# 2. Drop problematic table
npx wrangler d1 execute DB --env production --remote \
  --command "DROP TABLE IF EXISTS problematic_table;"

# 3. Re-apply migration
npx wrangler d1 migrations apply DB --env production --remote

# 4. Restore data (if needed)
# Use SQL INSERT statements from backup
```

---

## Post-Deployment Checklist

### Immediate (Within 1 Hour)
- [ ] All environments deployed successfully
- [ ] Health checks passing
- [ ] No critical errors in logs
- [ ] Slack notifications sent
- [ ] Team notified of deployment

### Short-Term (Within 24 Hours)
- [ ] Monitor error rates
- [ ] User acceptance testing
- [ ] Performance benchmarks recorded
- [ ] Cost analysis (D1 + KV usage)

### Medium-Term (Within 1 Week)
- [ ] 7-day stability report
- [ ] Performance optimization review
- [ ] User feedback collected
- [ ] Documentation updated

---

## Troubleshooting Common Issues

### Issue 1: D1 Migration Fails

**Symptoms:**
```
Error: SQL syntax error near "..."
```

**Solution:**
```bash
# 1. Check migration SQL syntax
cat workers/migrations/0001_initial_schema.sql

# 2. Test SQL locally (if possible)
sqlite3 test.db < workers/migrations/0001_initial_schema.sql

# 3. Fix syntax and reapply
npx wrangler d1 migrations apply DB --env development --remote
```

### Issue 2: Workers Deployment Fails

**Symptoms:**
```
Error: Failed to publish Worker
```

**Solution:**
```bash
# 1. Check wrangler.toml for syntax errors
cd workers
cat wrangler.toml

# 2. Verify bindings configured
npx wrangler whoami

# 3. Check Cloudflare account status
# https://dash.cloudflare.com/

# 4. Retry deployment
npx wrangler deploy --env development
```

### Issue 3: KV Operations Fail

**Symptoms:**
```
Error: KV namespace not found
```

**Solution:**
```bash
# 1. List KV namespaces
npx wrangler kv:namespace list

# 2. Verify namespace ID in wrangler.toml
cat wrangler.toml | grep SESSIONS

# 3. Recreate namespace if missing
npx wrangler kv:namespace create SESSIONS --env development

# 4. Update wrangler.toml with new ID
```

### Issue 4: Frontend API Calls Fail (CORS)

**Symptoms:**
```
Access-Control-Allow-Origin header missing
```

**Solution:**
```bash
# 1. Check CORS middleware in Workers
# File: workers/api/middleware/cors.ts

# 2. Verify allowed origins include frontend URL
# Expected: https://jobmatch-ai-dev.pages.dev

# 3. Re-deploy Workers with CORS fix
cd workers
npx wrangler deploy --env development
```

### Issue 5: Session Creation Fails

**Symptoms:**
```
Error: Session already exists
```

**Solution:**
```bash
# 1. Clear stale KV keys
# Cloudflare Dashboard → KV → SESSIONS → Delete keys

# 2. Or clear programmatically
npx wrangler kv:key delete "user:${userId}:${sessionId}" \
  --namespace-id=<SESSIONS_KV_ID> --env development

# 3. Retry session creation
```

---

## Success Metrics

### Deployment Success
- ✅ All environments deployed without errors
- ✅ All validation tests passing
- ✅ No Supabase database violations
- ✅ Zero downtime during deployment

### Functional Success
- ✅ Users can login and create sessions
- ✅ Sessions persist across reloads
- ✅ Security events logged correctly
- ✅ OAuth login works
- ✅ Gap analysis works

### Performance Success
- ✅ Session creation < 200ms (95th percentile)
- ✅ Session query < 100ms (95th percentile)
- ✅ Event logging < 150ms (95th percentile)
- ✅ OAuth sync < 500ms (95th percentile)

### Stability Success
- ✅ Error rate < 0.1% over 7 days
- ✅ No critical user issues
- ✅ No production rollbacks needed

---

## Next Steps After Deployment

### Immediate
1. Update MIGRATION_TASKS_REMAINING.md (mark phases 1-3 complete)
2. Document lessons learned
3. Create post-deployment report

### Short-Term
1. Monitor production for 1 week
2. Collect user feedback
3. Performance optimization review
4. Plan next migration phase (storage/embeddings)

### Long-Term
1. Remove Supabase fallback code
2. Archive old migration docs
3. Update onboarding documentation
4. Plan full Supabase decommissioning

---

**Last Updated:** 2026-01-03
**Author:** DevOps Automation Architect
**Status:** Ready for Execution
