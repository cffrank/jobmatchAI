# Workers Troubleshooting Runbook

**Quick Reference Guide for Common Issues**
**Date:** 2026-01-03
**Scope:** Phases 1-3 migration (Sessions, Security Events, OAuth)

---

## 🚨 Emergency Contacts

| Severity | Contact | When to Use |
|----------|---------|-------------|
| **P0 - Critical** | On-call engineer | Production down, users can't login |
| **P1 - High** | Backend lead | Errors >5%, migration violations |
| **P2 - Medium** | DevOps team | Performance issues, slow queries |
| **P3 - Low** | Slack #engineering | Questions, trend analysis |

---

## Quick Diagnostic Commands

### Check Workers Health
```bash
# All environments
curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health
curl https://jobmatch-ai-staging.carl-f-frank.workers.dev/health
curl https://jobmatch-ai-prod.carl-f-frank.workers.dev/health
```

### View Recent Logs
```
# Cloudflare Dashboard → Workers & Pages → jobmatch-ai-prod → Logs
level="ERROR" AND timestamp > -1h
```

### Check KV Namespace
```bash
wrangler kv:key list \
  --namespace-id "a7352191f17942f9a5e557be72671ea0" \
  --env production | head -20
```

### Check D1 Database
```bash
wrangler d1 execute DB \
  --env production \
  --remote \
  --command "SELECT COUNT(*) as count FROM security_events;"
```

---

## Issue #1: Users Can't Login (Session Creation Failed)

### Symptoms
- User reports "Unable to login"
- Frontend shows "Session creation failed"
- Logs show: `event="session.create.failure"`

### Quick Diagnosis (2 minutes)
```bash
# 1. Check recent session creation errors
# In Cloudflare Dashboard Logs:
event="session.create.failure" AND timestamp > -5m

# 2. Check KV namespace health
wrangler kv:key list \
  --namespace-id "a7352191f17942f9a5e557be72671ea0" \
  --env production \
  --prefix "user:" | head -10

# 3. Test session creation manually
curl -X POST https://jobmatch-ai-prod.carl-f-frank.workers.dev/api/sessions \
  -H "Authorization: Bearer [VALID_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-123",
    "device_type": "desktop",
    "browser": "Chrome",
    "ip_address": "127.0.0.1"
  }'
```

### Common Causes & Fixes

**Cause 1: KV Namespace Unavailable**
```bash
# Check Cloudflare status
curl https://www.cloudflarestatus.com/api/v2/status.json

# If KV is down, wait for Cloudflare resolution
# In meantime, check Cloudflare Dashboard for incidents
```

**Cause 2: Invalid Session Data**
```typescript
// Check validation error in logs
// Look for: "Invalid request body" with field details

// Fix: Ensure frontend sends all required fields:
{
  "session_id": "string (min 1 char)",
  "device_type": "string | null",
  "browser": "string | null",
  "ip_address": "string | null"
}
```

**Cause 3: JWT Token Expired**
```bash
# Check auth errors
# In Cloudflare Logs: event="auth.failure" AND message LIKE "%expired%"

# User needs to re-login to get fresh token
# Frontend should automatically redirect to /login
```

### Resolution Steps
1. [ ] Identify root cause from logs
2. [ ] If KV issue → Wait for Cloudflare (check status page)
3. [ ] If validation issue → Fix frontend to send correct data
4. [ ] If auth issue → User needs to re-login
5. [ ] Monitor for 15 minutes to confirm fix
6. [ ] Document issue in incident log

**Recovery Time:** 5-15 minutes

---

## Issue #2: Supabase Violation Detected

### Symptoms
- Logs show: `event="migration.violation.supabase_call"`
- Development environment throws error
- **CRITICAL**: Should NEVER happen in production

### Quick Diagnosis (1 minute)
```bash
# In Cloudflare Dashboard Logs:
event="migration.violation.supabase_call" AND timestamp > -1h

# Get violation details:
# - context.route: Which endpoint violated
# - context.violation_table: Which Supabase table accessed
# - context.violation_method: GET/POST/PATCH/DELETE
```

### Common Causes & Fixes

**Cause: Code Still Uses Supabase Client**
```bash
# Find the violating route from logs
# Example: context.route="/api/sessions"

# Search for Supabase usage in that route
cd workers/api/routes
grep -n "createSupabaseAdmin\|createSupabaseClient" sessions.ts

# If found, replace with D1/KV equivalent
```

**Example Fix:**
```typescript
// BEFORE (WRONG):
const { data, error } = await supabase
  .from('sessions')
  .select('*')
  .eq('user_id', userId);

// AFTER (CORRECT):
const kvKey = `user:${userId}:`;
const { keys } = await c.env.SESSIONS.list({ prefix: kvKey });
const sessions = [];
for (const key of keys) {
  const sessionJson = await c.env.SESSIONS.get(key.name);
  if (sessionJson) sessions.push(JSON.parse(sessionJson));
}
```

### Resolution Steps
1. [ ] **IMMEDIATE**: Rollback production if violation detected
2. [ ] Identify violating route from logs
3. [ ] Search codebase for Supabase usage in that route
4. [ ] Replace with D1/KV equivalent
5. [ ] Test in development (should throw error if still violating)
6. [ ] Deploy to staging → verify no violations
7. [ ] Re-deploy to production with monitoring

**Recovery Time:** 30-60 minutes (includes rollback + fix + re-deploy)

---

## Issue #3: High KV Latency (>100ms)

### Symptoms
- Slow session operations
- Logs show: `event="performance.budget.exceeded"` with `operation="session.kv.put"`
- User reports slow login

### Quick Diagnosis (2 minutes)
```bash
# In Cloudflare Dashboard Logs:
event LIKE "session.kv.%" AND context.duration_ms > 100 AND timestamp > -1h

# Count occurrences
event LIKE "session.kv.%" AND context.duration_ms > 100 | stats count() by operation

# Check Cloudflare KV status
curl https://www.cloudflarestatus.com/api/v2/components.json | grep -i "workers kv"
```

### Common Causes & Fixes

**Cause 1: Cloudflare KV Degradation**
```bash
# Check Cloudflare status page
# If KV degraded, wait for resolution

# Temporary workaround: Increase timeout
# In route handler, add retry logic with backoff
```

**Cause 2: Large Session Payloads**
```bash
# Check session size in logs
# Look for: context.payload_size_bytes

# If >10KB, investigate why session is so large
# Common culprit: Too much metadata stored
```

**Cause 3: Cold Start**
```bash
# First request after idle may be slower
# KV warms up after first use

# Not an issue if only affects 1st request
# If persistent, investigate further
```

### Resolution Steps
1. [ ] Check if widespread (>10% of requests) or isolated
2. [ ] If Cloudflare issue → Wait for resolution + notify users
3. [ ] If payload issue → Reduce session metadata size
4. [ ] If cold start → Expected behavior, ignore
5. [ ] Monitor for 1 hour to confirm resolution

**Recovery Time:** 15-30 minutes (or wait for Cloudflare)

---

## Issue #4: D1 Query Failures

### Symptoms
- Security event logging fails
- OAuth profile creation fails
- Logs show: `event="security_event.d1.insert.failure"` or `event="oauth.d1.insert.failure"`

### Quick Diagnosis (2 minutes)
```bash
# Check D1 errors in logs
level="ERROR" AND event LIKE "%.d1.%" AND timestamp > -1h

# Test D1 connectivity
wrangler d1 execute DB \
  --env production \
  --remote \
  --command "SELECT 1 as test;"

# If fails, D1 is down or misconfigured
```

### Common Causes & Fixes

**Cause 1: D1 Database Not Migrated**
```bash
# Check if migrations ran
wrangler d1 execute DB \
  --env production \
  --remote \
  --command "SELECT name FROM d1_migrations ORDER BY id;"

# If empty, run migrations
cd workers
npx wrangler d1 migrations apply DB --env production --remote
```

**Cause 2: Missing Index**
```bash
# Check if query is slow due to missing index
# In logs: context.duration_ms > 100 for SELECT queries

# List indexes
wrangler d1 execute DB \
  --env production \
  --remote \
  --command "SELECT name, sql FROM sqlite_master WHERE type='index';"

# Add missing index if needed
wrangler d1 execute DB \
  --env production \
  --remote \
  --command "CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);"
```

**Cause 3: Foreign Key Constraint Violation**
```bash
# Check error message in logs
# Example: "FOREIGN KEY constraint failed"

# This means trying to insert with invalid user_id
# Ensure user exists before creating related record
```

### Resolution Steps
1. [ ] Test D1 connectivity
2. [ ] If connection fails → Check Cloudflare status
3. [ ] If migrations missing → Run migrations
4. [ ] If constraint violation → Fix data integrity issue
5. [ ] Monitor for 30 minutes to confirm fix

**Recovery Time:** 10-30 minutes

---

## Issue #5: OAuth Profile Creation Fails

### Symptoms
- New LinkedIn signups fail
- Logs show: `event="oauth.profile.create.failure"`
- User stuck after LinkedIn OAuth redirect

### Quick Diagnosis (2 minutes)
```bash
# Check OAuth errors
event LIKE "oauth.%" AND level="ERROR" AND timestamp > -1h

# Check if user already exists (duplicate email)
wrangler d1 execute DB \
  --env production \
  --remote \
  --command "SELECT id, email FROM users WHERE email='[user-email]';"
```

### Common Causes & Fixes

**Cause 1: Duplicate User ID (Already Exists)**
```bash
# Error in logs: "UNIQUE constraint failed: users.id"

# This means Supabase Auth created user, but profile creation failed
# User exists in auth.users but not in D1 users table

# Fix: Use oauth-enrich endpoint instead of create
# Frontend should check /api/users/:id/exists first
```

**Cause 2: Invalid OAuth Data**
```typescript
// Check validation error in logs
// Example: "Invalid request body: email is required"

// Ensure LinkedIn provides all required fields:
{
  "user_id": "uuid from Supabase Auth",
  "email": "user@example.com",
  "first_name": "optional",
  "last_name": "optional",
  "photo_url": "optional",
  "linkedin_url": "optional"
}
```

**Cause 3: D1 Write Lock**
```bash
# Rare: D1 database locked during migration or maintenance

# Check logs for: "database is locked"
# Wait 30 seconds and retry
# If persists, contact Cloudflare support
```

### Resolution Steps
1. [ ] Check if user already exists in D1
2. [ ] If exists → Use enrich endpoint instead of create
3. [ ] If validation error → Fix frontend OAuth handler
4. [ ] If D1 lock → Wait and retry
5. [ ] Test complete OAuth flow end-to-end

**Recovery Time:** 10-20 minutes

---

## Issue #6: Session Not Expiring (TTL Not Working)

### Symptoms
- User has >20 active sessions
- Old sessions (>7 days) still visible
- KV namespace growing unexpectedly

### Quick Diagnosis (2 minutes)
```bash
# List sessions for user
wrangler kv:key list \
  --namespace-id "a7352191f17942f9a5e557be72671ea0" \
  --env production \
  --prefix "user:[user-id]:"

# Get specific session to check expiration
wrangler kv:key get \
  --namespace-id "a7352191f17942f9a5e557be72671ea0" \
  --env production \
  "user:[user-id]:[session-id]" | jq '.expires_at'
```

### Common Causes & Fixes

**Cause: TTL Not Set on KV Put**
```typescript
// Check session creation code
// WRONG: Missing expirationTtl
await c.env.SESSIONS.put(kvKey, JSON.stringify(sessionData));

// CORRECT: Always set TTL
await c.env.SESSIONS.put(
  kvKey,
  JSON.stringify(sessionData),
  { expirationTtl: 604800 } // 7 days in seconds
);
```

**Cause: TTL Not Refreshed on Update**
```typescript
// When updating session, must re-set TTL
await c.env.SESSIONS.put(
  kvKey,
  JSON.stringify(updatedSession),
  { expirationTtl: SESSION_TTL } // Refresh TTL
);
```

### Resolution Steps
1. [ ] Check session creation code for missing TTL
2. [ ] Check session update code for missing TTL refresh
3. [ ] Fix code and deploy
4. [ ] Manually delete old sessions (optional):
```bash
# Delete sessions older than 7 days
# (TTL will eventually clean them up automatically)
```

**Recovery Time:** 15 minutes (code fix) + 7 days (auto-cleanup)

---

## Emergency Rollback Procedure

**Use this if production is broken and needs immediate fix.**

### Step 1: Identify Issue (1 minute)
```bash
# Check what's broken
# In Cloudflare Dashboard Logs: level="ERROR" AND timestamp > -5m

# Determine severity:
# - Error rate >10% → CRITICAL, rollback immediately
# - Supabase violation → CRITICAL, rollback immediately
# - Slow performance → HIGH, investigate before rollback
```

### Step 2: Execute Rollback (2 minutes)
```bash
cd workers

# Rollback to previous deployment
npx wrangler rollback --env production --message "Emergency rollback: [REASON]"

# Verify rollback successful
curl https://jobmatch-ai-prod.carl-f-frank.workers.dev/health

# Should see previous deployment version
```

### Step 3: Notify Team (1 minute)
```bash
# Send Slack alert
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "text":"🚨 EMERGENCY ROLLBACK",
    "blocks":[
      {"type":"header","text":{"type":"plain_text","text":"🚨 Production Rollback Executed"}},
      {"type":"section","text":{"type":"mrkdwn","text":"*Reason:* [DESCRIBE ISSUE]"}},
      {"type":"section","text":{"type":"mrkdwn","text":"*Action:* Review logs and fix before re-deploying"}},
      {"type":"section","text":{"type":"mrkdwn","text":"*Status:* Previous version restored, users should be unaffected"}}
    ]
  }'
```

### Step 4: Post-Rollback Analysis (30 minutes)
- [ ] Review logs to understand root cause
- [ ] Fix issue in code
- [ ] Test fix in development
- [ ] Deploy to staging for verification
- [ ] Create incident report
- [ ] Schedule re-deployment with extra monitoring

---

## Monitoring Dashboard Access

### Cloudflare Dashboard
- **URL:** https://dash.cloudflare.com/
- **Navigate:** Workers & Pages → jobmatch-ai-[env] → Logs
- **Filters:** Use log query examples in this guide

### KV Namespace IDs
```
Development:  8b8cb591b4864e51a5e14c0d551e2d88
Staging:      4acc943274c349dd9a5ce7decf338dfd
Production:   a7352191f17942f9a5e557be72671ea0
```

### D1 Database IDs
```
Development:  8140efd5-9912-4e31-981d-0566f1efe9dc
Staging:      84b09169-503f-4e40-91c1-b3828272c2e3
Production:   06159734-6a06-4c4c-89f6-267e47cb8d30
```

---

## Log Query Reference

### Session Errors
```
event="session.create.failure" AND timestamp > -1h
event="session.update.failure" AND timestamp > -1h
event="session.revoke.failure" AND timestamp > -1h
```

### Security Event Errors
```
event="security_event.logged.failure" AND timestamp > -1h
event="security_event.query.failure" AND timestamp > -1h
```

### OAuth Errors
```
event="oauth.profile.create.failure" AND timestamp > -1h
event="oauth.profile.enrich.failure" AND timestamp > -1h
event="oauth.profile.check.failure" AND timestamp > -1h
```

### Performance Issues
```
event LIKE "%.success" AND context.duration_ms > 100
event="performance.budget.exceeded" AND timestamp > -1h
```

### Migration Violations
```
event="migration.violation.supabase_call"
```

---

## Escalation Matrix

| Error Rate | Latency p95 | Violations | Action |
|------------|-------------|------------|--------|
| <1% | <50ms | 0 | Monitor only |
| 1-5% | 50-100ms | 0 | Investigate |
| 5-10% | 100-200ms | 0 | Alert backend lead |
| >10% | >200ms | ANY | Page on-call + rollback |

---

**Last Updated:** 2026-01-03
**Owner:** DevOps Team
**Emergency Contact:** [ON-CALL SLACK CHANNEL]
