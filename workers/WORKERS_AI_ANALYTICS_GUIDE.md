# Workers AI Analytics & Monitoring Guide

This guide explains how to view and analyze Workers AI usage metrics, fallback rates, cache performance, and cost savings using Cloudflare's analytics tools.

## Table of Contents

1. [Structured Logging Events](#structured-logging-events)
2. [Viewing Logs in Cloudflare Dashboard](#viewing-logs-in-cloudflare-dashboard)
3. [Log Filtering & Analysis](#log-filtering--analysis)
4. [Setting Up Logpush for Long-Term Analytics](#setting-up-logpush-for-long-term-analytics)
5. [Using Workers Analytics Engine](#using-workers-analytics-engine)
6. [Key Metrics to Monitor](#key-metrics-to-monitor)
7. [Cost Savings Calculation](#cost-savings-calculation)

---

## Structured Logging Events

All Workers AI operations emit structured JSON logs that can be parsed and analyzed. Here are the key events:

### Workers AI Events

#### `workers_ai_analysis_success`
```json
{
  "event": "workers_ai_analysis_success",
  "job_id": "uuid",
  "user_id": "uuid",
  "model": "@cf/meta/llama-3.1-8b-instruct",
  "model_index": 0,
  "attempt": 1,
  "max_attempts": 2,
  "success": true,
  "validation_passed": true,
  "duration_ms": 1234,
  "attempt_duration_ms": 1200,
  "overall_score": 75,
  "recommendation": "Good Match",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### `workers_ai_attempt_failed`
```json
{
  "event": "workers_ai_attempt_failed",
  "job_id": "uuid",
  "user_id": "uuid",
  "model": "@cf/meta/llama-3.1-8b-instruct",
  "model_index": 0,
  "attempt": 1,
  "max_attempts": 2,
  "success": false,
  "error": "Network timeout",
  "error_type": "Error",
  "duration_ms": 5000,
  "will_retry": true,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### `workers_ai_validation_failed`
```json
{
  "event": "workers_ai_validation_failed",
  "job_id": "uuid",
  "user_id": "uuid",
  "model": "@cf/meta/llama-3.1-8b-instruct",
  "model_index": 0,
  "attempt": 1,
  "validation_failure": "Invalid overall score",
  "duration_ms": 1100,
  "overall_score": -5,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### `workers_ai_model_exhausted`
```json
{
  "event": "workers_ai_model_exhausted",
  "job_id": "uuid",
  "user_id": "uuid",
  "model": "@cf/meta/llama-3.1-8b-instruct",
  "model_index": 0,
  "total_attempts": 2,
  "duration_ms": 6500,
  "will_fallback": true,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### `workers_ai_complete_failure`
```json
{
  "event": "workers_ai_complete_failure",
  "job_id": "uuid",
  "user_id": "uuid",
  "models_tried": 4,
  "total_attempts": 8,
  "duration_ms": 15000,
  "fallback_to": "openai",
  "last_error": "Quality validation failed",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### OpenAI Events

#### `openai_fallback_success`
```json
{
  "event": "openai_fallback_success",
  "job_id": "uuid",
  "user_id": "uuid",
  "model": "gpt-4o-mini",
  "duration_ms": 2500,
  "overall_score": 82,
  "recommendation": "Strong Match",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### `hybrid_strategy_decision`
```json
{
  "event": "hybrid_strategy_decision",
  "job_id": "uuid",
  "user_id": "uuid",
  "strategy": "workers_ai",
  "result": "success",
  "duration_ms": 1234,
  "cost_savings_percent": 95,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Cache Events

#### `cache_lookup`
```json
{
  "event": "cache_lookup",
  "cache_type": "kv",
  "user_id": "uuid",
  "job_id": "uuid",
  "result": "hit",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

## Viewing Logs in Cloudflare Dashboard

### Real-Time Logs (Last 24 Hours)

1. **Navigate to Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com
   - Select your account
   - Click **Workers & Pages** in the left sidebar

2. **Select Your Worker**
   - Find and click on **jobmatch-ai** worker

3. **View Logs**
   - Click the **Logs** tab
   - You'll see a live stream of logs from your worker
   - Logs update in real-time as requests come in

4. **Filter Logs**
   - Use the search bar to filter by event type
   - Example: Search for `workers_ai_analysis_success` to see successful analyses

### Log Retention

- **Free Plan**: Real-time logs only (no retention)
- **Paid Plans**: Last 24 hours of logs retained
- **Logpush**: Unlimited retention (see below)

---

## Log Filtering & Analysis

### Using Cloudflare Dashboard Filters

In the Logs tab, you can filter logs using simple text search:

#### Workers AI Success Rate
```
event="workers_ai_analysis_success"
```

#### Cache Hit Rate
```
event="cache_lookup" AND result="hit"
```

#### Fallback Rate
```
event="workers_ai_complete_failure"
```

#### Validation Failures
```
event="workers_ai_validation_failed"
```

#### Model Performance
```
event="workers_ai_analysis_success" AND model="@cf/meta/llama-3.1-8b-instruct"
```

### Common Queries

#### 1. **Overall Workers AI Success Rate**
```
Count(event="workers_ai_analysis_success") /
Count(event="workers_ai_analysis_success" OR event="workers_ai_complete_failure")
```

**How to calculate manually:**
- Count logs with `workers_ai_analysis_success`
- Count logs with `workers_ai_complete_failure`
- Divide successes by total (successes + failures)

**Example:**
- 95 successes, 5 failures = 95% success rate

#### 2. **Cache Hit Rate**
```
Count(event="cache_lookup" AND result="hit") /
Count(event="cache_lookup")
```

**Expected rates:**
- KV cache: 80-90% for frequently analyzed jobs
- Database cache: 60-70% for older analyses

#### 3. **Average Analysis Duration**
```
AVG(duration_ms) WHERE event="workers_ai_analysis_success"
```

**Expected durations:**
- Workers AI: 800-1500ms
- OpenAI fallback: 1500-3000ms

#### 4. **Validation Failure Breakdown**
```
Count WHERE event="workers_ai_validation_failed"
GROUP BY validation_failure
```

**Common validation failures:**
- "Invalid overall score"
- "Missing dimension: skillMatch"
- "Insufficient strengths"
- "Invalid recommendation category"

---

## Setting Up Logpush for Long-Term Analytics

Cloudflare Logpush allows you to export logs to external storage for long-term retention and advanced analytics.

### Supported Destinations
- **Amazon S3**
- **Google Cloud Storage**
- **Azure Blob Storage**
- **Cloudflare R2** (recommended - no egress fees!)
- **Datadog**
- **Splunk**
- **New Relic**

### Setup Steps (R2 Example)

#### 1. Create R2 Bucket
```bash
# Using Wrangler CLI
wrangler r2 bucket create jobmatch-logs

# Note the bucket URL: https://YOUR_ACCOUNT.r2.cloudflarestorage.com/jobmatch-logs
```

#### 2. Configure Logpush Job
```bash
# Install Cloudflare CLI
npm install -g @cloudflare/wrangler

# Create Logpush job
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/logpush/jobs" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "workers-ai-logs",
    "destination_conf": "r2://jobmatch-logs/workers-ai/{DATE}",
    "dataset": "workers_trace_events",
    "logpull_options": "fields=EventTimestampMs,Outcome,ScriptName,Logs",
    "enabled": true
  }'
```

#### 3. Query Logs with SQL (Cloudflare Analytics)

Once logs are in R2, you can query them with SQL:

```sql
-- Workers AI success rate over time
SELECT
  DATE_TRUNC('hour', EventTimestamp) as hour,
  COUNT(CASE WHEN Logs LIKE '%workers_ai_analysis_success%' THEN 1 END) as successes,
  COUNT(CASE WHEN Logs LIKE '%workers_ai_complete_failure%' THEN 1 END) as failures,
  ROUND(100.0 * COUNT(CASE WHEN Logs LIKE '%workers_ai_analysis_success%' THEN 1 END) /
    NULLIF(COUNT(CASE WHEN Logs LIKE '%workers_ai_analysis_success%' THEN 1 END) +
           COUNT(CASE WHEN Logs LIKE '%workers_ai_complete_failure%' THEN 1 END), 0), 2) as success_rate
FROM workers_logs
WHERE EventTimestamp > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour DESC;
```

```sql
-- Cache hit rate by type
SELECT
  JSON_EXTRACT_SCALAR(Logs, '$.cache_type') as cache_type,
  JSON_EXTRACT_SCALAR(Logs, '$.result') as result,
  COUNT(*) as count
FROM workers_logs
WHERE Logs LIKE '%cache_lookup%'
  AND EventTimestamp > NOW() - INTERVAL '24 hours'
GROUP BY cache_type, result
ORDER BY cache_type, result;
```

```sql
-- Model performance comparison
SELECT
  JSON_EXTRACT_SCALAR(Logs, '$.model') as model,
  COUNT(*) as uses,
  ROUND(AVG(CAST(JSON_EXTRACT_SCALAR(Logs, '$.duration_ms') AS FLOAT)), 2) as avg_duration_ms,
  ROUND(AVG(CAST(JSON_EXTRACT_SCALAR(Logs, '$.overall_score') AS FLOAT)), 2) as avg_score
FROM workers_logs
WHERE Logs LIKE '%workers_ai_analysis_success%'
  AND EventTimestamp > NOW() - INTERVAL '7 days'
GROUP BY model
ORDER BY uses DESC;
```

---

## Using Workers Analytics Engine

For real-time aggregated metrics, enable Workers Analytics Engine.

### Setup

#### 1. Add Analytics Engine Binding to `wrangler.toml`
```toml
[[analytics_engine_datasets]]
binding = "ANALYTICS"
dataset = "workers_ai_metrics"
```

#### 2. Update Code to Write Data Points

```typescript
// In workersAI.ts, after successful analysis
if (env.ANALYTICS) {
  await env.ANALYTICS.writeDataPoint({
    blobs: [
      job.id,
      profile.id,
      model,
      analysis.recommendation,
    ],
    doubles: [
      totalDuration,
      analysis.overallScore,
    ],
    indexes: [
      'workers_ai_success',
    ],
  });
}
```

#### 3. Query Analytics via GraphQL

```graphql
query {
  viewer {
    accounts(filter: { accountTag: "YOUR_ACCOUNT_ID" }) {
      analyticsEngineDatasets(filter: { name: "workers_ai_metrics" }) {
        # Average duration
        avg: avgDouble(doubleField: "double1")

        # Average score
        avgScore: avgDouble(doubleField: "double2")

        # Total count
        count
      }
    }
  }
}
```

### Benefits of Analytics Engine
- Real-time aggregated metrics
- GraphQL API for custom queries
- Build custom dashboards
- Set up alerts for anomalies
- 30-day retention (configurable)

---

## Key Metrics to Monitor

### 1. Workers AI Success Rate
**Target**: 85-95%

**What it measures**: Percentage of job analyses successfully completed by Workers AI without falling back to OpenAI.

**How to improve**:
- If < 80%: Check validation failures, consider adjusting quality thresholds
- Monitor which validation checks fail most often
- Test with different model configurations

### 2. Cache Hit Rate
**Target**: 80-90% (KV), 60-70% (Database)

**What it measures**: Percentage of analyses served from cache instead of generating new analysis.

**How to improve**:
- If KV < 70%: Increase TTL (currently 7 days)
- If DB < 50%: Check cache invalidation logic
- Monitor cache size and eviction patterns

### 3. Average Analysis Duration
**Target**: 800-1500ms (Workers AI), 1500-3000ms (OpenAI)

**What it measures**: How long it takes to generate a job compatibility analysis.

**How to improve**:
- If > 2000ms for Workers AI: Check network latency, try faster model variants
- Consider using `@cf/meta/llama-3.1-8b-instruct-fast` for time-sensitive requests

### 4. Validation Failure Rate
**Target**: < 5%

**What it measures**: Percentage of Workers AI responses that fail quality validation.

**How to improve**:
- Analyze which dimensions fail most often
- Adjust prompts for problematic dimensions
- Consider loosening thresholds for non-critical validations

### 5. Model Distribution
**What it measures**: Which models are being used (primary vs fallbacks).

**Ideal distribution**:
- Primary model (`llama-3.1-8b-instruct`): 85-95%
- Fallback models: 5-10%
- OpenAI: 0-5%

### 6. Cost per Analysis
**Target**: $0.001-0.002 (Workers AI), $0.03-0.05 (OpenAI)

**What it measures**: Average cost per job analysis.

**Formula**:
```
Cost = (Workers_AI_Count × $0.0015) + (OpenAI_Count × $0.045)
Average = Cost / Total_Analyses
```

---

## Cost Savings Calculation

### Monthly Savings Formula

```
Workers_AI_Successes = Count(event="workers_ai_analysis_success")
OpenAI_Fallbacks = Count(event="openai_fallback_success")
Total_Analyses = Workers_AI_Successes + OpenAI_Fallbacks

Workers_AI_Cost = Workers_AI_Successes × $0.0015
OpenAI_Cost = OpenAI_Fallbacks × $0.045

Actual_Cost = Workers_AI_Cost + OpenAI_Cost
OpenAI_Only_Cost = Total_Analyses × $0.045

Monthly_Savings = OpenAI_Only_Cost - Actual_Cost
Savings_Percentage = (Monthly_Savings / OpenAI_Only_Cost) × 100
```

### Example Calculation

**Scenario**: 1,000 analyses per month
- Workers AI successes: 950 (95%)
- OpenAI fallbacks: 50 (5%)

**Costs**:
```
Workers AI: 950 × $0.0015 = $1.43
OpenAI: 50 × $0.045 = $2.25
Actual Total: $3.68

If using OpenAI only: 1,000 × $0.045 = $45.00

Monthly Savings: $45.00 - $3.68 = $41.32
Savings Percentage: 92%
```

### Use Analytics Endpoint

You can also access cost savings estimates via API:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-worker.workers.dev/api/analytics/cost-savings
```

---

## Recommended Monitoring Setup

### Daily Checks (5 minutes)
1. Check Workers AI success rate (target: 85-95%)
2. Check cache hit rate (target: 80-90%)
3. Review any error logs or validation failures

### Weekly Analysis (30 minutes)
1. Review model performance distribution
2. Calculate cost savings for the week
3. Analyze validation failure patterns
4. Check average response times
5. Review any anomalies or spikes

### Monthly Review (1-2 hours)
1. Calculate monthly cost savings
2. Review trends over time
3. Optimize quality thresholds based on data
4. Plan model updates or configuration changes
5. Update documentation with findings

### Alerts to Set Up

**High Priority**:
- Workers AI success rate drops below 80%
- Average duration exceeds 3 seconds
- More than 10% OpenAI fallbacks in an hour

**Medium Priority**:
- Cache hit rate drops below 70%
- Validation failure rate exceeds 10%
- Specific model consistently failing

**Low Priority**:
- Daily cost exceeds budget threshold
- Unusual traffic patterns

---

## Troubleshooting

### Workers AI Success Rate Too Low

**Possible causes**:
1. Validation thresholds too strict
2. Network connectivity issues
3. Model overload or rate limiting
4. Prompt quality issues

**Solutions**:
- Review validation failure logs
- Test with different models
- Adjust quality thresholds
- Improve system prompts

### Cache Hit Rate Too Low

**Possible causes**:
1. Users analyzing different jobs each time
2. Cache TTL too short
3. Cache invalidation too aggressive

**Solutions**:
- Increase KV TTL from 7 days to 14 days
- Review cache invalidation triggers
- Monitor cache eviction patterns

### High Latency

**Possible causes**:
1. Using slower model variants
2. Network latency to Cloudflare AI
3. Large prompts/responses

**Solutions**:
- Try `@cf/meta/llama-3.1-8b-instruct-fast`
- Optimize prompt length
- Check network connectivity

---

## Additional Resources

- [Cloudflare Workers Logs Documentation](https://developers.cloudflare.com/workers/observability/logs/)
- [Cloudflare Logpush Documentation](https://developers.cloudflare.com/logs/logpush/)
- [Workers Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Cloudflare AI Documentation](https://developers.cloudflare.com/workers-ai/)

---

## API Endpoints for Analytics

All analytics endpoints require authentication:

```bash
# Workers AI metrics
GET /api/analytics/workers-ai

# Cache metrics
GET /api/analytics/cache

# Model performance
GET /api/analytics/models

# Cost savings
GET /api/analytics/cost-savings
```

Example:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-worker.workers.dev/api/analytics/workers-ai
```

These endpoints return guidance on how to interpret metrics and where to find detailed data in Cloudflare Dashboard.
