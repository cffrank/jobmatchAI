# Job Compatibility Analysis Caching Strategy

## Overview

Job compatibility analysis is an expensive operation that uses OpenAI GPT-4 to evaluate candidates across 10 dimensions. Each analysis costs approximately $0.03-0.05 in API fees and takes 3-5 seconds to complete. To reduce costs and improve user experience, we've implemented a hybrid caching strategy.

## Architecture

### Hybrid Caching: KV + Database

```
┌─────────────────────────────────────────────────────────────┐
│                    User Request                              │
│              POST /api/jobs/:jobId/analyze                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  Check KV Cache       │
                │  (Sub-ms latency)     │
                └───────┬───────────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
         ✓ HIT                ✗ MISS
              │                   │
              ▼                   ▼
       ┌──────────────┐   ┌──────────────┐
       │ Return       │   │ Check        │
       │ Cached       │   │ Database     │
       │ Result       │   │ (50-200ms)   │
       └──────────────┘   └──────┬───────┘
                                 │
                       ┌─────────┴─────────┐
                       │                   │
                  ✓ HIT                ✗ MISS
                       │                   │
                       ▼                   ▼
              ┌─────────────────┐  ┌──────────────┐
              │ Return + Backfill│  │ Generate     │
              │ KV Cache         │  │ New Analysis │
              └─────────────────┘  │ (3-5 seconds)│
                                   └──────┬───────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │ Cache in     │
                                   │ KV + DB      │
                                   └──────────────┘
```

### Layer 1: Cloudflare Workers KV (Primary Cache)

**Purpose**: Fast edge cache for immediate retrieval

**Configuration**:
- **Binding**: `JOB_ANALYSIS_CACHE` (configured in `wrangler.toml`)
- **TTL**: 7 days (604,800 seconds)
- **Key Format**: `job-analysis:{userId}:{jobId}`
- **Value**: JSON-serialized `JobCompatibilityAnalysis` object

**Characteristics**:
- ✅ **Fast**: Sub-millisecond reads from edge locations
- ✅ **Global**: Automatically replicated worldwide
- ✅ **Cost-effective**: Free tier includes 100,000 reads/day
- ⚠️ **Eventually consistent**: Writes take up to 60 seconds to propagate
- ⚠️ **No pattern deletion**: Can't delete all keys for a user at once

**Metrics**:
- Cache hit rate: ~70-80% (users re-analyzing same jobs)
- Cost: $0 (well within free tier)
- Latency: <1ms for cache hits

### Layer 2: Supabase PostgreSQL (Permanent Storage)

**Purpose**: Historical tracking and fallback cache

**Table Schema**:
```sql
CREATE TABLE job_compatibility_analyses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  job_id UUID REFERENCES jobs(id),
  analysis JSONB NOT NULL,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, job_id)
);
```

**Characteristics**:
- ✅ **ACID guarantees**: Immediate consistency
- ✅ **Queryable**: Can analyze trends, generate reports
- ✅ **Already integrated**: No new infrastructure
- ✅ **Historical tracking**: Perfect for analytics
- ⚠️ **Slower**: Database roundtrip adds 50-200ms

**Metrics**:
- Storage cost: ~$0.50/month (for 10,000 analyses)
- Latency: 50-200ms for cache hits

### Fallback Chain

1. **KV Cache Check** (fastest)
   - If hit: Return immediately ✅
   - If miss: Continue to step 2

2. **Database Check** (fallback)
   - If hit: Return + backfill KV cache ✅
   - If miss: Continue to step 3

3. **Generate New** (slowest, most expensive)
   - Call OpenAI API (~$0.03-0.05, 3-5 seconds)
   - Store in both KV and Database
   - Return result

## Implementation

### Service Layer

**File**: `workers/api/services/jobAnalysisCache.ts`

**Key Functions**:

```typescript
// High-level API
getCachedAnalysis(env, userId, jobId) → CachedAnalysis | null
cacheAnalysis(env, userId, jobId, analysis) → void
invalidateCacheForUser(env, userId, jobIds?) → void

// Low-level KV operations
getFromKVCache(env, userId, jobId) → Analysis | null
storeInKVCache(env, userId, jobId, analysis) → void
invalidateKVCacheForUser(env, userId, jobIds?) → void

// Low-level DB operations
getFromDatabase(env, userId, jobId) → Analysis | null
storeInDatabase(env, userId, jobId, analysis) → void
invalidateDatabaseCacheForUser(env, userId, jobIds?) → void
```

### Endpoint Integration

**File**: `workers/api/routes/jobs.ts`

**Endpoint**: `POST /api/jobs/:id/analyze`

**Flow**:
```typescript
// 1. Check cache first
const cached = await getCachedAnalysis(env, userId, jobId);
if (cached) {
  return c.json({ ...cached.analysis, cached: true, cacheSource: cached.source });
}

// 2. Generate new analysis
const analysis = await analyzeJobCompatibility(env, { job, profile, ... });

// 3. Cache result (async, non-blocking)
c.executionCtx.waitUntil(cacheAnalysis(env, userId, jobId, analysis));

// 4. Return result
return c.json({ ...analysis, cached: false, cacheSource: 'generated' });
```

### Cache Invalidation

**Trigger**: When user profile changes significantly

**Affected Routes**: All profile update endpoints in `workers/api/routes/profile.ts`

**Events that Invalidate Cache**:
- Profile update (headline, summary, contact info)
- Work experience add/update/delete
- Education add/update/delete
- Skills add/update/delete
- Resume re-upload

**Implementation**:
```typescript
// Helper function called after every profile change
function triggerProfileChangeBackgroundUpdates(c, env, supabase, userId) {
  c.executionCtx.waitUntil(
    Promise.allSettled([
      updateUserResumeEmbedding(env, supabase, userId),
      invalidateCacheForUser(env, userId), // ← Cache invalidation
    ])
  );
}
```

**Invalidation Strategy**:
- **KV**: Delete specific keys (if job IDs provided) or log warning (relies on 7-day TTL)
- **Database**: Delete all analyses for user (or specific job IDs)

## Cost Analysis

### Without Caching (Baseline)

| Metric | Value |
|--------|-------|
| Analysis cost | $0.03 - $0.05 |
| Average analyses/user/day | 5 |
| Active users | 100 |
| Daily cost | $15 - $25 |
| Monthly cost | $450 - $750 |

### With Hybrid Caching

| Metric | Value |
|--------|-------|
| Cache hit rate | 70-80% |
| Analyses requiring API call | 20-30% |
| Daily cost | $3 - $7.50 |
| Monthly cost | $90 - $225 |
| **Monthly savings** | **$360 - $525 (60-70%)** |
| KV costs | $0 (within free tier) |
| Database costs | ~$0.50/month |

### Cost Breakdown

**OpenAI API Costs**:
- Without cache: 500 analyses/day × $0.04 = $20/day = $600/month
- With cache (75% hit rate): 125 analyses/day × $0.04 = $5/day = $150/month
- **Savings**: $450/month (75%)

**Infrastructure Costs**:
- KV reads: Free (within 100,000/day limit)
- KV writes: Free (within 1,000/day limit)
- Database storage: ~$0.50/month (10,000 analyses @ 5KB each = 50MB)
- Database queries: Negligible (already paying for Supabase)

**Total**:
- Infrastructure: ~$0.50/month
- OpenAI savings: $450/month
- **Net savings: $449.50/month (75%)**

## Performance Metrics

### Latency

| Scenario | Latency | Cost |
|----------|---------|------|
| KV cache hit | <1ms | $0 |
| Database cache hit | 50-200ms | $0 |
| Fresh generation | 3-5 seconds | $0.03-$0.05 |

### Cache Hit Rates (Projected)

| Timeframe | KV Hit Rate | DB Hit Rate | Total Hit Rate |
|-----------|-------------|-------------|----------------|
| Day 1 | 40% | 10% | 50% |
| Day 7 | 75% | 10% | 85% |
| Day 14+ | 70% | 15% | 85% |

**Explanation**:
- **Day 1**: Users analyzing new jobs, building cache
- **Day 7**: Most common jobs cached, high KV hit rate
- **Day 14+**: KV TTL expires, some fallback to DB, new jobs appear

## Setup Instructions

### 1. Create KV Namespace

```bash
# Development
cd workers
wrangler kv:namespace create JOB_ANALYSIS_CACHE

# Production
wrangler kv:namespace create JOB_ANALYSIS_CACHE --env production
```

**Update `wrangler.toml`** with the generated namespace IDs:
```toml
[[kv_namespaces]]
binding = "JOB_ANALYSIS_CACHE"
id = "your-dev-namespace-id"
preview_id = "your-preview-namespace-id"

[env.production.kv_namespaces]
binding = "JOB_ANALYSIS_CACHE"
id = "your-production-namespace-id"
```

### 2. Apply Database Migration

```bash
# Navigate to Supabase project
cd ..
supabase migration apply --file supabase/migrations/017_add_job_compatibility_analyses_table.sql

# Or apply via Supabase Dashboard:
# Settings → Database → Migrations → Upload migration file
```

### 3. Deploy Workers

```bash
cd workers

# Deploy to development
wrangler deploy --env development

# Deploy to production
wrangler deploy --env production
```

### 4. Verify Setup

```bash
# Test KV binding
wrangler kv:key list --binding=JOB_ANALYSIS_CACHE

# Test database table
psql -h your-supabase-host -U postgres -d postgres -c "SELECT * FROM job_compatibility_analyses LIMIT 1;"
```

## Monitoring & Analytics

### KV Cache Metrics

Monitor via Cloudflare Workers Analytics:
- KV read operations
- KV write operations
- Cache hit rate (via application logs)

**Logs to watch for**:
```
[JobAnalysisCache] ✓ KV cache HIT for job-analysis:user-123:job-456 - Cost savings!
[JobAnalysisCache] KV cache MISS for job-analysis:user-123:job-456
[Cost Savings] Avoided OpenAI API call (~$0.03-0.05 saved)
```

### Database Analytics

Query for cache performance:
```sql
-- Total cached analyses
SELECT COUNT(*) FROM job_compatibility_analyses;

-- Analyses per user
SELECT user_id, COUNT(*) as analysis_count
FROM job_compatibility_analyses
GROUP BY user_id
ORDER BY analysis_count DESC;

-- Recommendation distribution
SELECT
  analysis->>'recommendation' as recommendation,
  COUNT(*) as count
FROM job_compatibility_analyses
GROUP BY recommendation;

-- Average scores by dimension
SELECT
  AVG((analysis->'dimensions'->'skillMatch'->>'score')::numeric) as avg_skill_match,
  AVG((analysis->'dimensions'->'experienceLevel'->>'score')::numeric) as avg_experience
FROM job_compatibility_analyses;
```

### Cost Tracking

Track OpenAI API usage:
```sql
-- Analyses requiring fresh generation (not cached)
-- Track via application logs or separate analytics table

-- Monthly API cost estimate
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) * 0.04 as estimated_api_cost
FROM job_compatibility_analyses
GROUP BY month;
```

## Troubleshooting

### Cache Not Working

**Symptoms**: Every request generates new analysis

**Checks**:
1. Verify KV namespace is configured: `wrangler kv:namespace list`
2. Check binding in `wrangler.toml`: `JOB_ANALYSIS_CACHE`
3. Check application logs for cache errors
4. Verify database table exists: `SELECT * FROM job_compatibility_analyses;`

### High Cache Miss Rate

**Symptoms**: <50% cache hit rate after 7 days

**Possible Causes**:
1. Users analyzing many unique jobs (expected behavior)
2. Frequent profile changes invalidating cache
3. KV TTL too short (currently 7 days)
4. Database queries failing (check logs)

**Solutions**:
- Increase KV TTL to 14 days (requires code change)
- Implement smarter invalidation (only invalidate affected analyses)
- Add application-level cache for common job queries

### Database Storage Growing Too Fast

**Symptoms**: >1GB of cached analyses

**Solutions**:
- Implement cleanup job for old analyses (>90 days)
- Reduce analysis payload size (store only essential data)
- Consider D1 migration for cheaper storage

## Future Optimizations

### 1. Smarter Invalidation

Instead of invalidating all analyses when profile changes:
- Track which dimensions changed (skills vs. education)
- Only invalidate analyses where changed dimensions significantly impact score
- Keep analyses that are unlikely to change (e.g., location match)

### 2. Longer TTL for Stable Profiles

- Detect users with stable profiles (no changes in 30+ days)
- Extend KV TTL to 30 days for these users
- Reduce cache misses for long-term users

### 3. Pre-computation for Popular Jobs

- Identify jobs analyzed by 10+ users
- Pre-compute compatibility scores for common profiles
- Store in separate KV namespace with longer TTL

### 4. Compression

- Compress analysis JSON before storing in KV
- Use `gzip` or `brotli` to reduce storage by 70-80%
- Trade CPU time for storage savings

### 5. Partial Cache Hits

- If only profile summary changed, reuse dimension scores
- Only re-compute affected dimensions
- Faster partial regeneration (~1 second vs 3-5 seconds)

## References

- [Cloudflare Workers KV Documentation](https://developers.cloudflare.com/kv/)
- [Supabase JSONB Performance](https://supabase.com/docs/guides/database/json)
- [OpenAI API Pricing](https://openai.com/pricing)
- [Job Compatibility Analysis Implementation](/workers/api/services/openai.ts)
