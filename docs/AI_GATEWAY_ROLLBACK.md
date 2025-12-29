# AI Gateway Rollback Procedures

**Purpose:** Emergency rollback procedures for Cloudflare AI Gateway
**Rollback Time:** < 5 minutes
**Risk Level:** Low (automatic fallback to direct OpenAI API)

## Table of Contents
- [When to Rollback](#when-to-rollback)
- [Quick Rollback (5 Minutes)](#quick-rollback-5-minutes)
- [Verification Steps](#verification-steps)
- [Post-Rollback Actions](#post-rollback-actions)
- [Rollback Scenarios](#rollback-scenarios)
- [Re-Deployment After Rollback](#re-deployment-after-rollback)

---

## When to Rollback

### Critical Issues (Immediate Rollback)

Execute rollback immediately if you observe any of these:

1. **Error Rate Spike**
   - Error rate increases > 5% above baseline
   - Multiple 500 errors from AI endpoints
   - OpenAI timeout errors increasing

2. **Complete Service Failure**
   - AI Gateway returning consistent errors
   - All AI features non-functional
   - Users unable to generate resumes or analyze jobs

3. **Data Integrity Issues**
   - Incorrect AI responses (e.g., wrong job matching)
   - Cache serving responses for wrong users (privacy breach)
   - Corrupted resume generation

4. **Performance Degradation**
   - Response times increase > 50%
   - P95 latency > 30 seconds
   - User complaints about slowness

5. **Cost Anomaly**
   - Unexpected cost increase (despite caching)
   - OpenAI usage spiking instead of decreasing
   - Cloudflare billing showing unexpected charges

### Warning Signs (Monitor, Consider Rollback)

These issues may not require immediate rollback but warrant close monitoring:

1. **Cache Not Working**
   - Cache hit rate < 10% after 24 hours
   - No cost savings observed
   - Not necessarily broken, just not effective

2. **Intermittent Errors**
   - Occasional AI Gateway timeouts (< 1% error rate)
   - Isolated cache misses
   - Single user reports of issues

3. **Minor Performance Impact**
   - Response time increase < 20%
   - Acceptable but not optimal
   - Consider optimization before rollback

---

## Quick Rollback (5 Minutes)

### Rollback Checklist

Before executing rollback:
- [ ] Confirm critical issue justifies rollback
- [ ] Notify team in Slack/email: "Rolling back AI Gateway in [environment]"
- [ ] Open Cloudflare dashboard for monitoring
- [ ] Open terminal for wrangler commands

### Step 1: Disable AI Gateway Secrets (2 minutes)

**Production Rollback:**
```bash
cd /home/carl/application-tracking/jobmatch-ai/workers

# Delete AI Gateway secrets
wrangler secret delete AI_GATEWAY_SLUG --env production
wrangler secret delete CLOUDFLARE_ACCOUNT_ID --env production

# Confirm deletion
wrangler secret list --env production
# Should NOT show AI_GATEWAY_SLUG or CLOUDFLARE_ACCOUNT_ID
```

**Staging Rollback:**
```bash
wrangler secret delete AI_GATEWAY_SLUG --env staging
wrangler secret delete CLOUDFLARE_ACCOUNT_ID --env staging
```

**Development Rollback:**
```bash
wrangler secret delete AI_GATEWAY_SLUG --env development
wrangler secret delete CLOUDFLARE_ACCOUNT_ID --env development
```

### Step 2: Deploy Worker (1 minute)

```bash
# Deploy to production (or staging/development)
wrangler deploy --env production

# Worker will automatically fallback to direct OpenAI API
# No code changes required - built-in fallback logic
```

**Expected Output:**
```
✔ Deployed to production
✔ Published to jobmatch-ai-prod.carl-f-frank.workers.dev
```

### Step 3: Verify Rollback (2 minutes)

**Check Logs:**
```bash
# Tail production logs
wrangler tail --env production

# Look for fallback confirmation:
# [OpenAI] Using direct OpenAI API (AI Gateway not configured)

# You should see this instead of:
# [OpenAI] Using Cloudflare AI Gateway: jobmatch-ai-gateway
```

**Test AI Endpoints:**
```bash
# Health check
curl https://jobmatch-ai-prod.carl-f-frank.workers.dev/health

# Test AI generation (requires auth token)
curl -X POST https://jobmatch-ai-prod.carl-f-frank.workers.dev/api/applications/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "test-job-id"}'

# Should succeed and bypass AI Gateway
```

### Total Time: ~5 minutes

---

## Verification Steps

### 1. Confirm Direct OpenAI API Usage

**Worker Logs:**
```bash
wrangler tail --env production | grep -i "openai"

# Expected output (after rollback):
# [OpenAI] Using direct OpenAI API (AI Gateway not configured)

# NOT this (before rollback):
# [OpenAI] Using Cloudflare AI Gateway: jobmatch-ai-gateway
```

### 2. Verify Error Rate Normalized

**Cloudflare Dashboard:**
- Navigate to: Workers & Pages → jobmatch-ai-prod → Metrics
- Check: Error rate should return to baseline (< 0.1%)
- Compare: Before rollback vs after rollback

**Application Monitoring:**
- Check support tickets for AI-related issues
- Monitor user feedback channels
- Verify internal test users can generate resumes

### 3. Verify Response Times

**Cloudflare Analytics:**
- Check P50, P95, P99 latency
- Should return to pre-AI-Gateway levels
- May be slightly slower (no cache benefit)

**Manual Testing:**
```bash
# Time a request
time curl -X POST https://jobmatch-ai-prod.carl-f-frank.workers.dev/api/applications/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "test-job-id"}'

# Should complete in < 20 seconds
```

### 4. Check OpenAI Dashboard

- Navigate to: [platform.openai.com/usage](https://platform.openai.com/usage)
- Verify: API calls are being processed directly
- Check: No unusual error rate spikes

### 5. User Impact Assessment

**Within 10 minutes of rollback:**
- [ ] Test all AI features manually
- [ ] Check for user error reports
- [ ] Verify resume generation works
- [ ] Verify job matching works
- [ ] Verify resume parsing works

**Within 1 hour of rollback:**
- [ ] Review support tickets
- [ ] Monitor error tracking (Sentry, etc.)
- [ ] Check social media for complaints
- [ ] Confirm team members can use app

---

## Post-Rollback Actions

### Immediate Actions (Within 1 Hour)

1. **Team Communication**
   ```
   Subject: AI Gateway Rolled Back in [Environment]

   Team,

   AI Gateway has been rolled back at [TIME] due to [ISSUE].

   Status:
   - Rollback completed: [TIME]
   - Service restored: [TIME]
   - Users impacted: [NUMBER or "None"]

   Current state:
   - Using direct OpenAI API
   - All AI features functional
   - Error rate: [PERCENTAGE]

   Next steps:
   - Root cause analysis
   - Fix implementation
   - Re-deploy when ready

   On-call engineer: [NAME]
   ```

2. **Incident Documentation**
   - Create post-mortem document
   - Log exact issue observed
   - Capture error logs and metrics
   - Document timeline of events

3. **Monitoring Intensification**
   - Monitor error rate every 15 minutes for next 2 hours
   - Watch OpenAI API usage
   - Track user feedback
   - Keep wrangler tail running

### Within 24 Hours

1. **Root Cause Analysis**
   - Identify exact cause of rollback
   - Review AI Gateway configuration
   - Check Cloudflare status page for incidents
   - Analyze error logs for patterns

2. **Fix Implementation**
   - Address root cause
   - Test fix in development environment
   - Validate fix in staging
   - Document changes made

3. **Stakeholder Update**
   ```
   Subject: AI Gateway Rollback - Root Cause Identified

   Team,

   Root cause: [DESCRIPTION]

   Impact:
   - Duration: [TIME]
   - Users affected: [NUMBER]
   - Cost impact: [if any]

   Fix:
   - [Description of fix]
   - Tested in: Development ✓, Staging ✓

   Timeline for re-deployment:
   - Development: [DATE]
   - Staging: [DATE]
   - Production: [DATE] (pending approval)
   ```

### Within 1 Week

1. **Lessons Learned**
   - Document what went wrong
   - Update rollback procedures if needed
   - Improve monitoring and alerts
   - Share knowledge with team

2. **Re-Deployment Plan**
   - See [Re-Deployment After Rollback](#re-deployment-after-rollback)
   - More conservative rollout
   - Enhanced monitoring
   - Smaller time windows

---

## Rollback Scenarios

### Scenario 1: AI Gateway Service Outage

**Symptoms:**
- All AI requests failing
- 502/503 errors from gateway.ai.cloudflare.com
- Error: "Unable to connect to AI Gateway"

**Rollback:**
```bash
# Quick rollback
wrangler secret delete AI_GATEWAY_SLUG --env production
wrangler secret delete CLOUDFLARE_ACCOUNT_ID --env production
wrangler deploy --env production

# Worker automatically falls back to OpenAI
```

**Why it works:**
- Code includes automatic fallback logic
- `createOpenAI()` checks for AI Gateway config
- Falls back to direct API if secrets missing

**Prevention:**
- Monitor Cloudflare status: status.cloudflare.com
- Set up Cloudflare status webhooks
- Implement health checks for AI Gateway

### Scenario 2: Cache Serving Wrong Data

**Symptoms:**
- Users reporting incorrect resume content
- Job matches showing for wrong jobs
- Data privacy concerns

**Immediate Actions:**
```bash
# 1. Rollback immediately (privacy issue)
wrangler secret delete AI_GATEWAY_SLUG --env production
wrangler secret delete CLOUDFLARE_ACCOUNT_ID --env production
wrangler deploy --env production

# 2. Clear AI Gateway cache (via Cloudflare dashboard)
# Navigate to: AI → AI Gateway → jobmatch-ai-gateway
# Click: "Purge Cache"

# 3. Investigate cache keys
# Ensure prompts are unique per user/job combination
```

**Root Cause Investigation:**
- Review prompt construction
- Check if user IDs are in prompts
- Verify cache isolation
- Test with multiple users

**Prevention:**
- Include unique identifiers in prompts
- Test cache isolation before deployment
- Monitor for cache anomalies

### Scenario 3: Performance Degradation

**Symptoms:**
- Response times 2-3x slower than before
- P95 latency > 30 seconds
- Users complaining about slowness

**Diagnosis First (Before Rollback):**
```bash
# Check if it's actually AI Gateway
wrangler tail --env production | grep -E "(OpenAI|latency)"

# Compare with direct OpenAI
# Temporarily test direct API in development
```

**If AI Gateway is the cause:**
```bash
# Rollback production
wrangler secret delete AI_GATEWAY_SLUG --env production
wrangler secret delete CLOUDFLARE_ACCOUNT_ID --env production
wrangler deploy --env production
```

**Root Cause Investigation:**
- Check AI Gateway region (should be close to OpenAI)
- Review cache TTL settings
- Check for network routing issues
- Compare latency: cached vs uncached requests

**Prevention:**
- Load test before production
- Monitor P95/P99 latency closely
- Set latency alerts in Cloudflare

### Scenario 4: Cost Increase Instead of Savings

**Symptoms:**
- OpenAI costs increasing instead of decreasing
- Cache hit rate very low (< 10%)
- More API calls than expected

**Diagnosis:**
```bash
# Check cache hit rate
# Cloudflare Dashboard → AI → AI Gateway → Analytics

# Check if prompts are being cached
wrangler tail --env production | grep "cache"
```

**Rollback Decision:**
- **Don't rollback immediately** (no user impact)
- Monitor for 48-72 hours
- If costs exceed budget, then rollback

**Optimization Before Rollback:**
- Review prompt templates (ensure consistent formatting)
- Check for unnecessary prompt variations
- Increase cache TTL
- Reduce prompt uniqueness

**Rollback Only If:**
- Costs exceed budget significantly
- Optimization attempts fail
- No path to positive ROI

---

## Monitoring During Rollback

### Real-Time Monitoring

**Terminal 1: Worker Logs**
```bash
wrangler tail --env production
```

**Terminal 2: Error Tracking**
```bash
wrangler tail --env production | grep -i error
```

**Terminal 3: Health Checks**
```bash
watch -n 30 'curl -s https://jobmatch-ai-prod.carl-f-frank.workers.dev/health | jq'
```

### Dashboard Monitoring

**Cloudflare:**
1. Workers & Pages → jobmatch-ai-prod → Metrics
   - Request rate
   - Error rate
   - Response time

2. AI → AI Gateway → jobmatch-ai-gateway
   - Request volume (should drop to zero after rollback)
   - Cache hit rate (N/A after rollback)

**OpenAI:**
1. [platform.openai.com/usage](https://platform.openai.com/usage)
   - API call volume (should return to pre-gateway levels)
   - Error rate (should normalize)

### Alert Thresholds

Set up alerts for:
- Error rate > 1% (warning)
- Error rate > 5% (critical)
- Response time P95 > 20s (warning)
- Response time P95 > 30s (critical)
- OpenAI cost spike > 20% above baseline

---

## Re-Deployment After Rollback

### Pre-Deployment Checklist

Before re-deploying AI Gateway after a rollback:

- [ ] Root cause fully understood and documented
- [ ] Fix implemented and tested in development
- [ ] Fix validated in staging for 48+ hours
- [ ] Monitoring and alerts improved
- [ ] Team trained on new rollback procedures
- [ ] Stakeholders informed of re-deployment plan

### Conservative Re-Deployment Plan

**Phase 1: Development (24 hours)**
```bash
# Re-deploy to development with fixes
./scripts/deploy-ai-gateway.sh development

# Monitor for 24 hours
# Validate fix works
```

**Phase 2: Staging (72 hours)**
```bash
# Re-deploy to staging
./scripts/deploy-ai-gateway.sh staging

# Extended monitoring: 72 hours (vs 48 hours originally)
# More aggressive testing
# Load testing to replicate production
```

**Phase 3: Production (Gradual, 14 days)**
```bash
# Re-deploy to production
./scripts/deploy-ai-gateway.sh production

# Monitoring schedule:
# - Hour 1-4: Every 15 minutes
# - Hour 4-24: Every hour
# - Day 2-7: Every 4 hours
# - Day 8-14: Daily

# Slower rollback trigger (more tolerant)
# Full 2-week validation before declaring success
```

### Communication Template

```
Subject: AI Gateway Re-Deployment - [Date]

Team,

After rollback on [DATE] due to [ISSUE], we are re-deploying AI Gateway.

Previous Issue:
- [Description of issue]
- Impact: [Description]

Fix Applied:
- [Description of fix]
- Tested in: Development ✓, Staging ✓
- Validation period: [DAYS]

Re-Deployment Schedule:
- Development: [DATE] - 24h monitoring
- Staging: [DATE] - 72h monitoring
- Production: [DATE] - 14d monitoring

Enhanced Monitoring:
- More frequent checks
- Lower error tolerance
- Faster rollback trigger

Rollback Plan:
- Same < 5 minute rollback procedure
- On-call engineer: [NAME]
- 24/7 monitoring for first week

Questions? Reply to this thread.
```

---

## Emergency Contacts

### On-Call Escalation

**During Rollback:**
1. DevOps Lead: [Contact]
2. Backend Lead: [Contact]
3. CTO: [Contact] (if critical production issue)

### External Support

**Cloudflare Support:**
- Enterprise Support: [If you have it]
- Community Forum: https://community.cloudflare.com
- Status Page: https://www.cloudflarestatus.com

**OpenAI Support:**
- Support Email: support@openai.com
- Status Page: https://status.openai.com

---

## Rollback Testing

### Quarterly Rollback Drills

Practice rollback procedure every quarter:

**Test Schedule:**
- Q1: Development rollback drill
- Q2: Staging rollback drill
- Q3: Production rollback drill (during low-traffic window)
- Q4: Full cross-environment rollback drill

**Drill Procedure:**
1. Schedule drill with team (announce as drill)
2. Execute rollback as if real incident
3. Time the rollback (target: < 5 minutes)
4. Verify all verification steps
5. Document any issues
6. Update procedures as needed

**Drill Metrics:**
- Time to complete rollback
- Time to verify service restored
- Accuracy of procedures
- Team readiness

---

## Related Documentation

- [AI Gateway Rollout Plan](./AI_GATEWAY_ROLLOUT_PLAN.md) - Deployment procedures
- [Environment Mapping](./ENVIRONMENT_MAPPING.md) - Environment configuration
- [Cloudflare Workers Setup](./cloudflare-migration/CLOUDFLARE_WORKERS_SETUP.md) - Technical details

---

## Changelog

**v1.0** - Initial rollback procedures created for Phase 1 AI Gateway deployment

---

**Remember:** Rollback is a success, not a failure. It's better to rollback and investigate than to leave users with a broken experience. The < 5 minute rollback time ensures minimal user impact.
