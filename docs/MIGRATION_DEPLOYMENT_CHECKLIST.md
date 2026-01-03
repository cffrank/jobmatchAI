# Migration Deployment Checklist

**Phases 1-3: Sessions, Security Events, OAuth**
**Date:** 2026-01-03
**Target Deployment:** Development → Staging → Production

---

## Pre-Deployment: Code Preparation

### Observability Implementation
- [ ] **Structured logging implemented** in all 3 route files
  - `workers/api/routes/sessions.ts`
  - `workers/api/routes/security-events.ts`
  - `workers/api/routes/oauth.ts`
- [ ] **Request correlation IDs** added to middleware
- [ ] **Supabase violation detector** enabled in development
- [ ] **Performance budgets** configured (KV <15ms, D1 <50ms)
- [ ] **Slack webhook** configured for alerts (`SLACK_WEBHOOK_URL` secret)

### Testing
- [ ] **Unit tests pass** for all new routes
- [ ] **E2E tests pass** with network monitoring
- [ ] **Manual test**: Create session → verify in KV
- [ ] **Manual test**: Log security event → verify in D1
- [ ] **Manual test**: Create OAuth profile → verify in D1
- [ ] **No Supabase violations** in development testing

### Documentation
- [ ] **Observability guide** reviewed by team
- [ ] **Rollback procedure** documented
- [ ] **On-call engineer** assigned for deployment
- [ ] **Incident response runbook** ready

---

## Deployment: Development Environment

### Deploy
```bash
cd workers
npx wrangler deploy --env development
```

### Immediate Verification (15 minutes)
- [ ] **Health check passes**: `GET https://jobmatch-ai-dev.carl-f-frank.workers.dev/health`
- [ ] **No deployment errors** in Cloudflare Dashboard
- [ ] **Logs show structured JSON** (not plain console.log)
- [ ] **Request correlation IDs** present in logs

### Functional Tests (30 minutes)
Test each endpoint manually:

**Sessions:**
- [ ] `POST /api/sessions` → Creates session in KV
- [ ] `PATCH /api/sessions/:id` → Updates last_active
- [ ] `GET /api/sessions` → Lists user sessions
- [ ] `DELETE /api/sessions/:id` → Deletes session from KV
- [ ] `GET /api/users/:id/2fa-settings` → Returns 2FA status

**Security Events:**
- [ ] `POST /api/security-events` → Logs event to D1
- [ ] `GET /api/security-events` → Returns user's events

**OAuth:**
- [ ] `GET /api/users/:id/exists` → Checks user existence
- [ ] `POST /api/users/oauth-profile` → Creates profile
- [ ] `PATCH /api/users/:id/oauth-enrich` → Enriches profile

### Monitoring (1 hour)
- [ ] **No errors** in Cloudflare Logs
- [ ] **No Supabase violations** detected
- [ ] **KV latency <15ms** (check logs for `duration_ms`)
- [ ] **D1 latency <50ms** (check logs for `duration_ms`)
- [ ] **Session TTL working** (verify old sessions auto-expire after 7 days)

**Log Queries:**
```
# Check for errors
level="ERROR" AND timestamp > -1h

# Check for violations
event="migration.violation.supabase_call"

# Check performance
event LIKE "%.success" AND context.duration_ms > 100
```

---

## Deployment: Staging Environment

### Deploy
```bash
cd workers
npx wrangler deploy --env staging
```

### Verification (Same as Development)
- [ ] Health check passes
- [ ] Functional tests pass
- [ ] No errors in logs
- [ ] No Supabase violations
- [ ] Performance within budget

### Extended Testing (2 hours)
- [ ] **Load test**: 100 concurrent session creations
- [ ] **OAuth flow test**: Complete LinkedIn login
- [ ] **Session expiry test**: Verify TTL auto-cleanup
- [ ] **Security audit**: No sensitive data in logs

---

## Deployment: Production Environment

### Pre-Deployment Meeting (15 minutes)
- [ ] **Team standup**: Review deployment plan
- [ ] **On-call confirmed**: Engineer ready for rollback
- [ ] **Rollback tested**: Confirm `wrangler rollback` works
- [ ] **Monitoring setup**: Cloudflare Dashboard open, Slack alerts active

### Deploy
```bash
cd workers
npx wrangler deploy --env production
```

### Hour 0-1: Critical Monitoring

**Immediate Checks (5 minutes):**
- [ ] **Deployment successful** (no errors in GitHub Actions)
- [ ] **Health check passes**: `GET https://jobmatch-ai-prod.carl-f-frank.workers.dev/health`
- [ ] **No errors** in Cloudflare Logs (last 5 minutes)
- [ ] **No Supabase violations**

**Functional Smoke Tests (15 minutes):**
- [ ] User can login (session created)
- [ ] User can logout (session deleted)
- [ ] Security events logged
- [ ] OAuth signup works

**Active Monitoring (60 minutes):**
- [ ] **Error rate <1%** across all endpoints
- [ ] **No Supabase violations** detected
- [ ] **KV latency p95 <15ms**
- [ ] **D1 latency p95 <50ms**
- [ ] **No user complaints** in support channels

**Key Metrics:**
```
# Error rate (should be <1%)
level="ERROR" AND timestamp > -1h | stats count()

# Supabase violations (should be 0)
event="migration.violation.supabase_call" | stats count()

# Slow operations (should be rare)
event LIKE "%.success" AND context.duration_ms > 100 | stats count()
```

### Hour 1-4: Ongoing Monitoring

**Check every 30 minutes:**
- [ ] Error logs (no new errors)
- [ ] Performance metrics (latency stable)
- [ ] User feedback (no complaints)
- [ ] Support tickets (no session/login issues)

### Hour 4-24: Passive Monitoring

**Check every 4 hours:**
- [ ] Daily error summary
- [ ] Performance trends
- [ ] Any anomalies

**End of Day Summary:**
- [ ] **Total errors**: _____ (target: <10)
- [ ] **Error rate**: _____% (target: <0.5%)
- [ ] **Supabase violations**: _____ (target: 0)
- [ ] **Average KV latency**: _____ms (target: <10ms)
- [ ] **Average D1 latency**: _____ms (target: <30ms)
- [ ] **User complaints**: _____ (target: 0)

---

## Post-Deployment: Week 1 Monitoring

### Daily Review (15 minutes)
- [ ] **Review error logs** (any patterns?)
- [ ] **Check Supabase violations** (should be 0)
- [ ] **Verify session creation rate** (>99% success)
- [ ] **Verify OAuth profile creation** (>95% success)
- [ ] **Check performance trends** (improving or degrading?)

### Weekly Analysis (30 minutes)
- [ ] **Total sessions created**: _____
- [ ] **Total security events logged**: _____
- [ ] **Total OAuth profiles created**: _____
- [ ] **Error rate**: _____% (target: <0.5%)
- [ ] **Average KV latency**: _____ms (target: <10ms)
- [ ] **Average D1 latency**: _____ms (target: <30ms)

---

## Rollback Criteria

**Trigger immediate rollback if ANY of these occur:**

1. **Error rate >5%** for any endpoint
2. **Any Supabase violation** detected in production
3. **Session creation failures >10%** (users can't login)
4. **OAuth profile creation failures >20%** (new signups broken)
5. **KV latency >100ms p95** (10x performance regression)
6. **D1 query errors >10%**
7. **Multiple user complaints** about session/login issues

### Rollback Procedure

**Emergency Rollback (5 minutes):**
```bash
# 1. Rollback Workers deployment
cd workers
npx wrangler rollback --env production --message "Reverting migration due to [REASON]"

# 2. Verify rollback successful
curl https://jobmatch-ai-prod.carl-f-frank.workers.dev/health

# 3. Notify team
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "text":"🚨 EMERGENCY ROLLBACK: Workers migration reverted to previous version",
    "blocks":[
      {"type":"section","text":{"type":"mrkdwn","text":"*Reason:* [DESCRIBE ISSUE]"}},
      {"type":"section","text":{"type":"mrkdwn","text":"*Action:* Review logs and fix before re-deploying"}}
    ]
  }'
```

**Post-Rollback:**
- [ ] Investigate root cause in logs
- [ ] Fix issue in code
- [ ] Test fix in development
- [ ] Re-deploy to staging
- [ ] Re-deploy to production (with extra monitoring)

---

## Success Criteria

**Migration is complete when:**
- ✅ **7 days with zero rollbacks**
- ✅ **7 days with zero Supabase violations**
- ✅ **Session creation success rate >99.5%**
- ✅ **OAuth profile creation success rate >98%**
- ✅ **KV latency p95 <15ms** (3x faster than PostgreSQL)
- ✅ **D1 latency p95 <50ms** (2x faster than PostgreSQL)
- ✅ **Error rate <1%**
- ✅ **Zero user complaints** about sessions/login

---

## Deployment Timeline

**Recommended schedule:**

| Day | Environment | Duration | Notes |
|-----|-------------|----------|-------|
| Day 1 | Development | 2 hours | Test all endpoints, monitor logs |
| Day 2 | Staging | 4 hours | Load testing, OAuth flow testing |
| Day 3 | Production | 24 hours | Active monitoring first day |
| Day 4-7 | Production | Daily checks | Passive monitoring |
| Day 8-14 | Production | Weekly review | Trend analysis |

**Total deployment time: 2 weeks** (1 week active monitoring + 1 week validation)

---

## Key Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| On-call engineer | [NAME] | [SLACK/PHONE] | 24/7 during deployment |
| Backend lead | [NAME] | [SLACK/PHONE] | Business hours |
| DevOps | [NAME] | [SLACK/PHONE] | Backup support |

---

## Quick Reference: Log Queries

**Find errors:**
```
level="ERROR" AND timestamp > -1h
```

**Find Supabase violations:**
```
event="migration.violation.supabase_call"
```

**Find slow operations:**
```
event LIKE "%.success" AND context.duration_ms > 100
```

**Session creation errors:**
```
event="session.create.failure" AND timestamp > -1h
```

**OAuth profile creation errors:**
```
event="oauth.profile.create.failure" AND timestamp > -1h
```

---

## Quick Reference: KV/D1 Commands

**List sessions for user:**
```bash
wrangler kv:key list \
  --namespace-id "a7352191f17942f9a5e557be72671ea0" \
  --env production \
  --prefix "user:[user-id]:"
```

**Query security events:**
```bash
wrangler d1 execute DB \
  --env production \
  --remote \
  --command "SELECT * FROM security_events WHERE user_id='[user-id]' ORDER BY timestamp DESC LIMIT 20;"
```

**Check OAuth profile:**
```bash
wrangler d1 execute DB \
  --env production \
  --remote \
  --command "SELECT id, email, first_name, last_name FROM users WHERE id='[user-id]';"
```

---

**Last Updated:** 2026-01-03
**Owner:** DevOps Team
**Next Review:** After production deployment
