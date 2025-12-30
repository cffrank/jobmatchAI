# Workers AI Analytics - Quick Reference Card

## Structured Log Events (JSON)

### Workers AI Events

| Event | Description | Key Fields |
|-------|-------------|------------|
| `workers_ai_analysis_success` | Successful AI analysis | `model`, `duration_ms`, `overall_score`, `recommendation` |
| `workers_ai_attempt_failed` | Failed attempt (will retry) | `model`, `error`, `will_retry` |
| `workers_ai_validation_failed` | Quality validation failed | `validation_failure`, `overall_score` |
| `workers_ai_model_exhausted` | All attempts failed for model | `model`, `total_attempts`, `will_fallback` |
| `workers_ai_complete_failure` | All models failed, fallback to OpenAI | `models_tried`, `total_attempts`, `last_error` |

### OpenAI Events

| Event | Description | Key Fields |
|-------|-------------|------------|
| `hybrid_strategy_decision` | Strategy decision made | `strategy`, `result`, `cost_savings_percent` |
| `openai_fallback_success` | OpenAI fallback succeeded | `model`, `duration_ms`, `overall_score` |

### Cache Events

| Event | Description | Key Fields |
|-------|-------------|------------|
| `cache_lookup` | Cache lookup (KV or DB) | `cache_type`, `result` (hit/miss) |

## API Endpoints (Authenticated)

```bash
# Workers AI metrics guide
GET /api/analytics/workers-ai

# Cache efficiency guide
GET /api/analytics/cache

# Model performance guide
GET /api/analytics/models

# Cost savings calculator
GET /api/analytics/cost-savings
```

## Cloudflare Dashboard Access

1. Go to https://dash.cloudflare.com
2. Workers & Pages > **jobmatch-ai**
3. Click **Logs** tab
4. Filter logs with search bar

## Common Log Filters

```
# Workers AI success rate
event="workers_ai_analysis_success"

# Workers AI failures
event="workers_ai_complete_failure"

# Cache hits
event="cache_lookup" AND result="hit"

# Cache misses
event="cache_lookup" AND result="miss"

# Validation failures
event="workers_ai_validation_failed"

# OpenAI fallbacks
event="openai_fallback_success"

# Hybrid decisions
event="hybrid_strategy_decision"
```

## Key Metrics Formulas

### Workers AI Success Rate
```
Success Rate =
  Count(workers_ai_analysis_success) /
  [Count(workers_ai_analysis_success) + Count(workers_ai_complete_failure)]

Target: 85-95%
```

### Cache Hit Rate
```
Hit Rate =
  Count(cache_lookup AND result="hit") /
  Count(cache_lookup)

Target: 80-90% (KV), 60-70% (DB)
```

### Average Duration
```
Avg Duration = AVG(duration_ms) WHERE event="workers_ai_analysis_success"

Target: 800-1500ms (Workers AI), 1500-3000ms (OpenAI)
```

### Cost Savings
```
Workers_AI_Cost = Count(workers_ai_analysis_success) × $0.0015
OpenAI_Cost = Count(openai_fallback_success) × $0.045
Actual_Total = Workers_AI_Cost + OpenAI_Cost

If_All_OpenAI = [Workers_AI + OpenAI counts] × $0.045
Savings = If_All_OpenAI - Actual_Total
Savings % = (Savings / If_All_OpenAI) × 100

Target: 95%+ savings
```

## Monitoring Checklist

### Daily (5 min)
- [ ] Check Workers AI success rate ≥ 85%
- [ ] Check cache hit rate ≥ 80%
- [ ] Review error logs

### Weekly (30 min)
- [ ] Calculate cost savings
- [ ] Review model distribution
- [ ] Analyze validation failures
- [ ] Check average latency

### Monthly (1-2 hours)
- [ ] Monthly cost report
- [ ] Trend analysis
- [ ] Optimize thresholds
- [ ] Document findings

## Alerts to Configure

| Priority | Metric | Threshold | Action |
|----------|--------|-----------|--------|
| 🔴 High | Success rate | < 80% | Investigate immediately |
| 🔴 High | Avg duration | > 3000ms | Check performance |
| 🔴 High | Fallback rate | > 10%/hour | Review logs |
| 🟡 Medium | Cache hit rate | < 70% | Check cache config |
| 🟡 Medium | Validation failures | > 10% | Review prompts |
| 🟢 Low | Daily cost | > budget | Optimize usage |

## Cost Impact

| Volume | OpenAI Only | Workers AI (95% success) | Monthly Savings |
|--------|-------------|--------------------------|-----------------|
| 100 analyses | $4.50 | $0.60 | $3.90 (87%) |
| 1,000 analyses | $45.00 | $6.00 | $39.00 (87%) |
| 10,000 analyses | $450.00 | $60.00 | $390.00 (87%) |

## Quick Test

```bash
# Trigger analysis
curl -X POST https://your-worker.workers.dev/api/applications/generate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "test-job-id"}'

# Check logs immediately in Dashboard
# Should see: cache_lookup → workers_ai_analysis_success → hybrid_strategy_decision
```

## Resources

- **Full Guide**: `/workers/WORKERS_AI_ANALYTICS_GUIDE.md`
- **Implementation Summary**: `/workers/ANALYTICS_IMPLEMENTATION_SUMMARY.md`
- **Cloudflare Docs**: https://developers.cloudflare.com/workers/observability/logs/
