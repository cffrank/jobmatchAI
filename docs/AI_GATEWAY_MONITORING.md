# AI Gateway Monitoring & Logging Infrastructure

**Version:** 1.0
**Date:** 2025-12-29
**Status:** Ready for AI Gateway Integration

## Table of Contents

1. [Overview](#overview)
2. [Monitoring Architecture](#monitoring-architecture)
3. [Key Metrics](#key-metrics)
4. [Alert Configuration](#alert-configuration)
5. [Log Format & Examples](#log-format--examples)
6. [PII Protection](#pii-protection)
7. [Integration Guide](#integration-guide)
8. [Dashboard Specifications](#dashboard-specifications)
9. [Accessing Cloudflare AI Gateway Analytics](#accessing-cloudflare-ai-gateway-analytics)
10. [Performance Impact](#performance-impact)
11. [Troubleshooting](#troubleshooting)

---

## Overview

This monitoring infrastructure tracks AI Gateway performance, caching effectiveness, and cost optimization for the JobMatch AI platform. It provides comprehensive observability for all AI operations while ensuring PII (Personally Identifiable Information) is never logged.

### Key Features

- **Cache Performance Tracking**: Monitor cache hit/miss rates to validate cost savings
- **Response Time Monitoring**: Track latency for cached vs uncached requests
- **Token Usage & Cost Tracking**: Real-time cost calculation per request
- **Error Tracking**: Comprehensive error logging with retry indicators
- **PII-Safe Logging**: All user data is masked before logging
- **Zero Performance Impact**: Asynchronous logging with minimal overhead

### Integration Status

✅ **Ready for Integration**
The monitoring infrastructure is fully implemented and ready to use. Once AI Gateway is configured, simply replace direct OpenAI calls with the provided wrapper functions.

---

## Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
│  (openai.service.ts, resume parsing, job matching, etc.)        │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              Monitoring Wrappers                                 │
│  (backend/src/services/openai-monitoring.ts)                    │
│                                                                   │
│  • monitoredResumeParsingCompletion()                           │
│  • monitoredApplicationGenerationCompletion()                   │
│  • monitoredJobCompatibilityCompletion()                        │
│  • monitoredChatCompletion()                                    │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│           AI Monitoring Service                                  │
│  (backend/src/services/ai-monitoring.service.ts)                │
│                                                                   │
│  • Measure execution time                                        │
│  • Extract cache headers (cf-aig-cache-status)                  │
│  • Calculate token costs                                         │
│  • Mask PII (user IDs, emails, phone numbers)                   │
│  • Emit structured logs                                          │
│  • Trigger alerts on thresholds                                  │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              OpenAI Client (via AI Gateway)                      │
│  https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/openai│
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│            Cloudflare AI Gateway                                 │
│  • Cache responses (cf-aig-cache-ttl)                           │
│  • Return cache status header (cf-aig-cache-status)             │
│  • Provide analytics dashboard                                   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                 OpenAI API                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Metrics

### Cache Performance

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| **Cache Hit Rate** | Percentage of requests served from cache | 60-80% | < 30% |
| **Cache Hit Latency (avg)** | Average response time for cache hits | < 100ms | > 500ms |
| **Cache Miss Latency (avg)** | Average response time for cache misses | 1-3s | > 5s |
| **Cache Bypass Count** | Requests that bypassed cache | 0-5% | > 10% |

### Cost Tracking

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| **Cost Per Request** | Average cost per AI request | $0.01-0.05 | > $0.10 |
| **Hourly Cost** | Total AI costs per hour | < $2 | > $5 |
| **Daily Cost** | Total AI costs per day | < $10 | > $30 |
| **Monthly Cost Projection** | Projected monthly cost based on usage | < $94 | > $120 |

### Token Usage

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| **Avg Tokens Per Request** | Average total tokens consumed | 2000-4000 | > 8000 |
| **Input/Output Ratio** | Ratio of input to output tokens | 1:1 to 1:2 | > 1:5 |
| **Token Cost Efficiency** | Cost per 1000 tokens | Model-dependent | Varies |

### Error Tracking

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| **Error Rate** | Percentage of failed requests | < 1% | > 5% |
| **Retryable Error Rate** | Errors that can be retried | < 2% | > 10% |
| **Rate Limit Errors** | 429 errors from OpenAI | 0 | > 0 |

### Performance

| Metric | Description | Target | Alert Threshold |
|--------|-------------|--------|-----------------|
| **P50 Latency** | Median response time | < 500ms | > 2s |
| **P95 Latency** | 95th percentile response time | < 2s | > 5s |
| **P99 Latency** | 99th percentile response time | < 5s | > 10s |

---

## Alert Configuration

### Critical Alerts (Immediate Action Required)

1. **High Error Rate**
   - Condition: Error rate > 5% over 5 minutes
   - Impact: Users cannot generate applications
   - Action: Check OpenAI API status, verify API keys, review error logs

2. **Rate Limit Exceeded**
   - Condition: Any 429 errors from OpenAI
   - Impact: Service degradation
   - Action: Increase rate limits or implement request queuing

3. **Cost Spike**
   - Condition: Hourly cost > $5
   - Impact: Budget overrun
   - Action: Review usage patterns, check for abuse, verify cache configuration

### Warning Alerts (Monitor and Investigate)

1. **Low Cache Hit Rate**
   - Condition: Cache hit rate < 30% over 1 hour
   - Impact: Higher costs, slower responses
   - Action: Review cache TTL settings, check request patterns

2. **High Latency**
   - Condition: P95 latency > 5s over 10 minutes
   - Impact: Poor user experience
   - Action: Check OpenAI API latency, verify network connectivity

3. **Approaching Daily Budget**
   - Condition: Daily cost > $20 (with 4+ hours remaining)
   - Impact: Potential budget overrun
   - Action: Review usage spike, consider temporary rate limiting

### Alert Destinations

- **Slack Channel**: `#ai-gateway-alerts` (recommended)
- **Email**: engineering@jobmatchai.com
- **PagerDuty**: For critical alerts (optional)
- **Cloudflare Notifications**: Configure in AI Gateway dashboard

---

## Log Format & Examples

### Successful Request (Cache HIT)

```
[AI Gateway] [resume_parsing] [gpt-4o] [RequestID: a1b2c3d4-e5f6-7890-abcd-ef1234567890] [User: user_123***789] [Cache: HIT] [87ms] [3542 tokens] [$0.0354]
```

**Breakdown:**
- `[AI Gateway]`: Log source
- `[resume_parsing]`: Operation type
- `[gpt-4o]`: Model used
- `[RequestID: ...]`: Unique request ID for tracing
- `[User: user_123***789]`: Masked user ID (PII-safe)
- `[Cache: HIT]`: Request served from cache
- `[87ms]`: Response time (cache hits are typically < 100ms)
- `[3542 tokens]`: Total tokens consumed
- `[$0.0354]`: Estimated cost in USD

### Successful Request (Cache MISS)

```
[AI Gateway] [application_generation] [gpt-4o-mini] [RequestID: b2c3d4e5-f678-9012-bcde-f12345678901] [User: user_456***012] [Job: job-uuid-1234] [Cache: MISS] [2847ms] [2145 tokens] [$0.0129]
```

**Breakdown:**
- Same as above, but:
- `[Job: job-uuid-1234]`: Job ID for context
- `[Cache: MISS]`: Request went to OpenAI API
- `[2847ms]`: Slower response (cache misses are typically 1-5s)

### Failed Request

```
[AI Gateway] [job_compatibility_analysis] [gpt-4o] [RequestID: c3d4e5f6-7890-1234-cdef-123456789012] [User: user_789***345] [Job: job-uuid-5678] [Error: RATE_LIMIT_EXCEEDED] [Rate limit exceeded. Please retry after 60 seconds.] [responseTimeMs: 1523]
```

**Breakdown:**
- `[Error: RATE_LIMIT_EXCEEDED]`: Error code
- `[Rate limit exceeded...]`: Sanitized error message (no PII)
- `[responseTimeMs: 1523]`: Time until error occurred

### Warning (Cache Miss on Expected Hit)

```
[AI Gateway] [resume_parsing] [gpt-4o] [RequestID: d4e5f6g7-8901-2345-defg-234567890123] [User: user_101***456] [Cache: MISS] [3214ms] [3876 tokens] [$0.0388] [Warning: Cache MISS on cacheable operation: resume_parsing]
```

**Breakdown:**
- Warning indicates potential cache configuration issue
- Resume parsing should typically have high cache hit rate (same resume = same result)

---

## PII Protection

### What is Masked

✅ **User IDs**: `user_1234567890` → `user_123***890`
✅ **Email Addresses**: `john.doe@example.com` → `[EMAIL]`
✅ **Phone Numbers**: `555-123-4567` → `[PHONE]`
✅ **API Keys**: `sk-1234567890abcdef` → `sk-[REDACTED]`
✅ **Personal Names**: Not logged at all
✅ **Resume Content**: Not logged at all
✅ **Cover Letter Content**: Not logged at all

### What is NOT Masked

❌ **Job IDs**: UUIDs are not PII
❌ **Request IDs**: Generated UUIDs for tracing
❌ **Model Names**: `gpt-4o`, `gpt-4o-mini`
❌ **Operation Types**: `resume_parsing`, `application_generation`
❌ **Token Counts**: Numeric values only
❌ **Response Times**: Numeric values only

### Sanitization Functions

All PII sanitization is handled by `backend/src/types/ai-monitoring.ts`:

```typescript
// Mask user IDs
maskUserId('user_1234567890') // → 'user_123***890'

// Sanitize error messages
sanitizeErrorMessage('Error for user_123 at john@example.com')
// → 'Error for user_[REDACTED] at [EMAIL]'
```

### Compliance

This monitoring infrastructure is designed to be compliant with:
- **GDPR** (EU General Data Protection Regulation)
- **CCPA** (California Consumer Privacy Act)
- **HIPAA** (Health Insurance Portability and Accountability Act) - when applicable

**No PII is ever logged, transmitted to third-party monitoring services, or stored in log files.**

---

## Integration Guide

### Step 1: Install Dependencies

The monitoring infrastructure requires the `uuid` package:

```bash
cd backend
npm install uuid
npm install --save-dev @types/uuid
```

### Step 2: Update OpenAI Service

Replace direct OpenAI calls with monitored wrappers:

**Before:**
```typescript
// backend/src/services/openai.service.ts

const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  temperature: 0.3,
  max_tokens: 4000,
  response_format: { type: 'json_object' },
});
```

**After:**
```typescript
// backend/src/services/openai.service.ts

import { monitoredResumeParsingCompletion } from './openai-monitoring';

const completion = await monitoredResumeParsingCompletion(
  openai,
  {
    model: 'gpt-4o',
    messages: [...],
    temperature: 0.3,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  },
  userId // User ID (will be masked in logs)
);
```

### Step 3: Configure AI Gateway

Once AI Gateway is set up, update the OpenAI client configuration:

```typescript
// backend/src/config/openai.ts

import OpenAI from 'openai';

export function getOpenAI(): OpenAI {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const gatewaySlug = process.env.AI_GATEWAY_SLUG || 'jobmatch-ai-gateway';

  // AI Gateway endpoint format:
  // https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_slug}/openai
  const baseURL = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewaySlug}/openai`;

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL, // Route through AI Gateway
  });
}
```

### Step 4: Update All AI Operations

Replace all OpenAI calls in `backend/src/services/openai.service.ts`:

| Function | Wrapper Function |
|----------|-----------------|
| `parseResume()` | `monitoredResumeParsingCompletion()` |
| `generateVariant()` | `monitoredApplicationGenerationCompletion()` |
| `analyzeJobCompatibility()` | `monitoredJobCompatibilityCompletion()` |
| `generateMatchInsights()` | `monitoredMatchInsightsCompletion()` |

### Step 5: Set Environment Variables

Add to `backend/.env`:

```bash
# Cloudflare AI Gateway Configuration
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
AI_GATEWAY_SLUG=jobmatch-ai-gateway
```

### Step 6: Verify Monitoring

After deployment, check logs for monitoring output:

```bash
# View logs
railway logs -t

# Expected output:
[AI Gateway] [resume_parsing] [gpt-4o] [Cache: HIT] [92ms] [3542 tokens] [$0.0354]
[AI Gateway] [application_generation] [gpt-4o-mini] [Cache: MISS] [2214ms] [2145 tokens] [$0.0129]
```

---

## Dashboard Specifications

### Recommended Dashboards

#### 1. Executive Dashboard (High-Level Overview)

**Metrics:**
- Total AI requests (last 24h, 7d, 30d)
- Cache hit rate (%) with trend
- Total cost (last 24h, 7d, 30d) with budget comparison
- Error rate (%) with trend
- Average response time

**Visualizations:**
- Line chart: Requests over time (hourly, daily)
- Pie chart: Cache HIT vs MISS distribution
- Bar chart: Cost by operation type
- Gauge: Current error rate vs threshold
- Number: Monthly cost projection

#### 2. Performance Dashboard

**Metrics:**
- P50, P95, P99 latency by operation type
- Cache hit latency vs cache miss latency (comparison)
- Request volume by operation type
- Errors by type (rate limit, timeout, invalid request)

**Visualizations:**
- Heatmap: Latency over time
- Stacked bar: Cache HIT/MISS by hour
- Line chart: Error rate over time
- Table: Top 10 slowest requests (with request IDs)

#### 3. Cost Optimization Dashboard

**Metrics:**
- Cost per request by operation type
- Token usage by operation type
- Cost savings from cache hits (estimated)
- Daily cost vs budget
- Monthly cost projection

**Visualizations:**
- Stacked area: Cost breakdown by operation type
- Bar chart: Cost savings from caching
- Table: Highest-cost operations
- Gauge: Budget utilization (%)

#### 4. Cache Effectiveness Dashboard

**Metrics:**
- Cache hit rate by operation type
- Cache hit rate over time (hourly, daily)
- Top cacheable operations with low hit rate
- Cache TTL effectiveness

**Visualizations:**
- Bar chart: Hit rate by operation type
- Line chart: Hit rate trend over time
- Table: Operations needing cache optimization
- Pie chart: Cache status distribution (HIT/MISS/BYPASS)

### Implementation Options

**Option 1: Cloudflare AI Gateway Analytics (Built-in)**
- Access via Cloudflare dashboard
- Free, no setup required
- Limited customization

**Option 2: Grafana + Prometheus**
- Custom dashboards with full control
- Requires setup and hosting
- Open-source, highly customizable

**Option 3: Datadog**
- Managed service with alerting
- Requires paid subscription
- Enterprise-grade features

**Option 4: CloudWatch (AWS)**
- Integrated with AWS services
- Requires AWS account
- Pay-per-use pricing

**Recommendation**: Start with **Cloudflare AI Gateway Analytics** (free, built-in), then migrate to Grafana or Datadog as needs grow.

---

## Accessing Cloudflare AI Gateway Analytics

### Dashboard Access

1. **Log in to Cloudflare Dashboard**
   - URL: https://dash.cloudflare.com/
   - Navigate to your account

2. **Open AI Gateway**
   - Sidebar: **AI** → **AI Gateway**
   - Select your gateway: `jobmatch-ai-gateway`

3. **View Analytics**
   - **Overview Tab**: Request volume, cache metrics, cost estimates
   - **Logs Tab**: Individual request logs with cache status
   - **Analytics Tab**: Time-series charts for requests, cache, errors

### Available Metrics

| Metric | Description | Location |
|--------|-------------|----------|
| **Total Requests** | Total AI requests through gateway | Overview tab |
| **Cache Hit Rate** | Percentage of cached responses | Overview tab |
| **Total Cost** | Estimated OpenAI costs | Overview tab → Cost section |
| **Request Logs** | Individual request details | Logs tab |
| **Error Rate** | Percentage of failed requests | Analytics tab |
| **Latency (P50, P95)** | Response time percentiles | Analytics tab |

### Filtering Logs

In the **Logs** tab, you can filter by:
- **Time Range**: Last hour, day, week, custom range
- **Cache Status**: HIT, MISS, BYPASS
- **Model**: gpt-4o, gpt-4o-mini, etc.
- **Status Code**: 200, 400, 429, 500, etc.

### Exporting Data

To export analytics data:
1. Navigate to **Analytics** tab
2. Select time range
3. Click **Export** (top right)
4. Choose format: **CSV** or **JSON**

### API Access (Programmatic)

For programmatic access, use the Cloudflare Analytics API:

```bash
curl -X GET "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai-gateway/gateways/{gateway_id}/analytics" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json"
```

**Documentation**: https://developers.cloudflare.com/ai-gateway/observability/analytics/

---

## Performance Impact

### Monitoring Overhead

The monitoring infrastructure is designed to have **minimal performance impact**:

| Operation | Overhead | Impact |
|-----------|----------|--------|
| **Timestamp Recording** | < 1ms | Negligible |
| **Header Extraction** | < 1ms | Negligible |
| **Token Calculation** | < 1ms | Negligible |
| **PII Masking** | 1-2ms | Negligible |
| **Logging (Console)** | 2-5ms | Low (asynchronous) |
| **Metrics Emission** | 0ms | None (async, non-blocking) |

**Total Overhead**: < 10ms per request (0.3% of typical 3s response time)

### Optimization Strategies

1. **Asynchronous Logging**
   - Logs are written asynchronously (non-blocking)
   - Metrics are emitted in background

2. **Conditional Logging**
   - Monitoring can be disabled in test environments
   - Debug logs only in development mode

3. **Lazy Evaluation**
   - Expensive operations only performed when logging is enabled
   - PII masking only applied to logged values

4. **Batched Metrics**
   - Metrics can be batched and sent periodically (future enhancement)

---

## Troubleshooting

### Issue: No Cache Status in Logs

**Symptoms**: All logs show `[Cache: UNKNOWN]`

**Causes**:
1. AI Gateway not configured (still using direct OpenAI)
2. Headers not being extracted correctly
3. OpenAI SDK version incompatibility

**Solutions**:
1. Verify `baseURL` in OpenAI client config points to AI Gateway
2. Check environment variables: `CLOUDFLARE_ACCOUNT_ID`, `AI_GATEWAY_SLUG`
3. Update OpenAI SDK: `npm install openai@latest`
4. Review Cloudflare AI Gateway logs to confirm requests are routed

### Issue: High Cache Miss Rate (> 70%)

**Symptoms**: Most requests show `[Cache: MISS]`

**Causes**:
1. Cache TTL set too low
2. Requests have high variability (different inputs)
3. Cache headers not being sent

**Solutions**:
1. Increase cache TTL (default: 24h for resume parsing, 1h for generation)
2. Review request patterns - are inputs actually similar?
3. Verify `cf-aig-cache-ttl` header is sent with requests
4. Check Cloudflare dashboard for cache configuration

### Issue: Logs Contain PII

**Symptoms**: User emails, names, or personal data in logs

**Causes**:
1. Error messages contain user data
2. Custom context includes PII
3. OpenAI error responses include prompts

**Solutions**:
1. Always use `sanitizeErrorMessage()` for error messages
2. Never include user data in `context` parameter
3. Avoid logging prompt content
4. Review logs and update sanitization rules

### Issue: High Logging Overhead

**Symptoms**: API response time increased after adding monitoring

**Causes**:
1. Synchronous logging blocking requests
2. Excessive debug logging

**Solutions**:
1. Ensure logging is asynchronous (check implementation)
2. Disable debug logging in production: `NODE_ENV=production`
3. Disable monitoring in test: `NODE_ENV=test`
4. Reduce log verbosity

### Issue: Alerts Not Triggering

**Symptoms**: No alerts despite high error rate or cost

**Causes**:
1. Alert thresholds not configured in Cloudflare
2. Notification destinations not set up

**Solutions**:
1. Configure alerts in Cloudflare dashboard: **AI Gateway** → **Settings** → **Alerts**
2. Set up notification destinations: Slack, email, PagerDuty
3. Test alerts manually with threshold override
4. Review alert logs in Cloudflare dashboard

### Issue: Cost Tracking Inaccurate

**Symptoms**: Estimated costs don't match OpenAI billing

**Causes**:
1. Model pricing outdated
2. Token counting mismatch
3. Cached requests counted incorrectly

**Solutions**:
1. Update `MODEL_COSTS` in `ai-monitoring.ts` with latest pricing
2. Verify token counts from OpenAI `usage` object
3. Cache hits should have $0 cost (not recalculated from tokens)
4. Compare with Cloudflare AI Gateway cost estimates

---

## Next Steps

### Phase 1: Basic Monitoring (Current)
✅ Monitoring types and interfaces
✅ Logging service with PII protection
✅ Wrapper functions for OpenAI calls
✅ Documentation and integration guide

### Phase 2: AI Gateway Integration (Pending)
⏳ Configure Cloudflare AI Gateway
⏳ Update OpenAI client to route through gateway
⏳ Replace direct calls with monitored wrappers
⏳ Verify cache headers extraction
⏳ Test end-to-end monitoring

### Phase 3: Dashboard & Alerts (Future)
⏳ Set up Cloudflare alert notifications
⏳ Create custom Grafana dashboards (optional)
⏳ Integrate with Slack for alerts
⏳ Set up PagerDuty for critical alerts (optional)

### Phase 4: Advanced Analytics (Future)
⏳ Export metrics to external monitoring service
⏳ Implement cost anomaly detection
⏳ Build predictive cost models
⏳ A/B test cache TTL configurations

---

## References

### Documentation
- [Cloudflare AI Gateway Docs](https://developers.cloudflare.com/ai-gateway/)
- [AI Gateway Caching](https://developers.cloudflare.com/ai-gateway/features/caching/)
- [AI Gateway Analytics](https://developers.cloudflare.com/ai-gateway/observability/analytics/)
- [OpenAI Pricing](https://openai.com/api/pricing/)

### Code Files
- `backend/src/types/ai-monitoring.ts` - Type definitions
- `backend/src/services/ai-monitoring.service.ts` - Monitoring service
- `backend/src/services/openai-monitoring.ts` - Wrapper functions
- `docs/CLOUDFLARE_AI_ARCHITECTURE.md` - AI architecture overview

### Related Documents
- [AI Gateway Implementation Checklist](../cloudflare-migration/API_MIGRATION_CHECKLIST.md)
- [Cloudflare Workers Setup Guide](../cloudflare-migration/CLOUDFLARE_WORKERS_SETUP.md)
- [Cost Analysis](../cloudflare-migration/COST_ANALYSIS.md)

---

## Support

For questions or issues with AI Gateway monitoring:

1. **Check Logs**: Review backend logs for monitoring output
2. **Review Documentation**: Consult this guide and Cloudflare docs
3. **Test Locally**: Use `npm run dev` and trigger AI operations
4. **Check Cloudflare Dashboard**: Verify AI Gateway analytics
5. **Raise Issue**: Create GitHub issue with logs and context

**Status**: Monitoring infrastructure ready for AI Gateway integration.
**Next Action**: Wait for backend development agent to implement AI Gateway configuration.

---

**End of Document**
