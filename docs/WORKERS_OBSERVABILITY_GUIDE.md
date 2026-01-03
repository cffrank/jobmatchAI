# Workers Observability Guide

**Document Version:** 1.0
**Date:** 2026-01-03
**Scope:** Monitoring and observability for newly migrated Cloudflare Workers endpoints

---

## Executive Summary

This guide provides comprehensive observability recommendations for the newly migrated Workers API endpoints (Phases 1-3). These endpoints handle critical security functions (sessions, security events, OAuth profile sync) and require robust monitoring to ensure migration success and catch issues before they impact users.

**New Endpoints Covered:**
- **Phase 1 - Sessions (KV):** 5 endpoints
- **Phase 2 - Security Events (D1):** 2 endpoints
- **Phase 3 - OAuth (D1):** 3 endpoints

**Monitoring Maturity:** Currently **Level 1 (Basic)** → Target: **Level 3 (Proactive)**

---

## 1. Current Observability Assessment

### What Exists ✅

**1.1 Basic Logging (console.*)**
- ✅ Error logging in all new routes (`console.error()`)
- ✅ Auth middleware logs successful authentication
- ✅ Request logging via Hono's `logger()` middleware
- ⚠️ **Limitation:** Basic console logs only, no structured metadata

**Example from sessions.ts:**
```typescript
console.error('Error creating/updating session:', error);
```

**1.2 Global Error Handler**
- ✅ Centralized error handler in `middleware/errorHandler.ts`
- ✅ Logs error context (method, path, userId)
- ✅ Includes stack traces in development
- ⚠️ **Limitation:** No error severity levels, no alerting integration

**1.3 Existing Monitoring Infrastructure**
- ✅ GitHub Actions cost monitoring workflow (daily at 9 AM UTC)
- ✅ Health check endpoint (`/health`)
- ✅ Slack notifications for deployments (success/failure)
- ✅ Post-deployment E2E tests

**1.4 Analytics Endpoint**
- ✅ `/api/analytics/workers-ai` provides monitoring guidance
- ⚠️ **Limitation:** Documentation only, not real-time metrics

### What's Missing ❌

**1.5 No Structured Logging**
- No event types or severity levels
- No correlation IDs for tracing requests
- No contextual metadata (user_id, session_id, operation)

**1.6 No Real-Time Metrics**
- No error rate tracking
- No latency monitoring (p50, p95, p99)
- No KV/D1 performance metrics
- No Supabase violation detection

**1.7 No Proactive Alerting**
- No alerts for error spikes
- No alerts for Supabase fallback violations
- No alert integration (PagerDuty, Opsgenie, Slack webhooks)

**1.8 No Business Metrics**
- No tracking of session creation success/failure rates
- No OAuth profile creation tracking
- No security event logging volume

---

## 2. Recommended Monitoring Strategy

### 2.1 Three-Tier Approach

**Tier 1: Structured Logging (Immediate - 2 hours)**
Emit structured JSON logs for all critical operations:
- Event type classification
- Request correlation IDs
- Contextual metadata (user_id, session_id)
- Operation timing

**Tier 2: Metrics Collection (Week 1 - 4 hours)**
Track key performance indicators:
- RED metrics (Rate, Errors, Duration)
- KV/D1 operation latency
- Supabase violation detection
- Business KPIs

**Tier 3: Proactive Alerting (Week 2 - 3 hours)**
Configure alerts for:
- Error rate thresholds
- Latency degradation
- Migration violations (Supabase calls)
- Deployment health checks

### 2.2 Critical Metrics to Track

#### 2.2.1 Session Management Metrics

**Success/Failure Rates:**
- `session.create.success` - Session created in KV
- `session.create.failure` - Session creation failed
- `session.update.success` - Last activity updated
- `session.update.failure` - Update failed
- `session.revoke.success` - Session deleted
- `session.revoke.failure` - Revoke failed

**Performance:**
- `session.kv.put.duration_ms` - Time to write to KV (target: <10ms)
- `session.kv.get.duration_ms` - Time to read from KV (target: <5ms)
- `session.kv.list.duration_ms` - Time to list sessions (target: <20ms)
- `session.kv.delete.duration_ms` - Time to delete (target: <10ms)

**Business Metrics:**
- `session.active.count` - Number of active sessions
- `session.ttl.automatic_expiration` - Sessions expired via KV TTL
- `session.concurrent.per_user` - Avg concurrent sessions

#### 2.2.2 Security Events Metrics

**Logging Volume:**
- `security_event.logged.success` - Event written to D1
- `security_event.logged.failure` - Write failed
- `security_event.query.success` - Events retrieved
- `security_event.query.failure` - Query failed

**Performance:**
- `security_event.d1.insert.duration_ms` - Time to insert (target: <30ms)
- `security_event.d1.select.duration_ms` - Time to query (target: <50ms)

**Event Type Distribution:**
- `security_event.type.login` - Login events logged
- `security_event.type.logout` - Logout events
- `security_event.type.session_revoke` - Session revocations
- `security_event.type.failed_login` - Failed attempts

#### 2.2.3 OAuth Profile Sync Metrics

**Profile Operations:**
- `oauth.profile.check.success` - User existence check succeeded
- `oauth.profile.check.failure` - Check failed
- `oauth.profile.create.success` - New profile created
- `oauth.profile.create.failure` - Creation failed
- `oauth.profile.enrich.success` - Profile enriched with OAuth data
- `oauth.profile.enrich.failure` - Enrichment failed
- `oauth.profile.enrich.skipped` - No fields to update

**Performance:**
- `oauth.d1.select.duration_ms` - Time to check user (target: <20ms)
- `oauth.d1.insert.duration_ms` - Time to create profile (target: <40ms)
- `oauth.d1.update.duration_ms` - Time to enrich (target: <30ms)

**LinkedIn OAuth Funnel:**
- `oauth.linkedin.initiated` - OAuth flow started
- `oauth.linkedin.profile_created` - First-time signup
- `oauth.linkedin.profile_enriched` - Existing user enriched
- `oauth.linkedin.error` - OAuth flow failed

#### 2.2.4 Migration Health Metrics

**Supabase Violation Detection:**
- `migration.violation.supabase_call` - Direct Supabase query detected
- `migration.violation.route` - Which route made the violation
- `migration.violation.table` - Which table was accessed

**Storage Layer Verification:**
- `migration.sessions.kv_used` - Confirmed KV usage
- `migration.sessions.postgres_used` - VIOLATION: PostgreSQL used
- `migration.security_events.d1_used` - Confirmed D1 usage
- `migration.oauth.d1_used` - Confirmed D1 usage

---

## 3. Implementation Guide

### 3.1 Structured Logging Implementation

**Add to `workers/api/lib/logger.ts` (NEW FILE):**

```typescript
/**
 * Structured logging utilities for Cloudflare Workers
 *
 * Provides standardized logging with:
 * - Event types and severity levels
 * - Request correlation IDs
 * - Contextual metadata
 * - Performance timing
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  operation?: string;
  duration_ms?: number;
  [key: string]: unknown;
}

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  event: string;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Log a structured event
 */
export function logEvent(
  level: LogLevel,
  event: string,
  message: string,
  context: LogContext = {},
  error?: Error
): void {
  const log: StructuredLog = {
    timestamp: new Date().toISOString(),
    level,
    event,
    message,
    context,
  };

  if (error) {
    log.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  // Output as JSON for Cloudflare Logs ingestion
  console.log(JSON.stringify(log));
}

/**
 * Helper: Log successful operation
 */
export function logSuccess(event: string, message: string, context: LogContext = {}): void {
  logEvent('INFO', event, message, context);
}

/**
 * Helper: Log operation failure
 */
export function logFailure(event: string, message: string, context: LogContext, error?: Error): void {
  logEvent('ERROR', event, message, context, error);
}

/**
 * Helper: Measure and log operation duration
 */
export function measureOperation<T>(
  event: string,
  operation: string,
  fn: () => Promise<T>,
  context: LogContext = {}
): Promise<T> {
  const startTime = Date.now();

  return fn()
    .then((result) => {
      const duration_ms = Date.now() - startTime;
      logSuccess(`${event}.success`, `${operation} completed`, {
        ...context,
        duration_ms,
      });
      return result;
    })
    .catch((error) => {
      const duration_ms = Date.now() - startTime;
      logFailure(`${event}.failure`, `${operation} failed`, {
        ...context,
        duration_ms,
      }, error);
      throw error;
    });
}
```

**Update `workers/api/routes/sessions.ts` to use structured logging:**

```typescript
import { logSuccess, logFailure, measureOperation } from '../lib/logger';

// Before:
console.error('Error creating/updating session:', error);

// After:
logFailure(
  'session.create.failure',
  'Failed to create/update session in KV',
  {
    userId,
    sessionId: session_id,
    operation: 'kv.put',
  },
  error as Error
);

// Measure KV operation performance:
await measureOperation(
  'session.kv.put',
  'Store session in KV',
  () => c.env.SESSIONS.put(kvKey, JSON.stringify(sessionData), { expirationTtl: SESSION_TTL }),
  { userId, sessionId: session_id }
);
```

**Similarly update `security-events.ts` and `oauth.ts`.**

### 3.2 Add Request Correlation IDs

**Update `workers/api/index.ts` to add correlation middleware:**

```typescript
import { v4 as uuidv4 } from 'uuid'; // Add to package.json

// After logger middleware, before routes
app.use('*', async (c, next) => {
  // Generate request ID
  const requestId = c.req.header('X-Request-ID') || uuidv4();
  c.set('requestId', requestId);

  // Log request start
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    event: 'http.request.start',
    message: `${c.req.method} ${c.req.path}`,
    context: {
      requestId,
      method: c.req.method,
      path: c.req.path,
      userId: c.get('userId'), // May not be set yet
    },
  }));

  const startTime = Date.now();
  await next();
  const duration_ms = Date.now() - startTime;

  // Log request completion
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'INFO',
    event: 'http.request.complete',
    message: `${c.req.method} ${c.req.path} completed`,
    context: {
      requestId,
      method: c.req.method,
      path: c.req.path,
      userId: c.get('userId'),
      status: c.res.status,
      duration_ms,
    },
  }));
});
```

**Update types in `workers/api/types.ts`:**

```typescript
export interface Variables {
  userId?: string;
  userEmail?: string;
  requestId?: string; // Add this
}
```

### 3.3 Migration Violation Detection

**Add to `workers/api/middleware/supabaseViolationDetector.ts` (NEW FILE):**

```typescript
/**
 * Supabase Violation Detector
 *
 * Monitors network requests to detect direct Supabase PostgreSQL calls.
 * During migration, all database operations should go through D1/KV, not Supabase.
 *
 * This middleware logs violations for alerting and debugging.
 */

import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../types';
import { logFailure } from '../lib/logger';

export const detectSupabaseViolations: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (c, next) => {
  // Intercept fetch globally (if Supabase client is used in routes)
  const originalFetch = global.fetch;

  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();

    // Check if this is a Supabase REST API call (database violation)
    if (url.includes('supabase.co/rest/v1/')) {
      const path = new URL(url).pathname;
      const table = path.split('/rest/v1/')[1]?.split('?')[0];

      // Log violation
      logFailure(
        'migration.violation.supabase_call',
        `VIOLATION: Direct Supabase database call detected`,
        {
          requestId: c.get('requestId'),
          userId: c.get('userId'),
          route: c.req.path,
          violation_url: url,
          violation_table: table,
          violation_method: init?.method || 'GET',
          environment: c.env.ENVIRONMENT,
        }
      );

      // In development, throw error to fail fast
      if (c.env.ENVIRONMENT === 'development') {
        throw new Error(`Migration violation: Direct Supabase call to ${table} table. Use D1/KV instead.`);
      }
    }

    return originalFetch(input, init);
  };

  await next();

  // Restore original fetch
  global.fetch = originalFetch;
};
```

**Add to `workers/api/index.ts`:**

```typescript
import { detectSupabaseViolations } from './middleware/supabaseViolationDetector';

// Apply to new migrated routes only
app.use('/api/sessions/*', detectSupabaseViolations);
app.use('/api/security-events/*', detectSupabaseViolations);
app.use('/api/users/*', detectSupabaseViolations);
```

### 3.4 Performance Monitoring

**Add performance budgets to routes:**

```typescript
// In sessions.ts
const PERFORMANCE_BUDGETS = {
  KV_PUT: 15, // ms
  KV_GET: 10, // ms
  KV_LIST: 30, // ms
  KV_DELETE: 15, // ms
};

async function performanceCheck(operation: string, duration_ms: number, budget: number, context: LogContext): void {
  if (duration_ms > budget) {
    logFailure(
      'performance.budget.exceeded',
      `${operation} exceeded performance budget`,
      {
        ...context,
        duration_ms,
        budget_ms: budget,
        overage_ms: duration_ms - budget,
      }
    );
  }
}

// Example usage:
const startTime = Date.now();
await c.env.SESSIONS.put(kvKey, JSON.stringify(sessionData), { expirationTtl: SESSION_TTL });
const duration_ms = Date.now() - startTime;

await performanceCheck('session.kv.put', duration_ms, PERFORMANCE_BUDGETS.KV_PUT, {
  userId,
  sessionId: session_id,
});
```

---

## 4. Deployment Monitoring Checklist

### 4.1 Pre-Deployment Checks

Before deploying the migrated endpoints to production:

- [ ] **Structured logging implemented** in all 3 route files
- [ ] **Request correlation IDs** added to all requests
- [ ] **Supabase violation detector** enabled in development
- [ ] **Performance budgets** configured for KV/D1 operations
- [ ] **Error context** includes userId, sessionId, requestId
- [ ] **Unit tests pass** for new routes
- [ ] **E2E tests pass** with network monitoring

### 4.2 Deployment Day Monitoring

**Hour 0-1 (Immediate):**
- [ ] Monitor deployment logs for errors
- [ ] Check health endpoint: `GET /health`
- [ ] Verify no Supabase violation logs
- [ ] Test one manual session creation/deletion
- [ ] Test one manual security event logging
- [ ] Test one manual OAuth profile creation

**Hour 1-4 (Active Monitoring):**
- [ ] Monitor error rates in Cloudflare Logs
- [ ] Check KV operation latency (target: <10ms avg)
- [ ] Check D1 query latency (target: <50ms avg)
- [ ] Verify session TTL auto-expiration works
- [ ] Monitor user-reported issues (support tickets, Slack)

**Day 1-7 (Ongoing):**
- [ ] Daily review of error logs
- [ ] Daily check of performance metrics
- [ ] Daily verification: No Supabase violations
- [ ] Monitor session creation success rate (target: >99%)
- [ ] Monitor OAuth profile creation success rate (target: >95%)

### 4.3 Rollback Criteria

**Trigger immediate rollback if:**
1. **Error rate >5%** for any endpoint
2. **Any Supabase violation detected** in production (indicates code still using PostgreSQL)
3. **Session creation failures >10%** (users can't login)
4. **OAuth profile creation failures >20%** (new signups broken)
5. **KV latency >100ms p95** (performance regression)
6. **D1 query errors >10%** (database unavailable)

**Rollback procedure:**
```bash
# Emergency rollback to previous Workers deployment
cd workers
npx wrangler rollback --env production --message "Reverting migration due to [reason]"

# Notify team
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text":"🚨 EMERGENCY ROLLBACK: Workers migration reverted to previous version"}'
```

---

## 5. Accessing Logs for Troubleshooting

### 5.1 Cloudflare Dashboard Logs

**Real-Time Logs:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **jobmatch-ai-[env]**
3. Click **Logs** tab
4. Use filters:
   - `event="session.create.failure"` - Session creation errors
   - `event="security_event.logged.failure"` - Security event logging errors
   - `event="oauth.profile.create.failure"` - OAuth profile creation errors
   - `event="migration.violation.supabase_call"` - Supabase violations
   - `level="ERROR"` - All errors
   - `userId="[user-id]"` - User-specific issues

**Time Range:**
- Last 5 minutes → Real-time troubleshooting
- Last 1 hour → Deployment monitoring
- Last 24 hours → Daily health check
- Last 7 days → Weekly trend analysis

### 5.2 Logpush for Long-Term Storage

**Setup (Optional - for production):**
```bash
# Configure Logpush to send logs to R2 for long-term storage
wrangler logpush create \
  --name "jobmatch-ai-production-logs" \
  --destination-conf "r2://jobmatch-ai-prod-logs/workers-logs/{DATE}/{HOUR}/{MINUTE}" \
  --dataset workers_trace_events \
  --filter '{"where":{"key":"environment","operator":"eq","value":"production"}}'
```

**Benefits:**
- 30+ day log retention
- SQL queries for analysis
- Compliance and audit trail
- Cost-effective ($0.10 per 1M log entries)

### 5.3 Querying D1 for Debugging

**Check security events for a user:**
```bash
# Development
wrangler d1 execute DB \
  --env development \
  --remote \
  --command "SELECT * FROM security_events WHERE user_id = '[user-id]' ORDER BY timestamp DESC LIMIT 20;"

# Production (be careful!)
wrangler d1 execute DB \
  --env production \
  --remote \
  --command "SELECT * FROM security_events WHERE user_id = '[user-id]' ORDER BY timestamp DESC LIMIT 20;"
```

**Check if OAuth profile exists:**
```bash
wrangler d1 execute DB \
  --env development \
  --remote \
  --command "SELECT id, email, first_name, last_name, linkedin_url, created_at FROM users WHERE id = '[user-id]';"
```

**Count security events by type (last 24 hours):**
```bash
wrangler d1 execute DB \
  --env production \
  --remote \
  --command "
    SELECT
      action,
      status,
      COUNT(*) as count
    FROM security_events
    WHERE timestamp > datetime('now', '-1 day')
    GROUP BY action, status
    ORDER BY count DESC;
  "
```

### 5.4 Inspecting KV Storage

**List all sessions for a user:**
```bash
# Get KV keys with user prefix
wrangler kv:key list \
  --namespace-id "a7352191f17942f9a5e557be72671ea0" \
  --env production \
  --prefix "user:[user-id]:"
```

**Get specific session:**
```bash
wrangler kv:key get \
  --namespace-id "a7352191f17942f9a5e557be72671ea0" \
  --env production \
  "user:[user-id]:[session-id]"
```

**Delete stuck session (emergency):**
```bash
wrangler kv:key delete \
  --namespace-id "a7352191f17942f9a5e557be72671ea0" \
  --env production \
  "user:[user-id]:[session-id]"
```

---

## 6. Alert Configuration

### 6.1 Slack Webhook Alerts (Immediate - 1 hour)

**Add to `workers/api/lib/alerts.ts` (NEW FILE):**

```typescript
/**
 * Alert notifications via Slack webhook
 */

export interface Alert {
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  context?: Record<string, unknown>;
}

export async function sendSlackAlert(alert: Alert, webhookUrl: string): Promise<void> {
  const emoji = alert.severity === 'CRITICAL' ? '🚨' : alert.severity === 'WARNING' ? '⚠️' : 'ℹ️';

  const payload = {
    text: `${emoji} ${alert.title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${alert.title}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: alert.message,
        },
      },
    ],
  };

  if (alert.context) {
    payload.blocks.push({
      type: 'section',
      fields: Object.entries(alert.context).map(([key, value]) => ({
        type: 'mrkdwn',
        text: `*${key}:*\n\`${value}\``,
      })),
    } as any);
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
```

**Example usage in routes:**

```typescript
import { sendSlackAlert } from '../lib/alerts';

// In error handler:
if (errorCount > threshold && c.env.SLACK_WEBHOOK_URL) {
  await sendSlackAlert({
    severity: 'CRITICAL',
    title: 'Session Creation Failure Spike',
    message: `Session creation errors exceeded threshold: ${errorCount} failures in last 5 minutes`,
    context: {
      environment: c.env.ENVIRONMENT,
      route: '/api/sessions',
      error_count: errorCount,
      threshold: threshold,
    },
  }, c.env.SLACK_WEBHOOK_URL);
}
```

### 6.2 Cloudflare Workers Analytics Engine (Week 2 - 2 hours)

**Setup analytics binding in `wrangler.toml`:**

```toml
[[analytics_engine_datasets]]
binding = "ANALYTICS"
```

**Track custom metrics:**

```typescript
// In session creation handler
c.env.ANALYTICS.writeDataPoint({
  indexes: [userId],
  blobs: ['session.create'],
  doubles: [duration_ms],
});

// In error handler
c.env.ANALYTICS.writeDataPoint({
  indexes: [userId],
  blobs: ['session.create.error', errorType],
  doubles: [1], // count
});
```

**Query via GraphQL API:**

```graphql
query {
  viewer {
    accounts(filter: { accountTag: "280c58ea17d9fe3235c33bd0a52a256b" }) {
      analyticsEngineDatasets(filter: { limit: 100 }) {
        nodes {
          dataPoints(
            filter: {
              blob1: "session.create.error"
              startDate: "2026-01-03T00:00:00Z"
              endDate: "2026-01-03T23:59:59Z"
            }
          ) {
            count
          }
        }
      }
    }
  }
}
```

### 6.3 Recommended Alert Thresholds

**Critical Alerts (PagerDuty / Immediate Notification):**

| Metric | Threshold | Action |
|--------|-----------|--------|
| Session creation error rate | >5% over 5 min | Page on-call engineer |
| OAuth profile creation error rate | >10% over 5 min | Page on-call engineer |
| Supabase violation detected | ANY in production | Page on-call + rollback |
| D1 query failures | >20% over 5 min | Page on-call engineer |
| KV operation failures | >10% over 5 min | Page on-call engineer |

**Warning Alerts (Slack / Email):**

| Metric | Threshold | Action |
|--------|-----------|--------|
| Session creation latency p95 | >50ms | Investigate performance |
| D1 query latency p95 | >100ms | Check D1 health |
| Security event logging backlog | >1000 events/min | Review logging volume |
| OAuth profile enrichment skip rate | >50% | Review OAuth data quality |

**Info Alerts (Daily Digest):**

| Metric | Threshold | Action |
|--------|-----------|--------|
| Total sessions created | N/A | Track growth |
| Security events logged | N/A | Track activity |
| OAuth profiles created | N/A | Track new signups |
| Average KV latency | N/A | Track trends |

---

## 7. Post-Deployment Validation

### 7.1 Week 1 Monitoring Tasks

**Daily (15 minutes):**
- [ ] Review error logs in Cloudflare Dashboard
- [ ] Check no Supabase violations
- [ ] Verify session creation success rate >99%
- [ ] Verify OAuth profile creation success rate >95%
- [ ] Check KV/D1 latency within budget

**Weekly (30 minutes):**
- [ ] Analyze error trends (are errors increasing/decreasing?)
- [ ] Review performance metrics (p50, p95, p99 latencies)
- [ ] Check security event logging volume (any spikes?)
- [ ] Validate session TTL auto-expiration working
- [ ] Review any user-reported issues related to sessions/login

### 7.2 Success Metrics

**Migration is successful when:**
- ✅ **Zero Supabase violations** for 7 consecutive days
- ✅ **Session creation success rate >99.5%** over 7 days
- ✅ **OAuth profile creation success rate >98%** over 7 days
- ✅ **KV latency p95 <15ms** (5x faster than PostgreSQL)
- ✅ **D1 query latency p95 <50ms** (2x faster than PostgreSQL)
- ✅ **Zero rollbacks** required
- ✅ **No user complaints** about session/login issues
- ✅ **Error rate <1%** across all new endpoints

### 7.3 Performance Benchmarks

**Target Latencies (p95):**

| Operation | PostgreSQL (Before) | Cloudflare (After) | Improvement |
|-----------|---------------------|---------------------|-------------|
| Session create | 50ms | <15ms | **3.3x faster** |
| Session query | 30ms | <10ms | **3x faster** |
| Session delete | 40ms | <10ms | **4x faster** |
| Security event insert | 60ms | <30ms | **2x faster** |
| Security event query | 80ms | <50ms | **1.6x faster** |
| OAuth profile check | 40ms | <20ms | **2x faster** |
| OAuth profile create | 70ms | <40ms | **1.75x faster** |

**Cost Savings:**
- KV operations: Included in Workers plan (was ~$0.0001 per read in PostgreSQL)
- D1 operations: Included in Workers plan (was ~$0.0003 per query in PostgreSQL)
- Estimated monthly savings: **$5-10** on database operations

---

## 8. Observability Gaps to Address

### 8.1 Before Production Deployment

**HIGH PRIORITY:**
1. [ ] **Implement structured logging** (2 hours)
   - Add `workers/api/lib/logger.ts`
   - Update all 3 route files to use structured logs
   - Add request correlation IDs

2. [ ] **Enable Supabase violation detection** (1 hour)
   - Add `middleware/supabaseViolationDetector.ts`
   - Apply to migrated routes
   - Test in development (should throw error if violation detected)

3. [ ] **Configure performance budgets** (1 hour)
   - Add performance checks to all KV/D1 operations
   - Log when budgets exceeded
   - Alert on repeated violations

**MEDIUM PRIORITY:**
4. [ ] **Set up Slack alerts** (1 hour)
   - Add SLACK_WEBHOOK_URL to Workers secrets
   - Implement alert thresholds
   - Test alert notifications

5. [ ] **Add business metrics tracking** (2 hours)
   - Track session creation funnel
   - Track OAuth profile creation funnel
   - Track security event volume

**LOW PRIORITY:**
6. [ ] **Enable Workers Analytics Engine** (2 hours)
   - Add analytics binding to wrangler.toml
   - Emit custom metrics
   - Build GraphQL queries

7. [ ] **Configure Logpush** (1 hour)
   - Set up R2 bucket for logs
   - Configure Logpush destination
   - Verify log ingestion

### 8.2 After Production Deployment

**Week 2-3:**
8. [ ] **Build monitoring dashboard** (4 hours)
   - Create Grafana/Datadog dashboard
   - Add error rate charts
   - Add latency distribution charts
   - Add business metrics charts

9. [ ] **Document incident response** (2 hours)
   - Create runbook for common issues
   - Document rollback procedure
   - Create escalation paths

10. [ ] **Set up synthetic monitoring** (2 hours)
    - Create health check cron job
    - Test session creation every 5 minutes
    - Alert if health check fails

---

## 9. Common Troubleshooting Scenarios

### 9.1 Session Creation Failures

**Symptoms:**
- Users can't login
- Error: "Failed to create/update session"
- Logs show: `event="session.create.failure"`

**Diagnosis:**
```bash
# Check KV namespace status
wrangler kv:key list --namespace-id "a7352191f17942f9a5e557be72671ea0" --env production

# Check recent errors
# In Cloudflare Dashboard Logs: event="session.create.failure" AND timestamp > -1h
```

**Common Causes:**
1. **KV namespace full** (unlikely, 1GB limit)
2. **KV write timeout** (network issue)
3. **Invalid session data** (validation error)
4. **Auth token expired** (JWT validation failure)

**Resolution:**
```typescript
// Add retry logic to KV writes
async function putWithRetry(kv: KVNamespace, key: string, value: string, options: any, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await kv.put(key, value, options);
      return;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
    }
  }
}
```

### 9.2 Supabase Violation Detected

**Symptoms:**
- Logs show: `event="migration.violation.supabase_call"`
- Development environment throws error

**Diagnosis:**
```bash
# Search logs for violations
# In Cloudflare Dashboard: event="migration.violation.supabase_call"
```

**Common Causes:**
1. **Route still imports Supabase client** (code not migrated)
2. **Shared utility function uses Supabase** (indirect usage)
3. **Middleware accidentally uses Supabase** (auth middleware issue)

**Resolution:**
1. Identify violating route from logs (`context.route`)
2. Search codebase: `grep -r "createSupabaseAdmin\|createSupabaseClient" workers/api/routes/[route].ts`
3. Replace Supabase queries with D1/KV equivalents
4. Re-test in development
5. Re-deploy

### 9.3 High Latency on D1 Queries

**Symptoms:**
- Security event logging slow (>100ms)
- OAuth profile creation slow (>100ms)
- Logs show: `event="performance.budget.exceeded"`

**Diagnosis:**
```bash
# Query recent slow operations
# In Cloudflare Dashboard: event="performance.budget.exceeded" AND duration_ms > 100
```

**Common Causes:**
1. **Missing index** on user_id column
2. **Large table scan** (no WHERE clause)
3. **D1 cold start** (first query after idle)
4. **Complex JOIN** (not optimized)

**Resolution:**
```sql
-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_security_events_user_timestamp
  ON security_events(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email);

-- Verify indexes exist
SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='security_events';
```

### 9.4 Session TTL Not Expiring

**Symptoms:**
- Old sessions still visible
- User has >20 active sessions
- KV namespace growing unexpectedly

**Diagnosis:**
```bash
# List sessions for user (should see old sessions expired)
wrangler kv:key list \
  --namespace-id "a7352191f17942f9a5e557be72671ea0" \
  --env production \
  --prefix "user:[user-id]:"

# Check session data
wrangler kv:key get \
  --namespace-id "a7352191f17942f9a5e557be72671ea0" \
  --env production \
  "user:[user-id]:[session-id]"
```

**Common Causes:**
1. **TTL not set** on KV put (missing `expirationTtl` option)
2. **TTL set incorrectly** (e.g., set to timestamp instead of seconds)
3. **Session updated without refreshing TTL** (bug in PATCH handler)

**Resolution:**
```typescript
// Ensure TTL is always set
await c.env.SESSIONS.put(
  kvKey,
  JSON.stringify(sessionData),
  { expirationTtl: 604800 } // CRITICAL: Always set TTL
);

// When updating session, refresh TTL
await c.env.SESSIONS.put(
  kvKey,
  JSON.stringify(updatedSession),
  { expirationTtl: SESSION_TTL } // Re-set TTL to refresh expiration
);
```

---

## 10. Summary & Next Steps

### 10.1 Current State

**Observability Maturity: Level 1 (Basic)**
- ✅ Basic console logging
- ✅ Global error handler
- ✅ Health check endpoint
- ❌ No structured logging
- ❌ No real-time metrics
- ❌ No proactive alerting

### 10.2 Recommended Path to Level 3 (Proactive)

**Week 1 (6 hours total):**
1. Implement structured logging (2 hours)
2. Add request correlation IDs (1 hour)
3. Enable Supabase violation detection (1 hour)
4. Configure performance budgets (1 hour)
5. Set up Slack alerts (1 hour)

**Week 2 (5 hours total):**
6. Deploy to development → test → staging → production (2 hours)
7. Monitor deployment with checklist (2 hours)
8. Document incident response runbooks (1 hour)

**Week 3 (4 hours total):**
9. Enable Workers Analytics Engine (2 hours)
10. Build monitoring dashboard (2 hours)

**Total Effort: 15 hours** over 3 weeks

### 10.3 Immediate Action Items

**Before deploying to production:**
1. [ ] Review this document with team
2. [ ] Implement structured logging in all 3 route files
3. [ ] Add Supabase violation detector middleware
4. [ ] Configure Slack webhook for alerts
5. [ ] Test logging in development environment
6. [ ] Validate logs appear in Cloudflare Dashboard
7. [ ] Create deployment monitoring checklist
8. [ ] Schedule on-call rotation for deployment day

**Deployment day:**
1. [ ] Deploy to development → monitor for 1 hour
2. [ ] Deploy to staging → monitor for 4 hours
3. [ ] Deploy to production → monitor for 24 hours
4. [ ] Keep rollback plan ready (1-click revert)
5. [ ] Watch error rates, latency, violations

**Post-deployment:**
1. [ ] Daily log review for 7 days
2. [ ] Weekly metrics analysis
3. [ ] Document any issues encountered
4. [ ] Iterate on alert thresholds
5. [ ] Plan observability improvements (Analytics Engine, dashboards)

---

## Appendix A: Log Query Examples

**Find all errors in last hour:**
```
level="ERROR" AND timestamp > -1h
```

**Find session creation failures for specific user:**
```
event="session.create.failure" AND context.userId="[user-id]"
```

**Find Supabase violations:**
```
event="migration.violation.supabase_call"
```

**Find slow operations (>100ms):**
```
event LIKE "%.success" AND context.duration_ms > 100
```

**Find OAuth profile creation funnel:**
```
event IN ("oauth.profile.check.success", "oauth.profile.create.success", "oauth.profile.enrich.success")
```

**Count errors by event type:**
```
level="ERROR" | stats count() by event
```

---

## Appendix B: Performance Budget Reference

| Operation | Budget (ms) | Percentile | Alert Threshold |
|-----------|-------------|------------|-----------------|
| KV PUT | 15 | p95 | >20ms for 5 min |
| KV GET | 10 | p95 | >15ms for 5 min |
| KV LIST | 30 | p95 | >50ms for 5 min |
| KV DELETE | 15 | p95 | >20ms for 5 min |
| D1 INSERT | 30 | p95 | >50ms for 5 min |
| D1 SELECT | 50 | p95 | >100ms for 5 min |
| D1 UPDATE | 40 | p95 | >80ms for 5 min |
| Total request | 200 | p95 | >500ms for 5 min |

---

## Appendix C: Useful Links

**Cloudflare Documentation:**
- [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/)
- [Workers Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Logpush](https://developers.cloudflare.com/logs/get-started/enable-destinations/)
- [KV Metrics](https://developers.cloudflare.com/kv/observability/metrics-analytics/)
- [D1 Metrics](https://developers.cloudflare.com/d1/observability/metrics-analytics/)

**Internal Documentation:**
- Migration tasks: `/home/carl/application-tracking/jobmatch-ai/MIGRATION_TASKS_REMAINING.md`
- Infrastructure audit: `/home/carl/application-tracking/jobmatch-ai/docs/CLOUDFLARE_INFRASTRUCTURE_AUDIT_2026-01-02.md`
- KV architecture: `/home/carl/application-tracking/jobmatch-ai/docs/CLOUDFLARE_KV_AND_WORKERS_ARCHITECTURE.md`
- D1 schema: `/home/carl/application-tracking/jobmatch-ai/docs/D1_SCHEMA_MAPPING.md`

---

**Last Updated:** 2026-01-03
**Reviewed By:** Claude Code (Observability Specialist)
**Next Review:** After production deployment
